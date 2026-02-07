'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { formatRelativeTime } from '@/lib/utils'
import { getAuthenticatedOwner } from '@/lib/auth/owner'

export async function getExpiringSubscriptions(
    filter: string,
    page: number = 1,
    limit: number = 30,
    branchId?: string
) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }
    const libraryId = owner.libraryId
    const whereBranch = branchId && branchId !== 'All Branches' ? { branchId } : {}
    
    const now = new Date()
    let startDate = now
    let endDate = addDays(now, 7) // Default

    switch (filter) {
        case 'today':
            startDate = now
            endDate = endOfDay(now)
            break
        case 'tomorrow':
            startDate = startOfDay(addDays(now, 1))
            endDate = endOfDay(addDays(now, 1))
            break
        default:
            // For "Next X days"
            const days = parseInt(filter) || 7
            // Start date is now, but we want to include overdue active subscriptions too
            // So we effectively look for anything active with endDate <= target date
            // However, for "Expiring Soon", we usually want from NOW onwards.
            // But if users want to see "Overdue", we should include past dates.
            // Let's set startDate to a past date to include overdue items.
            startDate = subMonths(now, 12) // Include up to 1 year overdue
            endDate = endOfDay(addDays(now, days))
    }

    try {
        console.log(`[getExpiring] Filter: ${filter}, Branch: ${branchId}, Lib: ${libraryId}`)
        console.log(`[getExpiring] Range: ${startDate.toISOString()} - ${endDate.toISOString()}`)
        
        const subscriptions = await prisma.studentSubscription.findMany({
            where: {
                libraryId,
                ...whereBranch,
                status: 'active',
                endDate: { gte: startDate, lte: endDate }
            },
            orderBy: { endDate: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
            include: { 
                student: { select: { name: true, image: true, phone: true, email: true } }, 
                plan: { select: { name: true } } 
            }
        })

        console.log(`[getExpiring] Found: ${subscriptions.length}`)

        const studentIds = subscriptions.map(s => s.studentId)
        const presentStudentIds = await getAttendanceStatus(studentIds, libraryId)

        const total = await prisma.studentSubscription.count({
             where: {
                libraryId,
                ...whereBranch,
                status: 'active',
                endDate: { gte: startDate, lte: endDate }
            }
        })

        return {
            success: true,
            data: subscriptions.map(s => ({
                id: s.id,
                studentId: s.studentId,
                studentName: s.student.name,
                studentImage: s.student.image,
                planName: s.plan.name,
                startDate: s.startDate,
                endDate: s.endDate,
                phone: s.student.phone,
                email: s.student.email,
                amount: s.amount,
                isPresentToday: presentStudentIds.has(s.studentId)
            })),
            hasMore: (page * limit) < total
        }
    } catch (error) {
        console.error('Error fetching expiring subscriptions:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch subscriptions' }
    }
}

export async function getExpiredSubscriptions(
    filter: string,
    page: number = 1,
    limit: number = 30,
    branchId?: string
) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }
    const libraryId = owner.libraryId
    const whereBranch = branchId && branchId !== 'All Branches' ? { branchId } : {}
    
    const now = new Date()
    let startDate = subMonths(now, 1) // Default
    let endDate = now

    switch (filter) {
        case 'today':
            startDate = startOfDay(now)
            endDate = now
            break
        case 'yesterday':
            startDate = startOfDay(subDays(now, 1))
            endDate = endOfDay(subDays(now, 1))
            break
        default:
            // For "Last X days"
            const days = parseInt(filter) || 7
            startDate = startOfDay(subDays(now, days))
            endDate = now
    }

    try {
        console.log(`[getExpired] Filter: ${filter}, Branch: ${branchId}, Lib: ${libraryId}`)
        console.log(`[getExpired] Range: ${startDate.toISOString()} - ${endDate.toISOString()}`)

        const subscriptions = await prisma.studentSubscription.findMany({
            where: {
                libraryId,
                ...whereBranch,
                status: { in: ['expired', 'active'] },
                endDate: { gte: startDate, lte: endDate }
            },
            orderBy: { endDate: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: { 
                student: { select: { name: true, image: true, phone: true, email: true } }, 
                plan: { select: { name: true } } 
            }
        })

        console.log(`[getExpired] Found: ${subscriptions.length}`)

        const studentIds = subscriptions.map(s => s.studentId)
        const presentStudentIds = await getAttendanceStatus(studentIds, libraryId)

        const total = await prisma.studentSubscription.count({
             where: {
                libraryId,
                ...whereBranch,
                status: { in: ['expired', 'active'] },
                endDate: { gte: startDate, lte: endDate }
            }
        })

        return {
            success: true,
            data: subscriptions.map(s => ({
                id: s.id,
                studentId: s.studentId,
                studentName: s.student.name,
                studentImage: s.student.image,
                planName: s.plan.name,
                startDate: s.startDate,
                endDate: s.endDate,
                phone: s.student.phone,
                email: s.student.email,
                amount: s.amount,
                isPresentToday: presentStudentIds.has(s.studentId)
            })),
            hasMore: (page * limit) < total
        }
    } catch (error) {
        console.error('Error fetching expired subscriptions:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch subscriptions' }
    }
}

export async function getDashboardStats(branchId?: string) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

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
        take: 20,
        orderBy: { date: 'desc' },
        include: { student: { select: { name: true } }, branch: { select: { name: true } } }
    })

    const recentAttendance = await prisma.attendance.findMany({
        where: { libraryId, ...whereBranch },
        take: 20,
        orderBy: { checkIn: 'desc' },
        include: { student: { select: { name: true } }, branch: { select: { name: true } } }
    })

    const recentTickets = await prisma.supportTicket.findMany({
        where: { libraryId, ...whereBranch },
        take: 10,
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
    .slice(0, 50) // Take top 50

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
        orderBy: { date: 'asc' }
    })

    const revenueMap = new Map<string, number>()
    // Initialize months
    for (let i = 0; i < monthsToFetch; i++) {
        const d = subMonths(now, monthsToFetch - 1 - i)
        revenueMap.set(format(d, 'MMM yyyy'), 0)
    }

    chartPayments.forEach(p => {
        const monthKey = format(p.date, 'MMM yyyy')
        revenueMap.set(monthKey, (revenueMap.get(monthKey) || 0) + p.amount)
    })

    const revenueChart = Array.from(revenueMap.entries()).map(([name, amount]) => ({ name, amount }))

    // 7. Upcoming Expirations
    const upcomingExpirations = await prisma.studentSubscription.findMany({
        where: {
            libraryId,
            ...whereBranch,
            status: 'active',
            endDate: { lte: addDays(now, 7), gt: now }
        },
        orderBy: { endDate: 'asc' },
        take: 5,
        include: { student: { select: { name: true, image: true, phone: true, email: true } }, plan: { select: { name: true } } }
    })

    const upcomingStudentIds = upcomingExpirations.map(s => s.studentId)
    const presentUpcomingIds = await getAttendanceStatus(upcomingStudentIds, libraryId)

    // 8. Attendance Today Stats
    const startOfToday = startOfDay(now)
    const endOfToday = endOfDay(now)
    
    const attendanceToday = await prisma.attendance.count({
        where: {
            libraryId,
            ...whereBranch,
            checkIn: { gte: startOfToday, lte: endOfToday }
        }
    })

    // 9. Revenue by Method (All Time or This Month? Let's do This Month for relevance)
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

    const revenueByMethod = revenueByMethodData.map(r => ({
        name: r.method.charAt(0).toUpperCase() + r.method.slice(1),
        value: r._sum.amount || 0
    }))

    // 10. Alerts (Custom logic - e.g. low occupancy, high issues)
    const alerts: { id: string; type: 'warning' | 'error' | 'info'; title: string; desc: string }[] = []
    if (occupancyRate > 90) {
        alerts.push({
            id: 'alert_occ_high',
            type: 'warning',
            title: 'High Occupancy',
            desc: `Occupancy is at ${occupancyRate}%. Consider adding more seats.`
        })
    }
    if (pendingIssues > 5) {
        alerts.push({
            id: 'alert_issues',
            type: 'error',
            title: 'Pending Issues',
            desc: `You have ${pendingIssues} pending support tickets.`
        })
    }

    // 11. Recently Expired
    const recentlyExpired = await prisma.studentSubscription.findMany({
        where: {
            libraryId,
            ...whereBranch,
            status: 'expired',
            endDate: { gte: subMonths(now, 1), lte: now }
        },
        orderBy: { endDate: 'desc' },
        take: 5,
        include: { student: { select: { name: true, image: true, phone: true } }, plan: { select: { name: true } } }
    })

    const expiredStudentIds = recentlyExpired.map(s => s.studentId)
    const presentExpiredIds = await getAttendanceStatus(expiredStudentIds, libraryId)

    return {
        success: true,
        data: {
            kpi: {
                revenue: { value: currentRevenue, trend: revenueTrend },
                students: { value: activeStudents, trend: studentTrend },
                occupancy: { value: occupancyRate, trend: occupancyTrend },
                issues: { value: openIssues, pending: pendingIssues }
            },
            recentActivity: activities,
            revenueChart,
            upcomingExpirations: upcomingExpirations.map(s => ({
                id: s.id,
                studentId: s.studentId,
                studentName: s.student.name,
                studentImage: s.student.image,
                planName: s.plan.name,
                startDate: s.startDate,
                endDate: s.endDate,
                phone: s.student.phone,
                email: s.student.email,
                amount: s.amount,
                isPresentToday: presentUpcomingIds.has(s.studentId)
            })),
            attendance: {
                today: attendanceToday,
                totalActive: activeStudents, // Using active students as base
                percentage: activeStudents > 0 ? Math.round((attendanceToday / activeStudents) * 100) : 0
            },
            revenueByMethod,
            alerts,
            recentlyExpired: recentlyExpired.map(s => ({
                id: s.id,
                studentId: s.studentId,
                studentName: s.student.name,
                studentImage: s.student.image,
                planName: s.plan.name,
                startDate: s.startDate,
                endDate: s.endDate,
                phone: s.student.phone,
                amount: s.amount,
                isPresentToday: presentExpiredIds.has(s.studentId)
            }))
        }
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch dashboard statistics' }
  }
}

export async function getAttendanceStatus(studentIds: string[], libraryId: string) {
    const today = startOfDay(new Date())
    const attendance = await prisma.attendance.findMany({
        where: {
            libraryId,
            studentId: { in: studentIds },
            date: { gte: today }
        },
        select: { studentId: true }
    })
    return new Set(attendance.map(a => a.studentId))
}

export async function getMoreActivities(before: string, branchId?: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }
    const libraryId = owner.libraryId
    const whereBranch = branchId && branchId !== 'All Branches' ? { branchId } : {}
    const beforeDate = new Date(before)

    try {
        const recentPayments = await prisma.payment.findMany({
            where: { libraryId, ...whereBranch, date: { lt: beforeDate } },
            take: 20,
            orderBy: { date: 'desc' },
            include: { student: { select: { name: true } }, branch: { select: { name: true } } }
        })
    
        const recentAttendance = await prisma.attendance.findMany({
            where: { libraryId, ...whereBranch, checkIn: { lt: beforeDate } },
            take: 20,
            orderBy: { checkIn: 'desc' },
            include: { student: { select: { name: true } }, branch: { select: { name: true } } }
        })
    
        const recentTickets = await prisma.supportTicket.findMany({
            where: { libraryId, ...whereBranch, createdAt: { lt: beforeDate } },
            take: 10,
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
        .slice(0, 50)
        
        return { success: true, data: activities }
    } catch (error) {
        console.error('Error fetching more activities:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch more activities' }
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
