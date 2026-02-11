'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'

export async function getAdminDashboardStats() {
    await requireAdmin()

    const [
        totalLibraries,
        activeLibraries,
        totalStudents,
        activeSubscriptions,
        totalRevenue
    ] = await Promise.all([
        prisma.library.count(),
        prisma.library.count({ where: { isActive: true } }),
        prisma.student.count(),
        prisma.librarySubscription.count({ where: { status: 'active' } }),
        // Calculate MRR roughly (sum of active subscriptions * monthly price)
        prisma.librarySubscription.findMany({
            where: { status: 'active' },
            include: { plan: true }
        }).then(subs => subs.reduce((acc, sub) => {
            const duration = sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()
            const isYearly = duration > 40 * 24 * 60 * 60 * 1000 // > 40 days
            
            if (isYearly) {
                return acc + (sub.plan.priceYearly / 12)
            } else {
                return acc + sub.plan.priceMonthly
            }
        }, 0))
    ])

    return {
        totalLibraries,
        activeLibraries,
        totalStudents,
        activeSubscriptions,
        mrr: totalRevenue
    }
}
