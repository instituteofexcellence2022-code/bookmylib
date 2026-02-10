'use server'

import { prisma } from '@/lib/prisma'
import { Prisma, Student, Staff, Owner } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { sendPasswordResetEmail, sendWelcomeEmail, sendEmailVerificationEmail } from '@/actions/email'
import { verify } from 'otplib'
import { createSession, deleteSession } from '@/lib/auth/session'

// --- Session Management ---

export async function logout() {
    await deleteSession('owner')
    await deleteSession('staff')
    await deleteSession('student')
    return { success: true }
}

import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { getAuthenticatedStudent } from '@/lib/auth/student'

export async function getCurrentUser() {
    const owner = await getAuthenticatedOwner()
    if (owner) return { 
        name: owner.name, 
        image: null, 
        initials: owner.name.substring(0, 2).toUpperCase(),
        role: 'owner',
        link: '/owner/dashboard'
    }
    
    const staff = await getAuthenticatedStaff()
    if (staff) return { 
        name: staff.name, 
        image: staff.image, 
        initials: staff.name.substring(0, 2).toUpperCase(),
        role: 'staff',
        link: '/staff/dashboard'
    }
    
    const student = await getAuthenticatedStudent()
    if (student) return { 
        name: student.name, 
        image: student.image, 
        initials: student.name.substring(0, 2).toUpperCase(),
        role: 'student',
        link: '/student/home'
    }
    
    return null
}

// --- Owner Auth ---

export async function registerOwner(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string

    if (!name || !email || !password) {
        return { success: false, error: 'Missing required fields' }
    }

    try {
        // Check verification status
        const verificationRecord = await prisma.emailVerification.findFirst({
            where: { email }
        })

        if (!verificationRecord || !verificationRecord.verifiedAt) {
             return { success: false, error: 'Email not verified. Please verify your email first.' }
        }

        const existingOwner = await prisma.owner.findUnique({
            where: { email }
        })

        if (existingOwner) {
            return { success: false, error: 'Email already registered' }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // Create Library and Owner in transaction
        const result = await prisma.$transaction(async (tx) => {
            const library = await tx.library.create({
                data: {
                    name: `${name}'s Library`,
                    subdomain: name.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 10000),
                }
            })

            const owner = await tx.owner.create({
                data: {
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    libraryId: library.id
                }
            })
            
            return owner
        })

        // Cleanup verification record
        await prisma.emailVerification.deleteMany({
            where: { email }
        })

        // Set session
        await createSession(result.id, 'owner')

        return { success: true, ownerId: result.id }
    } catch (error) {
        console.error('Owner registration error:', error)
        return { success: false, error: 'Registration failed' }
    }
}

export async function loginOwner(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    // const rememberMe = formData.get('rememberMe') === 'true'

    if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
    }

    try {
        const owner = await prisma.owner.findUnique({
            where: { email }
        })

        if (!owner || !owner.password) {
            return { success: false, error: 'Invalid credentials' }
        }

        const isValid = await bcrypt.compare(password, owner.password)

        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        if (owner.twoFactorEnabled && owner.twoFactorSecret) {
            return { 
                success: true, 
                requiresTwoFactor: true, 
                ownerId: owner.id 
            }
        }

        // Set session
        await createSession(owner.id, 'owner')

        return { success: true }

    } catch (error) {
    console.error('Owner login error:', error)
    return { success: false, error: 'Login error: ' + (error instanceof Error ? error.message : String(error)) }
  }
}

export async function verifyOwnerTwoFactor(ownerId: string, code: string) {
    try {
        const owner = await prisma.owner.findUnique({
            where: { id: ownerId }
        })

        if (!owner || !owner.twoFactorSecret) {
            return { success: false, error: 'Invalid request' }
        }

        const { valid } = await verify({ token: code, secret: owner.twoFactorSecret })

        if (!valid) {
            return { success: false, error: 'Invalid code' }
        }

        // Set session
        await createSession(owner.id, 'owner')

        return { success: true }

    } catch (error) {
        console.error('2FA verification error:', error)
        return { success: false, error: 'Verification failed' }
    }
}

// --- Staff Auth ---

export async function loginStaff(formData: FormData) {
    const identifierRaw = (formData.get('identifier') || formData.get('email')) as string
    const identifier = identifierRaw?.trim()
    const password = formData.get('password') as string

    if (!identifier || !password) {
        return { success: false, error: 'Email/Username and password are required' }
    }

    try {
        const staff = await prisma.staff.findFirst({
            where: {
                OR: [
                    { email: { equals: identifier, mode: 'insensitive' } },
                    { username: { equals: identifier, mode: 'insensitive' } }
                ]
            },
            include: {
                library: true,
                branch: true
            }
        })

        if (!staff || !staff.password) {
            return { success: false, error: 'Invalid credentials' }
        }

        if (staff.status === 'inactive' || (!staff.isActive && staff.status !== 'on_leave')) {
            return { success: false, error: 'Account is inactive. Please contact admin.' }
        }

        const isValid = await bcrypt.compare(password, staff.password)

        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        // Set session
        await createSession(staff.id, 'staff')

        return { success: true }

    } catch (error) {
        console.error('Staff login error:', error)
        return { success: false, error: 'An error occurred during login' }
    }
}

// --- Student Auth ---

export async function initiateEmailVerification(emailRaw: string, name?: string) {
    const email = emailRaw.toLowerCase()
    try {
        // 1. Check if email is already registered by a student
        const existingStudent = await prisma.student.findUnique({
            where: { email }
        })
        if (existingStudent) {
            return { success: false, error: 'Email already registered' }
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

        // 3. Upsert into EmailVerification
        const existingVerification = await prisma.emailVerification.findFirst({
            where: { email }
        })

        if (existingVerification) {
            await prisma.emailVerification.update({
                where: { id: existingVerification.id },
                data: {
                    otp,
                    expiresAt,
                    verifiedAt: null
                }
            })
        } else {
            await prisma.emailVerification.create({
                data: {
                    email,
                    otp,
                    expiresAt
                }
            })
        }

        // 4. Send Email
        const emailResult = await sendEmailVerificationEmail({
            email,
            name: name || 'Guest',
            otp,
            libraryName: 'BookMyLib'
        })

        if (!emailResult.success) {
            return { success: false, error: emailResult.error || 'Failed to send verification email' }
        }

        return { success: true }
    } catch (error) {
        console.error('Initiate verification error:', error)
        return { success: false, error: `Error: ${error instanceof Error ? error.message : String(error)}` }
    }
}

export async function initiatePublicBookingVerification(email: string, name?: string) {
    try {
        // 1. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

        // 2. Upsert into EmailVerification
        const existingVerification = await prisma.emailVerification.findFirst({
            where: { email }
        })

        if (existingVerification) {
            await prisma.emailVerification.update({
                where: { id: existingVerification.id },
                data: {
                    otp,
                    expiresAt,
                    verifiedAt: null
                }
            })
        } else {
            await prisma.emailVerification.create({
                data: {
                    email,
                    otp,
                    expiresAt
                }
            })
        }

        // 3. Send Email
        const emailResult = await sendEmailVerificationEmail({
            email,
            name: name || 'Guest',
            otp,
            libraryName: 'BookMyLib'
        })

        if (!emailResult.success) {
            return { success: false, error: emailResult.error || 'Failed to send verification email' }
        }

        return { success: true }
    } catch (error) {
        console.error('Initiate public verification error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred.' }
    }
}

export async function initiateOwnerVerification(email: string, name?: string) {
    try {
        // 1. Check if email is already registered by an owner
        const existingOwner = await prisma.owner.findUnique({
            where: { email }
        })
        if (existingOwner) {
            return { success: false, error: 'Email already registered' }
        }

        // 2. Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

        // 3. Upsert into EmailVerification
        const existingVerification = await prisma.emailVerification.findFirst({
            where: { email }
        })

        if (existingVerification) {
            await prisma.emailVerification.update({
                where: { id: existingVerification.id },
                data: {
                    otp,
                    expiresAt,
                    verifiedAt: null
                }
            })
        } else {
            await prisma.emailVerification.create({
                data: {
                    email,
                    otp,
                    expiresAt
                }
            })
        }

        // 4. Send Email
        const emailResult = await sendEmailVerificationEmail({
            email,
            name: name || 'Owner',
            otp,
            libraryName: 'BookMyLib'
        })

        if (!emailResult.success) {
            return { success: false, error: emailResult.error || 'Failed to send verification email' }
        }

        return { success: true }
    } catch (error) {
        console.error('Initiate owner verification error:', error)
        return { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred.' }
    }
}

export async function confirmEmailVerification(emailRaw: string, otp: string) {
    const email = emailRaw.toLowerCase()
    try {
        const record = await prisma.emailVerification.findFirst({
            where: { email }
        })

        if (!record) {
            return { success: false, error: 'Verification record not found' }
        }

        if (record.otp !== otp) {
            return { success: false, error: 'Invalid OTP' }
        }

        if (new Date() > record.expiresAt) {
            return { success: false, error: 'OTP expired' }
        }

        // Mark as verified
        await prisma.emailVerification.update({
            where: { id: record.id },
            data: { verifiedAt: new Date() }
        })

        return { success: true }
    } catch (error) {
        console.error('Confirm verification error:', error)
        return { success: false, error: 'Verification failed' }
    }
}

export async function registerStudent(formData: FormData) {
    const name = formData.get('name') as string
    const email = (formData.get('email') as string).toLowerCase()
    const phoneRaw = formData.get('phone') as string
    const phone = phoneRaw ? phoneRaw.replace(/\D/g, '').slice(0, 10) : null
    const password = formData.get('password') as string
    const referralCode = formData.get('referralCode') as string
    const dob = formData.get('dob') as string

    if (!name || !email) {
        return { success: false, error: 'Missing required fields' }
    }

    if (!password && !dob) {
        return { success: false, error: 'Password or Date of Birth is required' }
    }

    try {
        // Check verification status
        const verificationRecord = await prisma.emailVerification.findFirst({
            where: { email }
        })

        if (!verificationRecord || !verificationRecord.verifiedAt) {
             return { success: false, error: 'Email not verified. Please verify your email first.' }
        }

        const existingStudent = await prisma.student.findFirst({
            where: {
                OR: [
                    { email },
                    { phone: phone || undefined }
                ]
            }
        })

        if (existingStudent) {
            if (existingStudent.email === email) {
                return { success: false, error: 'Email already registered' }
            }
            if (phone && existingStudent.phone === phone) {
                return { success: false, error: 'Phone number already registered' }
            }
        }

        let hashedPassword = null
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10)
        }

        // Generate own referral code
        const baseCode = name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')
        const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
        const ownReferralCode = `${baseCode}${randomSuffix}`

        const student = await prisma.$transaction(async (tx) => {
            let libraryId = null
            let referrerId = null

            if (referralCode) {
                 const referrer = await tx.student.findUnique({
                     where: { referralCode }
                 })
                 
                 if (referrer && referrer.libraryId) {
                     libraryId = referrer.libraryId
                     referrerId = referrer.id
                 }
            }

            const newStudent = await tx.student.create({
                data: {
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    referralCode: ownReferralCode,
                    dob: dob ? new Date(dob) : null,
                    emailVerifiedAt: new Date(),
                    libraryId
                }
            })
            
            // Cleanup verification record
            await tx.emailVerification.deleteMany({
                where: { email }
            })

            if (referrerId && libraryId) {
                 await tx.referral.create({
                     data: {
                         referrerId: referrerId,
                         refereeId: newStudent.id,
                         libraryId: libraryId,
                         status: 'pending' 
                     }
                 })
            }

            return newStudent
        })

        // Send Welcome Email (Non-blocking)
        try {
            await sendWelcomeEmail({
                studentName: name,
                studentEmail: email,
                libraryName: 'BookMyLib'
            })
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError)
        }

        // Auto login
        await createSession(student.id, 'student')

        return { success: true, studentId: student.id, email }
    } catch (error) {
        console.error('Student registration error:', error)
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                // Unique constraint violation
                const target = error.meta?.target as string[]
                if (target?.includes('email')) {
                    return { success: false, error: 'Email already registered' }
                }
                if (target?.includes('phone')) {
                    return { success: false, error: 'Phone number already registered' }
                }
                return { success: false, error: 'Account already exists with these details' }
            }
        }
        return { success: false, error: 'Registration failed. Please try again.' }
    }
}

export async function loginStudent(formData: FormData) {
    const identifierRaw = formData.get('identifier') as string
    const identifier = identifierRaw?.trim()
    const password = formData.get('password') as string
    const dob = formData.get('dob') as string

    if (!identifier) {
        return { success: false, error: 'Email or Phone Number is required' }
    }

    if (!password && !dob) {
        return { success: false, error: 'Password or Date of Birth is required' }
    }

    try {
        const phoneCandidate = identifier.replace(/\D/g, '')
        
        const orConditions: Prisma.StudentWhereInput[] = [
            { email: { equals: identifier, mode: 'insensitive' } }
        ]

        if (phoneCandidate.length >= 10) {
            orConditions.push({ phone: phoneCandidate })
        } else if (phoneCandidate.length > 0 && !identifier.includes('@')) {
            // If it has numbers but not full 10 digits and not an email, try matching exact phone just in case
            orConditions.push({ phone: identifier })
        }

        const student = await prisma.student.findFirst({
            where: {
                OR: orConditions
            }
        })

        if (!student) {
            return { success: false, error: 'Invalid credentials' }
        }

        if (student.isBlocked) {
            return { success: false, error: 'Account has been blocked. Please contact support.' }
        }

        let isValid = false

        if (password) {
            if (!student.password) {
                return { success: false, error: 'Invalid credentials' }
            }
            isValid = await bcrypt.compare(password, student.password)
        } else if (dob) {
            if (!student.dob) {
                return { success: false, error: 'Date of Birth not set for this account' }
            }
            // Strict UTC Date comparison
            // Both input 'dob' (YYYY-MM-DD) and stored 'dob' (UTC Date) should align on the date part
            const storedDob = student.dob.toISOString().split('T')[0]
            if (storedDob === dob) {
                isValid = true
            }
        }

        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        // Set session
        await createSession(student.id, 'student')

        return { success: true }

    } catch (error) {
        console.error('Student login error:', error)
        return { success: false, error: 'An error occurred during login' }
    }
}

// --- Password Reset ---

export async function forgotPassword(formData: FormData) {
    const email = formData.get('email') as string
    
    if (!email) {
        return { success: false, error: 'Email is required' }
    }

    try {
        // Check if user exists in any table (Priority: Student -> Staff -> Owner)
        let user: { id: string, email: string | null, name: string, library: { name: string } | null } | null = await prisma.student.findUnique({ 
            where: { email },
            include: { library: { select: { name: true } } }
        })
        let userType = 'student'

        if (!user) {
            user = await prisma.staff.findUnique({ 
                where: { email },
                include: { library: { select: { name: true } } }
            })
            userType = 'staff'
        }

        if (!user) {
            user = await prisma.owner.findUnique({ 
                where: { email },
                include: { library: { select: { name: true } } }
            })
            userType = 'owner'
        }

        if (!user) {
            // Return success even if email not found to prevent enumeration
            return { success: true }
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        // Save OTP to DB based on user type
        if (userType === 'student') {
            await prisma.student.update({
                where: { id: user.id },
                data: { resetToken: otp, resetTokenExpiry: expires }
            })
        } else if (userType === 'staff') {
            await prisma.staff.update({
                where: { id: user.id },
                data: { resetToken: otp, resetTokenExpiry: expires }
            })
        } else if (userType === 'owner') {
            await prisma.owner.update({
                where: { id: user.id },
                data: { resetToken: otp, resetTokenExpiry: expires }
            })
        }

        console.log(`Attempting to send OTP to ${email} for user ${user.name}`)
        const emailResult = await sendPasswordResetEmail({
            email,
            name: user.name,
            otp,
            libraryName: user.library?.name || 'Library'
        })

        if (!emailResult.success) {
            console.error('Failed to send OTP email:', emailResult.error)
            return { success: false, error: emailResult.error || 'Failed to send email' }
        }

        console.log('OTP email sent successfully')
        return { success: true, userType }

    } catch (error) {
        console.error('Forgot password error:', error)
        return { success: false, error: 'Failed to process request' }
    }
}

export async function verifyOtp(formData: FormData) {
    const email = formData.get('email') as string
    const otp = formData.get('otp') as string
    const userType = formData.get('userType') as string

    if (!email || !otp || !userType) {
        return { success: false, error: 'Missing required fields' }
    }

    try {
        const now = new Date()
        let user: Student | Staff | Owner | null = null

        if (userType === 'student') {
            user = await prisma.student.findFirst({
                where: { 
                    email,
                    resetToken: otp,
                    resetTokenExpiry: { gt: now }
                }
            })
        } else if (userType === 'staff') {
            user = await prisma.staff.findFirst({
                where: { 
                    email,
                    resetToken: otp,
                    resetTokenExpiry: { gt: now }
                }
            })
        } else if (userType === 'owner') {
            user = await prisma.owner.findFirst({
                where: { 
                    email,
                    resetToken: otp,
                    resetTokenExpiry: { gt: now }
                }
            })
        }

        if (!user) {
            return { success: false, error: 'Invalid or expired OTP' }
        }

        return { success: true }

    } catch (error) {
        console.error('Verify OTP error:', error)
        return { success: false, error: 'Failed to verify OTP' }
    }
}

export async function resetPassword(formData: FormData) {
    const email = formData.get('email') as string
    const otp = formData.get('otp') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const userType = formData.get('userType') as string // 'owner', 'staff', 'student'

    if (!email || !otp || !password || !confirmPassword || !userType) {
        return { success: false, error: 'All fields are required' }
    }

    if (password !== confirmPassword) {
        return { success: false, error: 'Passwords do not match' }
    }

    if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' }
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        const now = new Date()

        if (userType === 'owner') {
            const owner = await prisma.owner.findFirst({
                where: { 
                    email,
                    resetToken: otp,
                    resetTokenExpiry: { gt: now }
                }
            })

            if (!owner) {
                return { success: false, error: 'Invalid or expired OTP' }
            }

            await prisma.owner.update({
                where: { id: owner.id },
                data: { 
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
        } else if (userType === 'staff') {
            const staff = await prisma.staff.findFirst({
                where: { 
                    email,
                    resetToken: otp,
                    resetTokenExpiry: { gt: now }
                }
            })

            if (!staff) {
                return { success: false, error: 'Invalid or expired OTP' }
            }

            await prisma.staff.update({
                where: { id: staff.id },
                data: { 
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
        } else if (userType === 'student') {
            const student = await prisma.student.findFirst({
                where: { 
                    email,
                    resetToken: otp,
                    resetTokenExpiry: { gt: now }
                }
            })

            if (!student) {
                return { success: false, error: 'Invalid or expired OTP' }
            }

            await prisma.student.update({
                where: { id: student.id },
                data: { 
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
        } else {
            return { success: false, error: 'Invalid user type' }
        }

        return { success: true }

    } catch (error) {
        console.error('Reset password error:', error)
        return { success: false, error: 'Failed to reset password' }
    }
}
