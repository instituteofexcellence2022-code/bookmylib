'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedOwner } from '@/lib/auth/owner'

export async function exportDatabaseData() {
    const owner = await getAuthenticatedOwner()
    if (!owner) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        // Fetch critical data scoped to the owner's library
        const [
            students,
            staff,
            branches,
            plans,
            subscriptions,
            payments,
            attendance
        ] = await Promise.all([
            prisma.student.findMany({
                where: { libraryId: owner.libraryId }
            }),
            prisma.staff.findMany({
                where: { libraryId: owner.libraryId }
            }),
            prisma.branch.findMany({
                where: { libraryId: owner.libraryId }
            }),
            prisma.plan.findMany({
                where: { libraryId: owner.libraryId }
            }),
            prisma.studentSubscription.findMany({
                where: { libraryId: owner.libraryId }
            }),
            prisma.payment.findMany({
                where: { libraryId: owner.libraryId }
            }),
            prisma.attendance.findMany({
                where: { 
                    student: { libraryId: owner.libraryId }
                },
                take: 10000, // Limit to recent 10k records to avoid massive payloads
                orderBy: { date: 'desc' }
            })
        ])

        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                libraryId: owner.libraryId,
                version: '1.0'
            },
            data: {
                branches,
                plans,
                staff,
                students,
                subscriptions,
                payments,
                attendance
            }
        }

        return { success: true, data: backupData }
    } catch (error) {
        console.error('Export failed:', error)
        return { success: false, error: 'Failed to export data' }
    }
}
