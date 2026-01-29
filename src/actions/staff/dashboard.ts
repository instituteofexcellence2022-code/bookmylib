'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { getStaffSelfAttendanceToday } from './attendance'

export async function getStaffDashboardStats() {
  const staff = await getAuthenticatedStaff()
  if (!staff) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const threeDaysFromNow = new Date(today)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  try {
    // 1. Occupancy Stats
    const totalSeats = await prisma.seat.count({
      where: {
        branchId: staff.branchId
      }
    })

    const occupiedSeats = await prisma.seat.count({
      where: {
        branchId: staff.branchId,
        status: 'occupied'
      }
    })

    const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0

    // 2. Payments Collected Today (by this branch)
    const payments = await prisma.payment.aggregate({
      where: {
        branchId: staff.branchId,
        status: 'completed',
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      _sum: {
        amount: true
      }
    })

    const collectedToday = payments._sum.amount || 0

    // 3. Due Renewals (Next 3 days)
    const dueRenewals = await prisma.studentSubscription.count({
      where: {
        branchId: staff.branchId,
        status: 'active',
        endDate: {
          gte: today,
          lte: threeDaysFromNow
        }
      }
    })

    // 4. Staff Shift Status
    const attendance = await getStaffSelfAttendanceToday()
    
    // 5. Recent Activity (Last 5 payments/registrations mixed - simplified to just payments for now)
    const recentPayments = await prisma.payment.findMany({
      where: {
        branchId: staff.branchId,
        status: 'completed'
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        student: {
          select: {
            name: true
          }
        }
      }
    })

    return {
      stats: {
        occupancyRate,
        occupiedSeats,
        totalSeats,
        collectedToday,
        dueRenewals
      },
      attendance,
      recentActivity: recentPayments
    }
  } catch (error) {
    console.error('Error fetching staff dashboard stats:', error)
    return null
  }
}
