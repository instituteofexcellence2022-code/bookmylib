'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/lib/auth/session'

export async function getOwnerBranches() {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) return { success: false, error: 'Unauthorized' }

    try {
        const owner = await prisma.owner.findUnique({
            where: { id: ownerId },
            include: { library: true }
        })

        if (!owner) return { success: false, error: 'Owner not found' }

        const branches = await prisma.branch.findMany({
            where: { libraryId: owner.libraryId },
            select: {
                id: true,
                name: true
            },
            orderBy: { name: 'asc' }
        })

        return { success: true, data: branches }
    } catch (error) {
        console.error('Error fetching branches:', error)
        return { success: false, error: 'Failed to fetch branches' }
    }
}
