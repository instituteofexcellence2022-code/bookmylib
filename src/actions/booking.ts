'use server'

import { prisma } from '@/lib/prisma'
import { isSeatAvailable, getBranchSeatsSimple } from '@/actions/seats'
import { isLockerAvailable, findLockerBySeatNumber, getBranchLockersSimple } from '@/actions/lockers'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedStudent } from '@/lib/auth/student'
import { sendReceiptEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import { ReceiptData } from '@/lib/pdf-generator'

export async function getPublishedBranches() {
    try {
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
            include: {
                library: {
                    select: { 
                        name: true,
                        plans: {
                            where: { isActive: true, branchId: null },
                            select: { price: true, duration: true, durationUnit: true }
                        }
                    }
                },
                _count: {
                    select: { seats: true }
                },
                plans: {
                    where: { isActive: true },
                    select: { price: true, duration: true, durationUnit: true }
                }
            }
        })
        return { success: true, branches }
    } catch (error) {
        console.error('Error fetching branches:', error)
        return { success: false, error: 'Failed to fetch branches' }
    }
}

export async function getBranchDetails(branchId: string) {
    try {
        const branch = await prisma.branch.findUnique({
            where: { id: branchId },
            include: {
                library: {
                    select: { 
                        name: true,
                        id: true,
                        additionalFees: {
                            where: { 
                                isActive: true,
                                branchId: null
                            }
                        },
                        plans: {
                            where: { 
                                isActive: true,
                                branchId: null
                            }
                        }
                    }
                },
                plans: { where: { isActive: true } },
                additionalFees: { where: { isActive: true } }
            }
        })

        if (!branch) {
            return { success: false, error: 'Branch not found' }
        }

        const [seatsRes, lockersRes] = await Promise.all([
            getBranchSeatsSimple(branchId),
            getBranchLockersSimple(branchId)
        ])

        const seatsWithStatus = seatsRes.success && seatsRes.data ? seatsRes.data : []
        const lockersWithStatus = lockersRes.success && lockersRes.data ? lockersRes.data : []

        // Combine branch-specific and global fees
        const allFees = [
            ...branch.additionalFees,
            ...(branch.library?.additionalFees || [])
        ].map(f => ({ ...f, type: 'additional' }))

        // Combine branch-specific and global plans
        const allPlans = [
            ...branch.plans,
            ...(branch.library?.plans || [])
        ]

        return { 
            success: true, 
            branch: {
                ...branch,
                seats: seatsWithStatus,
                lockers: lockersWithStatus,
                fees: allFees,
                plans: allPlans
            }
        }
    } catch (error) {
        console.error('Error fetching branch details:', error)
        return { success: false, error: 'Failed to fetch branch details' }
    }
}

export async function createBooking(data: {
    studentId: string
    branchId: string
    planId: string
    seatId?: string
    lockerId?: string
    startDate: string // ISO string
    quantity?: number // Number of cycles/months
    additionalFeeIds?: string[]
    paymentId?: string
    paymentDetails?: {
        amount: number
        method: string
        remarks?: string
        type?: string
        discount?: number
        proofUrl?: string
    }
    isAddOn?: boolean
    activeSubscriptionId?: string
}): Promise<{ success: true; subscriptionIds?: string[]; subscriptionId?: string; paymentId?: string; invoiceNo?: string | null; seatNumber?: string; amount?: number; discount?: number; method?: string; status?: string } | { success: false; error: string }> {
    try {
        const { studentId, branchId, planId, seatId, startDate, quantity = 1, additionalFeeIds = [], paymentId, paymentDetails, isAddOn, activeSubscriptionId } = data

        // 1. Validate Student
        const student = await prisma.student.findUnique({ where: { id: studentId } })
        if (!student) return { success: false as const, error: 'Student not found' }

        // 2. Validate Plan
        const plan = await prisma.plan.findUnique({ where: { id: planId } })
        if (!plan) return { success: false as const, error: 'Plan not found' }

        // 3. Validate Branch
        const branch = await prisma.branch.findUnique({ where: { id: branchId } })
        if (!branch) return { success: false as const, error: 'Branch not found' }

        // 4. Validate Seat (if provided) - Check existence early
        let seatNumber: string | undefined
        if (seatId) {
            const seat = await prisma.seat.findUnique({ where: { id: seatId } })
            if (!seat) return { success: false as const, error: 'Seat not found' }
            seatNumber = seat.number
        }

        // 5. Validate Locker
        let finalLockerId = data.lockerId

        if (finalLockerId) {
             const locker = await prisma.locker.findUnique({ where: { id: finalLockerId } })
             if (!locker) return { success: false as const, error: 'Locker not found' }
        } else if (plan.includesLocker && branch.hasLockers) {
             if (!branch.isLockerSeparate) {
                 // Part of seat - auto assign
                 if (!seatNumber) return { success: false as const, error: 'Seat selection required for this plan' }
                 
                const found = await findLockerBySeatNumber(branch.id, seatNumber)
                if (!found.success || !found.id) return { success: false as const, error: `Locker ${seatNumber} not found` }
                finalLockerId = found.id
             } else {
                 // Separate - user must select
                 return { success: false as const, error: 'Locker selection required' }
             }
        }

        // 6. Validate Payment (if provided) - Check existence early
        let existingPayment = null
        if (paymentId) {
            existingPayment = await prisma.payment.findUnique({ where: { id: paymentId } })
            if (!existingPayment) return { success: false as const, error: 'Payment record not found' }
        }

        const platformSubscription = await prisma.librarySubscription.findUnique({
            where: { libraryId: branch.libraryId },
            include: { plan: true }
        })
        if (!platformSubscription || platformSubscription.status !== 'active') {
            return { success: false, error: 'Platform subscription inactive' }
        }
        const activeSubsCount = await prisma.studentSubscription.count({
            where: { libraryId: branch.libraryId, status: 'active', endDate: { gt: new Date() } }
        })
        let willActivateNow = 0
        if ((existingPayment && existingPayment.status === 'completed') || paymentDetails) {
            willActivateNow = 1
        }
        if (activeSubsCount + willActivateNow > (platformSubscription.plan.maxActiveStudents || 0)) {
            return { success: false, error: 'Active student limit reached' }
        }
        const totalStudentsCount = await prisma.student.count({
            where: { libraryId: branch.libraryId }
        })
        if (student.libraryId !== branch.libraryId && totalStudentsCount >= (platformSubscription.plan.maxTotalStudents || 0)) {
            return { success: false, error: 'Total student limit reached' }
        }

        // 6. Calculate Dates & Check Conflicts
        // Find latest active or pending subscription for this student & branch to chain dates
        const lastSubscription = await prisma.studentSubscription.findFirst({
            where: {
                studentId,
                branchId,
                status: { in: ['active', 'pending'] },
                endDate: { gt: new Date() }
            },
            orderBy: { endDate: 'desc' }
        })

        let initialStart = new Date(startDate)
        // If there's an active/pending subscription, start the new one after it ends
        // BUT if it's an add-on, we want to start immediately (or at specified date)
        if (lastSubscription && !isAddOn) {
            initialStart = new Date(lastSubscription.endDate)
        }

        // Pre-calculate dates for all cycles to check conflicts
        const subscriptionPeriods: { start: Date, end: Date }[] = []
        let currentStart = new Date(initialStart)

        for (let i = 0; i < quantity; i++) {
            const end = new Date(currentStart)
            // Add duration based on plan
            if (plan.durationUnit === 'days') {
                end.setDate(end.getDate() + plan.duration)
            } else if (plan.durationUnit === 'weeks') {
                end.setDate(end.getDate() + (plan.duration * 7))
            } else if (plan.durationUnit === 'months') {
                end.setMonth(end.getMonth() + plan.duration)
            }
            subscriptionPeriods.push({ start: new Date(currentStart), end: new Date(end) })
            // Next cycle starts when this one ends
            currentStart = new Date(end)
        }

        const finalEndDate = subscriptionPeriods[subscriptionPeriods.length - 1].end

        // Determine hasLocker status
        let hasLocker = plan.includesLocker || false
        if (!hasLocker && additionalFeeIds.length > 0) {
            const fees = await prisma.additionalFee.findMany({
                where: { id: { in: additionalFeeIds } }
            })
            hasLocker = fees.some(f => f.name.toLowerCase().includes('locker'))
        }

        // Check for overlapping subscriptions on this seat (Outside transaction)
        if (seatId) {
            const seatCheck = await isSeatAvailable(seatId, initialStart, finalEndDate)
            if (!seatCheck.available) {
                return { success: false, error: 'Seat is already occupied for the selected dates' }
            }
        }

        // Check for overlapping subscriptions on this locker (Outside transaction)
        if (finalLockerId) {
            const lockerCheck = await isLockerAvailable(finalLockerId, initialStart, finalEndDate)
            if (!lockerCheck.available) {
                return { success: false, error: 'Locker is already occupied for the selected dates' }
            }
        }

        // Validate Existing Payment Status (Outside transaction)
        if (existingPayment) {
             if (existingPayment.status !== 'completed' && existingPayment.status !== 'pending_verification' && existingPayment.status !== 'pending') {
                 return { success: false, error: 'Payment failed, cannot book' }
             }
        }

        const result = await prisma.$transaction(async (tx) => {
            let paymentIdToUse = paymentId
            let invoiceNoToUse: string | null = null
            let subscriptionStatus = 'active' // Default for legacy/admin calls
            let amountPaid = 0
            let paymentStatus = 'pending'
            let discount = 0
            let finalAmount = 0
            let feeDescription = '' // Initialize variable

            if (existingPayment) {
                // Use pre-fetched payment
                invoiceNoToUse = existingPayment.invoiceNo
                amountPaid = existingPayment.amount
                discount = existingPayment.discountAmount || 0
                finalAmount = amountPaid

                // Set status based on payment
                if (existingPayment.status === 'completed') {
                    subscriptionStatus = 'active'
                    paymentStatus = 'paid'
                } else if (existingPayment.status === 'pending_verification' || existingPayment.status === 'pending') {
                    subscriptionStatus = 'pending'
                    paymentStatus = 'pending'
                }
            } else {
                // 5. Calculate Total Amount & Validate Fees (Only needed if creating new payment)
                // Base amount for ONE cycle
                let cycleAmount = isAddOn ? 0 : plan.price
                feeDescription = isAddOn ? `Add-on: Locker` : `Plan: ${plan.name} (x${quantity})`

                if (additionalFeeIds.length > 0) {
                    const fees = await tx.additionalFee.findMany({
                        where: {
                            id: { in: additionalFeeIds },
                            isActive: true
                        }
                    })

                    fees.forEach(fee => {
                        let feeAmount = fee.amount
                        if (fee.billType === 'MONTHLY' && plan.durationUnit === 'months') {
                            feeAmount = fee.amount * plan.duration
                        }
                        cycleAmount += feeAmount
                        feeDescription += `, ${fee.name}${fee.billType === 'MONTHLY' && plan.durationUnit === 'months' ? ` (₹${fee.amount} x ${plan.duration}mo)` : ''}`
                    })
                }
                
                // Total for ALL cycles
                let totalAmount = cycleAmount * quantity
                
                // Override with manual details if provided
                if (paymentDetails) {
                    amountPaid = paymentDetails.amount
                    totalAmount = paymentDetails.amount // Assuming full payment for manual
                    paymentStatus = 'completed' // Manual payments are completed
                    subscriptionStatus = 'active'
                    discount = paymentDetails.discount || 0
                } else {
                    amountPaid = totalAmount
                    paymentStatus = 'pending'
                    subscriptionStatus = 'pending'
                }
                
                finalAmount = totalAmount

                // 6. Create Payment Record (Simulated/Manual)
                const generatedInvoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
                const payment = await tx.payment.create({
                    data: {
                        libraryId: plan.libraryId,
                        branchId,
                        studentId,
                        type: paymentDetails?.type || 'subscription',
                        amount: amountPaid,
                        method: paymentDetails?.method || 'unknown',
                        status: paymentStatus,
                        notes: paymentDetails?.remarks ? `${feeDescription}. ${paymentDetails.remarks}` : feeDescription,
                        invoiceNo: generatedInvoiceNo,
                        relatedId: planId,
                        discountAmount: discount,
                        proofUrl: paymentDetails?.proofUrl
                    }
                })
                paymentIdToUse = payment.id
                invoiceNoToUse = generatedInvoiceNo
            }

            // 7. Create Single Consolidated Subscription (covers all cycles)
            const createdSubscriptionIds: string[] = []
            const consolidated = await tx.studentSubscription.create({
                data: {
                    libraryId: plan.libraryId,
                    studentId,
                    branchId,
                    planId,
                    seatId,
                    lockerId: finalLockerId,
                    status: subscriptionStatus,
                    startDate: initialStart,
                    endDate: finalEndDate,
                    amount: finalAmount,
                    hasLocker
                }
            })
            createdSubscriptionIds.push(consolidated.id)
            
            // 8. Link Payment to First Subscription and Store All IDs in Remarks
            if (paymentIdToUse && createdSubscriptionIds.length > 0) {
                await tx.payment.update({
                    where: { id: paymentIdToUse },
                    data: { 
                        subscriptionId: createdSubscriptionIds[0],
                        relatedId: createdSubscriptionIds[0],
                        remarks: JSON.stringify(createdSubscriptionIds)
                    }
                })
            }
            
            // 9. Update Student Profile Context
            if (subscriptionStatus === 'active' || subscriptionStatus === 'pending') {
                await tx.student.update({
                    where: { id: studentId },
                    data: {
                        libraryId: plan.libraryId,
                        branchId: branchId
                    }
                })
            }
            
            return { 
                success: true as const, 
                subscriptionIds: createdSubscriptionIds, // Return Array
                paymentId: paymentIdToUse,
                invoiceNo: invoiceNoToUse,
                seatNumber,
                amount: finalAmount,
                discount,
                method: paymentDetails?.method,
                status: paymentStatus
            }
        }, {
            maxWait: 5000,
            timeout: 20000
        })

        // Send Receipt Email Automatically (Only if payment is completed)
        if (result.success && result.paymentId && result.status === 'completed') {
            try {
                // Construct fee items
                const feeItems: { description: string, amount: number }[] = []
                if (additionalFeeIds.length > 0) {
                     const fees = await prisma.additionalFee.findMany({
                        where: { id: { in: additionalFeeIds } }
                     })
                     fees.forEach(f => {
                         const base = (f.billType === 'MONTHLY' && plan.durationUnit === 'months') ? (f.amount * plan.duration) : f.amount
                         feeItems.push({ description: f.name, amount: base })
                     })
                }

                const receiptData: ReceiptData = {
                    invoiceNo: result.invoiceNo || `INV-${Date.now()}`,
                    date: new Date(),
                    studentName: student.name,
                    studentEmail: student.email,
                    studentPhone: student.phone,
                    branchName: branch.name,
                    branchAddress: `${branch.address}, ${branch.city}`,
                    planName: plan.name,
                    planType: plan.category,
                    planDuration: `${plan.duration * quantity} ${plan.durationUnit}`,
                    planHours: plan.hoursPerDay ? `${plan.hoursPerDay} Hrs/Day` : undefined,
                    seatNumber: result.seatNumber ? formatSeatNumber(result.seatNumber) : undefined,
                    startDate: subscriptionPeriods[0].start, // First start
                    endDate: subscriptionPeriods[subscriptionPeriods.length - 1].end, // Last end
                    amount: result.amount || 0,
                    paymentMethod: result.method || 'unknown',
                    subTotal: (result.amount || 0) + (result.discount || 0),
                    discount: result.discount || 0,
                    items: [
                        {
                            description: `Plan: ${plan.name} (x${quantity})`,
                            amount: plan.price * quantity
                        },
                        ...feeItems.map(f => ({ ...f, amount: f.amount * quantity, description: `${f.description} (x${quantity})` }))
                    ]
                }
                
                // Fire and forget (or await but don't block failure)
                await sendReceiptEmail(receiptData).catch(err => {
                    console.error('Failed to send automatic receipt email:', err)
                })
            } catch (emailError) {
                console.error('Error preparing receipt email:', emailError)
            }
        }

        revalidatePath('/student/book')
        revalidatePath('/owner/finance')
        revalidatePath('/owner/students')
        return {
            ...result,
            subscriptionId: result.subscriptionIds[0] // Backward compatibility for return type if needed, but we changed return type
        }
    } catch (error) {
        console.error('Booking error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
        return { success: false as const, error: errorMessage }
    }
}

export async function checkStudentSubscription(studentId: string, branchId: string) {
    try {
        const subscription = await prisma.studentSubscription.findFirst({
            where: {
                studentId,
                branchId,
                status: 'active',
                startDate: { lte: new Date() },
                endDate: { gt: new Date() }
            }
        })
        return { hasActiveSubscription: !!subscription }
    } catch (error) {
        console.error('Error checking subscription:', error)
        return { hasActiveSubscription: false }
    }
}

export async function verifyBranchSubscription(branchId: string) {
    try {
        const student = await getAuthenticatedStudent()

        if (!student) {
            return { success: false, hasActiveSubscription: false, error: 'Not authenticated' }
        }

        const subscription = await prisma.studentSubscription.findFirst({
            where: {
                studentId: student.id,
                branchId,
                status: 'active',
                startDate: { lte: new Date() },
                endDate: { gt: new Date() }
            }
        })

        return { success: true, hasActiveSubscription: !!subscription }
    } catch (error) {
        console.error('Error verifying subscription:', error)
        return { success: false, hasActiveSubscription: false, error: 'Failed to verify subscription' }
    }
}
