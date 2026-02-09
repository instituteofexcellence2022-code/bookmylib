'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { Prisma } from '@prisma/client'

export async function getLockers(branchId?: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    // Lockers don't have libraryId directly, they are linked via Branch
    // So we need to filter by branches that belong to the owner's library
    const where: Prisma.LockerWhereInput = {
      branch: {
        libraryId: owner.libraryId,
        ...(branchId && { id: branchId })
      }
    }

    const lockers = await prisma.locker.findMany({
      where,
      include: {
        branch: {
          select: { name: true }
        },
        subscriptions: {
          where: {
            status: 'active',
            endDate: { gte: new Date() }
          },
          select: {
            id: true,
            student: { select: { name: true, image: true } },
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: [
        { branch: { name: 'asc' } },
        { number: 'asc' }
      ]
    })

    return { success: true, data: lockers }
  } catch (error) {
    console.error('Error fetching lockers:', error)
    return { success: false, error: 'Failed to fetch lockers' }
  }
}

export async function createLocker(data: {
  branchId: string
  number: string
}) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const existing = await prisma.locker.findUnique({
      where: {
        branchId_number: {
          branchId: data.branchId,
          number: data.number
        }
      }
    })

    if (existing) {
      return { success: false, error: 'Locker number already exists in this branch' }
    }

    const locker = await prisma.locker.create({
      data: {
        branchId: data.branchId,
        number: data.number
      }
    })

    // Update branch locker count
    await prisma.branch.update({
      where: { id: data.branchId },
      data: { totalLockers: { increment: 1 } }
    })

    revalidatePath('/owner/lockers')
    return { success: true, data: locker }
  } catch (error) {
    console.error('Error creating locker:', error)
    return { success: false, error: 'Failed to create locker' }
  }
}

export async function updateLocker(id: string, data: {
  number?: string
  isActive?: boolean
}) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const locker = await prisma.locker.update({
      where: { id },
      data
    })

    revalidatePath('/owner/lockers')
    return { success: true, data: locker }
  } catch (error) {
    console.error('Error updating locker:', error)
    return { success: false, error: 'Failed to update locker' }
  }
}

export async function deleteLocker(id: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const locker = await prisma.locker.delete({
      where: { id }
    })

    // Update branch locker count
    await prisma.branch.update({
      where: { id: locker.branchId },
      data: { totalLockers: { decrement: 1 } }
    })

    revalidatePath('/owner/lockers')
    return { success: true }
  } catch (error) {
    console.error('Error deleting locker:', error)
    return { success: false, error: 'Failed to delete locker' }
  }
}
