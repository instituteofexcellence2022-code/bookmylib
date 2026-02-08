'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedStaff } from '@/lib/auth/staff'

// Helper to get authenticated staff
// Removed local helper in favor of imported one

export async function getStaffShifts() {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        const shifts = await prisma.staffShift.findMany({
            where: {
                staffId: staff.id,
                isActive: true
            },
            orderBy: {
                dayOfWeek: 'asc'
            }
        })
        return { success: true, data: shifts }
    } catch (error) {
        console.error('Error fetching staff shifts:', error)
        return { success: false, error: 'Failed to fetch shifts' }
    }
}
