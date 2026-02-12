'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedStaff } from '@/lib/auth/staff'
import { staffPermit } from '@/lib/auth/policy'
import { revalidatePath } from 'next/cache'
import { sendReceiptEmail } from '@/actions/email'
import { allowAsync } from '@/lib/rate-limit'

// Helper to get authenticated staff
// Removed local helper in favor of imported one

export async function getPendingPayments(studentId?: string) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }
        if (!staffPermit('verification:view')) return { success: false, error: 'Unauthorized' }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const whereClause: any = {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            status: 'pending_verification'
        }

        if (studentId) {
            whereClause.studentId = studentId
        }

        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                student: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        image: true
                    }
                },
                subscription: {
                    include: {
                        plan: true,
                        branch: { select: { name: true } }
                    }
                },
                additionalFee: true
            },
            orderBy: {
                date: 'desc'
            }
        })

        // Enrich with Plan details if subscription is missing but relatedId exists
        const enrichedPayments = await Promise.all(payments.map(async (payment) => {
            if (payment.type === 'subscription' && !payment.subscription && payment.relatedId) {
                const plan = await prisma.plan.findUnique({
                    where: { id: payment.relatedId }
                })
                
                if (plan) {
                    return {
                        ...payment,
                        subscription: {
                            plan,
                            branch: { name: staff.branch.name }
                        }
                    }
                }
            }
            return payment
        }))

        return { success: true, data: enrichedPayments }
    } catch (error) {
        console.error('Error fetching pending payments:', error)
        return { success: false, error: 'Failed to fetch pending payments' }
    }
}

export async function verifyPendingPayment(paymentId: string, action: 'approve' | 'reject' = 'approve') {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }
    if (!staffPermit('verification:write')) return { success: false, error: 'Unauthorized' }
    if (!(await allowAsync(`staff:verify:${staff.id}`, 5, 30_000))) {
        return { success: false, error: 'Too many attempts. Please wait and try again.' }
    }

    try {
        if (action === 'reject') {
            const updated = await prisma.payment.update({
                where: { id: paymentId, libraryId: staff.libraryId },
                data: {
                    status: 'rejected',
                    verifiedAt: new Date(),
                    verifiedBy: staff.id,
                    verifierRole: 'staff'
                }
            })
            await prisma.staffActivity.create({
                data: {
                    libraryId: staff.libraryId,
                    staffId: staff.id,
                    type: 'payment',
                    action: 'Payment Rejected',
                    details: `Payment ${paymentId} rejected by staff`,
                    entity: 'Finance',
                    status: 'success',
                    metadata: JSON.stringify({ paymentId, branchId: staff.branchId, amount: updated.amount, method: updated.method })
                }
            })
            revalidatePath('/staff/verification')
            return { success: true }
        }

        const payment = await prisma.$transaction(async (tx) => {
            let updatedPayment = await tx.payment.update({
                where: { id: paymentId, libraryId: staff.libraryId, branchId: staff.branchId },
                data: {
                    status: 'completed',
                    verifiedAt: new Date(),
                    verifiedBy: staff.id,
                    verifierRole: 'staff'
                },
                include: {
                    student: true,
                    branch: true,
                    subscription: {
                        include: { plan: true }
                    }
                }
            })

            const platformSubscription = await tx.librarySubscription.findUnique({
                where: { libraryId: updatedPayment.libraryId },
                include: { plan: true }
            })
            if (!platformSubscription || platformSubscription.status !== 'active') {
                throw new Error('Platform subscription inactive')
            }
            const activeSubsCount = await tx.studentSubscription.count({
                where: { libraryId: updatedPayment.libraryId, status: 'active', endDate: { gt: new Date() } }
            })
            let toActivateCount = 0
            if (updatedPayment.subscriptionId) toActivateCount += 1
            else if (updatedPayment.type === 'subscription' && updatedPayment.relatedId) toActivateCount += 1
            if (platformSubscription.plan.maxActiveStudents !== undefined) {
                if (activeSubsCount + toActivateCount > platformSubscription.plan.maxActiveStudents) {
                    throw new Error('Active student limit reached')
                }
            }

            if (updatedPayment.subscriptionId) {
                await tx.studentSubscription.update({
                    where: { id: updatedPayment.subscriptionId },
                    data: { status: 'active' }
                })
            } else if (updatedPayment.type === 'subscription' && updatedPayment.relatedId) {
                const plan = await tx.plan.findUnique({ where: { id: updatedPayment.relatedId } })
                if (plan) {
                    const startDate = new Date()
                    const endDate = new Date()
                    if (plan.durationUnit === 'months') {
                        endDate.setMonth(endDate.getMonth() + plan.duration)
                    } else if (plan.durationUnit === 'days') {
                        endDate.setDate(endDate.getDate() + (plan.duration || 30))
                    } else {
                        endDate.setDate(endDate.getDate() + 30)
                    }
                    const branchId = updatedPayment.branchId || plan.branchId || staff.branchId
                    const existing = await tx.studentSubscription.findFirst({
                        where: {
                            studentId: updatedPayment.studentId,
                            branchId,
                            status: 'pending'
                        }
                    })
                    let subId = ''
                    if (existing) {
                        const sub = await tx.studentSubscription.update({
                            where: { id: existing.id },
                            data: {
                                status: 'active',
                                startDate,
                                endDate,
                                planId: plan.id,
                                amount: updatedPayment.amount
                            }
                        })
                        subId = sub.id
                    } else {
                        const sub = await tx.studentSubscription.create({
                            data: {
                                studentId: updatedPayment.studentId,
                                branchId,
                                libraryId: updatedPayment.libraryId,
                                planId: plan.id,
                                startDate,
                                endDate,
                                status: 'active',
                                amount: updatedPayment.amount
                            }
                        })
                        subId = sub.id
                    }
                    updatedPayment = await tx.payment.update({
                        where: { id: updatedPayment.id },
                        data: { subscriptionId: subId },
                        include: {
                            student: true,
                            branch: true,
                            subscription: { include: { plan: true } }
                        }
                    })
                }
            }

            return updatedPayment
        })

        await prisma.staffActivity.create({
            data: {
                libraryId: staff.libraryId,
                staffId: staff.id,
                type: 'payment',
                action: 'Payment Verified',
                details: `Payment ${payment.id} verified by staff`,
                entity: 'Finance',
                status: 'success',
                metadata: JSON.stringify({ paymentId: payment.id, branchId: staff.branchId, amount: payment.amount, method: payment.method })
            }
        })

        if (payment.student?.email) {
            await sendReceiptEmail({
                invoiceNo: payment.invoiceNo || `INV-${payment.id.substring(0, 8).toUpperCase()}`,
                date: payment.date,
                studentName: payment.student.name,
                studentEmail: payment.student.email,
                studentPhone: payment.student.phone,
                branchName: payment.branch?.name || 'Main Branch',
                planName: payment.subscription?.plan?.name || 'Custom Payment',
                amount: payment.amount,
                paymentMethod: payment.method,
                subTotal: payment.amount + (payment.discountAmount || 0),
                discount: payment.discountAmount || 0,
                items: [{
                    description: payment.subscription?.plan?.name || 'Payment',
                    amount: payment.amount
                }]
            })
        }

        revalidatePath('/staff/verification')
        revalidatePath('/student/home')
        revalidatePath('/student/attendance')
        return { success: true }
    } catch (error) {
        console.error('Error verifying payment:', error)
        const msg = error instanceof Error ? error.message : 'Failed to verify payment'
        return { success: false, error: msg }
    }
}
