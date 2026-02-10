'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function getSubscriptions() {
    await requireAdmin()
    return prisma.librarySubscription.findMany({
        include: {
            library: {
                select: { name: true, subdomain: true }
            },
            plan: {
                select: { name: true, priceMonthly: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function updateSubscriptionPlan(subscriptionId: string, planId: string) {
    await requireAdmin()
    
    try {
        const plan = await prisma.saasPlan.findUnique({ where: { id: planId } })
        if (!plan) return { success: false, error: 'Plan not found' }

        await prisma.librarySubscription.update({
            where: { id: subscriptionId },
            data: { planId }
        })
        
        revalidatePath('/admin/libraries')
        return { success: true }
    } catch (error) {
        console.error('Update plan error:', error)
        return { success: false, error: 'Failed to update plan' }
    }
}

export async function updateSubscriptionStatus(subscriptionId: string, status: string) {
    await requireAdmin()
    
    try {
        await prisma.librarySubscription.update({
            where: { id: subscriptionId },
            data: { status }
        })
        
        revalidatePath('/admin/libraries')
        return { success: true }
    } catch (error) {
        console.error('Update status error:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

export async function updateSubscriptionPeriod(subscriptionId: string, endDate: Date) {
    await requireAdmin()
    
    try {
        await prisma.librarySubscription.update({
            where: { id: subscriptionId },
            data: { currentPeriodEnd: endDate }
        })
        
        revalidatePath('/admin/libraries')
        return { success: true }
    } catch (error) {
        console.error('Update period error:', error)
        return { success: false, error: 'Failed to update subscription period' }
    }
}
