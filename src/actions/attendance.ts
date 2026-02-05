'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

import { getAuthenticatedStudent } from '@/lib/auth/student'

async function getStudentSession() {
    const student = await getAuthenticatedStudent()
    return student?.id
}

export async function getStudentAttendanceStatus() {
    const studentId = await getStudentSession()
    if (!studentId) return { success: false, error: 'Unauthorized' }

    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Check for any open attendance (Check-in today without checkout)
        const openAttendance = await prisma.attendance.findFirst({
            where: {
                studentId: studentId,
                checkOut: null,
                checkIn: { gte: today }
            },
            include: { branch: true },
            orderBy: { checkIn: 'desc' }
        })

        if (openAttendance) {
            return {
                success: true,
                status: 'checked-in',
                branchName: openAttendance.branch.name,
                checkInTime: openAttendance.checkIn
            }
        } else {
            return {
                success: true,
                status: 'checked-out'
            }
        }
    } catch (error) {
        console.error('Error getting student status:', error)
        return { success: false, error: 'Failed to get status' }
    }
}

export async function markAttendance(qrCode: string, location?: { lat: number, lng: number }) {
    const studentId = await getStudentSession()
    if (!studentId) return { success: false, error: 'Unauthorized' }

    let qrCodeValue = qrCode
    try {
        const data = JSON.parse(qrCode)
        if (data.code) qrCodeValue = data.code
    } catch {
        // ignore
    }

    try {
        // 1. Find branch by QR
        const branch = await prisma.branch.findUnique({
            where: { qrCode: qrCodeValue }
        })
        
        if (!branch) return { success: false, error: 'Invalid QR Code' }

        // 2. Check active or pending subscription for this branch
        const subscription = await prisma.studentSubscription.findFirst({
            where: {
                studentId: studentId,
                branchId: branch.id,
                status: { in: ['active', 'pending'] },
                endDate: { gte: new Date() }
            }
        })

        if (!subscription) {
            return { success: false, error: 'No active subscription for this branch' }
        }

        // 3. Check for any open attendance (Check-in today without checkout)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // Check for open attendance at THIS branch
        const openAttendanceHere = await prisma.attendance.findFirst({
            where: {
                studentId: studentId,
                branchId: branch.id,
                checkOut: null,
                checkIn: { gte: today }
            },
            orderBy: { checkIn: 'desc' }
        })

        if (openAttendanceHere) {
            // Perform Checkout
            const checkOutTime = new Date()
            const duration = Math.floor((checkOutTime.getTime() - openAttendanceHere.checkIn.getTime()) / 60000) // minutes
            
            // Determine status based on duration
            let status = 'present'
            if (duration < 120) status = 'short_session' // < 2 hours
            else if (duration > 360) status = 'full_day' // > 6 hours

            await prisma.attendance.update({
                where: { id: openAttendanceHere.id },
                data: {
                    checkOut: checkOutTime,
                    duration: duration > 0 ? duration : 0,
                    status
                }
            })
            revalidatePath('/student/home')
            revalidatePath('/student/attendance')
            revalidatePath('/student/attendance/history')
            return { 
                success: true, 
                type: 'check-out', 
                branchName: branch.name,
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
                branchId: { not: branch.id }
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
                     status: 'auto_checkout'
                 }
             })
             // We continue to check in at the new branch below...
        }

        // Perform Checkin
        const checkInTime = new Date()
        await prisma.attendance.create({
            data: {
                libraryId: branch.libraryId,
                studentId: studentId,
                branchId: branch.id,
                date: checkInTime,
                checkIn: checkInTime,
                status: 'present'
            }
        })
        revalidatePath('/student/home')
        revalidatePath('/student/attendance')
        revalidatePath('/student/attendance/history')
        revalidatePath('/staff/attendance')
        return { 
            success: true, 
            type: 'check-in', 
            branchName: branch.name,
            timestamp: checkInTime,
            message: openAttendanceOther ? `Checked out from ${openAttendanceOther.branch.name} and checked in here.` : undefined
        }

    } catch (error) {
        console.error('Attendance error:', error)
        return { success: false, error: 'System error' }
    }
}

export async function getTodayAttendance() {
    const studentId = await getStudentSession()
    if (!studentId) return null

    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const attendance = await prisma.attendance.findFirst({
            where: {
                studentId,
                checkIn: { gte: today }
            },
            include: {
                branch: {
                    select: { name: true }
                }
            },
            orderBy: { checkIn: 'desc' }
        })

        if (!attendance) return null

        // Fetch active subscription for plan details
        const subscription = await prisma.studentSubscription.findFirst({
            where: {
                studentId,
                branchId: attendance.branchId,
                status: 'active',
                startDate: { lte: attendance.checkIn },
                endDate: { gte: attendance.checkIn }
            },
            include: {
                plan: true
            }
        })

        return {
            ...attendance,
            plan: subscription?.plan ? {
                name: subscription.plan.name,
                shiftStart: subscription.plan.shiftStart,
                shiftEnd: subscription.plan.shiftEnd,
                hoursPerDay: subscription.plan.hoursPerDay
            } : null
        }
    } catch (error) {
        console.error('Error fetching today attendance:', error)
        return null
    }
}

export async function getAttendanceHistory() {
    const studentId = await getStudentSession()
    if (!studentId) return []

    try {
        const history = await prisma.attendance.findMany({
            where: { studentId },
            include: {
                branch: {
                    select: { name: true }
                }
            },
            orderBy: { checkIn: 'desc' }
        })

        // Fetch all subscriptions for this student to map plans
        const subscriptions = await prisma.studentSubscription.findMany({
            where: { studentId },
            include: {
                plan: true
            }
        })

        // Enrich history with plan tags
        const enrichedHistory = history.map(record => {
            // Find subscription active during this attendance
            // We use checkIn date to match subscription validity
            const subscription = subscriptions.find(sub => 
                sub.branchId === record.branchId &&
                sub.startDate <= record.checkIn &&
                sub.endDate >= record.checkIn
            )

            const plan = subscription?.plan
            const tags: { type: 'default' | 'destructive' | 'outline' | 'secondary' | 'success' | 'warning', label: string }[] = []

            if (plan) {
                // 1. Duration Limit Check (Flexible Plans)
                if (plan.hoursPerDay && record.duration) {
                     const maxMinutes = plan.hoursPerDay * 60
                     if (record.duration > maxMinutes) {
                         const extraMinutes = record.duration - maxMinutes
                         tags.push({ 
                             type: 'destructive', 
                             label: `Overstay (+${Math.floor(extraMinutes/60)}h ${extraMinutes%60}m)` 
                         })
                     }
                }

                // 2. Shift Timing Checks (Fixed Plans)
                if (plan.shiftStart && plan.shiftEnd) {
                    const checkInDate = new Date(record.checkIn)
                    const dateString = checkInDate.toISOString().split('T')[0] // YYYY-MM-DD
                    
                    // Parse Plan Start
                    const [startH, startM] = plan.shiftStart.split(':').map(Number)
                    const shiftStart = new Date(record.checkIn)
                    shiftStart.setHours(startH, startM, 0, 0)
                    
                    // Parse Plan End
                    const [endH, endM] = plan.shiftEnd.split(':').map(Number)
                    const shiftEnd = new Date(record.checkIn)
                    shiftEnd.setHours(endH, endM, 0, 0)
                    
                    // Handle overnight shifts if needed (end < start), but assuming day shifts for now
                    
                    // Late Check-in (Grace period 15 mins)
                    const lateThreshold = new Date(shiftStart.getTime() + 15 * 60000)
                    if (record.checkIn > lateThreshold) {
                        const diff = Math.floor((record.checkIn.getTime() - shiftStart.getTime()) / 60000)
                        tags.push({ type: 'warning', label: `Late (+${diff}m)` })
                    }

                    // Overstay past shift end
                    if (record.checkOut && record.checkOut > shiftEnd) {
                        const diff = Math.floor((record.checkOut.getTime() - shiftEnd.getTime()) / 60000)
                        if (diff > 10) { // 10 min buffer
                            tags.push({ type: 'destructive', label: `Overstay (+${diff}m)` })
                        }
                    }
                    
                    // Early Leave
                    if (record.checkOut && record.checkOut < shiftEnd) {
                         const diff = Math.floor((shiftEnd.getTime() - record.checkOut.getTime()) / 60000)
                         if (diff > 30) { // 30 min threshold
                             tags.push({ type: 'secondary', label: `Early Leave (-${Math.floor(diff/60)}h ${diff%60}m)` })
                         }
                    }
                }
            }

            return {
                ...record,
                planName: plan?.name,
                tags
            }
        })

        return enrichedHistory
    } catch (error) {
        console.error('Error fetching attendance history:', error)
        return []
    }
}

export async function getAttendanceStats() {
    const studentId = await getStudentSession()
    if (!studentId) return null

    try {
        const history = await prisma.attendance.findMany({
            where: { studentId },
            orderBy: { checkIn: 'desc' },
            select: { checkIn: true, duration: true }
        })

        // Calculate Stats
        const totalSessions = history.length
        const totalMinutes = history.reduce((acc, curr) => acc + (curr.duration || 0), 0)
        
        // Monthly Stats
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonth = lastMonthDate.getMonth()
        const lastMonthYear = lastMonthDate.getFullYear()

        const thisMonthMinutes = history
            .filter(h => h.checkIn.getMonth() === currentMonth && h.checkIn.getFullYear() === currentYear)
            .reduce((acc, curr) => acc + (curr.duration || 0), 0)

        const lastMonthMinutes = history
            .filter(h => h.checkIn.getMonth() === lastMonth && h.checkIn.getFullYear() === lastMonthYear)
            .reduce((acc, curr) => acc + (curr.duration || 0), 0)

        // Streak Calculation
        // Get unique dates (ignoring time)
        const uniqueDates = Array.from(new Set(history.map(h => h.checkIn.toISOString().split('T')[0]))).sort().reverse()
        
        let currentStreak = 0
        let longestStreak = 0
        
        if (uniqueDates.length > 0) {
            // Check if checked in today
            const todayStr = new Date().toISOString().split('T')[0]
            const lastCheckInStr = uniqueDates[0]
            
            // If last checkin was today or yesterday, streak is alive
            // Actually, for "Current Streak", we usually count consecutive days ending today or yesterday.
            
            let tempStreak = 1
            let maxStreak = 1
            
            // Iterate to find streaks
            for (let i = 0; i < uniqueDates.length - 1; i++) {
                const d1 = new Date(uniqueDates[i])
                const d2 = new Date(uniqueDates[i+1])
                const diffTime = Math.abs(d1.getTime() - d2.getTime())
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
                
                if (diffDays === 1) {
                    tempStreak++
                } else {
                    if (tempStreak > maxStreak) maxStreak = tempStreak
                    tempStreak = 1
                }
            }
            if (tempStreak > maxStreak) maxStreak = tempStreak
            longestStreak = maxStreak

            // Calculate current streak specifically
            // If the most recent date is today or yesterday, count backwards
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0]
            
            if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
                currentStreak = 1
                for (let i = 0; i < uniqueDates.length - 1; i++) {
                     const d1 = new Date(uniqueDates[i])
                     const d2 = new Date(uniqueDates[i+1])
                     const diffTime = Math.abs(d1.getTime() - d2.getTime())
                     const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                     
                     if (diffDays === 1) {
                         currentStreak++
                     } else {
                         break
                     }
                }
            }
        }

        return {
            totalSessions,
            totalHours: Math.round(totalMinutes / 60 * 10) / 10,
            thisMonthHours: Math.round(thisMonthMinutes / 60 * 10) / 10,
            lastMonthHours: Math.round(lastMonthMinutes / 60 * 10) / 10,
            currentStreak,
            longestStreak,
            averageDailyHours: uniqueDates.length > 0 ? Math.round((totalMinutes / 60 / uniqueDates.length) * 10) / 10 : 0
        }

    } catch (error) {
        console.error('Error fetching attendance stats:', error)
        return null
    }
}
