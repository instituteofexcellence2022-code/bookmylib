'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Helper to get authenticated staff
async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get('staff_session')?.value

    if (!staffId) return null

    const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: { 
            library: true,
            branch: true 
        }
    })
    
    if (!staff || staff.status !== 'active') return null
    return staff
}

export async function getStaffKhatabook(limit = 50) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    // 1. Fetch Collections (Cash In)
    const collections = await prisma.payment.findMany({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            collectedBy: staff.id,
            status: 'completed',
        },
        orderBy: { date: 'desc' },
        take: limit,
        include: {
            student: { 
                select: { 
                    name: true,
                    email: true
                } 
            },
            subscription: {
                include: {
                    plan: {
                        select: { name: true }
                    }
                }
            },
            handover: {
                select: {
                    status: true
                }
            }
        }
    })

    // 2. Fetch Handovers (Cash Out)
    const handovers = await prisma.cashHandover.findMany({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            staffId: staff.id
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
            _count: {
                select: { payments: true }
            }
        }
    })

    // 3. Normalize and Combine
    const transactions = [
        ...collections.map(c => ({
            id: c.id,
            type: 'IN' as const,
            amount: c.amount,
            date: c.date,
            description: c.student?.name || 'Unknown Student',
            details: {
                studentName: c.student?.name || 'Unknown Student',
                studentEmail: c.student?.email || '',
                planName: c.subscription?.plan?.name || 'N/A',
                paymentId: c.id,
                handoverStatus: !c.handoverId 
                    ? 'In Hand' 
                    : c.handover?.status === 'verified' 
                        ? 'Handed Over' 
                        : 'Pending',
                method: c.method
            },
            status: c.status,
            referenceId: c.id,
            attachmentUrl: c.proofUrl
        })),
        ...handovers.map(h => ({
            id: h.id,
            type: 'OUT' as const,
            amount: h.amount,
            date: h.createdAt,
            description: 'Handover to Owner',
            details: {
                method: h.method,
                linkedTransactions: h._count.payments,
                notes: h.notes
            },
            status: h.status,
            referenceId: h.id,
            attachmentUrl: h.attachmentUrl,
            notes: h.notes
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, limit)

    return transactions
}

export async function getPendingCashTransactions() {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    const pendingPayments = await prisma.payment.findMany({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            collectedBy: staff.id,
            status: 'completed',
            method: { in: ['CASH', 'cash'] },
            handoverId: null
        },
        orderBy: { date: 'desc' },
        include: {
            student: {
                select: { name: true, email: true }
            },
            subscription: {
                include: {
                    plan: { select: { name: true } }
                }
            }
        }
    })

    return pendingPayments.map(p => ({
        id: p.id,
        amount: p.amount,
        date: p.date,
        studentName: p.student?.name || 'Unknown',
        planName: p.subscription?.plan?.name || 'N/A'
    }))
}

export async function getStaffCashSummary() {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    // 1. Total Cash Collected by Staff
    // Assuming 'cash' and 'front_desk' are cash methods. Adjust if needed.
    const totalCollected = await prisma.payment.aggregate({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            collectedBy: staff.id,
            status: 'completed',
            method: { in: ['CASH', 'cash'] }
        },
        _sum: { amount: true }
    })

    // 2. Total Handed Over (Verified Only)
    const totalHandedOver = await prisma.cashHandover.aggregate({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            staffId: staff.id,
            status: 'verified'
        },
        _sum: { amount: true }
    })

    // 3. Pending Handover Amount
    const pendingHandover = await prisma.cashHandover.aggregate({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            staffId: staff.id,
            status: 'pending'
        },
        _sum: { amount: true }
    })

    const collectedAmount = totalCollected._sum.amount || 0
    const handedOverAmount = totalHandedOver._sum.amount || 0
    const pendingAmount = pendingHandover._sum.amount || 0
    
    // Cash In Hand = Collected - Verified Handed Over
    // Note: This includes pending amount as "in hand" liability until verified
    const cashInHand = collectedAmount - handedOverAmount

    // Get recent handovers
    const recentHandovers = await prisma.cashHandover.findMany({
        where: {
            staffId: staff.id
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    })

    return {
        cashInHand,
        totalCollected: collectedAmount,
        totalHandedOver: handedOverAmount,
        pendingHandoverAmount: pendingAmount,
        recentHandovers
    }
}

export async function createHandoverRequest(data: {
    amount: number
    notes?: string
    method: string
    attachmentUrl?: string
    paymentIds?: string[]
}) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    // Validate amount
    const summary = await getStaffCashSummary()
    if (data.amount > summary.cashInHand) {
        throw new Error('Insufficient cash in hand')
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
        // 1. Create Handover
        const handover = await tx.cashHandover.create({
            data: {
                libraryId: staff.libraryId,
                branchId: staff.branchId,
                staffId: staff.id,
                amount: data.amount,
                notes: data.notes,
                method: data.method,
                attachmentUrl: data.attachmentUrl,
                status: 'pending'
            }
        })

        // 2. Link Payments if provided
        if (data.paymentIds && data.paymentIds.length > 0) {
            await tx.payment.updateMany({
                where: {
                    id: { in: data.paymentIds },
                    collectedBy: staff.id, // Security check
                    handoverId: null
                },
                data: {
                    handoverId: handover.id
                }
            })
        }

        // 3. Log Activity
        await tx.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'finance',
                action: 'Cash Handover Request',
                details: `Requested handover of ₹${data.amount} via ${data.method}`,
                entity: 'Finance',
                status: 'success'
            }
        })

        return handover
    })

    revalidatePath('/staff/khatabook')
    return result
}
