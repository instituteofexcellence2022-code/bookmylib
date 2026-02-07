'use server'

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, addDays, subDays } from 'date-fns'
import { getAttendanceStatus } from '@/actions/owner/dashboard'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { Prisma } from '@prisma/client'

export async function getUpcomingExpiries(days: string | number = 7, branchId?: string) {
    let context = null;
    
    // Check Owner Auth
    const owner = await getAuthenticatedOwner()
    if (owner) {
        context = { 
            type: 'owner', 
            libraryId: owner.libraryId, 
            branchId: branchId && branchId !== 'all' ? branchId : undefined 
        }
    } else {
        // Check Staff Auth
        const staff = await getAuthenticatedStaff()
        if (staff) {
            const staffBranch = await prisma.branch.findUnique({
                where: { id: staff.branchId },
                select: { libraryId: true }
            })
            
            if (staffBranch) {
                context = { 
                    type: 'staff', 
                    libraryId: staffBranch.libraryId, 
                    branchId: staff.branchId // Staff is strictly limited to their branch
                }
            }
        }
    }

    if (!context) return { success: false, error: 'Unauthorized' }

    try {
        const now = new Date()
        let startDate = now
        let endDate = addDays(now, 7) // Default

        if (typeof days === 'string' && isNaN(Number(days))) {
            switch (days) {
                case 'today':
                    startDate = now
                    endDate = endOfDay(now)
                    break
                case 'tomorrow':
                    startDate = startOfDay(addDays(now, 1))
                    endDate = endOfDay(addDays(now, 1))
                    break
                case '0-3':
                    startDate = now
                    endDate = endOfDay(addDays(now, 3))
                    break
                case '3-7':
                    startDate = startOfDay(addDays(now, 4))
                    endDate = endOfDay(addDays(now, 7))
                    break
                case '7-15':
                    startDate = startOfDay(addDays(now, 8))
                    endDate = endOfDay(addDays(now, 15))
                    break
                case '15-30':
                    startDate = startOfDay(addDays(now, 16))
                    endDate = endOfDay(addDays(now, 30))
                    break
            }
        } else {
            const daysNum = typeof days === 'string' ? parseInt(days) : days
            endDate = new Date(now)
            endDate.setDate(now.getDate() + daysNum)
        }

        const where: Prisma.StudentSubscriptionWhereInput = {
            libraryId: context.libraryId,
            status: 'active',
            endDate: {
                gte: startDate,
                lte: endDate
            }
        }

        if (context.branchId) {
            where.branchId = context.branchId
        }

        const expiries = await prisma.studentSubscription.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        image: true
                    }
                },
                plan: true,
                seat: true,
                branch: { select: { name: true } }
            },
            orderBy: {
                endDate: 'asc'
            }
        })

        const studentIds = expiries.map(s => s.studentId)
        const presentStudentIds = await getAttendanceStatus(studentIds, context.libraryId)

        return { success: true, data: expiries.map(s => ({ ...s, isPresentToday: presentStudentIds.has(s.studentId) })) }
    } catch (error) {
        console.error('Error fetching upcoming expiries:', error)
        return { success: false, error: 'Failed to fetch upcoming expiries' }
    }
}

export async function getOverdueSubscriptions(days: string | number = 30, branchId?: string) {
    let context = null;
    
    const owner = await getAuthenticatedOwner()
    if (owner) {
        context = { 
            type: 'owner', 
            libraryId: owner.libraryId, 
            branchId: branchId && branchId !== 'all' ? branchId : undefined 
        }
    } else {
        const staff = await getAuthenticatedStaff()
        if (staff) {
            const staffBranch = await prisma.branch.findUnique({
                where: { id: staff.branchId },
                select: { libraryId: true }
            })
            
            if (staffBranch) {
                context = { 
                    type: 'staff', 
                    libraryId: staffBranch.libraryId, 
                    branchId: staff.branchId 
                }
            }
        }
    }

    if (!context) return { success: false, error: 'Unauthorized' }

    try {
        const now = new Date()
        let startDate = subDays(now, 30)
        let endDate = now

        if (typeof days === 'string' && isNaN(Number(days))) {
            switch (days) {
                case 'today':
                    startDate = startOfDay(now)
                    endDate = now
                    break
                case 'yesterday':
                    startDate = startOfDay(subDays(now, 1))
                    endDate = endOfDay(subDays(now, 1))
                    break
                case '0-3':
                    startDate = startOfDay(subDays(now, 3))
                    endDate = now
                    break
                case '3-7':
                    startDate = startOfDay(subDays(now, 7))
                    endDate = endOfDay(subDays(now, 4))
                    break
                case '7-15':
                    startDate = startOfDay(subDays(now, 15))
                    endDate = endOfDay(subDays(now, 8))
                    break
                case '15-30':
                    startDate = startOfDay(subDays(now, 30))
                    endDate = endOfDay(subDays(now, 16))
                    break
            }
        } else {
            const daysNum = typeof days === 'string' ? parseInt(days) : days
            startDate = new Date(now)
            startDate.setDate(now.getDate() - daysNum)
        }

        const where: Prisma.StudentSubscriptionWhereInput = {
            libraryId: context.libraryId,
            endDate: {
                lt: endDate,
                gte: startDate
            },
            status: { in: ['active', 'expired'] }
        }

        if (context.branchId) {
            where.branchId = context.branchId
        }

        const overdue = await prisma.studentSubscription.findMany({
            where,
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        image: true
                    }
                },
                plan: true,
                seat: true,
                branch: { select: { name: true } }
            },
            orderBy: {
                endDate: 'desc'
            }
        })

        const studentIds = overdue.map(s => s.studentId)
        const presentStudentIds = await getAttendanceStatus(studentIds, context.libraryId)

        return { success: true, data: overdue.map(s => ({ ...s, isPresentToday: presentStudentIds.has(s.studentId) })) }
    } catch (error) {
        console.error('Error fetching overdue subscriptions:', error)
        return { success: false, error: 'Failed to fetch overdue subscriptions' }
    }
}