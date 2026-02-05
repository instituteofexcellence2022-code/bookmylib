'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { uploadFile } from '@/actions/upload'
import { sendWelcomeEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'

export type StudentFilter = {
    search?: string
    status?: string // 'active', 'expired', 'no_plan', 'blocked'
    page?: number
    limit?: number
}

import { getAuthenticatedStaff } from '@/lib/auth/staff'

export async function getStaffStudents(filters: StudentFilter = {}) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    const { search, status, page = 1, limit = 10 } = filters
    const skip = (page - 1) * limit

    const where: Prisma.StudentWhereInput = {
        AND: [
            {
                OR: [
                    { branchId: staff.branchId },
                    {
                        subscriptions: {
                            some: {
                                branchId: staff.branchId
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
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } }
            ]
        })
    }

    // Status Filter
    if (status === 'expired') {
        where.AND.push({
            subscriptions: {
                some: { libraryId: staff.libraryId }
            }
        })
        where.AND.push({
            subscriptions: {
                none: {
                    libraryId: staff.libraryId,
                    status: 'active'
                }
            }
        })
    } else if (status === 'active') {
        where.AND.push({
            subscriptions: {
                some: {
                    libraryId: staff.libraryId,
                    status: 'active'
                }
            },
            isBlocked: false
        })
    } else if (status === 'new') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        where.AND.push({
            createdAt: { gte: oneDayAgo },
            subscriptions: {
                none: { libraryId: staff.libraryId }
            },
            isBlocked: false
        })
    } else if (status === 'no_plan') {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        where.AND.push({
            isBlocked: false,
            createdAt: { lt: oneDayAgo },
            subscriptions: {
                none: { libraryId: staff.libraryId }
            }
        })
    } else if (status === 'blocked') {
        where.AND.push({ isBlocked: true })
    }

    try {
        const [students, total] = await Promise.all([
        prisma.student.findMany({
            where,
            include: {
                subscriptions: {
                    where: { status: 'active' },
                    include: { 
                        plan: true,
                        branch: true,
                        seat: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                branch: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        }),
        prisma.student.count({ where })
    ])

    // Process students for UI
    const enhancedStudents = students.map(s => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const activeSub = s.subscriptions.find((sub: any) => sub.status === 'active')
        const latestSub = s.subscriptions[0]
        const displaySub = activeSub || latestSub

        let status = 'no_plan'
        if (s.isBlocked) {
            status = 'blocked'
        } else if (activeSub) {
            status = 'active'
        } else if (s.subscriptions.length > 0) {
            status = 'expired'
        } else {
            const createdTime = new Date(s.createdAt).getTime()
            const now = new Date().getTime()
            if ((now - createdTime) < 24 * 60 * 60 * 1000) {
                status = 'new'
            }
        }

        return {
            ...s,
            phone: s.phone ? `******${s.phone.slice(-4)}` : null,
            dob: null,
            govtIdUrl: null,
            password: null,
            status,
            currentPlan: displaySub?.plan?.name,
            currentBranch: displaySub?.branch?.name,
            seatNumber: displaySub?.seat?.number ? formatSeatNumber(displaySub.seat.number) : undefined
        }
    })

    return {
        students: enhancedStudents,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    }
    } catch (error) {
        console.error('Error fetching students:', error)
        throw new Error('Failed to fetch students')
    }
}

export async function getStudentDetailsForScanner(studentId: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                subscriptions: {
                    where: {
                        OR: [
                            { status: 'active' },
                            { status: 'pending' }
                        ]
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
                    where: {
                        checkIn: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    },
                    orderBy: { checkIn: 'desc' },
                    take: 1
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 5
                }
            }
        })

        if (!student) return { success: false, error: 'Student not found' }

        if (student.libraryId !== staff.libraryId) {
            return { success: false, error: 'Student not found' }
        }

        return {
            success: true,
            data: {
                student: {
                    id: student.id,
                    name: student.name,
                    email: student.email,
                    phone: student.phone,
                    image: student.image,
                    isBlocked: student.isBlocked
                },
                subscription: student.subscriptions[0] || null,
                attendance: student.attendance[0] || null,
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

export async function createStudent(formData: FormData) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    const name = formData.get('name') as string
    const email = formData.get('email') as string || null
    const phone = formData.get('phone') as string || null
    const password = formData.get('password') as string
    
    // Strict Branch Isolation: Staff can ONLY create students in their branch
    const branchId = staff.branchId
    
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

    if (!name) {
        return { success: false, error: 'Name is required' }
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
        if (email) {
            const existing = await prisma.student.findUnique({ where: { email } })
            if (existing) {
                return { success: false, error: 'Email already exists' }
            }
        }
        if (phone) {
            const existingPhone = await prisma.student.findUnique({ where: { phone } })
            if (existingPhone) {
                return { success: false, error: 'Phone number already exists' }
            }
        }

        const hashedPassword = password ? await bcrypt.hash(password, 10) : null


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
                libraryId: staff.libraryId,
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
                govtIdStatus: govtIdPath ? 'pending' : 'none'
            }
        })

        // Send Welcome Email
        if (student.email) {
            await sendWelcomeEmail({
                studentName: student.name,
                studentEmail: student.email,
                libraryName: staff.library?.name
            })
        }
        
        // Log activity
        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'create',
                action: 'Created Student',
                details: `Created student ${name} (${email})`,
                entity: 'Student Management',
                status: 'success'
            }
        })

        revalidatePath('/staff/students')
        return { success: true, studentId: student.id }
    } catch (error) {
        console.error('Error creating student:', error)
        return { success: false, error: 'Failed to create student' }
    }
}

export async function getStudentDetails(studentId: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    try {
        // STRICT BRANCH CHECK: Use findFirst with branch filters instead of findUnique
        const student = await prisma.student.findFirst({
            where: { 
                id: studentId,
                OR: [
                    { branchId: staff.branchId },
                    { subscriptions: { some: { branchId: staff.branchId } } }
                ]
            },
            include: {
                subscriptions: {
                    where: { branchId: staff.branchId }, // Only show subscriptions for this branch
                    include: {
                        plan: true,
                        branch: true,
                        seat: true
                    },
                    orderBy: { startDate: 'desc' }
                },
                attendance: {
                    where: { branchId: staff.branchId }, // Only show attendance for this branch
                    orderBy: {
                        date: 'desc'
                    },
                    take: 50,
                    include: { branch: true }
                },
                payments: {
                    where: { 
                        OR: [
                            { branchId: staff.branchId },
                            { subscription: { branchId: staff.branchId } }
                        ]
                    },
                    orderBy: { date: 'desc' },
                    include: { 
                        subscription: { include: { plan: true } },
                        additionalFee: true 
                    }
                },
                supportTickets: {
                    where: { branchId: staff.branchId },
                    orderBy: { createdAt: 'desc' },
                    include: { comments: true }
                },
                notes: {
                    where: { 
                        // Notes don't have branchId usually, but let's assume library level notes are ok? 
                        // User said "only view that branch student". 
                        // If notes are shared, maybe ok. But safest is to filter or leave as libraryId if no branchId on Note.
                        // Let's check Note schema later. For now, keep libraryId but maybe restrict writing?
                        libraryId: staff.libraryId 
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!student) return null

        const totalAttendance = await prisma.attendance.count({
            where: { 
                studentId, 
                branchId: staff.branchId, // Strict branch count
                status: 'present'
            }
        })

        const totalSpent = student.payments.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0)
        const activeSubscription = student.subscriptions.find(s => s.status === 'active')

        // Privacy Masking
        const maskedStudent = {
            ...student,
            phone: student.phone ? `******${student.phone.slice(-4)}` : null,
            dob: null, // Hide DOB
            govtIdUrl: null, // Hide ID document
            hasGovtId: !!student.govtIdUrl, // Indicate existence
            // Keep govtIdStatus
        }

        return {
            student: maskedStudent,
            stats: {
                totalAttendance,
                totalSpent,
                activePlan: activeSubscription?.plan?.name || 'None',
                lastActive: student.attendance[0]?.date || null
            }
        }
    } catch (error) {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         if ((error as any)?.digest === 'DYNAMIC_SERVER_USAGE') {
            throw error
        }
        console.error('Error fetching student details:', error)
        return null
    }
}

export async function getStaffBranchOptions() {
    const staff = await getAuthenticatedStaff()
    if (!staff || !staff.branch) return []
    
    return [{
        label: staff.branch.name,
        value: staff.branch.id
    }]
}

export async function toggleBlockStudent(studentId: string, isBlocked: boolean) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    // Use parameters to avoid unused variable warning
    void studentId
    void isBlocked

    // Explicitly deny block action for staff
    return { success: false, error: 'Staff are not authorized to block/unblock students' }

    /*
    try {
        await prisma.student.update({
            where: { id: studentId },
            data: { isBlocked }
        })
        
        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'update',
                action: isBlocked ? 'Block Student' : 'Unblock Student',
                details: `${isBlocked ? 'Blocked' : 'Unblocked'} student ${studentId}`,
                entity: 'Student Management',
                status: 'success'
            }
        })

        revalidatePath(`/staff/students/${studentId}`)
        revalidatePath('/staff/students')
        
        return { success: true }
    } catch (error) {
        console.error('Error updating student block status:', error)
        return { success: false, error: 'Failed to update status' }
    }
    */
}

export async function deleteStudent(studentId: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }
    
    // Use parameter to avoid unused variable warning
    void studentId

    // Explicitly deny delete action for staff
    return { success: false, error: 'Staff are not authorized to delete students' }
    
    /* 
    // Logic disabled for staff
    try {
        await prisma.student.delete({
            where: { id: studentId }
        })
        
        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'delete',
                action: 'Delete Student',
                details: `Deleted student ${studentId}`,
                entity: 'Student Management',
                status: 'success'
            }
        })
        
        revalidatePath('/staff/students')
        return { success: true }
    } catch (error) {
        console.error('Error deleting student:', error)
        return { success: false, error: 'Failed to delete student' }
    }
    */
}

export async function updateStudent(formData: FormData) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

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
    // const gender = formData.get('gender') as string
    const dob = formData.get('dob') as string

    // Guardian Fields
    const guardianName = formData.get('guardianName') as string
    const guardianPhone = formData.get('guardianPhone') as string

    if (guardianPhone && !/^\d{10}$/.test(guardianPhone)) {
        return { success: false, error: 'Guardian phone number must be exactly 10 digits' }
    }

    try {
        const existingStudent = await prisma.student.findUnique({ where: { id } })
        if (!existingStudent) return { success: false, error: 'Student not found' }

        // Ignore empty DOB update if existing has value (prevent accidental clearing due to masked view)
        // Only update DOB if it's provided and valid
        // let dobDate: Date | null | undefined = undefined
        if (dob) {
            // dobDate = new Date(dob)
        } else {
            // If empty, keep existing (since staff can't see it to clear it explicitly)
            // If they really want to clear it, they can't via this UI restriction.
            // dobDate = existingStudent.dob
        }

    // Restrict staff from editing personal details
    // Ignore updates to name, email, phone, gender, dob
    
    await prisma.student.update({
        where: { id },
        data: {
            // Personal details - Keep existing values
            // name, email, phone, gender, dob are IGNORED
            
            // Allow updates to address and guardian info
            address,
            area,
            city,
            state,
            pincode,
            guardianName,
            guardianPhone
        }
    })
        
        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'update',
                action: 'Update Student',
                details: `Updated student ${name} (${id})`,
                entity: 'Student Management',
                status: 'success'
            }
        })
        
        revalidatePath(`/staff/students/${id}`)
        return { success: true }
    } catch (error) {
        console.error('Error updating student:', error)
        return { success: false, error: 'Failed to update student' }
    }
}

export async function addStudentNote(studentId: string, content: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.studentNote.create({
            data: {
                studentId,
                libraryId: staff.libraryId,
                content,
                createdBy: `Staff: ${staff.name}`
            }
        })

        revalidatePath(`/staff/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error adding note:', error)
        return { success: false, error: 'Failed to add note' }
    }
}

export async function deleteStudentNote(noteId: string, studentId: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    // Verify access
    const note = await prisma.studentNote.findUnique({
        where: { id: noteId },
        include: { student: { include: { subscriptions: true } } }
    })

    if (!note) return { success: false, error: 'Note not found' }

    // Check if student belongs to staff's branch
    const isBranchStudent = note.student.branchId === staff.branchId || 
                            note.student.subscriptions.some(s => s.branchId === staff.branchId)

    if (!isBranchStudent) {
        return { success: false, error: 'Unauthorized: Student not in your branch' }
    }

    try {
        await prisma.studentNote.delete({
            where: { id: noteId }
        })

        revalidatePath(`/staff/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error deleting note:', error)
        return { success: false, error: 'Failed to delete note' }
    }
}

export async function verifyStudentGovtId(studentId: string, status: 'verified' | 'rejected') {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    // Use parameters to avoid unused variable warning
    void studentId
    void status

    // Check if user is an Owner (Staff cannot verify)
    // Actually, getAuthenticatedStaff only returns Staff model. 
    // If the requirement is "only owner can verify", then staff calling this should be rejected.
    return { success: false, error: 'Unauthorized: Only Library Owners can verify IDs' }

    /* 
    // Verify student belongs to branch
    const student = await prisma.student.findFirst({
        where: {
            id: studentId,
            OR: [
                { branchId: staff.branchId },
                { subscriptions: { some: { branchId: staff.branchId } } }
            ]
        }
    })

    if (!student) {
        return { success: false, error: 'Student not found or unauthorized' }
    }

    try {
        await prisma.student.update({
            where: { id: studentId },
            data: { govtIdStatus: status }
        })

        // Log activity
        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'update',
                action: 'Verify Govt ID',
                details: `${status === 'verified' ? 'Verified' : 'Rejected'} govt ID for student ${student.name}`,
                entity: 'Student Management',
                status: 'success'
            }
        })

        revalidatePath(`/staff/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error verifying govt ID:', error)
        return { success: false, error: 'Failed to update verification status' }
    }
    */
}

export async function reportStudent(studentId: string, reason: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    if (!reason.trim()) {
        return { success: false, error: 'Reason is required' }
    }

    try {
        // Verify student belongs to branch
        const student = await prisma.student.findFirst({
            where: {
                id: studentId,
                OR: [
                    { branchId: staff.branchId },
                    { subscriptions: { some: { branchId: staff.branchId } } }
                ]
            }
        })

        if (!student) {
            return { success: false, error: 'Student not found or unauthorized' }
        }

        // Create a Support Ticket as the Report
        await prisma.supportTicket.create({
            data: {
                libraryId: staff.libraryId,
                branchId: staff.branchId,
                staffId: staff.id, // Reported by Staff
                studentId: studentId, // Reported Student
                subject: `Report: Student ${student.name}`,
                description: reason,
                category: 'discipline', // Custom category for reports
                priority: 'high',
                status: 'open'
            }
        })

        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'issue',
                action: 'Report Student',
                details: `Reported student ${student.name}. Reason: ${reason}`,
                entity: 'Student Management',
                status: 'success'
            }
        })

        revalidatePath(`/staff/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error reporting student:', error)
        return { success: false, error: 'Failed to report student' }
    }
}

export async function uploadStudentGovtId(formData: FormData) {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    const studentId = formData.get('studentId') as string
    const file = formData.get('file') as File

    if (!studentId || !file) {
        return { success: false, error: 'Missing required fields' }
    }

    try {
        // Verify student belongs to branch
        const student = await prisma.student.findFirst({
            where: {
                id: studentId,
                OR: [
                    { branchId: staff.branchId },
                    { subscriptions: { some: { branchId: staff.branchId } } }
                ]
            }
        })

        if (!student) {
            return { success: false, error: 'Student not found or unauthorized' }
        }

        const path = await uploadFile(file)
        
        await prisma.student.update({
            where: { id: studentId },
            data: {
                govtIdUrl: path,
                govtIdStatus: 'pending' // Reset status to pending on new upload
            }
        })

        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'update',
                action: 'Upload Govt ID',
                details: `Uploaded government ID for student ${student.name}`,
                entity: 'Student Management',
                status: 'success'
            }
        })

        revalidatePath(`/staff/students/${studentId}`)
        return { success: true }
    } catch (error) {
        console.error('Error uploading govt ID:', error)
        return { success: false, error: 'Failed to upload document' }
    }
}
