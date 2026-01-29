'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get('staff_session')?.value

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
