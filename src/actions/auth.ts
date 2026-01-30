'use server'

import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { sendPasswordResetEmail } from '@/actions/email'
import { verify } from 'otplib'
import { redirect } from 'next/navigation'
import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/lib/auth/session'

// --- Session Management ---

export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_KEYS.OWNER)
    cookieStore.delete(COOKIE_KEYS.STAFF)
    cookieStore.delete(COOKIE_KEYS.STUDENT)
    return { success: true }
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

        return { success: true, ownerId: result.id }
    } catch (error) {
        console.error('Owner registration error:', error)
        return { success: false, error: 'Registration failed' }
    }
}

export async function loginOwner(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const rememberMe = formData.get('rememberMe') === 'true'

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
        const cookieStore = await cookies()
        cookieStore.set(COOKIE_KEYS.OWNER, owner.id, {
            ...COOKIE_OPTIONS,
            maxAge: rememberMe ? 30 * 24 * 60 * 60 : COOKIE_OPTIONS.maxAge
        })

        return { success: true }

    } catch (error) {
        console.error('Owner login error:', error)
        return { success: false, error: 'An error occurred during login' }
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
        const cookieStore = await cookies()
        cookieStore.set(COOKIE_KEYS.OWNER, owner.id, COOKIE_OPTIONS)

        return { success: true }

    } catch (error) {
        console.error('2FA verification error:', error)
        return { success: false, error: 'Verification failed' }
    }
}

// --- Staff Auth ---

export async function loginStaff(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
    }

    try {
        const staff = await prisma.staff.findUnique({
            where: { email },
            include: {
                library: true,
                branch: true
            }
        })

        if (!staff || !staff.password) {
            return { success: false, error: 'Invalid credentials' }
        }

        if (!staff.isActive || staff.status === 'inactive') {
            return { success: false, error: 'Account is inactive. Please contact admin.' }
        }

        const isValid = await bcrypt.compare(password, staff.password)

        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        // Set session
        const cookieStore = await cookies()
        cookieStore.set(COOKIE_KEYS.STAFF, staff.id, COOKIE_OPTIONS)

        return { success: true }

    } catch (error) {
        console.error('Staff login error:', error)
        return { success: false, error: 'An error occurred during login' }
    }
}

// --- Student Auth ---

export async function registerStudent(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string
    const referralCode = formData.get('referralCode') as string

    if (!name || !email || !password) {
        return { success: false, error: 'Missing required fields' }
    }

    try {
        const existingStudent = await prisma.student.findUnique({
            where: { email }
        })

        if (existingStudent) {
            return { success: false, error: 'Email already registered' }
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        // Generate own referral code
        const baseCode = name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')
        const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
        const ownReferralCode = `${baseCode}${randomSuffix}`

        const student = await prisma.student.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                referralCode: ownReferralCode,
            }
        })
        
        if (referralCode) {
             const referrer = await prisma.student.findUnique({
                 where: { referralCode }
             })
             
             if (referrer && referrer.libraryId) {
                 // Create Referral record only if referrer belongs to a library
                 await prisma.referral.create({
                     data: {
                         referrerId: referrer.id,
                         refereeId: student.id,
                         libraryId: referrer.libraryId,
                         status: 'pending' 
                     }
                 })

                 // Associate student with the library immediately
                 await prisma.student.update({
                     where: { id: student.id },
                     data: { libraryId: referrer.libraryId }
                 })
             }
        }

        return { success: true }
    } catch (error) {
        console.error('Student registration error:', error)
        return { success: false, error: 'Registration failed' }
    }
}

export async function loginStudent(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
    }

    try {
        const student = await prisma.student.findUnique({
            where: { email }
        })

        if (!student || !student.password) {
            return { success: false, error: 'Invalid credentials' }
        }

        if (student.isBlocked) {
            return { success: false, error: 'Account has been blocked. Please contact support.' }
        }

        const isValid = await bcrypt.compare(password, student.password)

        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        // Set session
        const cookieStore = await cookies()
        cookieStore.set(COOKIE_KEYS.STUDENT, student.id, COOKIE_OPTIONS)

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
        let user: any = await prisma.student.findUnique({ 
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

        // Generate reset token
        const token = randomBytes(32).toString('hex')
        const expires = new Date(Date.now() + 3600000) // 1 hour

        // Save token to DB based on user type
        if (userType === 'student') {
            await prisma.student.update({
                where: { id: user.id },
                data: { resetToken: token, resetTokenExpiry: expires }
            })
        } else if (userType === 'staff') {
            await prisma.staff.update({
                where: { id: user.id },
                data: { resetToken: token, resetTokenExpiry: expires }
            })
        } else if (userType === 'owner') {
            await prisma.owner.update({
                where: { id: user.id },
                data: { resetToken: token, resetTokenExpiry: expires }
            })
        }

        const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/${userType}/reset-password?token=${token}`

        await sendPasswordResetEmail({
            email,
            name: user.name,
            token,
            resetUrl,
            libraryName: user.library?.name || 'Library'
        })

        return { success: true }

    } catch (error) {
        console.error('Forgot password error:', error)
        return { success: false, error: 'Failed to process request' }
    }
}

export async function resetPassword(formData: FormData) {
    const token = formData.get('token') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const userType = formData.get('userType') as string // 'owner', 'staff', 'student'

    if (!token || !password || !confirmPassword || !userType) {
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
                    resetToken: token,
                    resetTokenExpiry: { gt: now }
                }
            })

            if (!owner) {
                return { success: false, error: 'Invalid or expired token' }
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
                    resetToken: token,
                    resetTokenExpiry: { gt: now }
                }
            })

            if (!staff) {
                return { success: false, error: 'Invalid or expired token' }
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
                    resetToken: token,
                    resetTokenExpiry: { gt: now }
                }
            })

            if (!student) {
                return { success: false, error: 'Invalid or expired token' }
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
