import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from './session'

export async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get(COOKIE_KEYS.STAFF)?.value

    if (!staffId) return null

    try {
        const staff = await prisma.staff.findUnique({
            where: { id: staffId },
            include: { 
                library: true,
                branch: true 
            }
        })

        if (!staff || staff.status !== 'active') return null
        return staff
    } catch (error) {
        console.error('Error fetching authenticated staff:', error)
        return null
    }
}
