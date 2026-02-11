'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { Prisma } from '@prisma/client'

export async function getBookings(filters?: {
  status?: string
  search?: string
}) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    const where: Prisma.StudentSubscriptionWhereInput = {
      libraryId: staff.libraryId,
      branchId: staff.branchId, // Enforce staff branch
      ...(filters?.status && filters.status !== 'all' && { status: filters.status }),
      ...(filters?.search && {
        OR: [
          { student: { name: { contains: filters.search, mode: 'insensitive' } } },
          { student: { email: { contains: filters.search, mode: 'insensitive' } } },
          { student: { phone: { contains: filters.search, mode: 'insensitive' } } }
        ]
      })
    }

    const bookings = await prisma.studentSubscription.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, image: true, email: true, phone: true }
        },
        plan: {
          select: { name: true, price: true, duration: true, durationUnit: true }
        },
        branch: {
          select: { name: true }
        },
        seat: {
          select: { number: true, section: true }
        },
        locker: {
          select: { number: true }
        },
        payments: {
          select: { id: true, status: true, amount: true, discountAmount: true, method: true, createdAt: true, invoiceNo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return { success: false, error: 'Failed to fetch bookings' }
  }
}

export async function updateBookingDetails(
  id: string,
  data: {
    seatId?: string | null
    lockerId?: string | null
    startDate?: string
    endDate?: string
  }
) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify booking belongs to staff's branch
    const booking = await prisma.studentSubscription.findFirst({
        where: { id, branchId: staff.branchId }
    })

    if (!booking) return { success: false, error: 'Booking not found or access denied' }

    // 1. Check if seat is occupied by another active subscription
    if (data.seatId) {
      const existingSeat = await prisma.studentSubscription.findFirst({
        where: {
          seatId: data.seatId,
          status: 'active',
          id: { not: id } // Exclude current booking
        }
      })
      if (existingSeat) {
        return { success: false, error: 'Seat is already occupied' }
      }
    }

    // 2. Check if locker is occupied
    if (data.lockerId) {
      const existingLocker = await prisma.studentSubscription.findFirst({
        where: {
          lockerId: data.lockerId,
          status: 'active',
          id: { not: id }
        }
      })
      if (existingLocker) {
        return { success: false, error: 'Locker is already occupied' }
      }
    }

    // 3. Update
    const updatedBooking = await prisma.studentSubscription.update({
      where: { id },
      data: {
        ...(data.seatId !== undefined && { seatId: data.seatId }),
        ...(data.lockerId !== undefined && { lockerId: data.lockerId }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) })
      }
    })

    revalidatePath('/staff/bookings')
    return { success: true, data: updatedBooking }
  } catch (error) {
    console.error('Error updating booking details:', error)
    return { success: false, error: 'Failed to update booking details' }
  }
}

export async function updateBookingStatus(id: string, status: string) {
  const staff = await getAuthenticatedStaff()
  if (!staff) return { success: false, error: 'Unauthorized' }

  try {
    // Verify booking belongs to staff's branch
    const booking = await prisma.studentSubscription.findFirst({
        where: { id, branchId: staff.branchId }
    })

    if (!booking) return { success: false, error: 'Booking not found or access denied' }

    const updatedBooking = await prisma.studentSubscription.update({
      where: { id },
      data: { status }
    })

    revalidatePath('/staff/bookings')
    return { success: true, data: updatedBooking }
  } catch (error) {
    console.error('Error updating booking:', error)
    return { success: false, error: 'Failed to update booking' }
  }
}
