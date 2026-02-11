'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { Prisma } from '@prisma/client'
import { isSeatAvailable } from '@/actions/seats'

export async function getSeats(branchId?: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const where: Prisma.SeatWhereInput = {
      libraryId: owner.libraryId,
      ...(branchId && { branchId }),
    }

    const seats = await prisma.seat.findMany({
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

    return { success: true, data: seats }
  } catch (error) {
    console.error('Error fetching seats:', error)
    return { success: false, error: 'Failed to fetch seats' }
  }
}

export async function createSeat(data: {
  branchId: string
  number: string
  section?: string
  type: string
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
    const currentSeatCount = await prisma.seat.count({
      where: { libraryId: owner.libraryId }
    })
    if (currentSeatCount + 1 > (subscription.plan.maxSeats || 0)) {
      return { success: false, error: 'Seat limit reached' }
    }

    // Check if seat already exists in this branch
    const existing = await prisma.seat.findUnique({
      where: {
        branchId_number: {
          branchId: data.branchId,
          number: data.number
        }
      }
    })

    if (existing) {
      return { success: false, error: 'Seat number already exists in this branch' }
    }

    const seat = await prisma.seat.create({
      data: {
        libraryId: owner.libraryId,
        branchId: data.branchId,
        number: data.number,
        section: data.section,
        type: data.type
      }
    })

    // Update branch seat count
    await prisma.branch.update({
      where: { id: data.branchId },
      data: { seatCount: { increment: 1 } }
    })

    revalidatePath('/owner/seats')
    return { success: true, data: seat }
  } catch (error) {
    console.error('Error creating seat:', error)
    return { success: false, error: 'Failed to create seat' }
  }
}

export async function createBulkSeats(data: {
  branchId: string
  prefix?: string
  start: number
  end: number
  section?: string
  type: string
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
    const currentSeatCount = await prisma.seat.count({
      where: { libraryId: owner.libraryId }
    })

    const seatsToCreate = []
    const existingSeats = []

    for (let i = data.start; i <= data.end; i++) {
      const seatNumber = `${data.prefix || ''}${i.toString().padStart(2, '0')}`
      
      // Check existence
      const existing = await prisma.seat.findUnique({
        where: {
          branchId_number: {
            branchId: data.branchId,
            number: seatNumber
          }
        }
      })

      if (existing) {
        existingSeats.push(seatNumber)
        continue
      }

      seatsToCreate.push({
        libraryId: owner.libraryId,
        branchId: data.branchId,
        number: seatNumber,
        section: data.section,
        type: data.type
      })
    }

    if (seatsToCreate.length === 0) {
      return { success: false, error: 'All seats in this range already exist' }
    }

    if (currentSeatCount + seatsToCreate.length > (subscription.plan.maxSeats || 0)) {
      return { success: false, error: 'Seat limit reached' }
    }

    await prisma.seat.createMany({
      data: seatsToCreate
    })

    // Update branch seat count
    await prisma.branch.update({
      where: { id: data.branchId },
      data: { seatCount: { increment: seatsToCreate.length } }
    })

    revalidatePath('/owner/seats')
    return { 
      success: true, 
      count: seatsToCreate.length,
      skipped: existingSeats
    }
  } catch (error) {
    console.error('Error creating bulk seats:', error)
    return { success: false, error: 'Failed to create seats' }
  }
}

export async function updateSeat(id: string, data: {
  number?: string
  section?: string
  type?: string
  isActive?: boolean
}) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const seat = await prisma.seat.update({
      where: { id },
      data
    })

    revalidatePath('/owner/seats')
    return { success: true, data: seat }
  } catch (error) {
    console.error('Error updating seat:', error)
    return { success: false, error: 'Failed to update seat' }
  }
}

export async function deleteSeat(id: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const seat = await prisma.seat.delete({
      where: { id }
    })

    // Update branch seat count
    await prisma.branch.update({
      where: { id: seat.branchId },
      data: { seatCount: { decrement: 1 } }
    })

    revalidatePath('/owner/seats')
    return { success: true }
  } catch (error) {
    console.error('Error deleting seat:', error)
    return { success: false, error: 'Failed to delete seat' }
  }
}

export async function getSeatHistory(seatId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const history = await prisma.studentSubscription.findMany({
      where: {
        seatId: seatId,
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
    console.error('Error fetching seat history:', error)
    return { success: false, error: 'Failed to fetch history' }
  }
}

export async function getEligibleStudents(branchId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const subscriptions = await prisma.studentSubscription.findMany({
      where: {
        branchId: branchId,
        status: 'active',
        endDate: { gte: new Date() },
        seatId: null
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

export async function assignSeat(seatId: string, subscriptionId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const sub = await prisma.studentSubscription.findUnique({ where: { id: subscriptionId } })
    if (!sub) return { success: false, error: 'Subscription not found' }

    const availability = await isSeatAvailable(seatId, new Date(sub.startDate), new Date(sub.endDate))
    if (!availability.available) {
      return { success: false, error: 'Seat is already occupied for the selected dates' }
    }

    await prisma.studentSubscription.update({
      where: { id: subscriptionId },
      data: { seatId }
    })

    revalidatePath('/owner/seats')
    return { success: true }
  } catch (error) {
    console.error('Error assigning seat:', error)
    return { success: false, error: 'Failed to assign seat' }
  }
}

export async function unassignSeat(subscriptionId: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    await prisma.studentSubscription.update({
      where: { id: subscriptionId },
      data: { seatId: null }
    })

    revalidatePath('/owner/seats')
    return { success: true }
  } catch (error) {
    console.error('Error unassigning seat:', error)
    return { success: false, error: 'Failed to unassign seat' }
  }
}
