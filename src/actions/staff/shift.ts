'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

import { COOKIE_KEYS } from '@/lib/auth/session'

async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get(COOKIE_KEYS.STAFF)?.value

    if (!staffId) return null

    const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: { 
            library: true,
            branch: true 
        }
    })

    return staff
}

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
