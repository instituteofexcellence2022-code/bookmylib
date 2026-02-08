'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { uploadFile } from '@/actions/upload'
import { sendWelcomeEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

export async function createStudent(formData: FormData) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    // Owner already has libraryId included from getAuthenticatedOwner logic (see src/lib/auth/owner.ts)
    // But we need to make sure we have access to it.
    // getAuthenticatedOwner includes library. Let's check type.
    // It returns Owner & { library: Library }.
    
    // We can skip the manual DB lookup.
    // However, the original code selected specific fields.
    // We can just use owner.libraryId directly.
    
    const name = formData.get('name') as string
    const email = formData.get('email') as string || null
    const phone = formData.get('phone') as string || null
    const password = formData.get('password') as string
    const branchId = formData.get('branchId') as string
    
    // Optional fields
    const dob = formData.get('dob') as string
    const gender = formData.get('gender') as string
    const address = formData.get('address') as string || null
    const area = formData.get('area') as string || null
    const city = formData.get('city') as string || null
    const state = formData.get('state') as string || null
    const pincode = formData.get('pincode') as string || null
    const guardianName = formData.get('guardianName') as string
    const guardianPhone = formData.get('guardianPhone') as string

    const imageFile = formData.get('image') as File | null
    const govtIdFile = formData.get('govtId') as File | null

    if (!name || !branchId) {
        return { success: false, error: 'Required fields missing' }
    }

    if (!email && !phone) {
        return { success: false, error: 'Email or Phone is required' }
    }

    if (!password && !dob) {
        return { success: false, error: 'Password or Date of Birth is required' }
    }

    if (phone && !/^\d{10}$/.test(phone)) {
        return { success: false, error: 'Phone number must be exactly 10 digits' }
    }
    if (guardianPhone && !/^\d{10}$/.test(guardianPhone)) {
        return { success: false, error: 'Guardian phone number must be exactly 10 digits' }
    }

    try {
        // Check if email exists
        if (email) {
            const existing = await prisma.student.findUnique({ where: { email } })
            if (existing) {
                return { success: false, error: 'Email already exists' }
            }
        }

        // Check if phone exists
        if (phone) {
            const existingPhone = await prisma.student.findUnique({ where: { phone } })
            if (existingPhone) {
                return { success: false, error: 'Phone number already exists' }
            }
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null

        let imagePath = null
        if (imageFile && imageFile.size > 0) {
            const uploadRes = await uploadFile(imageFile)
            if (uploadRes.success) {
                imagePath = uploadRes.data
            }
        }

        let govtIdPath = null
        if (govtIdFile && govtIdFile.size > 0) {
            const uploadRes = await uploadFile(govtIdFile)
            if (uploadRes.success) {
                govtIdPath = uploadRes.data
            }
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

        try {
            if (email) {
                await sendWelcomeEmail({
                    studentName: name,
                    studentEmail: email,
                    libraryName: owner.library.name
                })
            }
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError)
        }

        revalidatePath('/owner/students')
        return { success: true, data: student }
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
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    const { search, branchId, status, page = 1, limit = 10 } = filters
    const skip = (page - 1) * limit

    // Base query conditions
    // Use AND to ensure all conditions are met
    const andConditions: Prisma.StudentWhereInput[] = [
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

    // Search
    if (search) {
        andConditions.push({
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } }
            ]
        })
    }

    // Handle Branch and Status filters
    if (status === 'expired') {
        // Expired means:
        // 1. Has subscriptions (filtered by branch if provided)
        // 2. BUT has NO active subscriptions (globally in this library)
        andConditions.push({
            subscriptions: {
                some: {
                    libraryId: owner.libraryId,
                    ...(branchId && { branchId })
                }
            }
        })
        andConditions.push({
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
        andConditions.push({
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
        const newConditions: Prisma.StudentWhereInput = {
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
        
        andConditions.push(newConditions)
    } else if (status === 'no_plan') {
        // No Plan means:
        // 1. Not blocked
        // 2. No subscriptions (in context)
        // 3. Not "New" (older than 24h) - optional, but usually "No Plan" implies steady state
        
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        
        const noPlanConditions: Prisma.StudentWhereInput = {
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

        andConditions.push(noPlanConditions)

    } else if (status === 'blocked') {
        andConditions.push({ isBlocked: true })
    } else {
        // All Status (Active, Expired, No Plan)
        // If branch filter is applied, we want students who belong to this branch
        // OR have a subscription in this branch (for backward compatibility)
        if (branchId) {
            andConditions.push({
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

    const where: Prisma.StudentWhereInput = {
        AND: andConditions
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let activeSub = s.subscriptions.find((sub: any) => sub.status === 'active')
            
            // If branch filter is applied, status should be calculated relative to that branch
            if (branchId) {
                // Active subscription in THIS branch?
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                activeSub = s.subscriptions.find((sub: any) => sub.status === 'active' && sub.branchId === branchId)
            }

            // Or get the latest one
            const latestSub = s.subscriptions[0]
            
            // If we are filtering by branch, prioritize showing the subscription for that branch
            let displaySub = activeSub || latestSub

            if (branchId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            success: true,
            data: {
                students: enhancedStudents,
                total,
                pages: Math.ceil(total / limit)
            }
        }

    } catch (error) {
        console.error('Error fetching students:', error)
        return { success: false, error: 'Failed to fetch students' }
    }
}

export async function verifyStudentGovtId(studentId: string, status: 'verified' | 'rejected') {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { libraryId: true }
        })

        if (!student || student.libraryId !== owner.libraryId) {
            return { success: false, error: 'Student not found' }
        }

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

export async function getPendingVerifications() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const students = await prisma.student.findMany({
            where: {
                libraryId: owner.libraryId,
                govtIdStatus: 'pending',
                govtIdUrl: { not: null }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                govtIdUrl: true,
                govtIdStatus: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        })

        return { success: true, data: students }
    } catch (error) {
        console.error('Error fetching pending verifications:', error)
        return { success: false, error: 'Failed to fetch pending verifications' }
    }
}

export async function getStudentDetails(studentId: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

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

        if (!student) return { success: false, error: 'Student not found' }

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
            success: true,
            data: {
                student,
                stats: {
                    totalAttendance,
                    totalSpent,
                    activePlan: activeSubscription?.plan?.name || 'None',
                    lastActive: student.attendance[0]?.date || null
                }
            }
        }
    } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
            throw error
        }
        console.error('Error fetching student details:', error)
        return { success: false, error: 'Failed to fetch student details' }
    }
}

export async function toggleBlockStudent(studentId: string, isBlocked: boolean) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

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
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { libraryId: true }
        })

        if (!student || student.libraryId !== owner.libraryId) {
            return { success: false, error: 'Student not found' }
        }

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

export async function getStudentDetailsForScanner(studentId: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                subscriptions: {
                    where: {
                        libraryId: owner.libraryId,
                        // Removed status filter to get ANY subscription (Active, Expired, Pending)
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: {
                        plan: true,
                        branch: true,
                        seat: true
                    }
                },
                attendance: {
                    where: { libraryId: owner.libraryId },
                    orderBy: { checkIn: 'desc' },
                    take: 5
                },
                payments: {
                    where: {
                        libraryId: owner.libraryId
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                },
                branch: {
                    select: { id: true, name: true, address: true, city: true }
                }
            }
        })

        if (!student) return { success: false, error: 'Student not found' }

        const latestSubscription = student.subscriptions[0] || null
        const candidateBranch = latestSubscription?.branch || student.branch || null
        const registrationStatus = latestSubscription ? 'registered' : 'not_registered'

        return {
            success: true,
            data: {
                student: {
                    id: student.id,
                    name: student.name,
                    email: student.email,
                    phone: student.phone,
                    image: student.image,
                    isBlocked: student.isBlocked,
                    govtIdStatus: student.govtIdStatus,
                    govtIdUrl: student.govtIdUrl
                },
                subscription: latestSubscription,
                candidateBranch,
                candidateBranchId: candidateBranch?.id || null,
                registrationStatus,
                attendance: student.attendance || [],
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                pendingPayment: student.payments.find((p: any) => p.status === 'pending' || p.status === 'pending_verification') || null,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lastPayment: student.payments.find((p: any) => p.status === 'completed') || null
            }
        }
    } catch (error) {
        console.error('Error fetching student details:', error)
        return { success: false, error: 'Failed to fetch student details' }
    }
}

export async function updateStudent(id: string, formData: FormData) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }
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
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
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
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

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
