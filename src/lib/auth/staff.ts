import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from './constants'
import { verifySessionToken } from './jwt'

export async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_KEYS.STAFF)?.value

    if (!token) return null

    const payload = await verifySessionToken(token)
    if (!payload || !payload.userId) return null
    
    const staffId = payload.userId as string

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
