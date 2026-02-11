'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// Types
export interface PlatformPayment {
    id: string
    amount: number
    subtotal: number | null
    taxAmount: number | null
    status: string
    method: string
    description: string | null
    invoiceNumber: string | null
    paymentDate: Date
    billingStart: Date | null
    billingEnd: Date | null
    createdAt: Date
    library: {
        id: string
        name: string
        subdomain: string
    }
    plan: {
        name: string
    } | null
}

// Stats
export async function getPaymentStats() {
    await requireAdmin()

    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const [
        totalRevenue,
        monthlyRevenue,
        lastMonthRevenue,
        pendingCount,
        failedCount
    ] = await Promise.all([
        // All time revenue (succeeded)
        prisma.saasPayment.aggregate({
            where: { status: 'succeeded' },
            _sum: { amount: true }
        }),
        // This month revenue
        prisma.saasPayment.aggregate({
            where: { 
                status: 'succeeded',
                createdAt: { gte: firstDayOfMonth }
            },
            _sum: { amount: true }
        }),
        // Last month revenue
        prisma.saasPayment.aggregate({
            where: { 
                status: 'succeeded',
                createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
            },
            _sum: { amount: true }
        }),
        // Pending payments
        prisma.saasPayment.count({
            where: { status: 'pending' }
        }),
        // Failed payments (recent attention needed)
        prisma.saasPayment.count({
            where: { status: 'failed' }
        })
    ])

    return {
        totalRevenue: totalRevenue._sum.amount || 0,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        lastMonthRevenue: lastMonthRevenue._sum.amount || 0,
        pendingCount,
        failedCount
    }
}

// Get Payments List
export async function getPayments(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
}) {
    await requireAdmin()
    
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit
    
    const where: any = {}
    
    if (params.status && params.status !== 'all') {
        where.status = params.status
    }
    
    if (params.search) {
        where.OR = [
            { invoiceNumber: { contains: params.search, mode: 'insensitive' } },
            { library: { name: { contains: params.search, mode: 'insensitive' } } },
            { library: { subdomain: { contains: params.search, mode: 'insensitive' } } }
        ]
    }
    
    const [payments, total] = await Promise.all([
        prisma.saasPayment.findMany({
            where,
            include: {
                library: {
                    select: {
                        id: true,
                        name: true,
                        subdomain: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.saasPayment.count({ where })
    ])
    
    return {
        payments: payments.map(p => ({
            ...p,
            subtotal: p.amount,
            taxAmount: 0,
            method: p.method || 'unknown',
            description: null,
            invoiceNumber: null,
            paymentDate: p.createdAt,
            billingStart: null,
            billingEnd: null,
            plan: null
        })) as PlatformPayment[],
        total,
        pages: Math.ceil(total / limit)
    }
}

// Get Active Plans for Payment Dropdown
export async function getPaymentPlans() {
    await requireAdmin()
    return prisma.saasPlan.findMany({
        where: { isActive: true },
        select: { 
            id: true, 
            name: true, 
            priceMonthly: true,
            priceYearly: true
        },
        orderBy: { priceMonthly: 'asc' }
    })
}

// Create Manual Payment
const manualPaymentSchema = z.object({
    libraryId: z.string().min(1, 'Library is required'),
    planId: z.string().optional().nullable(),
    amount: z.number().min(0, 'Amount must be positive'),
    subtotal: z.number().optional(),
    taxAmount: z.number().optional(),
    description: z.string().min(1, 'Description is required'),
    method: z.enum(['manual', 'bank_transfer', 'cheque', 'upi']),
    referenceId: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['succeeded', 'pending']).default('succeeded'),
    paymentDate: z.coerce.date().default(() => new Date()),
    billingStart: z.coerce.date().optional().nullable(),
    billingEnd: z.coerce.date().optional().nullable(),
})

export type ManualPaymentData = z.infer<typeof manualPaymentSchema>

export async function createManualPayment(data: ManualPaymentData) {
    await requireAdmin()
    
    const validated = manualPaymentSchema.parse(data)
    
    // Generate Invoice Number (Simple format: INV-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const count = await prisma.saasPayment.count({
        where: {
            createdAt: {
                gte: new Date(new Date().setHours(0,0,0,0))
            }
        }
    })
    const invoiceNumber = `INV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`
    
    try {
        const payment = await prisma.saasPayment.create({
            data: {
                libraryId: validated.libraryId,
                amount: validated.amount,
                currency: 'INR',
                status: validated.status,
                method: validated.method,
                gatewayId: validated.referenceId,
                // planId, subtotal, taxAmount, notes, invoiceNumber, billingStart/End not in schema
            }
        })
        
        revalidatePath('/admin/payments')
        return { success: true, payment }
    } catch (error) {
        console.error('Failed to create payment:', error)
        return { success: false, error: 'Failed to record payment' }
    }
}

// Export Payments
export async function exportPayments(status?: string) {
    await requireAdmin()
    
    const where: any = {}
    if (status && status !== 'all') {
        where.status = status
    }
    
    const payments = await prisma.saasPayment.findMany({
        where,
        include: {
            library: {
                select: {
                    name: true,
                    subdomain: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
    
    return payments.map(p => ({
        Invoice: '-',
        Library: p.library.name,
        Subdomain: p.library.subdomain,
        'SaaS Plan': '-',
        Date: p.createdAt.toISOString().split('T')[0],
        Amount: p.amount,
        Tax: 0,
        Total: p.amount,
        Status: p.status,
        Method: p.method,
        Description: '-'
    }))
}
