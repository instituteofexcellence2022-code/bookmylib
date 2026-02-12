'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { ownerPermit } from '@/lib/auth/policy'

export type AttendanceFilter = {
    page?: number
    limit?: number
    date?: Date
    startDate?: Date
    endDate?: Date
    branchId?: string
    search?: string // Student name
    status?: string
    activeOnly?: boolean
    durationMin?: number
    durationMax?: number
}

export async function getOwnerAttendanceLogs(filters: AttendanceFilter) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }
    if (!ownerPermit('attendance:view')) return { success: false, error: 'Unauthorized' }

    const page = filters.page || 1
    const limit = filters.limit || 10
    const skip = (page - 1) * limit

    const where: any = {
        libraryId: owner.libraryId,
    }

    // Currently active only
    if (filters.activeOnly) {
        where.checkOut = null
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

    // Duration range (completed sessions)
    if (typeof filters.durationMin === 'number' || typeof filters.durationMax === 'number') {
        where.duration = {}
        if (typeof filters.durationMin === 'number') where.duration.gte = filters.durationMin
        if (typeof filters.durationMax === 'number') where.duration.lte = filters.durationMax
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
    if (!ownerPermit('attendance:view')) return { success: false, error: 'Unauthorized' }

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

export async function getAttendanceAnalytics(days: number = 7, filters?: { branchIds?: string[], status?: string[], method?: string[] }) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }
    if (!ownerPermit('attendance:view')) return { success: false, error: 'Unauthorized' }

    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), days - 1))

    try {
        const logs = await prisma.attendance.findMany({
            where: {
                libraryId: owner.libraryId,
                ...(filters?.branchIds && filters.branchIds.length > 0 ? { branchId: { in: filters.branchIds } } : {}),
                ...(filters?.status && filters.status.length > 0 ? { status: { in: filters.status } } : {}),
                ...(filters?.method && filters.method.length > 0 ? { method: { in: filters.method } } : {}),
                checkIn: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                student: { select: { id: true, name: true } },
                branch: {
                    select: { id: true, name: true }
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
        const branchMap = new Map<string, { id: string, name: string, count: number }>()
        logs.forEach(log => {
            const id = (log as any).branch?.id as string
            const name = (log as any).branch?.name as string
            if (!id || !name) return
            if (!branchMap.has(id)) branchMap.set(id, { id, name, count: 0 })
            const entry = branchMap.get(id)!
            entry.count += 1
        })
        const branchComparison = Array.from(branchMap.values())

        // 4. Summary Stats
        const totalVisits = logs.length
        const uniqueStudents = new Set(logs.map(l => l.studentId)).size
        const completedLogs = logs.filter(l => l.duration)
        const avgDuration = completedLogs.length > 0 
            ? Math.round(completedLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0) / completedLogs.length) 
            : 0
        
        // Branch Avg Durations
        const branchDurations = new Map<string, { sum: number, count: number }>()
        completedLogs.forEach(l => {
            const name = (l as any).branch?.name || 'Unknown'
            if (!branchDurations.has(name)) branchDurations.set(name, { sum: 0, count: 0 })
            const entry = branchDurations.get(name)!
            entry.sum += l.duration || 0
            entry.count += 1
        })
        const branchAvgDurations = Array.from(branchDurations.entries()).map(([name, { sum, count }]) => ({
            name,
            avgDuration: count > 0 ? Math.round(sum / count) : 0
        }))
        
        // Top Student by visits in range
        const studentCount = new Map<string, { name: string, count: number }>()
        logs.forEach(l => {
            const id = l.studentId
            const name = (l as any).student?.name || 'Unknown'
            if (!studentCount.has(id)) studentCount.set(id, { name, count: 0 })
            const entry = studentCount.get(id)!
            entry.count += 1
        })
        let topStudent: { id: string; name: string; visits: number } | undefined = undefined
        studentCount.forEach((v, id) => {
            if (!topStudent || v.count > topStudent.visits) {
                topStudent = { id, name: v.name, visits: v.count }
            }
        })
        
        // Status Distribution
        const statusCounts = { present: 0, full_day: 0, short_session: 0 }
        logs.forEach(l => {
            const s = (l.status || 'present') as 'present' | 'full_day' | 'short_session'
            if (s in statusCounts) (statusCounts as any)[s] += 1
        })
        const statusDistribution = [
            { label: 'Present', count: statusCounts.present },
            { label: 'Full Day', count: statusCounts.full_day },
            { label: 'Short Session', count: statusCounts.short_session }
        ]
        
        // Method Distribution
        const methodMap = new Map<string, number>()
        logs.forEach(l => {
            const m = (l.method || 'unknown').toLowerCase()
            methodMap.set(m, (methodMap.get(m) || 0) + 1)
        })
        const methodDistribution = Array.from(methodMap.entries()).map(([method, count]) => ({ method, count }))
        
        // Hourly Avg Duration (for completed sessions)
        const hourDurations = new Array(24).fill(0)
        const hourCounts = new Array(24).fill(0)
        completedLogs.forEach(l => {
            const h = l.checkIn.getHours()
            hourDurations[h] += l.duration || 0
            hourCounts[h] += 1
        })
        const hourlyAvgDuration = hourDurations.map((sum, hour) => ({
            hour: `${hour}:00`,
            avgDuration: hourCounts[hour] > 0 ? Math.round(sum / hourCounts[hour]) : 0
        }))
        
        // Branch Daily Stack (top 5 branches)
        const dateKeys: string[] = Array.from(dailyMap.keys())
        const topBranches = (filters?.branchIds && filters.branchIds.length > 0)
            ? branchComparison.filter(b => filters!.branchIds!.includes(b.id)).map(b => b.name)
            : branchComparison
                .slice()
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(b => b.name)
        const branchDailyStack: Array<Record<string, number | string>> = dateKeys.map(date => {
            const obj: Record<string, number | string> = { date }
            topBranches.forEach(name => { obj[name] = 0 })
            return obj
        })
        logs.forEach(l => {
            const dateKey = l.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const branchName = (l as any).branch?.name || 'Unknown'
            const idx = dateKeys.indexOf(dateKey)
            if (idx >= 0 && topBranches.includes(branchName)) {
                const curr = Number(branchDailyStack[idx][branchName] || 0)
                branchDailyStack[idx][branchName] = curr + 1
            }
        })

        return {
            success: true,
            data: {
                dailyTrends,
                hourlyDistribution,
                hourlyAvgDuration,
                branchComparison,
                branchDailyStack,
                statusDistribution,
                methodDistribution,
                summary: {
                    totalVisits,
                    uniqueStudents,
                    avgDuration,
                    attendanceRate: totalVisits > 0 ? Math.round((totalVisits / days) * 10) / 10 : 0, // Avg visits per day
                    branchAvgDurations,
                    topStudent
                }
            }
        }
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return { success: false, error: 'Failed to fetch analytics' }
    }
}

export async function updateAttendanceRecord(id: string, data: { checkIn?: Date, checkOut?: Date, status?: string, method?: string, remarks?: string }) {
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
            revalidatePath('/owner/students')
            return { 
                success: true, 
                type: 'check-out', 
                studentId,
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

        if (!student.libraryId || !student.branchId) {
            const updates: any = {}
            if (!student.libraryId) updates.libraryId = owner.libraryId
            if (!student.branchId) updates.branchId = branchId
            if (Object.keys(updates).length > 0) {
                await prisma.student.update({
                    where: { id: studentId },
                    data: updates
                })
            }
        }
        const checkInDate = new Date()
        await prisma.attendance.create({
            data: {
                studentId: studentId,
                branchId: branchId,
                date: checkInDate,
                checkIn: checkInDate,
                status: 'present',
                method: 'qr',
                libraryId: subscription?.libraryId || owner.libraryId
            }
        })

        revalidatePath('/owner/attendance/logs')
        revalidatePath('/owner/students')
        return { 
            success: true, 
            type: 'check-in', 
            studentId,
            studentName: student.name,
            timestamp: checkInDate
        }

    } catch (error) {
        console.error('Error verifying student QR:', error)
        return { success: false, error: 'Failed to process attendance' }
    }
}

export async function createManualAttendance(data: { studentId: string, branchId: string, checkIn: Date, checkOut?: Date | null, status?: string, remarks?: string }) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }
    if (!ownerPermit('attendance:update')) return { success: false, error: 'Unauthorized' }

    try {
        const student = await prisma.student.findUnique({ where: { id: data.studentId }, select: { id: true, libraryId: true } })
        if (!student) return { success: false, error: 'Student not found' }
        if (student.libraryId && student.libraryId !== owner.libraryId) return { success: false, error: 'Access denied' }

        const checkInDate = new Date(data.checkIn)
        const checkOutDate = data.checkOut ? new Date(data.checkOut) : null
        if (checkOutDate && checkOutDate < checkInDate) {
            return { success: false, error: 'Check-out cannot be before check-in' }
        }

        let duration: number | null = null
        let status = data.status || 'present'
        if (checkOutDate) {
            const d = Math.floor((checkOutDate.getTime() - checkInDate.getTime()) / 60000)
            duration = d > 0 ? d : 0
            if (!data.status) {
                if (duration < 120) status = 'short_session'
                else if (duration > 360) status = 'full_day'
                else status = 'present'
            }
        }

        await prisma.attendance.create({
            data: {
                studentId: data.studentId,
                branchId: data.branchId,
                date: checkInDate,
                checkIn: checkInDate,
                checkOut: checkOutDate || undefined,
                duration: duration || undefined,
                status,
                method: 'manual',
                remarks: data.remarks || undefined,
                libraryId: owner.libraryId
            }
        })

        revalidatePath('/owner/attendance')
        revalidatePath('/owner/attendance/logs')
        return { success: true }
    } catch (error) {
        console.error('Error creating manual attendance:', error)
        return { success: false, error: 'Failed to create attendance' }
    }
}
