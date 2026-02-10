'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

// Types
export interface PlatformPayment {
    id: string
    amount: number
    status: string
    method: string
    description: string | null
    invoiceNumber: string | null
    createdAt: Date
    library: {
        id: string
        name: string
        subdomain: string
    }
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
        payments: payments as PlatformPayment[],
        total,
        pages: Math.ceil(total / limit)
    }
}

// Create Manual Payment
const manualPaymentSchema = z.object({
    libraryId: z.string().min(1, 'Library is required'),
    amount: z.number().min(1, 'Amount must be positive'),
    description: z.string().min(1, 'Description is required'),
    method: z.enum(['manual', 'bank_transfer', 'cheque', 'upi']),
    referenceId: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['succeeded', 'pending']).default('succeeded')
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
                subtotal: validated.amount, // Assuming inclusive for manual entry for simplicity, or we can calculate tax
                currency: 'INR',
                status: validated.status,
                method: validated.method,
                gatewayId: validated.referenceId,
                description: validated.description,
                notes: validated.notes,
                invoiceNumber
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
        Invoice: p.invoiceNumber,
        Library: p.library.name,
        Subdomain: p.library.subdomain,
        Date: p.createdAt.toISOString(),
        Amount: p.amount,
        Status: p.status,
        Method: p.method,
        Description: p.description
    }))
}
