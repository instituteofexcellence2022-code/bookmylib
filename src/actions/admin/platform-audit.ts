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

export async function getLibraryNotes(libraryId: string) {
    await requireAdmin()
    return prisma.platformAuditLog.findMany({
        where: { targetId: libraryId, action: 'ADMIN_NOTE' },
        include: {
            performedBy: {
                select: { name: true, email: true, role: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function addLibraryNote(libraryId: string, message: string) {
    const admin = await requireAdmin()
    if (!message || !message.trim()) {
        return { success: false, error: 'Note cannot be empty' }
    }
    try {
        await prisma.platformAuditLog.create({
            data: {
                platformUserId: admin.id,
                action: 'ADMIN_NOTE',
                targetId: libraryId,
                details: message
            }
        })
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
