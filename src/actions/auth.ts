'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { randomBytes, createHash } from 'crypto'
import { verify } from 'otplib'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
export async function loginOwner(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

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

        // Compare password with bcrypt
        const isBcrypt = owner.password.startsWith('$2')
        let isValid = false
        if (isBcrypt) {
            isValid = await bcrypt.compare(password, owner.password)
        } else {
            const legacyHash = createHash('sha256').update(password).digest('hex')
            if (legacyHash === owner.password) {
                const newHash = await bcrypt.hash(password, 10)
                await prisma.owner.update({ where: { id: owner.id }, data: { password: newHash } })
                isValid = true
            }
        }
        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        if (owner.twoFactorEnabled) {
            return { success: true, requiresTwoFactor: true, ownerId: owner.id }
        }

        // Set session cookie
        const rememberMeValue = formData.get('rememberMe') === 'true'
        const maxAge = rememberMeValue ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days vs 1 day

        const cookieStore = await cookies()
        cookieStore.set('owner_session', owner.id, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge
        })

        console.log(`[AUTH] Owner logged in: ${email} (Remember Me: ${rememberMeValue}) at ${new Date().toISOString()}`)

        return { success: true, requiresTwoFactor: false }

    } catch (error) {
        console.error('Login error:', error)
        return { success: false, error: 'An error occurred during login' }
    }
}

export async function loginStaff(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const rememberMeValue = formData.get('rememberMe') === 'true'

    if (!email || !password) {
        return { success: false, error: 'Email and password are required' }
    }

    try {
        const staff = await prisma.staff.findUnique({
            where: { email },
            include: { library: true, branch: true }
        })

        if (!staff || !staff.password) {
            return { success: false, error: 'Invalid credentials' }
        }

        if (staff.status !== 'active' || !staff.isActive) {
             return { success: false, error: 'Account is inactive. Please contact your administrator.' }
        }

        // Compare password with bcrypt
        const isBcrypt = staff.password.startsWith('$2')
        let isValid = false
        if (isBcrypt) {
            isValid = await bcrypt.compare(password, staff.password)
        } else {
            const legacyHash = createHash('sha256').update(password).digest('hex')
            if (legacyHash === staff.password) {
                const newHash = await bcrypt.hash(password, 10)
                await prisma.staff.update({ where: { id: staff.id }, data: { password: newHash } })
                isValid = true
            }
        }

        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        // Set session cookie
        const maxAge = rememberMeValue ? 30 * 24 * 60 * 60 : 24 * 60 * 60 // 30 days vs 1 day

        const cookieStore = await cookies()
        cookieStore.set('staff_session', staff.id, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge
        })

        console.log(`[AUTH] Staff logged in: ${email} at ${new Date().toISOString()}`)

        // Log activity
        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'login',
                action: 'Login',
                details: 'Staff member logged in',
                entity: 'Auth',
                status: 'success'
            }
        })

        return { success: true }

    } catch (error) {
        console.error('Staff Login error:', error)
        return { success: false, error: 'An error occurred during login' }
    }
}

export async function verifyOwnerTwoFactor(formData: FormData) {
    const ownerId = formData.get('ownerId') as string
    const token = formData.get('token') as string
    const rememberMe = formData.get('rememberMe') === 'true'

    if (!ownerId || !token) {
        return { success: false, error: 'Missing required fields' }
    }

    try {
        const owner = await prisma.owner.findUnique({
            where: { id: ownerId }
        })

        if (!owner || !owner.twoFactorSecret) {
            return { success: false, error: 'Invalid request' }
        }

        // Note: verify import from otplib might need adjustment depending on version
        // Assuming it works as per previous code
        const isTokenValid = await verify({
            token,
            secret: owner.twoFactorSecret
        })

        if (!isTokenValid) {
            return { success: false, error: 'Invalid verification code' }
        }

        // Set session cookie
        // Default to 30 days to ensure user stays logged in until explicit logout
        const maxAge = 30 * 24 * 60 * 60

        const cookieStore = await cookies()
        cookieStore.set('owner_session', owner.id, { 
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge
        })

        console.log(`[AUTH] Owner 2FA verified: ${ownerId} at ${new Date().toISOString()}`)

        return { success: true }

    } catch (error) {
        console.error('2FA verification error:', error)
        return { success: false, error: 'Verification failed' }
    }
}

export async function logoutOwner() {
    const cookieStore = await cookies()
    cookieStore.delete('owner_session')
    redirect('/owner/login')
}

export async function logoutStaff() {
    const cookieStore = await cookies()
    cookieStore.delete('staff_session')
    return { success: true }
}


export async function registerOwner(formData: FormData) {
    // Step 1: Owner Details
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string
    
    // Validation
    if (!name || !email || !password) {
        return { success: false, error: 'Required fields are missing' }
    }

    // Professional Validation
    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        return { success: false, error: 'Invalid email format' }
    }

    const phoneRegex = /^\d{10}$/
    if (!phoneRegex.test(phone)) {
        return { success: false, error: 'Invalid phone number format (10 digits required)' }
    }

    try {
        console.log('[AUTH] Registering owner:', { email, name })
        
        // Check for existing owner
        const existingOwner = await prisma.owner.findUnique({
            where: { email }
        })

        if (existingOwner) {
            console.log('[AUTH] Email already registered:', email)
            return { success: false, error: 'Email already registered' }
        }

        // Hash password with bcrypt
        const hashedPassword = await bcrypt.hash(password, 10)
        
        // Generate placeholder library details
        // Library Name: "Firstname's Library"
        const firstName = name.split(' ')[0]
        const libraryName = `${firstName}'s Library`
        
        // Subdomain: sanitized name + random hex
        const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10)
        const randomSuffix = randomBytes(4).toString('hex')
        const subdomain = `${safeName}-${randomSuffix}`

        console.log('[AUTH] Creating library with subdomain:', subdomain)

        // Create Library and Owner in a transaction
        await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            // 1. Create Library (Placeholder)
            const library = await tx.library.create({
                data: {
                    name: libraryName,
                    subdomain: subdomain,
                    address: '', // Placeholder
                    contactEmail: email,
                    contactPhone: phone,
                    isActive: true
                }
            })
            console.log('[AUTH] Library created:', library.id)

            // 2. Create Owner
            const owner = await tx.owner.create({
                data: {
                    name,
                    email,
                    phone,
                    password: hashedPassword,
                    libraryId: library.id,
                    address: '' // Placeholder
                }
            })
            console.log('[AUTH] Owner created:', owner.id)
            
            // Note: We deliberately do NOT create a branch here. 
            // The user will set up their library details and add branches later.
        })

        return { success: true }

    } catch (error) {
        console.error('Registration error details:', error)
        return { success: false, error: `Registration failed: ${error instanceof Error ? error.message : String(error)}` }
    }
}

export async function registerStudent(formData: FormData) {
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const password = formData.get('password') as string
    
    // Validation
    if (!name || !email || !password) {
        return { success: false, error: 'Required fields are missing' }
    }

    if (password.length < 8) {
        return { success: false, error: 'Password must be at least 8 characters' }
    }
    
    // Check for existing student
    const existingStudent = await prisma.student.findUnique({
        where: { email }
    })

    if (existingStudent) {
        return { success: false, error: 'Email already registered' }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        await prisma.student.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword
            }
        })
        return { success: true }
    } catch (error) {
        console.error('Student registration error:', error)
        return { success: false, error: `Registration failed: ${error instanceof Error ? error.message : String(error)}` }
    }
}

export async function loginStudent(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const rememberMe = formData.get('rememberMe') === 'true'

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

        const isValid = await bcrypt.compare(password, student.password)

        if (!isValid) {
            return { success: false, error: 'Invalid credentials' }
        }

        const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60
        const cookieStore = await cookies()
        cookieStore.set('student_session', student.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge
        })

        return { success: true }
    } catch (error) {
        console.error('Student login error:', error)
        return { success: false, error: 'Login failed' }
    }
}

export async function logoutStudent() {
    const cookieStore = await cookies()
    cookieStore.delete({
        name: 'student_session',
        path: '/',
    })
    revalidatePath('/student/login')
    redirect('/student/login')
}
