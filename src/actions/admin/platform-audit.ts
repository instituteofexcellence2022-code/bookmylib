'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'

export async function getAuditLogs() {
    await requireAdmin()
    return prisma.platformAuditLog.findMany({
        include: {
            performedBy: {
                select: { name: true, email: true, role: true }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit for now
    })
}
