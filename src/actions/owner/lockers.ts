'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { Prisma } from '@prisma/client'
import { isLockerAvailable } from '@/actions/lockers'
import { ownerPermit } from '@/lib/auth/policy'
import { z } from 'zod'

export async function getLockers(branchId?: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }
  if (!ownerPermit('lockers:view')) return { success: false, error: 'Unauthorized' }

  try {
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
            student: { select: { name: true, image: true, email: true } },
            startDate: true,
            endDate: true,
            plan: { select: { name: true } }
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
  section?: string
  type?: string
}) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const schema = z.object({
      branchId: z.string().min(1),
      number: z.string().min(1),
      section: z.string().optional(),
      type: z.string().optional()
    })
    const parsed = schema.safeParse(data)
    if (!parsed.success) return { success: false, error: 'Invalid input' }
    const { branchId, number, section, type } = parsed.data

    const subscription = await prisma.librarySubscription.findUnique({
      where: { libraryId: owner.libraryId },
      include: { plan: true }
    })
    if (!subscription || subscription.status !== 'active') {
      return { success: false, error: 'Platform subscription inactive' }
    }

    const existing = await prisma.locker.findUnique({
      where: {
        branchId_number: {
          branchId,
          number
        }
      }
    })

    if (existing) {
      return { success: false, error: 'Locker number already exists in this branch' }
    }

    const locker = await prisma.locker.create({
      data: {
        branchId,
        number,
        section,
        type,
        libraryId: owner.libraryId
      }
    })

    // Update branch locker count
    await prisma.branch.update({
      where: { id: branchId },
      data: { totalLockers: { increment: 1 } }
    })

    revalidatePath('/owner/lockers')
    return { success: true, data: locker }
  } catch (error) {
    console.error('Error creating locker:', error)
    return { success: false, error: 'Failed to create locker' }
  }
}

export async function createBulkLockers(data: {
  branchId: string
  prefix?: string
  start: number
  end: number
  section?: string
  type?: string
}) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const subscription = await prisma.librarySubscription.findUnique({
      where: { libraryId: owner.libraryId },
      include: { plan: true }
    })
    if (!subscription || subscription.status !== 'active') {
      return { success: false, error: 'Platform subscription inactive' }
    }

    const lockersToCreate = []
    const existingLockers = []

    for (let i = data.start; i <= data.end; i++) {
      const lockerNumber = `${data.prefix || ''}${i.toString().padStart(2, '0')}`
      
      const existing = await prisma.locker.findUnique({
        where: {
          branchId_number: {
            branchId: data.branchId,
            number: lockerNumber
          }
        }
      })

      if (existing) {
        existingLockers.push(lockerNumber)
        continue
      }

      lockersToCreate.push({
        branchId: data.branchId,
        number: lockerNumber,
        section: data.section,
        type: data.type,
        libraryId: owner.libraryId
      })
    }

    if (lockersToCreate.length === 0) {
      return { success: false, error: 'All lockers in this range already exist' }
    }

    await prisma.locker.createMany({
      data: lockersToCreate
    })

    await prisma.branch.update({
      where: { id: data.branchId },
      data: { totalLockers: { increment: lockersToCreate.length } }
    })

    revalidatePath('/owner/lockers')
    return { 
      success: true, 
      count: lockersToCreate.length,
      skipped: existingLockers
    }
  } catch (error) {
    console.error('Error creating bulk lockers:', error)
    return { success: false, error: 'Failed to create lockers' }
  }
}

export async function updateLocker(id: string, data: {
  number?: string
  isActive?: boolean
  section?: string
  type?: string
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

export async function getLockerHistory(lockerId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const history = await prisma.studentSubscription.findMany({
      where: {
        lockerId: lockerId,
      },
      include: {
        student: { select: { name: true, image: true, email: true } },
        plan: { select: { name: true } }
      },
      orderBy: { endDate: 'desc' },
      take: 10
    })

    return { success: true, data: history }
  } catch (error) {
    console.error('Error fetching locker history:', error)
    return { success: false, error: 'Failed to fetch history' }
  }
}

export async function getEligibleStudentsForLocker(branchId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const subscriptions = await prisma.studentSubscription.findMany({
      where: {
        branchId: branchId,
        status: 'active',
        endDate: { gte: new Date() },
        lockerId: null
      },
      include: {
        student: { select: { id: true, name: true, image: true } },
        plan: { select: { name: true } }
      },
      orderBy: { student: { name: 'asc' } }
    })

    return { success: true, data: subscriptions }
  } catch (error) {
    console.error('Error fetching eligible students:', error)
    return { success: false, error: 'Failed to fetch eligible students' }
  }
}

export async function assignLocker(lockerId: string, subscriptionId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const sub = await prisma.studentSubscription.findUnique({ where: { id: subscriptionId } })
    if (!sub) return { success: false, error: 'Subscription not found' }

    const availability = await isLockerAvailable(lockerId, new Date(sub.startDate), new Date(sub.endDate))
    if (!availability.available) {
      return { success: false, error: 'Locker is already occupied for the selected dates' }
    }

    await prisma.studentSubscription.update({
      where: { id: subscriptionId },
      data: { 
        lockerId,
        hasLocker: true 
      }
    })

    revalidatePath('/owner/lockers')
    return { success: true }
  } catch (error) {
    console.error('Error assigning locker:', error)
    return { success: false, error: 'Failed to assign locker' }
  }
}

export async function unassignLocker(subscriptionId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.studentSubscription.update({
      where: { id: subscriptionId },
      data: { 
        lockerId: null,
        hasLocker: false
      }
    })

    revalidatePath('/owner/lockers')
    return { success: true }
  } catch (error) {
    console.error('Error unassigning locker:', error)
    return { success: false, error: 'Failed to unassign locker' }
  }
}
