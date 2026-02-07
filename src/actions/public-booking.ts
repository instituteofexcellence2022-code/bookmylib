'use server'

import { prisma } from '@/lib/prisma'
import { createSession } from '@/lib/auth/session'
import { initiatePayment } from '@/actions/payment'
import { sendWelcomeEmail } from '@/actions/email'
import { addDays, addMonths } from 'date-fns'

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

        // 0. Verify Email Verification Status
        // We strictly require email verification for public bookings to prevent spam and unauthorized usage
        const verificationRecord = await prisma.emailVerification.findFirst({
            where: { email }
        })

        if (!verificationRecord || !verificationRecord.verifiedAt) {
             return { success: false, error: 'Email not verified. Please verify your email first.' }
        }

        // Check if verification is recent (within 1 hour)
        const verificationAge = new Date().getTime() - new Date(verificationRecord.verifiedAt).getTime()
        if (verificationAge > 60 * 60 * 1000) {
            return { success: false, error: 'Verification expired. Please verify again.' }
        }

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
        await createSession(student.id, 'student')

        // 3. Construct Description & Prepare Subscription
        const plan = await prisma.plan.findUnique({ where: { id: planId } })
        if (!plan) return { success: false, error: 'Plan not found' }

        let description = `Booking: ${plan.name}`
        
        if (seatId) {
            const seat = await prisma.seat.findUnique({ where: { id: seatId } })
            if (seat) description += ` (Seat ${seat.number})`
        }
        
        let hasLocker = plan.includesLocker

        if (fees.length > 0) {
            description += ` + ${fees.length} Fees`
            
            // Check if any selected fee is for Locker
            const selectedFees = await prisma.additionalFee.findMany({
                where: { id: { in: fees } }
            })
            const lockerFee = selectedFees.find(f => f.name.toLowerCase().includes('locker'))
            if (lockerFee) {
                hasLocker = true
            }
        }

        // Calculate Dates
        const startDate = new Date()
        let endDate = new Date(startDate)
        
        if (plan.durationUnit === 'months') {
            endDate = addMonths(startDate, plan.duration)
        } else {
            endDate = addDays(startDate, plan.duration)
        }

        // Create Pending Subscription
        // This ensures we capture all details (locker, seat) even before payment
        const subscription = await prisma.studentSubscription.create({
            data: {
                libraryId: plan.libraryId,
                branchId,
                studentId: student.id,
                planId: plan.id,
                seatId: seatId || undefined,
                hasLocker,
                startDate,
                endDate,
                status: 'pending',
                amount: amount
            }
        })

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
            manualPaymentData,
            subscription.id // Pass subscription ID to link and activate
        )

        if (!paymentResult.success) {
            return { success: false, error: paymentResult.error || 'Failed to initiate payment' }
        }

        // Cleanup verification record
        await prisma.emailVerification.deleteMany({
            where: { email }
        })

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
