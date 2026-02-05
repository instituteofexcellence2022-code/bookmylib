'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

import { getAuthenticatedStaff } from '@/lib/auth/staff'

// Helper to get authenticated staff
// Removed local helper in favor of imported one

export async function getStaffShifts() {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

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
        return shifts
    } catch (error) {
        console.error('Error fetching staff shifts:', error)
        return []
    }
}
