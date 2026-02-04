'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS, COOKIE_OPTIONS } from '@/lib/auth/session'
import { initiatePayment } from '@/actions/payment'
import { sendWelcomeEmail } from '@/actions/email'

export async function initiatePublicBooking(data: {
    // Student Details
    name: string
    email: string
    phone: string
    dob: string // YYYY-MM-DD
    
    // Payment Details
    amount: number
    planId: string
    seatId?: string // Optional
    fees: string[] // Fee IDs
    branchId: string
    gatewayProvider: string
    couponCode?: string
    manualPaymentData?: {
        transactionId?: string
        proofUrl?: string
    }
}) {
    try {
        const { name, email, phone, dob, amount, planId, seatId, fees, branchId, gatewayProvider, couponCode, manualPaymentData } = data

        // 1. Find or Create Student
        // Check for masked data
        const isPhoneMasked = phone.includes('*')
        const isDobMasked = dob.includes('*')

        let student = null

        if (isPhoneMasked) {
             // If phone is masked, we MUST find by email
             student = await prisma.student.findFirst({
                 where: { email: { equals: email, mode: 'insensitive' } }
             })
             
             if (!student) {
                 return { success: false, error: 'Cannot create new account with masked phone number. Please enter full details.' }
             }
        } else {
             // Normal search
             student = await prisma.student.findFirst({
                where: {
                    OR: [
                        { email: { equals: email, mode: 'insensitive' } },
                        { phone: phone }
                    ]
                }
            })
        }

        if (isDobMasked && !student) {
             return { success: false, error: 'Cannot create new account with masked date of birth. Please enter full details.' }
        }

        let isNewStudent = false

        if (!student) {
            // Create new student
            isNewStudent = true
            
            // Generate referral code
            const baseCode = name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X')
            const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString()
            const referralCode = `${baseCode}${randomSuffix}`

            student = await prisma.student.create({
                data: {
                    name,
                    email,
                    phone,
                    dob: new Date(dob),
                    referralCode,
                    libraryId: (await prisma.branch.findUnique({ where: { id: branchId }, select: { libraryId: true } }))?.libraryId
                }
            })

            // Send Welcome Email
            await sendWelcomeEmail({
                studentName: student.name,
                studentEmail: student.email!,
                libraryName: 'BookMyLib'
            }).catch(err => console.error('Failed to send welcome email', err))
        } else {
            // Check credentials if existing?
            // For this flow, we assume if they know email/phone, they are the user or we just proceed.
            // But if they are blocked, we should stop.
            if (student.isBlocked) {
                return { success: false, error: 'Account is blocked. Please contact support.' }
            }
        }

        // 2. Log them in (Set Cookie)
        const cookieStore = await cookies()
        cookieStore.set(COOKIE_KEYS.STUDENT, student.id, COOKIE_OPTIONS)

        // 3. Construct Description
        const plan = await prisma.plan.findUnique({ where: { id: planId } })
        let description = `Booking: ${plan?.name || 'Plan'}`
        
        if (seatId) {
            const seat = await prisma.seat.findUnique({ where: { id: seatId } })
            if (seat) description += ` (Seat ${seat.number})`
        }
        
        if (fees.length > 0) {
            description += ` + ${fees.length} Fees`
        }

        // 4. Initiate Payment
        // We explicitly pass studentId to ensure it uses the student we just handled
        const paymentResult = await initiatePayment(
            amount,
            'subscription',
            planId,
            description,
            gatewayProvider,
            branchId,
            couponCode,
            student.id, // Pass the student ID
            manualPaymentData
        )

        if (!paymentResult.success) {
            return { success: false, error: paymentResult.error || 'Failed to initiate payment' }
        }

        return {
            success: true,
            studentId: student.id,
            isNewStudent,
            paymentData: paymentResult
        }

    } catch (error) {
        console.error('Public booking init error:', error)
        return { success: false, error: 'Failed to process request' }
    }
}
