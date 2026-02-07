'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendReceiptEmail } from '@/actions/email'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { formatSeatNumber } from '@/lib/utils'
import { getAuthenticatedStaff } from '@/lib/auth/staff'

// Helper to get authenticated staff
// Removed local helper in favor of imported one

export async function getStaffFinanceStats() {
  try {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    const now = new Date()
    const startOfToday = startOfDay(now)
    const endOfToday = endOfDay(now)
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)

    // 1. Total Collected by Staff (All time)
    const totalCollectedByMe = await prisma.payment.aggregate({
      where: {
        libraryId: staff.libraryId,
        branchId: staff.branchId,
        status: 'completed',
        collectedBy: staff.id
      },
      _sum: { amount: true }
    })

    // 2. Collected Today (by Staff)
    const collectedTodayByMe = await prisma.payment.aggregate({
      where: {
        libraryId: staff.libraryId,
        branchId: staff.branchId,
        status: 'completed',
        collectedBy: staff.id,
        date: { gte: startOfToday, lte: endOfToday }
      },
      _sum: { amount: true }
    })

    // 3. Branch Monthly Revenue (Context)
    const branchMonthlyRevenue = await prisma.payment.aggregate({
      where: {
        libraryId: staff.libraryId,
        branchId: staff.branchId,
        status: 'completed',
        date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
      },
      _sum: { amount: true }
    })

    // 4. Pending Collections in Branch (Status = pending or pending_verification)
    const pendingCollections = await prisma.payment.aggregate({
      where: {
        libraryId: staff.libraryId,
        branchId: staff.branchId,
        status: { in: ['pending', 'pending_verification'] }
      },
      _sum: { amount: true },
      _count: { id: true }
    })

    return {
      success: true,
      data: {
        totalCollectedByMe: totalCollectedByMe._sum.amount || 0,
        collectedTodayByMe: collectedTodayByMe._sum.amount || 0,
        branchMonthlyRevenue: branchMonthlyRevenue._sum.amount || 0,
        pendingAmount: pendingCollections._sum.amount || 0,
        pendingCount: pendingCollections._count.id || 0
      }
    }
  } catch (error) {
    console.error('Error fetching finance stats:', error)
    return { success: false, error: 'Failed to fetch finance stats' }
  }
}

interface TransactionFilters {
    startDate?: Date
    endDate?: Date
    status?: string
    method?: string
    scope?: 'me' | 'branch' // 'me' = collected by staff, 'branch' = all branch payments
    search?: string
    studentId?: string
}

export async function getStaffTransactions(filters: TransactionFilters = {}, limit = 20) {
  try {
    const staff = await getAuthenticatedStaff()
    if (!staff) return { success: false, error: 'Unauthorized' }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
        libraryId: staff.libraryId,
        branchId: staff.branchId
    }

    // Scope filter: default to 'branch' to show all branch transactions
    if (filters.scope === 'me') {
        whereClause.collectedBy = staff.id
    }

    if (filters.status && filters.status !== 'all') {
        whereClause.status = filters.status
    }

    if (filters.method && filters.method !== 'all') {
        whereClause.method = filters.method
    }

    if (filters.studentId) {
        whereClause.studentId = filters.studentId
    }

    if (filters.search) {
        whereClause.OR = [
            { student: { name: { contains: filters.search, mode: 'insensitive' } } },
            { student: { email: { contains: filters.search, mode: 'insensitive' } } },
            { student: { phone: { contains: filters.search, mode: 'insensitive' } } },
            { invoiceNo: { contains: filters.search, mode: 'insensitive' } },
            { transactionId: { contains: filters.search, mode: 'insensitive' } }
        ]
    }

    if (filters.startDate) {
        whereClause.date = {
            ...whereClause.date,
            gte: startOfDay(filters.startDate)
        }
    }

    if (filters.endDate) {
        whereClause.date = {
            ...whereClause.date,
            lte: endOfDay(filters.endDate)
        }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        student: { select: { id: true, name: true, email: true, phone: true } },
        branch: { select: { name: true } },
        subscription: { include: { plan: true, seat: true } },
        additionalFee: true,
        promotion: true
      }
    })

    return { success: true, data: payments }
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return { success: false, error: 'Failed to fetch transactions' }
  }
}



export async function createStaffPayment(data: {
    studentId: string
    amount: number
    method: string
    type: string
    remarks?: string
    planId?: string
    feeId?: string
    additionalFeeIds?: string[]
    seatId?: string
    discount?: number
    promoCode?: string
}) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        // Validate student belongs to branch
        const student = await prisma.student.findFirst({
            where: { 
                id: data.studentId, 
                libraryId: staff.libraryId,
                OR: [
                    { branchId: staff.branchId },
                    { subscriptions: { some: { branchId: staff.branchId } } }
                ]
            },
            select: { id: true, branchId: true }
        })

        if (!student) return { success: false, error: 'Student not found or not in your branch' }

        // Pre-validate Plan and Seat existence to avoid throwing inside transaction
        let plan = null
        if (data.type === 'subscription' && data.planId) {
            plan = await prisma.plan.findUnique({ where: { id: data.planId } })
            if (!plan) return { success: false, error: 'Plan not found' }
        }

        if (data.seatId) {
            const seat = await prisma.seat.findUnique({ where: { id: data.seatId } })
            if (!seat) return { success: false, error: 'Seat not found' }
        }

        // Calculate Dates and Check Conflicts outside transaction
        let start = new Date()
        let end = new Date()
        let subscriptionId: string | undefined = undefined
        let hasLocker = false

        if (data.type === 'subscription' && plan) {
             const lastSubscription = await prisma.studentSubscription.findFirst({
                where: {
                    studentId: data.studentId,
                    branchId: staff.branchId,
                    status: { in: ['active', 'pending'] },
                    endDate: { gt: new Date() }
                },
                orderBy: { endDate: 'desc' }
            })

            if (lastSubscription) {
                start = new Date(lastSubscription.endDate)
            }

            end = new Date(start)
            if (plan.durationUnit === 'days') {
                end.setDate(end.getDate() + plan.duration)
            } else if (plan.durationUnit === 'weeks') {
                end.setDate(end.getDate() + (plan.duration * 7))
            } else if (plan.durationUnit === 'months') {
                end.setMonth(end.getMonth() + plan.duration)
            }

            if (data.seatId) {
                const conflictingSub = await prisma.studentSubscription.findFirst({
                    where: {
                        seatId: data.seatId,
                        status: { in: ['active', 'pending'] },
                        startDate: { lt: end },
                        endDate: { gt: start }
                    }
                })

                if (conflictingSub) return { success: false, error: 'Seat is already occupied for the selected dates' }
            }

            // Determine hasLocker status
            hasLocker = plan.includesLocker || false
            const feeIds = data.additionalFeeIds || (data.feeId ? [data.feeId] : [])
            
            if (!hasLocker && feeIds.length > 0) {
                const fees = await prisma.additionalFee.findMany({
                    where: { id: { in: feeIds } }
                })
                hasLocker = fees.some(f => f.name.toLowerCase().includes('locker'))
            }
        }

        const payment = await prisma.$transaction(async (tx) => {
            // Handle Subscription Logic
            if (data.type === 'subscription' && plan) {
                // Create Subscription
                const subscription = await tx.studentSubscription.create({
                    data: {
                        studentId: data.studentId,
                        libraryId: staff.libraryId,
                        branchId: staff.branchId,
                        planId: plan.id,
                        seatId: data.seatId,
                        startDate: start,
                        endDate: end,
                        amount: data.amount,
                        status: 'active', // Immediate activation for staff payments
                        hasLocker
                    }
                })
                subscriptionId = subscription.id
            }

            // Generate description for fees
            let feeDescription = ''
            if (plan) feeDescription = `Plan: ${plan.name}`
            
            const feeIds = data.additionalFeeIds || (data.feeId ? [data.feeId] : [])
            if (feeIds.length > 0) {
                const fees = await tx.additionalFee.findMany({
                    where: { id: { in: feeIds } }
                })
                fees.forEach(fee => {
                    feeDescription += feeDescription ? `, ${fee.name}` : fee.name
                })
            }

            // Create Payment
            const payment = await tx.payment.create({
                data: {
                    amount: data.amount,
                    method: data.method,
                    status: 'completed',
                    type: data.type,
                    date: new Date(),
                    studentId: data.studentId,
                    libraryId: staff.libraryId,
                    branchId: staff.branchId,
                    notes: data.remarks ? `${feeDescription}. ${data.remarks}` : feeDescription,
                    remarks: data.remarks,
                    collectedBy: staff.id,
                    verifiedBy: staff.id,
                    verifierRole: 'staff',
                    verifiedAt: new Date(),
                    feeId: data.feeId || undefined,
                    subscriptionId: subscriptionId,
                    discountAmount: data.discount || 0
                },
                include: {
                    student: true,
                    branch: true,
                    library: true
                }
            })

            return payment
        }, {
            maxWait: 5000, // default: 2000
            timeout: 20000 // default: 5000
        })

        // Log Activity (Outside transaction to reduce lock time)
        try {
            await prisma.staffActivity.create({
                data: {
                    libraryId: staff.libraryId,
                    staffId: staff.id,
                    type: 'payment',
                    action: 'Collect Payment',
                    details: `Collected ₹${data.amount} from student (Payment ID: ${payment.id})`,
                    entity: 'Finance',
                    status: 'success'
                }
            })

            // Send Receipt Email
            const enrichedPayment = await prisma.payment.findUnique({
                where: { id: payment.id },
                include: {
                    student: true,
                    branch: true,
                    subscription: {
                        include: { 
                            plan: true,
                            seat: true
                        }
                    },
                    additionalFee: true
                }
            })

            if (enrichedPayment && enrichedPayment.student.email) {
                // ... email sending logic (abbreviated for search/replace match, but I need to be careful)
                // Actually I can just keep the existing logic structure but wrapped in try/catch block of the main function
                // and return { success: true, data: payment }
                
                // Let's just copy the email logic from the read file to be safe
                let planName = 'N/A'
                let duration = 'N/A'
                const items: Array<{ description: string, amount: number }> = []
                const subTotal = enrichedPayment.amount + (enrichedPayment.discountAmount || 0)

                if (enrichedPayment.subscription?.plan) {
                    planName = enrichedPayment.subscription.plan.name
                    duration = `${enrichedPayment.subscription.plan.duration} ${enrichedPayment.subscription.plan.durationUnit}`
                    items.push({
                        description: `Plan: ${enrichedPayment.subscription.plan.name}`,
                        amount: enrichedPayment.subscription.plan.price
                    })
                } else if (enrichedPayment.additionalFee) {
                    planName = enrichedPayment.additionalFee.name
                    items.push({
                        description: enrichedPayment.additionalFee.name,
                        amount: enrichedPayment.additionalFee.amount
                    })
                } else {
                    items.push({
                        description: 'Payment',
                        amount: subTotal
                    })
                }

                const formatTime = (timeStr?: string | null) => {
                    if (!timeStr) return '-'
                    const [hours, minutes] = timeStr.split(':')
                    const h = parseInt(hours)
                    const ampm = h >= 12 ? 'PM' : 'AM'
                    const h12 = h % 12 || 12
                    return `${h12}:${minutes} ${ampm}`
                }

                await sendReceiptEmail({
                    invoiceNo: enrichedPayment.invoiceNo || enrichedPayment.id.slice(0, 8).toUpperCase(),
                    date: enrichedPayment.date,
                    studentName: enrichedPayment.student.name,
                    studentEmail: enrichedPayment.student.email,
                    studentPhone: enrichedPayment.student.phone,
                    branchName: enrichedPayment.branch?.name || 'N/A',
                    branchAddress: `${enrichedPayment.branch?.address || ''}, ${enrichedPayment.branch?.city || ''}`,
                    planName,
                    planType: enrichedPayment.subscription?.plan?.category || undefined,
                    planDuration: duration,
                    planHours: enrichedPayment.subscription?.plan?.hoursPerDay 
                        ? `${enrichedPayment.subscription.plan.hoursPerDay} Hrs/Day` 
                        : (enrichedPayment.subscription?.plan?.shiftStart && enrichedPayment.subscription?.plan?.shiftEnd)
                            ? `${formatTime(enrichedPayment.subscription.plan.shiftStart)} - ${formatTime(enrichedPayment.subscription.plan.shiftEnd)}`
                            : undefined,
                    seatNumber: enrichedPayment.subscription?.seat?.number 
                        ? `${formatSeatNumber(enrichedPayment.subscription.seat.number)}${enrichedPayment.subscription.seat.section ? ` (${enrichedPayment.subscription.seat.section})` : ''}` 
                        : undefined,
                    time: (enrichedPayment.subscription?.plan?.shiftStart && enrichedPayment.subscription?.plan?.shiftEnd)
                        ? `${formatTime(enrichedPayment.subscription.plan.shiftStart)} - ${formatTime(enrichedPayment.subscription.plan.shiftEnd)}`
                        : undefined,
                    startDate: enrichedPayment.subscription?.startDate || undefined,
                    endDate: enrichedPayment.subscription?.endDate || undefined,
                    amount: enrichedPayment.amount,
                    paymentMethod: enrichedPayment.method.replace('_', ' '),
                    subTotal: subTotal,
                    discount: enrichedPayment.discountAmount || 0,
                    items: items
                })
            }

        } catch (error) {
            console.error('Failed to log staff activity or send email:', error)
            // We don't throw here to avoid failing the request after successful payment
        }

        return { success: true, data: payment }
    } catch (error) {
        console.error('Error creating staff payment:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to create payment'
        return { success: false, error: errorMessage }
    }
}



export async function getStaffBranchDetails() {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        const branch = await prisma.branch.findUnique({
            where: { id: staff.branchId },
            include: {
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
                },
                library: {
                    select: {
                        plans: { where: { isActive: true, branchId: null } },
                        additionalFees: { where: { isActive: true, branchId: null } }
                    }
                }
            }
        })

        if (!branch) return { success: false, error: 'Branch not found' }

        // Transform seats to add isOccupied flag
        const seatsWithStatus = branch.seats.map(seat => ({
            ...seat,
            isOccupied: seat.subscriptions.length > 0,
            row: null,
            column: null,
            subscriptions: undefined // Remove detailed subscription info
        }))

        // Combine branch-specific and global items
        const allPlans = [
            ...branch.plans,
            ...(branch.library?.plans || [])
        ]

        const allFees = [
            ...branch.additionalFees.map(fee => ({ ...fee, type: 'fee' })),
            ...(branch.library?.additionalFees.map(fee => ({ ...fee, type: 'fee' })) || [])
        ]

        return {
            success: true,
            data: {
                seats: seatsWithStatus,
                plans: allPlans,
                fees: allFees,
                branch: {
                    id: branch.id,
                    name: branch.name,
                    address: branch.address,
                    city: branch.city,
                    phone: branch.contactPhone
                }
            }
        }
    } catch (error) {
        console.error('Error fetching branch details:', error)
        return { success: false, error: 'Failed to fetch branch details' }
    }
}

export async function updatePaymentRemarks(paymentId: string, remarks: string) {
    try {
        const staff = await getAuthenticatedStaff()
        if (!staff) return { success: false, error: 'Unauthorized' }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId, libraryId: staff.libraryId },
        })

        if (!payment) return { success: false, error: 'Payment not found' }

        await prisma.payment.update({
            where: { id: paymentId },
            data: { remarks, notes: remarks }
        })

        revalidatePath('/staff/finance')
        return { success: true }
    } catch (error) {
        console.error('Error updating payment remarks:', error)
        return { success: false, error: 'Failed to update payment remarks' }
    }
}

