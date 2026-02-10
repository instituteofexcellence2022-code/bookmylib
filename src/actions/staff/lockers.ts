'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { Prisma } from '@prisma/client'

export async function getLockers() {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    const where: Prisma.LockerWhereInput = {
      branch: {
        id: staff.branchId
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
        { number: 'asc' }
      ]
    })

    return { success: true, data: lockers }
  } catch (error) {
    console.error('Error fetching lockers:', error)
    return { success: false, error: 'Failed to fetch lockers' }
  }
}



export async function updateLocker(id: string, data: {
  number?: string
  isActive?: boolean
  section?: string
  type?: string
}) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify ownership/branch
    const existingLocker = await prisma.locker.findUnique({ where: { id } })
    if (!existingLocker || existingLocker.branchId !== staff.branchId) {
      return { success: false, error: 'Locker not found or unauthorized' }
    }

    const locker = await prisma.locker.update({
      where: { id },
      data
    })

    revalidatePath('/staff/lockers')
    return { success: true, data: locker }
  } catch (error) {
    console.error('Error updating locker:', error)
    return { success: false, error: 'Failed to update locker' }
  }
}

export async function deleteLocker(id: string) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify ownership/branch
    const existingLocker = await prisma.locker.findUnique({ where: { id } })
    if (!existingLocker || existingLocker.branchId !== staff.branchId) {
      return { success: false, error: 'Locker not found or unauthorized' }
    }

    const locker = await prisma.locker.delete({
      where: { id }
    })

    await prisma.branch.update({
      where: { id: locker.branchId },
      data: { totalLockers: { decrement: 1 } }
    })

    revalidatePath('/staff/lockers')
    return { success: true }
  } catch (error) {
    console.error('Error deleting locker:', error)
    return { success: false, error: 'Failed to delete locker' }
  }
}

export async function getLockerHistory(lockerId: string) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
     // Verify ownership/branch
     const existingLocker = await prisma.locker.findUnique({ where: { id: lockerId } })
     if (!existingLocker || existingLocker.branchId !== staff.branchId) {
       return { success: false, error: 'Locker not found or unauthorized' }
     }

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

export async function getEligibleStudentsForLocker() {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    const subscriptions = await prisma.studentSubscription.findMany({
      where: {
        branchId: staff.branchId,
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
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify locker ownership/branch
    const existingLocker = await prisma.locker.findUnique({ where: { id: lockerId } })
    if (!existingLocker || existingLocker.branchId !== staff.branchId) {
      return { success: false, error: 'Locker not found or unauthorized' }
    }

    const existing = await prisma.studentSubscription.findFirst({
      where: {
        lockerId: lockerId,
        status: 'active',
        endDate: { gte: new Date() }
      }
    })

    if (existing) {
      return { success: false, error: 'Locker is already occupied' }
    }

    // Verify subscription ownership/branch
    const sub = await prisma.studentSubscription.findUnique({ where: { id: subscriptionId } })
    if (!sub || sub.branchId !== staff.branchId) {
        return { success: false, error: 'Subscription not found or unauthorized' }
    }

    await prisma.studentSubscription.update({
      where: { id: subscriptionId },
      data: { 
        lockerId,
        hasLocker: true 
      }
    })

    revalidatePath('/staff/lockers')
    return { success: true }
  } catch (error) {
    console.error('Error assigning locker:', error)
    return { success: false, error: 'Failed to assign locker' }
  }
}

export async function unassignLocker(subscriptionId: string) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
     // Verify subscription ownership/branch
     const sub = await prisma.studentSubscription.findUnique({ where: { id: subscriptionId } })
     if (!sub || sub.branchId !== staff.branchId) {
         return { success: false, error: 'Subscription not found or unauthorized' }
     }

    await prisma.studentSubscription.update({
      where: { id: subscriptionId },
      data: { 
        lockerId: null,
        hasLocker: false
      }
    })

    revalidatePath('/staff/lockers')
    return { success: true }
  } catch (error) {
    console.error('Error unassigning locker:', error)
    return { success: false, error: 'Failed to unassign locker' }
  }
}
