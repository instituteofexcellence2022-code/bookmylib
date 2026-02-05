'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay, addDays } from 'date-fns'
import { formatRelativeTime } from '@/lib/utils'
import { getAuthenticatedOwner } from '@/lib/auth/owner'

export async function getDashboardStats(branchId?: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) throw new Error('Unauthorized')

  const libraryId = owner.libraryId
  const whereBranch = branchId && branchId !== 'All Branches' ? { branchId } : {}

  try {
    // 1. KPI Stats
    
    // Revenue (This Month)
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)
    const startOfLastMonth = startOfMonth(subMonths(now, 1))
    const endOfLastMonth = endOfMonth(subMonths(now, 1))

    const thisMonthRevenue = await prisma.payment.aggregate({
      where: {
        libraryId,
        ...whereBranch,
        status: 'completed',
        date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
      },
      _sum: { amount: true }
    })

    const lastMonthRevenue = await prisma.payment.aggregate({
      where: {
        libraryId,
        ...whereBranch,
        status: 'completed',
        date: { gte: startOfLastMonth, lte: endOfLastMonth }
      },
      _sum: { amount: true }
    })

    const currentRevenue = thisMonthRevenue._sum.amount || 0
    const lastRevenue = lastMonthRevenue._sum.amount || 0
    let revenueTrend = 0
    if (lastRevenue > 0) {
      revenueTrend = ((currentRevenue - lastRevenue) / lastRevenue) * 100
    } else if (currentRevenue > 0) {
      revenueTrend = 100
    }

    // 2. Active Students
    const activeStudents = await prisma.studentSubscription.count({
      where: {
        libraryId,
        ...whereBranch,
        status: 'active',
        endDate: { gt: now }
      }
    })

    // Last month active students (approximation for trend)
    // It's hard to get exact historical active count without snapshot tables.
    // We'll use "new subscriptions this month" vs "new subscriptions last month" as a proxy for trend for now, 
    // or just return 0 trend if too complex.
    // Let's use new subscriptions for trend.
    const newSubsThisMonth = await prisma.studentSubscription.count({
        where: {
            libraryId,
            ...whereBranch,
            status: 'active',
            createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        }
    })
    const newSubsLastMonth = await prisma.studentSubscription.count({
        where: {
            libraryId,
            ...whereBranch,
            status: 'active',
            createdAt: { gte: startOfLastMonth, lte: endOfLastMonth }
        }
    })
    
    let studentTrend = 0
    if (newSubsLastMonth > 0) {
        studentTrend = ((newSubsThisMonth - newSubsLastMonth) / newSubsLastMonth) * 100
    }

    // 3. Occupancy
    // Total Seats
    const totalSeats = await prisma.seat.count({
        where: {
            libraryId,
            ...whereBranch
        }
    })

    // Occupied Seats (Active subscriptions with a seat assigned)
    const occupiedSeats = await prisma.studentSubscription.count({
        where: {
            libraryId,
            ...whereBranch,
            status: 'active',
            endDate: { gt: now },
            seatId: { not: null }
        }
    })

    const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0
    // Trend for occupancy is hard without history. Setting to 0.
    const occupancyTrend = 0 

    // 4. Open Issues
    const openIssues = await prisma.supportTicket.count({
        where: {
            libraryId,
            ...whereBranch,
            status: 'open'
        }
    })
    const pendingIssues = await prisma.supportTicket.count({
        where: {
            libraryId,
            ...whereBranch,
            status: 'pending'
        }
    })

    const reportedStudentIssues = await prisma.supportTicket.count({
        where: {
            libraryId,
            ...whereBranch,
            status: 'open',
            category: 'discipline'
        }
    })


    // 5. Recent Activity (Feed)
    // Combine Payments, Check-ins, and Tickets
    const recentPayments = await prisma.payment.findMany({
        where: { libraryId, ...whereBranch },
        take: 5,
        orderBy: { date: 'desc' },
        include: { student: { select: { name: true } }, branch: { select: { name: true } } }
    })

    const recentAttendance = await prisma.attendance.findMany({
        where: { libraryId, ...whereBranch },
        take: 5,
        orderBy: { checkIn: 'desc' },
        include: { student: { select: { name: true } }, branch: { select: { name: true } } }
    })

    const recentTickets = await prisma.supportTicket.findMany({
        where: { libraryId, ...whereBranch },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { student: { select: { name: true } }, branch: { select: { name: true } } }
    })

    // Merge and sort
    const activities = [
        ...recentPayments.map(p => ({
            id: `pay_${p.id}`,
            type: 'payment',
            user: p.student?.name || 'Unknown',
            action: `paid ₹${p.amount}`,
            time: p.date,
            branch: p.branch?.name
        })),
        ...recentAttendance.map(a => ({
            id: `att_${a.id}`,
            type: 'attendance',
            user: a.student?.name || 'Unknown',
            action: a.checkOut ? 'checked out' : 'checked in',
            time: a.checkOut || a.checkIn,
            branch: a.branch?.name
        })),
        ...recentTickets.map(t => ({
            id: `tkt_${t.id}`,
            type: 'ticket',
            user: t.student?.name || 'Unknown',
            action: `reported issue: ${t.subject}`,
            time: t.createdAt,
            branch: t.branch?.name
        }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 10) // Take top 10

    // 6. Revenue Chart Data
    // Reusing getRevenueAnalytics logic but with branch filter
    const monthsToFetch = 6
    const startDate = startOfMonth(subMonths(now, monthsToFetch - 1))
    
    const chartPayments = await prisma.payment.findMany({
        where: {
            libraryId,
            ...whereBranch,
            status: 'completed',
            date: { gte: startDate }
        },
        select: {
            amount: true,
            date: true
        }
    })

    const monthlyData: Record<string, number> = {}
    for (let i = 0; i < monthsToFetch; i++) {
        const d = subMonths(now, i)
        const key = format(d, 'MMM') // Short month name
        monthlyData[key] = 0
    }

    chartPayments.forEach(p => {
        const key = format(p.date, 'MMM')
        if (monthlyData[key] !== undefined) {
            monthlyData[key] += p.amount
        }
    })

    const revenueChartData = Object.entries(monthlyData)
        .map(([name, amount]) => ({ name, amount }))
        .reverse()


    // 7. Upcoming Expirations (Next 30 days)
    const upcomingExpirations = await prisma.studentSubscription.findMany({
        where: {
            libraryId,
            ...whereBranch,
            status: 'active',
            endDate: {
                gte: now,
                lte: addDays(now, 30)
            }
        },
        include: {
            student: { select: { name: true, image: true } },
            plan: { select: { name: true } }
        },
        orderBy: { endDate: 'asc' },
        take: 20
    })

    // Recently Expired (Last 30 days)
    const recentlyExpired = await prisma.studentSubscription.findMany({
        where: {
            libraryId,
            ...whereBranch,
            endDate: {
                gte: addDays(now, -30),
                lt: now
            },
            status: { not: 'cancelled' }
        },
        include: {
            student: { select: { name: true, image: true, phone: true } },
            plan: { select: { name: true } }
        },
        orderBy: { endDate: 'desc' },
        take: 20
    })

    // 8. Today's Attendance
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    
    const todayAttendanceCount = await prisma.attendance.count({
        where: {
            libraryId,
            ...whereBranch,
            // Checkin time is reliable for "present today"
            checkIn: { gte: todayStart, lte: todayEnd }
        }
    })

    // 9. Revenue Distribution by Method (This Month)
    const revenueByMethodData = await prisma.payment.groupBy({
        by: ['method'],
        where: {
            libraryId,
            ...whereBranch,
            status: 'completed',
            date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        },
        _sum: { amount: true }
    })

    const revenueByMethod = revenueByMethodData.map(item => ({
        name: item.method,
        value: item._sum.amount || 0
    }))

  // 10. Generate Alerts
    const alerts: Array<{ id: string; type: 'error' | 'warning' | 'info'; title: string; desc: string }> = []

    if (occupancyRate >= 90) {
        alerts.push({
            id: 'high-occupancy',
            type: 'warning',
            title: 'High Occupancy',
            desc: `Occupancy is at ${occupancyRate}%. Consider adding more seats or a new branch.`
        })
    }

    if (reportedStudentIssues > 0) {
        alerts.push({
            id: 'reported-students',
            type: 'error',
            title: 'Reported Students',
            desc: `There are ${reportedStudentIssues} active student reports requiring immediate attention.`
        })
    }

    if (pendingIssues > 5) {
        alerts.push({
            id: 'high-pending-issues',
            type: 'error',
            title: 'High Pending Issues',
            desc: `You have ${pendingIssues} pending support tickets requiring attention.`
        })
    }

    if (revenueTrend < -10) {
        alerts.push({
            id: 'revenue-drop',
            type: 'warning',
            title: 'Revenue Drop',
            desc: 'Revenue is down by more than 10% compared to last month.'
        })
    }
    
    // Add a default welcome/info alert if no critical alerts
    if (alerts.length === 0) {
        alerts.push({
            id: 'system-nominal',
            type: 'info',
            title: 'System Nominal',
            desc: 'All systems are running smoothly. No critical alerts.'
        })
    }

    return {
        kpi: {
            revenue: { value: currentRevenue, trend: revenueTrend },
            students: { value: activeStudents, trend: studentTrend },
            occupancy: { value: occupancyRate, trend: occupancyTrend },
            issues: { value: openIssues, pending: pendingIssues }
        },
        recentActivity: activities.map(a => ({
            ...a,
            time: formatTimeAgo(new Date(a.time))
        })),
        revenueChart: revenueChartData,
        upcomingExpirations: upcomingExpirations.map(sub => ({
            id: sub.id,
            studentName: sub.student.name,
            studentImage: sub.student.image,
            planName: sub.plan.name,
            endDate: sub.endDate
        })),
        recentlyExpired: recentlyExpired.map(sub => ({
            id: sub.id,
            studentName: sub.student.name,
            studentImage: sub.student.image,
            planName: sub.plan.name,
            endDate: sub.endDate,
            phone: sub.student.phone
        })),
        attendance: {
            today: todayAttendanceCount,
            totalActive: activeStudents,
            percentage: activeStudents > 0 ? Math.round((todayAttendanceCount / activeStudents) * 100) : 0
        },
        revenueByMethod,
        alerts
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    throw new Error('Failed to load dashboard data')
  }
}

function formatTimeAgo(date: Date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
}
