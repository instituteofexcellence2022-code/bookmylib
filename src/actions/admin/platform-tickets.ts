'use server'

import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

interface ApproveSubscriptionData {
    ticketId: string
    shouldCreatePayment: boolean
    paymentDetails?: {
        amount: number
        method: string
        status: string
        referenceId?: string
        notes?: string
        billingCycle: 'monthly' | 'yearly'
    }
}

export async function getPlatformTickets(status: string = 'open') {
    await requireAdmin()
    
    return prisma.platformSupportTicket.findMany({
        where: status !== 'all' ? { status } : undefined,
        include: {
            library: {
                select: { name: true, subdomain: true }
            },
            owner: {
                select: { name: true, email: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })
}

export async function approveSubscriptionRequest(data: ApproveSubscriptionData) {
    await requireAdmin()
    
    const { ticketId, shouldCreatePayment, paymentDetails } = data

    try {
        const ticket = await prisma.platformSupportTicket.findUnique({
            where: { id: ticketId },
            include: { library: true }
        })

        if (!ticket) return { success: false, error: 'Ticket not found' }

        // 1. Parse Plan Name from Subject
        const prefix = "Platform Subscription Change Request: "
        if (!ticket.subject.startsWith(prefix)) {
            return { success: false, error: 'Invalid ticket type for subscription approval' }
        }

        const planName = ticket.subject.substring(prefix.length)
        
        // 2. Find the Plan
        const plan = await prisma.saasPlan.findFirst({
            where: { name: planName }
        })

        if (!plan) return { success: false, error: `Plan "${planName}" not found` }

        // 3. Determine Billing Period
        const now = new Date()
        let periodEnd = new Date()
        
        if (paymentDetails?.billingCycle === 'yearly') {
            periodEnd.setFullYear(now.getFullYear() + 1)
        } else {
            periodEnd.setMonth(now.getMonth() + 1)
        }

        // Determine Subscription Status based on Payment
        // Only set ACTIVE when admin marks payment as 'succeeded'.
        // Otherwise keep subscription in 'past_due' (waiting for payment).
        let subscriptionStatus = 'past_due'
        if (shouldCreatePayment && paymentDetails?.status === 'succeeded') {
            subscriptionStatus = 'active'
        }

        // 4. Update Subscription
        const subscription = await prisma.librarySubscription.findUnique({
            where: { libraryId: ticket.libraryId }
        })

        if (subscription) {
            await prisma.librarySubscription.update({
                where: { libraryId: ticket.libraryId },
                data: { 
                    planId: plan.id,
                    status: subscriptionStatus,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd
                }
            })
        } else {
            await prisma.librarySubscription.create({
                data: {
                    libraryId: ticket.libraryId,
                    planId: plan.id,
                    status: subscriptionStatus,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd
                }
            })
        }

        // 5. Create Payment Record (if requested)
        if (shouldCreatePayment && paymentDetails) {
            // Generate Invoice Number
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
            const count = await prisma.saasPayment.count({
                where: { createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }
            })
            const invoiceNumber = `INV-${dateStr}-${(count + 1).toString().padStart(4, '0')}`

            await prisma.saasPayment.create({
                data: {
                    libraryId: ticket.libraryId,
                    planId: plan.id,
                    amount: paymentDetails.amount,
                    subtotal: paymentDetails.amount, // Simplified tax handling for now
                    taxAmount: 0,
                    currency: 'INR',
                    status: paymentDetails.status, // 'succeeded' or 'pending'
                    method: paymentDetails.method,
                    gatewayId: paymentDetails.referenceId,
                    description: `Subscription to ${plan.name} (${paymentDetails.billingCycle})`,
                    notes: paymentDetails.notes,
                    invoiceNumber,
                    paymentDate: now,
                    billingStart: now,
                    billingEnd: periodEnd
                }
            })
        }

        // 6. Close Ticket
        const statusMsg = subscriptionStatus === 'active' ? 'Subscription is now ACTIVE.' : 'Subscription updated (Payment Pending).'
        
        await prisma.platformSupportTicket.update({
            where: { id: ticketId },
            data: { 
                status: 'resolved',
                message: ticket.message + `\n\n[System]: Request Approved. ${statusMsg}` + (shouldCreatePayment ? ' Payment record created.' : '')
            }
        })

        revalidatePath('/admin/tickets')
        revalidatePath('/admin/payments')
        revalidatePath('/admin/subscriptions')
        
        return { success: true }
    } catch (error) {
        console.error('Approve subscription error:', error)
        return { success: false, error: 'Failed to approve subscription' }
    }
}

export async function rejectSubscriptionRequest(ticketId: string, reason: string) {
    await requireAdmin()
    
    try {
        const ticket = await prisma.platformSupportTicket.findUnique({
            where: { id: ticketId }
        })

        if (!ticket) return { success: false, error: 'Ticket not found' }

        await prisma.platformSupportTicket.update({
            where: { id: ticketId },
            data: { 
                status: 'resolved', // or 'rejected' if we had that status, but 'resolved' implies processed
                message: ticket.message + `\n\n[System]: Request Rejected. Reason: ${reason}`
            }
        })

        revalidatePath('/admin/tickets')
        return { success: true }
    } catch (error) {
        console.error('Reject subscription error:', error)
        return { success: false, error: 'Failed to reject request' }
    }
}
