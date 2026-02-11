'use server'

import { prisma } from '@/lib/prisma'
import { isSeatAvailable } from '@/actions/seats'
import { isLockerAvailable, findLockerBySeatNumber } from '@/actions/lockers'
import { createSession } from '@/lib/auth/session'
import { initiatePayment, validateCoupon } from '@/actions/payment'
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
    lockerId?: string // Optional
    fees: string[] // Fee IDs
    quantity?: number // Number of cycles/months
    startDate?: string // YYYY-MM-DD
    branchId: string
    gatewayProvider: string
    couponCode?: string
    manualPaymentData?: {
        transactionId?: string
        proofUrl?: string
    }
}) {
    try {
        const { name, email, phone, dob, amount, planId, seatId, lockerId, fees, quantity = 1, branchId, gatewayProvider, couponCode, manualPaymentData } = data

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

        const branch = await prisma.branch.findUnique({ where: { id: branchId } })
        if (!branch) return { success: false, error: 'Branch not found' }

        let description = `Booking: ${plan.name}`
        if (quantity > 1) {
            description += ` (x${quantity})`
        }
        
        let seatNumber: string | undefined
        if (seatId) {
            const seat = await prisma.seat.findUnique({ where: { id: seatId } })
            if (seat) {
                description += ` (Seat ${seat.number})`
                seatNumber = seat.number
            }
        }
        
        // Handle Locker Logic
        let hasLocker = plan.includesLocker
        let finalLockerId = lockerId
        let lockerNumber: string | undefined

        // Check additional fees for locker
        let selectedFeeObjects: any[] = []
        if (fees.length > 0) {
            selectedFeeObjects = await prisma.additionalFee.findMany({
                where: { id: { in: fees } }
            })
            const lockerFee = selectedFeeObjects.find(f => f.name.toLowerCase().includes('locker'))
            if (lockerFee) {
                hasLocker = true
            }
        }

        // Recalculate Total Amount to ensure validity
        let calculatedTotal = plan.price * quantity
        for (const fee of selectedFeeObjects) {
             let feeAmount = fee.amount
             // Apply monthly multiplier if applicable
             if (fee.billType === 'MONTHLY' && plan.durationUnit === 'months') {
                 feeAmount = fee.amount * plan.duration
             }
             calculatedTotal += (feeAmount * quantity)
        }
        
        // Use the calculated total for payment (overriding client input for security)
        let finalAmount = Math.round(calculatedTotal)
        if (couponCode) {
            const coupon = await validateCoupon(couponCode, calculatedTotal, student.id, plan.id, branch.id)
            if (coupon.success && typeof coupon.finalAmount === 'number') {
                finalAmount = Math.round(coupon.finalAmount)
            }
        }

        if (finalLockerId) {
             const locker = await prisma.locker.findUnique({ where: { id: finalLockerId } })
             if (!locker) return { success: false, error: 'Locker not found' }
             lockerNumber = locker.number
        } else if (hasLocker && branch.hasLockers) {
             if (!branch.isLockerSeparate) {
                 // Part of seat - auto assign
                 if (!seatNumber) return { success: false, error: 'Seat selection required for this plan' }
                 
                const found = await findLockerBySeatNumber(branch.id, seatNumber)
                if (!found.success || !found.id) return { success: false, error: `Locker ${seatNumber} not found` }
                finalLockerId = found.id
                lockerNumber = seatNumber
             } else {
                 // Separate - user must select
                 return { success: false, error: 'Locker selection required' }
             }
        }

        if (lockerNumber) {
            description += ` (Locker ${lockerNumber})`
        }

        if (selectedFeeObjects.length > 0) {
            const feeDetails = selectedFeeObjects.map((f: any) => {
                let feeTotal = f.amount
                let detail = ''
                
                if (f.billType === 'MONTHLY' && plan.durationUnit === 'months') {
                    const durationMult = plan.duration
                    feeTotal = f.amount * durationMult
                    if (quantity > 1) {
                        feeTotal *= quantity
                        detail = ` (₹${f.amount} x ${durationMult}mo x ${quantity})`
                    } else {
                        detail = ` (₹${f.amount} x ${durationMult}mo)`
                    }
                } else {
                    if (quantity > 1) {
                        feeTotal *= quantity
                        detail = ` (₹${f.amount} x ${quantity})`
                    }
                }
                
                return `${f.name}${detail}`
            }).join(', ')
            
            description += ` + Fees [${feeDetails}]`
        }

        // Calculate Dates & Create Subscriptions
        const subscriptionPeriods: { start: Date, end: Date }[] = []
        let currentStart = data.startDate ? new Date(data.startDate) : new Date()

        for (let i = 0; i < quantity; i++) {
            const end = new Date(currentStart)
            if (plan.durationUnit === 'months') {
                end.setMonth(end.getMonth() + plan.duration)
            } else if (plan.durationUnit === 'weeks') {
                end.setDate(end.getDate() + (plan.duration * 7))
            } else {
                end.setDate(end.getDate() + plan.duration)
            }
            subscriptionPeriods.push({ start: new Date(currentStart), end: new Date(end) })
            currentStart = new Date(end)
        }

        // Conflict checks (prevent double booking of same seat/locker across active/pending subs)
        const initialStart = subscriptionPeriods[0].start
        const finalEndDate = subscriptionPeriods[subscriptionPeriods.length - 1].end

        // Seat conflict
        if (seatId) {
            const seatCheck = await isSeatAvailable(seatId, initialStart, finalEndDate)
            if (!seatCheck.available) {
                return { success: false, error: 'Seat is already occupied for the selected dates' }
            }
        }

        // Locker conflict
        if (finalLockerId) {
            const lockerCheck = await isLockerAvailable(finalLockerId, initialStart, finalEndDate)
            if (!lockerCheck.available) {
                return { success: false, error: 'Locker is already occupied for the selected dates' }
            }
        }

        // Create Pending Subscriptions
        const createdSubscriptionIds: string[] = []
        // Calculate per-subscription amount for record keeping
        const perSubAmount = finalAmount / quantity

        for (let i = 0; i < quantity; i++) {
            const period = subscriptionPeriods[i]
            const subscription = await prisma.studentSubscription.create({
                data: {
                    libraryId: plan.libraryId,
                    branchId,
                    studentId: student.id,
                    planId: plan.id,
                    seatId: seatId || undefined,
                    lockerId: finalLockerId,
                    hasLocker,
                    startDate: period.start,
                    endDate: period.end,
                    status: 'pending',
                    amount: perSubAmount
                }
            })
            createdSubscriptionIds.push(subscription.id)
        }

        // 4. Initiate Payment
        // We explicitly pass studentId to ensure it uses the student we just handled
        // We link to the FIRST subscription.
        const paymentResult = await initiatePayment(
            finalAmount,
            'subscription',
            planId,
            description,
            gatewayProvider,
            branchId,
            couponCode,
            student.id, // Pass the student ID
            manualPaymentData,
            createdSubscriptionIds[0], // Pass first subscription ID
            JSON.stringify(createdSubscriptionIds) // Pass all IDs in remarks for multi-activation
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
