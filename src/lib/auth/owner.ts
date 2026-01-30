import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from './session'

export async function getAuthenticatedOwner() {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) return null

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
