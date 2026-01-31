'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { uploadFile } from '@/actions/upload'
import { sendWelcomeEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import { COOKIE_KEYS } from '@/lib/auth/session'

import bcrypt from 'bcryptjs'

export async function createStudent(formData: FormData) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) throw new Error('Unauthorized')

    const owner = await prisma.owner.findUnique({
        where: { id: ownerId },
        select: { 
            libraryId: true,
            library: {
                select: { name: true }
            }
        }
    })

    if (!owner) throw new Error('Owner not found')

    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string
    const branchId = formData.get('branchId') as string
    
    // Optional fields
    const dob = formData.get('dob') as string
    const gender = formData.get('gender') as string
    const address = formData.get('address') as string
    const area = formData.get('area') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const pincode = formData.get('pincode') as string
    const guardianName = formData.get('guardianName') as string
    const guardianPhone = formData.get('guardianPhone') as string

    const imageFile = formData.get('image') as File | null
    const govtIdFile = formData.get('govtId') as File | null

    if (!name || !email || !phone || !branchId) {
        return { success: false, error: 'Required fields missing' }
    }

    if (!password && !dob) {
        return { success: false, error: 'Password or Date of Birth is required' }
    }

    if (!/^\d{10}$/.test(phone)) {
        return { success: false, error: 'Phone number must be exactly 10 digits' }
    }
    if (guardianPhone && !/^\d{10}$/.test(guardianPhone)) {
        return { success: false, error: 'Guardian phone number must be exactly 10 digits' }
    }

    try {
        // Check if email exists
        const existing = await prisma.student.findUnique({ where: { email } })
        if (existing) {
            return { success: false, error: 'Email already exists' }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        let imagePath = null
        if (imageFile && imageFile.size > 0) {
            imagePath = await uploadFile(imageFile)
        }

        let govtIdPath = null
        if (govtIdFile && govtIdFile.size > 0) {
            govtIdPath = await uploadFile(govtIdFile)
        }

        const student = await prisma.student.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                libraryId: owner.libraryId,
                branchId: branchId,
                dob: dob ? new Date(dob) : null,
                gender,
                address,
                area,
                city,
                state,
                pincode,
                guardianName,
                guardianPhone,
                image: imagePath,
                govtIdUrl: govtIdPath,
                govtIdStatus: govtIdPath ? 'verified' : 'none'
            }
        })

        revalidatePath('/owner/students')
        return { success: true, studentId: student.id }
    } catch (error) {
        console.error('Error creating student:', error)
        return { success: false, error: 'Failed to create student' }
    }
}

export type StudentFilter = {
    search?: string
    branchId?: string
    status?: string // 'active', 'expired', 'no_plan', 'blocked'
    page?: number
    limit?: number
}

export async function getOwnerStudents(filters: StudentFilter = {}) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) {
        throw new Error('Unauthorized')
    }

    const owner = await prisma.owner.findUnique({
        where: { id: ownerId },
        select: { libraryId: true }
    })

    if (!owner) {
        throw new Error('Owner not found')
    }

    const { search, branchId, status, page = 1, limit = 10 } = filters
    const skip = (page - 1) * limit

    // Base query conditions
    // Use AND to ensure all conditions are met
    const where: any = {
        AND: [
            {
                // Core scope: Student belongs to library OR has subscription in library
                OR: [
                    { libraryId: owner.libraryId },
                    {
                        subscriptions: {
                            some: {
                                libraryId: owner.libraryId
                            }
                        }
                    }
                ]
            }
        ]
    }

    // Search
    if (search) {
        where.AND.push({
            OR: [
                { name: { contains: search } },
                { email: { contains: search } },
                { phone: { contains: search } }
            ]
        })
    }

    // Handle Branch and Status filters
    if (status === 'expired') {
        // Expired means:
        // 1. Has subscriptions (filtered by branch if provided)
        // 2. BUT has NO active subscriptions (globally in this library)
        where.AND.push({
            subscriptions: {
                some: {
                    libraryId: owner.libraryId,
                    ...(branchId && { branchId })
                }
            }
        })
        where.AND.push({
            subscriptions: {
                none: {
                    libraryId: owner.libraryId,
                    status: 'active',
                    ...(branchId && { branchId })
                }
            }
        })
    } else if (status === 'active') {
        // Active means has at least one active subscription
        where.AND.push({
            subscriptions: {
                some: {
                    libraryId: owner.libraryId,
                    status: 'active',
                    ...(branchId && { branchId })
                }
            },
            isBlocked: false
        })
    } else if (status === 'new') {
        // New means created within last 24h AND no subscriptions (active or inactive)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const newConditions: any = {
            createdAt: { gte: oneDayAgo },
            subscriptions: {
                none: {
                    libraryId: owner.libraryId
                }
            },
            isBlocked: false
        }
        
        if (branchId) {
            newConditions.branchId = branchId
        }
        
        where.AND.push(newConditions)
    } else if (status === 'no_plan') {
        // No Plan means:
        // 1. Not blocked
        // 2. No subscriptions (in context)
        // 3. Not "New" (older than 24h) - optional, but usually "No Plan" implies steady state
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        const noPlanConditions: any = {
            isBlocked: false,
            createdAt: { lt: oneDayAgo }, // If it's < 24h, it's "New", not "No Plan" (usually)
            subscriptions: {
                none: {
                    libraryId: owner.libraryId,
                    ...(branchId && { branchId })
                }
            }
        }

        if (branchId) {
            // If checking for specific branch, they must belong to it (since they have no subs to link them)
            noPlanConditions.branchId = branchId
        }

        where.AND.push(noPlanConditions)

    } else if (status === 'blocked') {
        where.AND.push({ isBlocked: true })
    } else {
        // All Status (Active, Expired, No Plan)
        // If branch filter is applied, we want students who belong to this branch
        // OR have a subscription in this branch (for backward compatibility)
        if (branchId) {
            where.AND.push({
                OR: [
                    { branchId: branchId },
                    { 
                        subscriptions: { 
                            some: { 
                                branchId: branchId,
                                libraryId: owner.libraryId
                            } 
                        } 
                    }
                ]
            })
        }
    }

    try {
        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where,
                include: {
                    subscriptions: {
                        where: {
                            libraryId: owner.libraryId
                        },
                        include: {
                            plan: true,
                            branch: true,
                            seat: true
                        },
                        orderBy: { startDate: 'desc' }
                    }
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.student.count({ where })
        ])

        // Process students to add "status" field for UI
        const enhancedStudents = students.map(s => {
            // Find active subscription if any
            let activeSub = s.subscriptions.find((sub: any) => sub.status === 'active')
            
            // If branch filter is applied, status should be calculated relative to that branch
            if (branchId) {
                // Active subscription in THIS branch?
                activeSub = s.subscriptions.find((sub: any) => sub.status === 'active' && sub.branchId === branchId)
            }

            // Or get the latest one
            const latestSub = s.subscriptions[0]
            
            // If we are filtering by branch, prioritize showing the subscription for that branch
            let displaySub = activeSub || latestSub

            if (branchId) {
                const branchSub = s.subscriptions.find((sub: any) => sub.branchId === branchId)
                if (branchSub) {
                    displaySub = branchSub
                }
            }

            // Determine status
            let status = 'no_plan'
            if (s.isBlocked) {
                status = 'blocked'
            } else if (activeSub) {
                status = 'active'
            } else if (s.subscriptions.length > 0) {
                // If filtered by branch, check if has ANY subscription in this branch
                if (branchId) {
                     const hasBranchHistory = s.subscriptions.some((sub: any) => sub.branchId === branchId)
                     if (hasBranchHistory) {
                         status = 'expired'
                     } else {
                         // No history in this branch -> effectively no plan in this branch context
                         status = 'no_plan'
                     }
                } else {
                    status = 'expired'
                }
            }
            
            // Special check for "New" status (only if no active plan and no relevant history)
            if (status === 'no_plan') {
                const createdTime = new Date(s.createdAt).getTime()
                const now = new Date().getTime()
                const isNew = (now - createdTime) < 24 * 60 * 60 * 1000 // 24 hours
                if (isNew) {
                    status = 'new'
                }
            }

            return {
                ...s,
                status,
                currentPlan: displaySub?.plan?.name,
                currentBranch: displaySub?.branch?.name,
                seatNumber: displaySub?.seat?.number ? formatSeatNumber(displaySub.seat.number) : undefined
            }
        })

        return {
            students: enhancedStudents,
            total,
            pages: Math.ceil(total / limit)
        }

    } catch (error) {
        console.error('Error fetching students:', error)
        throw new Error('Failed to fetch students')
    }
}

export async function verifyStudentGovtId(studentId: string, status: 'verified' | 'rejected') {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) throw new Error('Unauthorized')

    try {
        await prisma.student.update({
            where: { id: studentId },
            data: { govtIdStatus: status }
        })
        revalidatePath(`/owner/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error verifying ID:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

export async function getStudentDetails(studentId: string) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) throw new Error('Unauthorized')

    const owner = await prisma.owner.findUnique({
        where: { id: ownerId },
        select: { libraryId: true }
    })

    if (!owner) throw new Error('Owner not found')

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                subscriptions: {
                    where: { libraryId: owner.libraryId },
                    include: {
                        plan: true,
                        branch: true,
                        seat: true
                    },
                    orderBy: { startDate: 'desc' }
                },
                attendance: {
                    where: { libraryId: owner.libraryId },
                    take: 50, // Limit history
                    orderBy: { date: 'desc' },
                    include: { branch: true }
                },
                payments: {
                    where: { libraryId: owner.libraryId },
                    orderBy: { date: 'desc' },
                    include: { 
                        subscription: { 
                            include: { 
                                plan: true,
                                seat: true
                            } 
                        },
                        additionalFee: true,
                        branch: { select: { name: true, address: true, city: true } }
                    }
                },
                supportTickets: {
                    where: { libraryId: owner.libraryId },
                    orderBy: { createdAt: 'desc' },
                    include: { comments: true }
                },
                notes: {
                    where: { libraryId: owner.libraryId },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!student) return null

        // Calculate Stats
        const totalAttendance = await prisma.attendance.count({
            where: { 
                studentId, 
                libraryId: owner.libraryId,
                status: 'present'
            }
        })

        const totalSpent = student.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0)

        const activeSubscription = student.subscriptions.find(s => s.status === 'active')

        return {
            student,
            stats: {
                totalAttendance,
                totalSpent,
                activePlan: activeSubscription?.plan?.name || 'None',
                lastActive: student.attendance[0]?.date || null
            }
        }
    } catch (error) {
        if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
            throw error
        }
        console.error('Error fetching student details:', error)
        return null
    }
}

export async function toggleBlockStudent(studentId: string, isBlocked: boolean) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.student.update({
            where: { id: studentId },
            data: { isBlocked }
        })
        
        revalidatePath(`/owner/students/${studentId}`)
        revalidatePath('/owner/students')
        
        return { success: true }
    } catch (error) {
        console.error('Error updating student block status:', error)
        return { success: false, error: 'Failed to update status' }
    }
}

export async function deleteStudent(studentId: string) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.student.delete({
            where: { id: studentId }
        })
        
        revalidatePath('/owner/students')
        return { success: true }
    } catch (error) {
        console.error('Error deleting student:', error)
        return { success: false, error: 'Failed to delete student' }
    }
}

export async function updateStudent(formData: FormData) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) return { success: false, error: 'Unauthorized' }

    const id = formData.get('id') as string
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    
    // Address Fields
    const address = formData.get('address') as string
    const area = formData.get('area') as string
    const city = formData.get('city') as string
    const state = formData.get('state') as string
    const pincode = formData.get('pincode') as string

    // Profile Fields
    const gender = formData.get('gender') as string
    const dob = formData.get('dob') as string

    // Guardian Fields
    const guardianName = formData.get('guardianName') as string
    const guardianPhone = formData.get('guardianPhone') as string

    if (phone && !/^\d{10}$/.test(phone)) {
        return { success: false, error: 'Phone number must be exactly 10 digits' }
    }
    if (guardianPhone && !/^\d{10}$/.test(guardianPhone)) {
        return { success: false, error: 'Guardian phone number must be exactly 10 digits' }
    }

    try {
        await prisma.student.update({
            where: { id },
            data: {
                name,
                email,
                phone,
                address,
                area,
                city,
                state,
                pincode,
                gender,
                dob: dob ? new Date(dob) : null,
                guardianName,
                guardianPhone
            }
        })
        
        revalidatePath(`/owner/students/${id}`)
        revalidatePath('/student/profile')
        return { success: true }
    } catch (error) {
        console.error('Error updating student:', error)
        return { success: false, error: 'Failed to update student' }
    }
}

export async function addStudentNote(studentId: string, content: string) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) return { success: false, error: 'Unauthorized' }

    try {
        const owner = await prisma.owner.findUnique({
            where: { id: ownerId }
        })

        if (!owner) return { success: false, error: 'Owner not found' }

        await prisma.studentNote.create({
            data: {
                studentId,
                libraryId: owner.libraryId,
                content,
                createdBy: `Owner: ${owner.name}`
            }
        })

        revalidatePath(`/owner/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error adding note:', error)
        return { success: false, error: 'Failed to add note' }
    }
}

export async function deleteStudentNote(noteId: string, studentId: string) {
    const cookieStore = await cookies()
    const ownerId = cookieStore.get(COOKIE_KEYS.OWNER)?.value

    if (!ownerId) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.studentNote.delete({
            where: { id: noteId }
        })

        revalidatePath(`/owner/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error deleting note:', error)
        return { success: false, error: 'Failed to delete note' }
    }
}
