'use server'

import { prisma } from '@/lib/prisma'
import { getOwnerProfile } from '@/actions/owner'
import { revalidatePath } from 'next/cache'

export async function getStaffBalances() {
    const owner = await getOwnerProfile()
    if (!owner) throw new Error('Unauthorized')

    // Get all staff in owner's branches
    const staffMembers = await prisma.staff.findMany({
        where: {
            libraryId: owner.libraryId,
            branch: {
                // If owner is assigned to specific branches (not handled in schema yet explicitly for Owner-Branch many-to-many, but assuming owner sees all for now or linked via Library)
                // Actually Owner has libraryId, so they see all staff in that library.
                // But if branches have ownerId, maybe filter? 
                // Let's stick to Library scope for now as per schema.
            },
            status: 'active'
        },
        include: {
            branch: { select: { name: true } }
        }
    })

    const balances = await Promise.all(staffMembers.map(async (staff) => {
        // 1. Total Collected (CASH)
        const totalCollected = await prisma.payment.aggregate({
            where: {
                collectedBy: staff.id,
                status: 'completed',
                method: 'CASH'
            },
            _sum: { amount: true }
        })

        // 2. Total Handed Over (VERIFIED only)
        // Owner only sees confirmed cash receipt
        const totalHandedOver = await prisma.cashHandover.aggregate({
            where: {
                staffId: staff.id,
                status: 'verified'
            },
            _sum: { amount: true }
        })

        const collected = totalCollected._sum.amount || 0
        const handedOver = totalHandedOver._sum.amount || 0
        
        // Also get last handover date
        const lastHandover = await prisma.cashHandover.findFirst({
            where: { 
                staffId: staff.id,
                status: 'verified'
            },
            orderBy: { createdAt: 'desc' }
        })

        // Count pending handovers and amount
        const pendingHandovers = await prisma.cashHandover.aggregate({
            where: {
                staffId: staff.id,
                status: 'pending'
            },
            _count: { id: true },
            _sum: { amount: true }
        })

        const pendingHandoverCount = pendingHandovers._count.id
        const pendingHandoverAmount = pendingHandovers._sum.amount || 0

        return {
            id: staff.id,
            name: staff.name,
            branchName: staff.branch.name,
            image: staff.image,
            totalCollected: collected,
            totalHandedOver: handedOver,
            balance: collected - handedOver,
            lastHandoverAt: lastHandover?.createdAt || null,
            pendingHandoverCount,
            pendingHandoverAmount
        }
    }))

    // Sort by balance desc (highest cash holder first)
    return balances.sort((a, b) => b.balance - a.balance)
}

export async function verifyHandover(handoverId: string) {
    const owner = await getOwnerProfile()
    if (!owner) throw new Error('Unauthorized')

    const handover = await prisma.cashHandover.findUnique({
        where: { id: handoverId }
    })

    if (!handover) throw new Error('Handover not found')

    // Verify it belongs to owner's library
    if (handover.libraryId !== owner.libraryId) throw new Error('Unauthorized')

    await prisma.cashHandover.update({
        where: { id: handoverId },
        data: {
            status: 'verified',
            verifiedBy: owner.id,
            verifiedAt: new Date()
        }
    })

    revalidatePath('/owner/khatabook')
    revalidatePath(`/owner/khatabook/${handover.staffId}`)
}

export async function rejectHandover(handoverId: string) {
    const owner = await getOwnerProfile()
    if (!owner) throw new Error('Unauthorized')

    const handover = await prisma.cashHandover.findUnique({
        where: { id: handoverId }
    })

    if (!handover) throw new Error('Handover not found')

    if (handover.libraryId !== owner.libraryId) throw new Error('Unauthorized')

    await prisma.cashHandover.update({
        where: { id: handoverId },
        data: {
            status: 'rejected',
            verifiedBy: owner.id,
            verifiedAt: new Date()
        }
    })

    revalidatePath('/owner/khatabook')
    revalidatePath(`/owner/khatabook/${handover.staffId}`)
}

export async function getStaffLedgerForOwner(staffId: string, limit = 50, dateRange?: { from: Date; to: Date }) {
    const owner = await getOwnerProfile()
    if (!owner) throw new Error('Unauthorized')

    // Verify staff belongs to owner's library
    const staff = await prisma.staff.findUnique({
        where: { 
            id: staffId,
            libraryId: owner.libraryId
        }
    })

    if (!staff) throw new Error('Staff not found')

    const dateFilter = dateRange ? {
        gte: dateRange.from,
        lte: dateRange.to
    } : undefined

    // 1. Fetch Collections (Cash In)
    const collections = await prisma.payment.findMany({
        where: {
            collectedBy: staffId,
            status: 'completed',
            method: { in: ['CASH', 'cash'] },
            ...(dateFilter && { date: dateFilter })
        },
        orderBy: { date: 'desc' },
        take: limit,
        include: {
            student: { select: { name: true } },
            subscription: { include: { plan: { select: { name: true } } } }
        }
    })

    // 2. Fetch Handovers (Cash Out)
    const handovers = await prisma.cashHandover.findMany({
        where: {
            staffId: staffId,
            ...(dateFilter && { createdAt: dateFilter })
        },
        orderBy: { createdAt: 'desc' },
        take: limit
    })

    // 3. Calculate Global Totals (All Time)
    const totalCollected = await prisma.payment.aggregate({
        where: {
            collectedBy: staffId,
            status: 'completed',
            method: { in: ['CASH', 'cash'] }
        },
        _sum: { amount: true }
    })

    const totalHandedOver = await prisma.cashHandover.aggregate({
        where: {
            staffId: staffId,
            status: 'verified'
        },
        _sum: { amount: true }
    })

    const collected = totalCollected._sum.amount || 0
    const handedOver = totalHandedOver._sum.amount || 0

    // 4. Calculate Period Totals (if range provided)
    let periodCollected = 0
    let periodHandedOver = 0
    
    if (dateRange) {
        const pCollected = await prisma.payment.aggregate({
            where: {
                collectedBy: staffId,
                status: 'completed',
                method: { in: ['CASH', 'cash'] },
                date: dateFilter
            },
            _sum: { amount: true }
        })
        const pHandedOver = await prisma.cashHandover.aggregate({
            where: {
                staffId: staffId,
                status: 'verified',
                createdAt: dateFilter
            },
            _sum: { amount: true }
        })
        periodCollected = pCollected._sum.amount || 0
        periodHandedOver = pHandedOver._sum.amount || 0
    }

    // 5. Combine
    const transactions = [
        ...collections.map(c => ({
            id: c.id,
            type: 'IN' as const,
            amount: c.amount,
            date: c.date,
            description: c.student?.name || 'Unknown Student',
            status: c.status,
            referenceId: c.id,
            details: {
                studentName: c.student?.name || 'Unknown',
                planName: c.subscription?.plan?.name
            }
        })),
        ...handovers.map(h => ({
            id: h.id,
            type: 'OUT' as const,
            amount: h.amount,
            date: h.createdAt,
            description: 'Handover to Owner',
            status: h.status,
            referenceId: h.id,
            notes: h.notes,
            details: {}
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
     .slice(0, limit)

    return {
        staff: {
            name: staff.name,
            image: staff.image,
            role: staff.role
        },
        summary: {
            totalCollected: collected,
            totalHandedOver: handedOver,
            balance: collected - handedOver,
            // Add period stats
            periodCollected: dateRange ? periodCollected : collected,
            periodHandedOver: dateRange ? periodHandedOver : handedOver
        },
        transactions
    }
}
