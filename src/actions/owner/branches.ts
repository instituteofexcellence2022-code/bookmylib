'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedOwner } from '@/lib/auth/owner'

export async function getOwnerBranches() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
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
