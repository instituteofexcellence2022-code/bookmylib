'use server'

import { prisma } from '@/lib/prisma'
import { getOwnerProfile } from '@/actions/owner'

export async function getPlatformSubscription() {
    const owner = await getOwnerProfile()
    if (!owner) return null

    return prisma.librarySubscription.findUnique({
        where: { libraryId: owner.libraryId },
        include: {
            plan: true
        }
    })
}

export async function getPlatformPayments() {
    const owner = await getOwnerProfile()
    if (!owner) return []

    return prisma.saasPayment.findMany({
        where: { libraryId: owner.libraryId },
        include: {
            plan: { select: { name: true } }
        },
        orderBy: { paymentDate: 'desc' }
    })
}

export async function getAvailableSaasPlans() {
    // Publicly available plans
    return prisma.saasPlan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' }
    })
}

export async function requestPlatformSubscriptionChange(planId: string) {
    const owner = await getOwnerProfile()
    if (!owner) return { success: false, error: 'Unauthorized' }

    const plan = await prisma.saasPlan.findUnique({ where: { id: planId } })
    if (!plan) return { success: false, error: 'SaaS Plan not found' }

    // Check if there is already an open ticket for this
    const existingTicket = await prisma.platformSupportTicket.findFirst({
        where: {
            libraryId: owner.libraryId,
            status: 'open',
            subject: `Platform Subscription Change Request: ${plan.name}`
        }
    })

    if (existingTicket) {
        return { success: false, error: 'You already have an open request for this subscription.' }
    }

    await prisma.platformSupportTicket.create({
        data: {
            libraryId: owner.libraryId,
            ownerId: owner.id,
            subject: `Platform Subscription Change Request: ${plan.name}`,
            message: `I would like to change my platform subscription to the ${plan.name} plan.`,
            status: 'open',
            priority: 'normal'
        }
    })

    return { success: true }
}
