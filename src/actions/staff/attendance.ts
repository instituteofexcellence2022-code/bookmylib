'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfDay, endOfDay, subDays } from 'date-fns'


export type AttendanceFilter = {
    page?: number
    limit?: number
    date?: Date
    startDate?: Date
    endDate?: Date
    search?: string // Student name
    status?: string
}

import { getAuthenticatedStaff } from '@/lib/auth/staff'

// Helper to get authenticated staff
// Removed local helper in favor of imported one

export async function getStaffAttendanceLogs(filters: AttendanceFilter) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        const page = filters.page || 1
        const limit = filters.limit || 10
        const skip = (page - 1) * limit

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            libraryId: staff.libraryId,
            branchId: staff.branchId, // Strictly scoped to staff's branch
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
        console.error('Error fetching staff attendance logs:', error)
        return { success: false, error: 'Failed to fetch logs' }
    }
}

export async function markStudentAttendance(studentId: string, action: 'check-in' | 'check-out') {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        if (action === 'check-in') {
            
            // Check if already checked in
            const existing = await prisma.attendance.findFirst({
                where: {
                    studentId,
                    checkOut: null,
                    checkIn: { gte: new Date(new Date().setHours(0,0,0,0)) }
                }
            })
            
            if (existing) return { success: false, error: 'Already checked in' }

            await prisma.attendance.create({
                data: {
                    libraryId: staff.libraryId,
                    branchId: staff.branchId,
                    studentId,
                    date: new Date(),
                    checkIn: new Date(),
                    status: 'present'
                }
            })
            revalidatePath('/owner/students')
        } else {
             // Check out
            const existing = await prisma.attendance.findFirst({
                where: {
                    studentId,
                    checkOut: null,
                    checkIn: { gte: new Date(new Date().setHours(0,0,0,0)) }
                }
            })
            
            if (!existing) return { success: false, error: 'Not checked in' }

            const checkOutTime = new Date()
            const duration = Math.floor((checkOutTime.getTime() - existing.checkIn.getTime()) / 60000)

             await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    checkOut: checkOutTime,
                    duration: duration > 0 ? duration : 0,
                    status: 'present'
                }
            })
        }

        revalidatePath('/staff/attendance')
        revalidatePath('/owner/students')
        return { success: true }
    } catch (error) {
         console.error('Error marking attendance:', error)
         return { success: false, error: 'System error' }
    }
}

export async function getStaffAttendanceStats(date: Date = new Date()) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    const start = startOfDay(date)
    const end = endOfDay(date)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        libraryId: staff.libraryId,
        branchId: staff.branchId,
        checkIn: {
            gte: start,
            lte: end
        }
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

export async function getStaffAttendanceAnalytics(days: number = 7) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), days - 1))

    try {
        const logs = await prisma.attendance.findMany({
            where: {
                libraryId: staff.libraryId,
                branchId: staff.branchId,
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

        // 3. Summary Stats
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
                summary: {
                    totalVisits,
                    uniqueStudents,
                    avgDuration,
                    attendanceRate: totalVisits > 0 ? Math.round((totalVisits / days) * 10) / 10 : 0
                }
            }
        }
    } catch (error) {
        console.error('Error fetching analytics:', error)
        return { success: false, error: 'Failed to fetch analytics' }
    }
}

export async function updateStaffAttendanceRecord(id: string, data: { checkIn?: Date, checkOut?: Date, status?: string }) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        const existing = await prisma.attendance.findUnique({ where: { id } })
        if (!existing) return { success: false, error: 'Record not found' }
        
        if (existing.branchId !== staff.branchId) {
            return { success: false, error: 'Cannot modify attendance from another branch' }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        revalidatePath('/staff/attendance')
        return { success: true }
    } catch (error) {
        console.error('Error updating attendance:', error)
        return { success: false, error: 'Failed to update record' }
    }
}

export async function verifyStaffStudentQR(studentId: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

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
                branchId: staff.branchId,
                status: 'active',
                endDate: { gte: new Date() }
            }
        })

        if (!subscription) {
            return { success: false, error: 'No active subscription for this branch' }
        }

        // 3. Logic similar to markAttendance
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Check for open attendance at THIS branch
        const openAttendanceHere = await prisma.attendance.findFirst({
            where: {
                studentId: studentId,
                branchId: staff.branchId,
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

            revalidatePath('/staff/attendance')
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
                branchId: { not: staff.branchId }
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
                branchId: staff.branchId,
                date: checkInDate,
                checkIn: checkInDate,
                status: 'present',
                libraryId: staff.libraryId
            }
        })

        revalidatePath('/staff/attendance')
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

export async function getStaffBranchInfo() {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }
    
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: staff.branch.id },
            include: { owner: true }
        })

        if (!branch) return { success: false, error: 'Branch not found' }

        return {
            success: true,
            data: {
                id: branch.id,
                name: branch.name,
                qrCode: branch.qrCode,
                address: branch.address,
                city: branch.city,
                state: branch.state,
                phone: branch.contactPhone,
                email: branch.contactEmail,
                owner: branch.owner ? {
                    name: branch.owner.name
                } : null
            }
        }
    } catch (error) {
        console.error('Error fetching branch info:', error)
        return { success: false, error: 'Failed to fetch branch info' }
    }
}

export async function getStaffSelfAttendanceToday() {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        const today = startOfDay(new Date())
        const end = endOfDay(new Date())

        const record = await prisma.staffAttendance.findFirst({
            where: {
                staffId: staff.id,
                checkIn: {
                    gte: today,
                    lte: end
                }
            },
            orderBy: { checkIn: 'desc' }
        })

        return { success: true, data: record }
    } catch (error) {
        console.error('Error fetching staff self attendance today:', error)
        return { success: false, error: 'Failed to fetch attendance' }
    }
}

export async function markStaffSelfAttendance(qrContent: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        let branchId = staff.branchId
        let qrCodeValue = qrContent

        // Try to parse JSON if applicable
        try {
            const data = JSON.parse(qrContent)
            if (data.branchId) branchId = data.branchId
            if (data.code) qrCodeValue = data.code
        } catch {
            // Not JSON, assume raw code
        }

        // 1. Verify Branch
        if (branchId !== staff.branchId) {
            return { success: false, error: 'Invalid Branch QR: This code belongs to another branch' }
        }

        // 2. Verify QR Code
        // If the branch has a QR code set, it MUST match
        if (staff.branch.qrCode && staff.branch.qrCode !== qrCodeValue) {
            return { success: false, error: 'Invalid QR Code' }
        }
        
        // If branch has no QR code set, we might want to prevent check-in or allow any (let's be strict: must exist)
        if (!staff.branch.qrCode) {
            return { success: false, error: 'Branch QR code not configured' }
        }

        // 3. Logic: Check-in or Check-out
        const today = startOfDay(new Date())
        
        // Check for open attendance
        const openAttendance = await prisma.staffAttendance.findFirst({
            where: {
                staffId: staff.id,
                checkOut: null,
                checkIn: { gte: today }
            },
            orderBy: { checkIn: 'desc' }
        })

        if (openAttendance) {
            // Check-out
            const checkOutTime = new Date()
            const durationMs = checkOutTime.getTime() - openAttendance.checkIn.getTime()
            
            // Safety check: Prevent checkout if < 1 minute (60000ms) to avoid accidental double-scans
            if (durationMs < 60000) {
                 return { success: false, error: 'You just checked in. Please wait a minute before checking out.' }
            }

            const duration = Math.floor(durationMs / 60000)
            
            let status = 'present'
            if (duration < 240) status = 'half_day' // Example logic: < 4 hours
            else status = 'present'

            await prisma.staffAttendance.update({
                where: { id: openAttendance.id },
                data: {
                    checkOut: checkOutTime,
                    duration: duration > 0 ? duration : 0,
                    status,
                    method: 'qr'
                }
            })

            revalidatePath('/staff/shift')
            revalidatePath('/staff/attendance')
            return { 
                success: true, 
                type: 'check-out', 
                timestamp: checkOutTime,
                duration
            }
        }

        // Create Check-in
        const checkInDate = new Date()
        await prisma.staffAttendance.create({
            data: {
                staffId: staff.id,
                libraryId: staff.libraryId,
                branchId: staff.branchId,
                date: checkInDate,
                checkIn: checkInDate,
                status: 'present', // Default, updated on checkout
                method: 'qr'
            }
        })

        revalidatePath('/staff/shift')
        revalidatePath('/staff/attendance')
        return { 
            success: true, 
            type: 'check-in', 
            timestamp: checkInDate
        }

    } catch (error) {
        console.error('Error marking staff self attendance:', error)
        return { success: false, error: 'Failed to process attendance' }
    }
}

export async function getStaffSelfAttendanceHistory(limit: number = 30) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        const history = await prisma.staffAttendance.findMany({
            where: {
                staffId: staff.id
            },
            orderBy: {
                checkIn: 'desc'
            },
            take: limit
        })

        return { success: true, data: history }
    } catch (error) {
        console.error('Error fetching staff self attendance history:', error)
        return { success: false, error: 'Failed to fetch history' }
    }
}

export async function getStaffSelfAttendanceStats() {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        
        // Fetch logs for this month
        const monthlyLogs = await prisma.staffAttendance.findMany({
            where: {
                staffId: staff.id,
                checkIn: {
                    gte: startOfMonth
                }
            }
        })

        const totalSessions = monthlyLogs.length
        
        // Calculate total hours
        const totalMinutes = monthlyLogs.reduce((acc, log) => acc + (log.duration || 0), 0)
        const totalHours = Math.round((totalMinutes / 60) * 10) / 10

        // Calculate average duration (for completed sessions)
        const completedSessions = monthlyLogs.filter(l => l.duration !== null)
        const avgDurationMinutes = completedSessions.length > 0 
            ? Math.round(completedSessions.reduce((acc, l) => acc + (l.duration || 0), 0) / completedSessions.length)
            : 0
        const avgDurationHours = Math.round((avgDurationMinutes / 60) * 10) / 10

        // On-time rate (This is tricky without strict shift times, so let's use "Full Days" vs "Short Sessions")
        // Or simply "Present Days"
        const fullDays = monthlyLogs.filter(l => (l.duration || 0) > 240).length // > 4 hours

        return {
            success: true,
            data: {
                totalSessions,
                totalHours,
                avgDurationHours,
                fullDays
            }
        }
    } catch (error) {
        console.error('Error fetching staff self stats:', error)
        return { success: false, error: 'Failed to fetch stats' }
    }
}
