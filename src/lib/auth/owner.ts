import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from './constants'
import { verifySessionToken } from './jwt'

export async function getAuthenticatedOwner() {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!token) return null

    const payload = await verifySessionToken(token)
    if (!payload || !payload.userId) return null
    
    const ownerId = payload.userId as string
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(ownerId)
    if (!isUuid) {
        return null
    }

    try {
        const owner = await prisma.owner.findUnique({
            where: { id: ownerId },
            include: { 
                library: true 
            }
        })
        return owner
    } catch (error) {
        console.error('Error fetching authenticated owner:', error)
        return null
    }
}
