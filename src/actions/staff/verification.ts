'use server'

import { prisma } from '@/lib/prisma'
import { getAuthenticatedStaff } from '@/lib/auth/staff'

// Helper to get authenticated staff
// Removed local helper in favor of imported one

export async function getPendingPayments(studentId?: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

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

    return enrichedPayments
}
