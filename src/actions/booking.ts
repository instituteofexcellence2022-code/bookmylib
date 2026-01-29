'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getPublishedBranches() {
    try {
        const branches = await prisma.branch.findMany({
            where: { isActive: true },
            include: {
                library: {
                    select: { name: true }
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
                                branchId: null // Global fees
                            }
                        },
                        plans: {
                            where: { 
                                isActive: true,
                                branchId: null // Global plans
                            }
                        }
                    }
                },
                seats: {
                    include: {
                        subscriptions: {
                            where: {
                                status: 'active',
                                endDate: { gt: new Date() }
                            }
                        }
                    },
                    orderBy: { number: 'asc' }
                },
                plans: {
                    where: { isActive: true }
                },
                additionalFees: {
                    where: { isActive: true }
                }
            }
        })

        if (!branch) {
            return { success: false, error: 'Branch not found' }
        }

        // Transform seats to add isOccupied flag
        const seatsWithStatus = branch.seats.map(seat => ({
            ...seat,
            isOccupied: seat.subscriptions.length > 0,
            subscriptions: undefined // Remove detailed subscription info for privacy
        }))

        // Combine branch-specific and global fees
        const allFees = [
            ...branch.additionalFees,
            ...(branch.library?.additionalFees || [])
        ]

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
    startDate: string // ISO string
    additionalFeeIds?: string[]
    paymentId?: string
    paymentDetails?: {
        amount: number
        method: string
        remarks?: string
        type?: string
        discount?: number
    }
}): Promise<{ success: true; subscriptionId: string; paymentId?: string } | { success: false; error: string }> {
    try {
        const { studentId, branchId, planId, seatId, startDate, additionalFeeIds = [], paymentId, paymentDetails } = data

        // 1. Validate Student
        const student = await prisma.student.findUnique({ where: { id: studentId } })
        if (!student) return { success: false as const, error: 'Student not found' }

        // 2. Validate Plan
        const plan = await prisma.plan.findUnique({ where: { id: planId } })
        if (!plan) return { success: false as const, error: 'Plan not found' }

        // 3. Calculate Dates (Chain if active subscription exists)
        // Find latest active or pending subscription for this student & branch
        const lastSubscription = await prisma.studentSubscription.findFirst({
            where: {
                studentId,
                branchId,
                status: { in: ['active', 'pending'] },
                endDate: { gt: new Date() }
            },
            orderBy: { endDate: 'desc' }
        })

        let start = new Date(startDate)
        // If there's an active/pending subscription, start the new one after it ends
        if (lastSubscription) {
            start = new Date(lastSubscription.endDate)
        }

        const end = new Date(start)
        
        // Add duration based on plan
        if (plan.durationUnit === 'days') {
            end.setDate(end.getDate() + plan.duration)
        } else if (plan.durationUnit === 'weeks') {
            end.setDate(end.getDate() + (plan.duration * 7))
        } else if (plan.durationUnit === 'months') {
            end.setMonth(end.getMonth() + plan.duration)
        }

        // 4. Validate Seat (if provided)
        // Moved inside transaction for consistency
        
        const result = await prisma.$transaction(async (tx) => {
            // Validate Seat (if provided) - Check inside transaction for safety
            if (seatId) {
                const seat = await tx.seat.findUnique({ where: { id: seatId } })
                if (!seat) throw new Error('Seat not found')

                // Check for overlapping subscriptions on this seat
                const conflictingSub = await tx.studentSubscription.findFirst({
                    where: {
                        seatId,
                        status: { in: ['active', 'pending'] },
                        startDate: { lt: end },
                        endDate: { gt: start }
                    }
                })

                if (conflictingSub) {
                    throw new Error('Seat is already occupied for the selected dates')
                }
            }

            let paymentIdToUse = paymentId
            let subscriptionStatus = 'active' // Default for legacy/admin calls
            let amountPaid = 0
            let paymentStatus = 'pending'
            let discount = 0
            let finalAmount = 0

            if (paymentId) {
                // Validate existing payment
                const payment = await tx.payment.findUnique({ where: { id: paymentId } })
                if (!payment) throw new Error('Payment record not found')
                
                amountPaid = payment.amount
                discount = payment.discountAmount || 0
                finalAmount = amountPaid

                // Set status based on payment
                if (payment.status === 'completed') {
                    subscriptionStatus = 'active'
                    paymentStatus = 'paid'
                } else if (payment.status === 'pending_verification' || payment.status === 'pending') {
                    subscriptionStatus = 'pending'
                    paymentStatus = 'pending'
                } else {
                    throw new Error('Payment failed, cannot book')
                }
            } else {
                // 5. Calculate Total Amount & Validate Fees (Only needed if creating new payment)
                let totalAmount = plan.price
                let feeDescription = `Plan: ${plan.name}`

                if (additionalFeeIds.length > 0) {
                    const fees = await tx.additionalFee.findMany({
                        where: {
                            id: { in: additionalFeeIds },
                            isActive: true
                        }
                    })

                    fees.forEach(fee => {
                        totalAmount += fee.amount
                        feeDescription += `, ${fee.name}`
                    })
                }
                
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
                const payment = await tx.payment.create({
                    data: {
                        libraryId: plan.libraryId,
                        branchId,
                        studentId,
                        type: paymentDetails?.type || 'subscription',
                        amount: amountPaid,
                        method: paymentDetails?.method || 'unknown',
                        status: paymentStatus,
                        description: feeDescription,
                        notes: paymentDetails?.remarks,
                        invoiceNo: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        relatedId: planId,
                        discountAmount: discount
                    }
                })
                paymentIdToUse = payment.id
            }

            // 7. Create Subscription
            // Note: We removed the check for existing active subscription to allow chaining

            const subscription = await tx.studentSubscription.create({
                data: {
                    libraryId: plan.libraryId,
                    studentId,
                    branchId,
                    planId,
                    seatId,
                    status: subscriptionStatus,
                    startDate: start,
                    endDate: end,
                    amountPaid,
                    paymentStatus,
                    discount,
                    finalAmount
                }
            })
            
            // 8. Link Payment to Subscription
            if (paymentIdToUse) {
                await tx.payment.update({
                    where: { id: paymentIdToUse },
                    data: { subscriptionId: subscription.id }
                })
            }
            
            // 9. Update Student Profile Context
            // Update the student's current library/branch context when they book a new plan
            // This ensures they are linked to the correct library/branch for issues, etc.
            if (subscriptionStatus === 'active' || subscriptionStatus === 'pending') {
                await tx.student.update({
                    where: { id: studentId },
                    data: {
                        libraryId: plan.libraryId,
                        branchId: branchId
                    }
                })
            }
            
            return { success: true as const, subscriptionId: subscription.id, paymentId: paymentIdToUse }
        })

        revalidatePath('/student/book')
        revalidatePath('/owner/finance')
        revalidatePath('/owner/students')
        return result
    } catch (error) {
        console.error('Booking error:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to create booking'
        return { success: false as const, error: errorMessage }
    }
}
