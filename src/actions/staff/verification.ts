'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/lib/auth/session'

// Helper to get authenticated staff
async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get(COOKIE_KEYS.STAFF)?.value

    if (!staffId) return null

    const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        include: { 
            library: true,
            branch: true 
        }
    })
    
    if (!staff || staff.status !== 'active') return null
    return staff
}

export async function getPendingPayments(studentId?: string) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

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
