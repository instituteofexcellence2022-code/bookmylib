'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

export async function getBranchDetails(branchId: string) {
    await requireAdmin()

    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: {
            _count: {
                select: {
                    students: true,
                    staff: true,
                    seats: true,
                    lockers: true
                }
            }
        }
    })

    if (!branch) throw new Error('Branch not found')

    return branch
}

export async function toggleBranchStatus(branchId: string, isActive: boolean) {
    await requireAdmin()

    await prisma.branch.update({
        where: { id: branchId },
        data: { isActive }
    })

    revalidatePath('/admin/libraries')
    return { success: true }
}
