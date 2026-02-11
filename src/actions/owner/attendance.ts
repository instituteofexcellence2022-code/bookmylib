'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { getAuthenticatedOwner } from '@/lib/auth/owner'

export type AttendanceFilter = {
    page?: number
    limit?: number
    date?: Date
    startDate?: Date
    endDate?: Date
    branchId?: string
    search?: string // Student name
    status?: string
}

export async function getOwnerAttendanceLogs(filters: AttendanceFilter) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    const where: any = {
        libraryId: owner.libraryId,
    }

    // Branch Filter
    if (filters.branchId) {
        where.branchId = filters.branchId
    }

    // Date Filter (Single Date)
    if (filters.date) {
        const start = startOfDay(filters.date)
        const end = endOfDay(filters.date)
        where.checkIn = {
            gte: start,
            lte: end
        }
    }
    // Date Range Filter
    else if (filters.startDate || filters.endDate) {
        where.checkIn = {}
        if (filters.startDate) where.checkIn.gte = startOfDay(filters.startDate)
        if (filters.endDate) where.checkIn.lte = endOfDay(filters.endDate)
    }

    // Status Filter
    if (filters.status && filters.status !== 'all') {
        where.status = filters.status
    }

    // Search (Student Name)
    if (filters.search) {
        where.student = {
            name: {
                contains: filters.search,
                mode: 'insensitive'
            }
        }
    }

    try {
        const [logs, total] = await Promise.all([
            prisma.attendance.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            email: true
                        }
                    },
                    branch: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: {
                    checkIn: 'desc'
                },
                skip,
                take: limit
            }),
            prisma.attendance.count({ where })
        ])

        return {
            success: true,
            data: {
                logs,
                total,
                pages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        console.error('Error fetching attendance logs:', error)
        return { success: false, error: 'Failed to fetch attendance logs' }
    }
}

export async function getOwnerAttendanceStats(branchId?: string, date: Date = new Date()) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    const start = startOfDay(date)
    const end = endOfDay(date)

    const where: any = {
        libraryId: owner.libraryId,
        checkIn: {
            gte: start,
            lte: end
        }
    }

    if (branchId) {
        where.branchId = branchId
    }

    try {
        const logs = await prisma.attendance.findMany({
            where,
            select: {
                checkIn: true,
                checkOut: true,
                duration: true,
                status: true
            }
        })

        const totalPresent = logs.length
        const currentlyCheckedIn = logs.filter(l => !l.checkOut).length
        const completedSessions = logs.filter(l => l.checkOut).length
        
        // Calculate average duration for completed sessions
        const totalDuration = logs.reduce((acc, curr) => acc + (curr.duration || 0), 0)
        const avgDuration = completedSessions > 0 ? Math.round(totalDuration / completedSessions) : 0

        // Determine peak hour
        const hourCounts = new Array(24).fill(0)
        logs.forEach(log => {
            const hour = log.checkIn.getHours()
            hourCounts[hour]++
        })
        const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts))
        const peakHour = `${peakHourIndex}:00 - ${peakHourIndex + 1}:00`

        return {
            success: true,
            data: {
                totalPresent,
                currentlyCheckedIn,
                avgDuration, // in minutes
                peakHour
            }
        }
    } catch (error) {
        console.error('Error fetching attendance stats:', error)
        return { success: false, error: 'Failed to fetch attendance stats' }
    }
}

export async function getAttendanceAnalytics(days: number = 7) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), days - 1))

    try {
        const logs = await prisma.attendance.findMany({
            where: {
                libraryId: owner.libraryId,
                checkIn: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                branch: {
                    select: { name: true }
                }
            }
        })

        // 1. Daily Trends
        const dailyMap = new Map<string, number>()
        // Initialize all days with 0
        for (let i = 0; i < days; i++) {
            const d = subDays(new Date(), days - 1 - i)
            dailyMap.set(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 0)
        }
        
        logs.forEach(log => {
            const dateKey = log.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            if (dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1)
            }
        })

        const dailyTrends = Array.from(dailyMap.entries()).map(([date, count]) => ({
            date,
            count
        }))

        // 2. Hourly Distribution
        const hourlyMap = new Array(24).fill(0)
        logs.forEach(log => {
            hourlyMap[log.checkIn.getHours()]++
        })
        const hourlyDistribution = hourlyMap.map((count, hour) => ({
            hour: `${hour}:00`,
            count
        }))

        // 3. Branch Comparison
        const branchMap = new Map<string, number>()
        logs.forEach(log => {
            const name = log.branch.name
            branchMap.set(name, (branchMap.get(name) || 0) + 1)
        })
        const branchComparison = Array.from(branchMap.entries()).map(([name, count]) => ({
            name,
            count
        }))

        // 4. Summary Stats
        const totalVisits = logs.length
        const uniqueStudents = new Set(logs.map(l => l.studentId)).size
        const completedLogs = logs.filter(l => l.duration)
        const avgDuration = completedLogs.length > 0 
            ? Math.round(completedLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0) / completedLogs.length) 
            : 0

        return {
            success: true,
            data: {
                dailyTrends,
                hourlyDistribution,
                branchComparison,
                summary: {
                    totalVisits,
                    uniqueStudents,
                    avgDuration,
                    attendanceRate: totalVisits > 0 ? Math.round((totalVisits / days) * 10) / 10 : 0 // Avg visits per day
                }
            }
        }
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return { success: false, error: 'Failed to fetch analytics' }
    }
}

export async function updateAttendanceRecord(id: string, data: { checkIn?: Date, checkOut?: Date, status?: string }) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const existing = await prisma.attendance.findUnique({ where: { id } })
        if (!existing) return { success: false, error: 'Record not found' }

        const updateData: any = { ...data }

        // Recalculate duration if times changed
        if (data.checkIn || data.checkOut) {
            const newCheckIn = data.checkIn ? new Date(data.checkIn) : existing.checkIn
            const newCheckOut = data.checkOut ? new Date(data.checkOut) : existing.checkOut

            if (newCheckOut) {
                const duration = Math.floor((newCheckOut.getTime() - newCheckIn.getTime()) / 60000)
                updateData.duration = duration > 0 ? duration : 0
                
                // Auto update status based on duration if not manually provided
                if (!data.status) {
                    if (duration < 120) updateData.status = 'short_session'
                    else if (duration > 360) updateData.status = 'full_day'
                    else updateData.status = 'present'
                }
            } else {
                updateData.duration = null
                updateData.status = 'present' // default open status
            }
        }

        await prisma.attendance.update({
            where: { id },
            data: updateData
        })

        revalidatePath('/owner/attendance/logs')
        return { success: true }
    } catch (error) {
        console.error('Error updating attendance:', error)
        return { success: false, error: 'Failed to update record' }
    }
}

export async function verifyStudentQR(studentId: string, branchId: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        // 1. Verify Student Exists
        const student = await prisma.student.findUnique({
            where: { id: studentId }
        })

        if (!student) return { success: false, error: 'Invalid Student ID' }

        // 2. Check Active Subscription for THIS branch
        const subscription = await prisma.studentSubscription.findFirst({
            where: {
                studentId: studentId,
                branchId: branchId
            },
            orderBy: { startDate: 'desc' }
        })

        // 3. Logic similar to markAttendance but triggered by Owner
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Check for open attendance at THIS branch
        const openAttendanceHere = await prisma.attendance.findFirst({
            where: {
                studentId: studentId,
                branchId: branchId,
                checkOut: null,
                checkIn: { gte: today }
            },
            orderBy: { checkIn: 'desc' }
        })

        if (openAttendanceHere) {
            // Check-out
            const checkOutTime = new Date()
            const duration = Math.floor((checkOutTime.getTime() - openAttendanceHere.checkIn.getTime()) / 60000)
            
            let status = 'present'
            if (duration < 120) status = 'short_session'
            else if (duration > 360) status = 'full_day'

            await prisma.attendance.update({
                where: { id: openAttendanceHere.id },
                data: {
                    checkOut: checkOutTime,
                    duration: duration > 0 ? duration : 0,
                    status
                }
            })

            revalidatePath('/owner/attendance/logs')
            return { 
                success: true, 
                type: 'check-out', 
                studentName: student.name,
                timestamp: checkOutTime,
                duration
            }
        }

        // Check for open attendance at OTHER branches (Concurrent check-in prevention)
        const openAttendanceOther = await prisma.attendance.findFirst({
            where: {
                studentId: studentId,
                checkOut: null,
                checkIn: { gte: today },
                branchId: { not: branchId }
            },
            include: { branch: true }
        })

        if (openAttendanceOther) {
             // Auto-checkout from other branch
             const checkOutTime = new Date()
             const duration = Math.floor((checkOutTime.getTime() - openAttendanceOther.checkIn.getTime()) / 60000)
             
             await prisma.attendance.update({
                 where: { id: openAttendanceOther.id },
                 data: {
                     checkOut: checkOutTime,
                     duration: duration > 0 ? duration : 0,
                     status: 'present' // default
                 }
             })
        }

        // Create Check-in
        const checkInDate = new Date()
        await prisma.attendance.create({
            data: {
                studentId: studentId,
                branchId: branchId,
                date: checkInDate,
                checkIn: checkInDate,
                status: 'present',
                libraryId: subscription?.libraryId || owner.libraryId
            }
        })

        revalidatePath('/owner/attendance/logs')
        return { 
            success: true, 
            type: 'check-in', 
            studentName: student.name,
            timestamp: new Date()
        }

    } catch (error) {
        console.error('Error verifying student QR:', error)
        return { success: false, error: 'Failed to process attendance' }
    }
}
