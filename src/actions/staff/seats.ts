'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { Prisma } from '@prisma/client'
import { isSeatAvailable } from '@/actions/seats'

export async function getSeats() {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    const where: Prisma.SeatWhereInput = {
      branchId: staff.branchId,
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
        { number: 'asc' }
      ]
    })

    return { success: true, data: seats }
  } catch (error) {
    console.error('Error fetching seats:', error)
    return { success: false, error: 'Failed to fetch seats' }
  }
}


export async function updateSeat(id: string, data: {
  number?: string
  section?: string
  type?: string
  isActive?: boolean
}) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify ownership/branch
    const existingSeat = await prisma.seat.findUnique({ where: { id } })
    if (!existingSeat || existingSeat.branchId !== staff.branchId) {
      return { success: false, error: 'Seat not found or unauthorized' }
    }

    const seat = await prisma.seat.update({
      where: { id },
      data
    })

    revalidatePath('/staff/seats')
    return { success: true, data: seat }
  } catch (error) {
    console.error('Error updating seat:', error)
    return { success: false, error: 'Failed to update seat' }
  }
}

export async function deleteSeat(id: string) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify ownership/branch
    const existingSeat = await prisma.seat.findUnique({ where: { id } })
    if (!existingSeat || existingSeat.branchId !== staff.branchId) {
      return { success: false, error: 'Seat not found or unauthorized' }
    }

    const seat = await prisma.seat.delete({
      where: { id }
    })

    // Update branch seat count
    await prisma.branch.update({
      where: { id: seat.branchId },
      data: { seatCount: { decrement: 1 } }
    })

    revalidatePath('/staff/seats')
    return { success: true }
  } catch (error) {
    console.error('Error deleting seat:', error)
    return { success: false, error: 'Failed to delete seat' }
  }
}

export async function getSeatHistory(seatId: string) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
     // Verify ownership/branch
     const existingSeat = await prisma.seat.findUnique({ where: { id: seatId } })
     if (!existingSeat || existingSeat.branchId !== staff.branchId) {
       return { success: false, error: 'Seat not found or unauthorized' }
     }

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

export async function getEligibleStudents() {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    const subscriptions = await prisma.studentSubscription.findMany({
      where: {
        branchId: staff.branchId,
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
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify seat ownership/branch
    const existingSeat = await prisma.seat.findUnique({ where: { id: seatId } })
    if (!existingSeat || existingSeat.branchId !== staff.branchId) {
        return { success: false, error: 'Seat not found or unauthorized' }
    }

    // Verify subscription ownership/branch (optional but good)
    const sub = await prisma.studentSubscription.findUnique({ where: { id: subscriptionId } })
    if (!sub || sub.branchId !== staff.branchId) {
        return { success: false, error: 'Subscription not found or unauthorized' }
    }

    const availability = await isSeatAvailable(seatId, new Date(sub.startDate), new Date(sub.endDate))
    if (!availability.available) {
      return { success: false, error: 'Seat is already occupied for the selected dates' }
    }

    await prisma.studentSubscription.update({
      where: { id: subscriptionId },
      data: { seatId }
    })

    revalidatePath('/staff/seats')
    return { success: true }
  } catch (error) {
    console.error('Error assigning seat:', error)
    return { success: false, error: 'Failed to assign seat' }
  }
}

export async function unassignSeat(subscriptionId: string) {
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
      data: { seatId: null }
    })

    revalidatePath('/staff/seats')
    return { success: true }
  } catch (error) {
    console.error('Error unassigning seat:', error)
    return { success: false, error: 'Failed to unassign seat' }
  }
}
