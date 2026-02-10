'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { Prisma } from '@prisma/client'

export async function getBookings(filters?: {
  branchId?: string
  status?: string
  search?: string
}) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const where: Prisma.StudentSubscriptionWhereInput = {
      libraryId: owner.libraryId,
      ...(filters?.branchId && { branchId: filters.branchId }),
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
          select: { name: true, image: true, email: true, phone: true }
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
          select: { id: true, status: true, amount: true, method: true, createdAt: true, invoiceNo: true }
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
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    // 1. Parallelize checks for seat and locker occupancy
    const [existingSeat, existingLocker] = await Promise.all([
      data.seatId ? prisma.studentSubscription.findFirst({
        where: {
          seatId: data.seatId,
          status: 'active',
          id: { not: id }
        }
      }) : null,
      data.lockerId ? prisma.studentSubscription.findFirst({
        where: {
          lockerId: data.lockerId,
          status: 'active',
          id: { not: id }
        }
      }) : null
    ])

    if (existingSeat) {
      return { success: false, error: 'Seat is already occupied' }
    }
    if (existingLocker) {
      return { success: false, error: 'Locker is already occupied' }
    }

    // 3. Update
    const booking = await prisma.studentSubscription.update({
      where: { id },
      data: {
        ...(data.seatId !== undefined && { seatId: data.seatId }),
        ...(data.lockerId !== undefined && { lockerId: data.lockerId }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) })
      }
    })

    revalidatePath('/owner/bookings')
    return { success: true, data: booking }
  } catch (error) {
    console.error('Error updating booking details:', error)
    return { success: false, error: 'Failed to update booking details' }
  }
}

export async function updateBookingStatus(id: string, status: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const booking = await prisma.studentSubscription.update({
      where: { id },
      data: { status }
    })

    revalidatePath('/owner/bookings')
    return { success: true, data: booking }
  } catch (error) {
    console.error('Error updating booking:', error)
    return { success: false, error: 'Failed to update booking' }
  }
}

