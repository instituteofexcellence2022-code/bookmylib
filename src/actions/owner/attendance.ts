'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay, subDays } from 'date-fns'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { ownerPermit } from '@/lib/auth/policy'
import { Prisma } from '@prisma/client'

export type AttendanceFilter = {
    page?: number
    limit?: number
    date?: Date
    startDate?: Date
    endDate?: Date
    startTime?: string
    endTime?: string
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

    const where: Prisma.AttendanceWhereInput = {
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
        if (filters.startDate) {
            const base = filters.startDate
            if (filters.startTime) {
                const [hh, mm] = filters.startTime.split(':').map(n => parseInt(n, 10))
                const withTime = new Date(base)
                withTime.setHours(hh || 0, mm || 0, 0, 0)
                where.checkIn.gte = withTime
            } else {
                where.checkIn.gte = startOfDay(base)
            }
        }
        if (filters.endDate) {
            const base = filters.endDate
            if (filters.endTime) {
                const [hh, mm] = filters.endTime.split(':').map(n => parseInt(n, 10))
                const withTime = new Date(base)
                withTime.setHours(hh || 23, mm || 59, 59, 999)
                where.checkIn.lte = withTime
            } else {
                where.checkIn.lte = endOfDay(base)
            }
        }
    }

    // Status Filter (special-case 'overstay' handled after fetch)
    if (filters.status && filters.status !== 'all' && filters.status !== 'overstay' && filters.status !== 'active') {
        where.status = filters.status
    }
    if (filters.status === 'active') {
        where.checkOut = null
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
        const isOverstayFilter = filters.status === 'overstay'
        const logsRaw = await prisma.attendance.findMany({
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
            ...(isOverstayFilter ? {} : { skip, take: limit })
        })
        const totalRaw = isOverstayFilter ? 0 : await prisma.attendance.count({ where })

        // Compute overstay minutes per log based on subscription plan hoursPerDay
        const studentIds = Array.from(new Set(logsRaw.map(l => l.student.id)))
        const minCheckIn = logsRaw.reduce((min, l) => (l.checkIn < min ? l.checkIn : min), logsRaw[0]?.checkIn || new Date())
        const maxCheckIn = logsRaw.reduce((max, l) => (l.checkIn > max ? l.checkIn : max), logsRaw[0]?.checkIn || new Date())

        const subscriptions = await prisma.studentSubscription.findMany({
            where: {
                libraryId: owner.libraryId,
                studentId: { in: studentIds },
                status: { in: ['active', 'expired'] },
                startDate: { lte: maxCheckIn },
                endDate: { gte: minCheckIn }
            },
            include: {
                plan: {
                    select: {
                        name: true,
                        hoursPerDay: true,
                        shiftStart: true,
                        shiftEnd: true
                    }
                }
            }
        })

        // Fetch whether students have any subscription history (across branches)
        const anySubs = await prisma.studentSubscription.findMany({
            where: {
                libraryId: owner.libraryId,
                studentId: { in: studentIds }
            },
            select: { studentId: true }
        })
        const studentsWithSubs = new Set<string>(anySubs.map(s => s.studentId))

        const byStudent = new Map<string, typeof subscriptions>()
        subscriptions.forEach(sub => {
            const list = byStudent.get(sub.studentId) || []
            list.push(sub)
            byStudent.set(sub.studentId, list)
        })

        const enriched = logsRaw.map(log => {
            let overstayMinutes: number | undefined = undefined
            const subs = byStudent.get(log.student.id) || []
            // Match subscription active at the time of check-in and same branch
            const match = subs.find(s => s.branchId === log.branch.id && s.startDate <= log.checkIn && s.endDate >= log.checkIn)
            const hoursPerDay = match?.plan?.hoursPerDay || null
            if (hoursPerDay && typeof log.duration === 'number') {
                const maxMinutes = hoursPerDay * 60
                if (log.duration > maxMinutes) {
                    overstayMinutes = log.duration - maxMinutes
                }
            }
            const newUser = !studentsWithSubs.has(log.student.id)
            return { ...log, overstayMinutes, newUser }
        })

        let finalLogs = enriched
        let total = totalRaw
        let pages = Math.ceil(total / limit)
        if (isOverstayFilter) {
            const filtered = enriched.filter(l => typeof l.overstayMinutes === 'number' && l.overstayMinutes > 0)
            total = filtered.length
            pages = Math.ceil(total / limit)
            finalLogs = filtered.slice(skip, skip + limit)
        }

        return {
            success: true,
            data: {
                logs: finalLogs,
                total,
                pages
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

    const where: Prisma.AttendanceWhereInput = {
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
                // Defer status filtering to app logic to support 'overstay'
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

        // Compute overstay flags using subscription plan hoursPerDay
        const studentIds = Array.from(new Set(logs.map(l => l.studentId)))
        const minCheckIn = logs.reduce((min, l) => (l.checkIn < min ? l.checkIn : min), logs[0]?.checkIn || startDate)
        const maxCheckIn = logs.reduce((max, l) => (l.checkIn > max ? l.checkIn : max), logs[0]?.checkIn || endDate)
        const subscriptions = await prisma.studentSubscription.findMany({
            where: {
                libraryId: owner.libraryId,
                studentId: { in: studentIds },
                status: { in: ['active', 'expired'] },
                startDate: { lte: maxCheckIn },
                endDate: { gte: minCheckIn }
            },
            include: {
                plan: {
                    select: { hoursPerDay: true }
                }
            }
        })
        const subsByStudent = new Map<string, typeof subscriptions>()
        subscriptions.forEach(sub => {
            const list = subsByStudent.get(sub.studentId) || []
            list.push(sub)
            subsByStudent.set(sub.studentId, list)
        })
        const isOverstay = (l: any) => {
            const subs = subsByStudent.get(l.studentId) || []
            const branchId = (l as { branch?: { id?: string } }).branch?.id
            const match = subs.find(s => s.branchId === branchId && s.startDate <= l.checkIn && s.endDate >= l.checkIn)
            const hoursPerDay = match?.plan?.hoursPerDay || null
            if (!hoursPerDay || typeof l.duration !== 'number') return false
            const maxMinutes = hoursPerDay * 60
            return l.duration > maxMinutes
        }

        // Apply status filter with support for 'overstay'
        let filteredLogs = logs
        if (filters?.status && filters.status.length > 0) {
            const selected = new Set(filters.status)
            const wantOverstay = selected.has('overstay')
            const allowedStatuses = Array.from(selected).filter(s => s !== 'overstay')
            filteredLogs = logs.filter(l => {
                const baseMatch = allowedStatuses.length > 0 ? allowedStatuses.includes((l.status || 'present')) : true
                const overstayMatch = wantOverstay ? isOverstay(l) : false
                // If user selected only overstay, baseMatch should not allow all; ensure baseMatch true only when status matched
                return (allowedStatuses.length > 0 ? baseMatch : false) || overstayMatch
            })
            // If user selected only overstay (allowedStatuses empty), keep only overstay logs
            if (allowedStatuses.length === 0 && wantOverstay) {
                filteredLogs = logs.filter(l => isOverstay(l))
            }
        }

        // 1. Daily Trends
        const dailyMap = new Map<string, number>()
        // Initialize all days with 0
        for (let i = 0; i < days; i++) {
            const d = subDays(new Date(), days - 1 - i)
            dailyMap.set(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 0)
        }
        
        filteredLogs.forEach(log => {
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
        filteredLogs.forEach(log => {
            hourlyMap[log.checkIn.getHours()]++
        })
        const hourlyDistribution = hourlyMap.map((count, hour) => ({
            hour: `${hour}:00`,
            count
        }))

        // 3. Branch Comparison
        const branchMap = new Map<string, { id: string, name: string, count: number }>()
        filteredLogs.forEach(log => {
            const id = (log as { branch?: { id?: string } }).branch?.id as string | undefined
            const name = (log as { branch?: { name?: string } }).branch?.name as string | undefined
            if (!id || !name) return
            if (!branchMap.has(id)) branchMap.set(id, { id, name, count: 0 })
            const entry = branchMap.get(id)!
            entry.count += 1
        })
        const branchComparison = Array.from(branchMap.values())

        // 4. Summary Stats
        const totalVisits = filteredLogs.length
        const uniqueStudents = new Set(filteredLogs.map(l => l.studentId)).size
        const completedLogs = filteredLogs.filter(l => l.duration)
        const avgDuration = completedLogs.length > 0 
            ? Math.round(completedLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0) / completedLogs.length) 
            : 0
        
        // Branch Avg Durations
        const branchDurations = new Map<string, { sum: number, count: number }>()
        completedLogs.forEach(l => {
            const name = (l as { branch?: { name?: string } }).branch?.name || 'Unknown'
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
        filteredLogs.forEach(l => {
            const id = l.studentId
            const name = (l as { student?: { name?: string } }).student?.name || 'Unknown'
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
        const statusCounts: Record<'present' | 'short_session', number> = { present: 0, short_session: 0 }
        filteredLogs.forEach(l => {
            const s = (l.status || 'present') as string
            const normalized = s === 'full_day' ? 'present' : s
            if (normalized in statusCounts) statusCounts[normalized as 'present' | 'short_session'] += 1
        })
        const overstayCount = filteredLogs.reduce((acc, l) => acc + (isOverstay(l) ? 1 : 0), 0)
        const statusDistribution = [
            { label: 'Present', count: statusCounts.present },
            { label: 'Short Session', count: statusCounts.short_session },
            { label: 'Overstay', count: overstayCount }
        ]
        
        // Method Distribution
        const methodMap = new Map<string, number>()
        filteredLogs.forEach(l => {
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
        filteredLogs.forEach(l => {
            const dateKey = l.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const branchName = (l as { branch?: { name?: string } }).branch?.name || 'Unknown'
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

        const updateData = { ...data } as unknown as Prisma.AttendanceUpdateInput

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
            const updates: Partial<{ libraryId: string; branchId: string }> = {}
            if (!student.libraryId) updates.libraryId = owner.libraryId
            if (!student.branchId) updates.branchId = branchId
            if (Object.keys(updates).length > 0) {
                await prisma.student.update({
                    where: { id: studentId },
                    data: updates as unknown as Prisma.StudentUpdateInput
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
