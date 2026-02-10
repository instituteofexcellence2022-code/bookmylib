'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

export async function getSubscriptions(params: {
    page?: number
    limit?: number
    search?: string
    status?: string
    planId?: string
} = {}) {
    await requireAdmin()
    
    const page = params.page || 1
    const limit = params.limit || 10
    const skip = (page - 1) * limit
    
    const where: any = {}
    
    if (params.status && params.status !== 'all') {
        where.status = params.status
    }

    if (params.planId && params.planId !== 'all') {
        where.planId = params.planId
    }
    
    if (params.search) {
        where.library = {
            OR: [
                { name: { contains: params.search, mode: 'insensitive' } },
                { subdomain: { contains: params.search, mode: 'insensitive' } }
            ]
        }
    }

    const [subscriptions, total] = await Promise.all([
        prisma.librarySubscription.findMany({
            where,
            include: {
                library: {
                    select: { id: true, name: true, subdomain: true }
                },
                plan: {
                    select: { id: true, name: true, priceMonthly: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.librarySubscription.count({ where })
    ])
    
    return {
        subscriptions,
        total,
        pages: Math.ceil(total / limit)
    }
}

export async function exportSubscriptions(status?: string) {
    await requireAdmin()
    
    const where: any = {}
    if (status && status !== 'all') {
        where.status = status
    }

    const subscriptions = await prisma.librarySubscription.findMany({
        where,
        include: {
            library: {
                select: { name: true, subdomain: true, contactEmail: true, contactPhone: true }
            },
            plan: {
                select: { name: true, priceMonthly: true, priceYearly: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return subscriptions.map(sub => ({
        Library: sub.library.name,
        Subdomain: sub.library.subdomain,
        Email: sub.library.contactEmail || '-',
        Phone: sub.library.contactPhone || '-',
        'SaaS Plan': sub.plan.name,
        Status: sub.status,
        'Price (Monthly)': sub.plan.priceMonthly,
        'Current Period Start': sub.currentPeriodStart.toISOString().split('T')[0],
        'Current Period End': sub.currentPeriodEnd.toISOString().split('T')[0],
        'Created At': sub.createdAt.toISOString().split('T')[0]
    }))
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
