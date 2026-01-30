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

        // 2. Total Handed Over (VERIFIED only for Owner's view of "Cash in Staff Hand")
        // Wait, "Cash In Hand" physically with staff includes pending handovers technically until they are accepted.
        // But usually, if staff says "I handed it over", it's out of their hand.
        // Let's stick to: Cash In Hand = Total Collected - Total Handed Over (All Statuses? or just Verified?)
        // If staff says "I gave it to you", they deducted it. If Owner rejects, it comes back.
        // For Owner View: "Cash to be collected from Staff".
        // If status is Pending, it's "In Transit".
        // If status is Verified, it's "Received".
        // If status is Rejected, it's "Back with Staff".
        
        // Let's match Staff logic:
        // Cash In Hand = Total Collected - Total Handed Over (All non-rejected?)
        // Staff logic was: cashInHand = totalCollected - totalHandedOver (where totalHandedOver included ALL handovers? let's check `getStaffCashSummary`)
        
        /* 
           Staff Logic Check:
           const totalHandedOver = await prisma.cashHandover.aggregate({
               where: { staffId: staff.id, status: { not: 'rejected' } },
               _sum: { amount: true }
           })
        */
       
        // So here:
        const totalHandedOver = await prisma.cashHandover.aggregate({
            where: {
                staffId: staff.id,
                status: { not: 'rejected' }
            },
            _sum: { amount: true }
        })

        const collected = totalCollected._sum.amount || 0
        const handedOver = totalHandedOver._sum.amount || 0
        
        // Also get last handover date
        const lastHandover = await prisma.cashHandover.findFirst({
            where: { staffId: staff.id },
            orderBy: { createdAt: 'desc' }
        })

        // Count pending handovers
        const pendingHandoverCount = await prisma.cashHandover.count({
            where: {
                staffId: staff.id,
                status: 'pending'
            }
        })

        return {
            id: staff.id,
            name: staff.name,
            branchName: staff.branch.name,
            image: staff.image,
            totalCollected: collected,
            totalHandedOver: handedOver,
            balance: collected - handedOver,
            lastHandoverAt: lastHandover?.createdAt || null,
            pendingHandoverCount
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

export async function getStaffLedgerForOwner(staffId: string, limit = 50) {
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

    // 1. Fetch Collections (Cash In)
    const collections = await prisma.payment.findMany({
        where: {
            collectedBy: staffId,
            status: 'completed',
            method: { in: ['CASH', 'cash'] }
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
            staffId: staffId
        },
        orderBy: { createdAt: 'desc' },
        take: limit
    })

    // 3. Calculate Totals
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
            status: { not: 'rejected' }
        },
        _sum: { amount: true }
    })

    const collected = totalCollected._sum.amount || 0
    const handedOver = totalHandedOver._sum.amount || 0

    // 4. Combine
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
            details: {
                method: h.method
            }
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
            balance: collected - handedOver
        },
        transactions
    }
}
