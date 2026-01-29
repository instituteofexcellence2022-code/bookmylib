'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'

// Helper to get authenticated staff
async function getAuthenticatedStaff() {
    const cookieStore = await cookies()
    const staffId = cookieStore.get('staff_session')?.value

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

export async function getStaffFinanceStats() {
  const staff = await getAuthenticatedStaff()
  if (!staff) throw new Error('Unauthorized')

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
    totalCollectedByMe: totalCollectedByMe._sum.amount || 0,
    collectedTodayByMe: collectedTodayByMe._sum.amount || 0,
    branchMonthlyRevenue: branchMonthlyRevenue._sum.amount || 0,
    pendingAmount: pendingCollections._sum.amount || 0,
    pendingCount: pendingCollections._count.id || 0
  }
}

interface TransactionFilters {
    startDate?: Date
    endDate?: Date
    status?: string
    method?: string
    scope?: 'me' | 'branch' // 'me' = collected by staff, 'branch' = all branch payments
}

export async function getStaffTransactions(filters: TransactionFilters = {}, limit = 20) {
  const staff = await getAuthenticatedStaff()
  if (!staff) throw new Error('Unauthorized')

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
      student: { select: { name: true, email: true, phone: true } },
      branch: { select: { name: true } },
      subscription: { include: { plan: true, seat: true } },
      additionalFee: true,
      promotion: true
    }
  })

  return payments
}

export async function createStaffPayment(data: {
    studentId: string
    amount: number
    method: string
    type: string
    remarks?: string
    planId?: string
    feeId?: string
    seatId?: string
    discount?: number
    promoCode?: string
}) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

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

    if (!student) throw new Error('Student not found or not in your branch')

    const payment = await prisma.$transaction(async (tx) => {
        let subscriptionId = undefined

        // Handle Subscription Logic
        if (data.type === 'subscription' && data.planId) {
            const plan = await tx.plan.findUnique({ where: { id: data.planId } })
            if (!plan) throw new Error('Plan not found')

            // Calculate Dates (Chain if active subscription exists)
            const lastSubscription = await tx.studentSubscription.findFirst({
                where: {
                    studentId: data.studentId,
                    branchId: staff.branchId,
                    status: { in: ['active', 'pending'] },
                    endDate: { gt: new Date() }
                },
                orderBy: { endDate: 'desc' }
            })

            let start = new Date()
            if (lastSubscription) {
                start = new Date(lastSubscription.endDate)
            }

            const end = new Date(start)
            if (plan.durationUnit === 'days') {
                end.setDate(end.getDate() + plan.duration)
            } else if (plan.durationUnit === 'weeks') {
                end.setDate(end.getDate() + (plan.duration * 7))
            } else if (plan.durationUnit === 'months') {
                end.setMonth(end.getMonth() + plan.duration)
            }

            // Validate Seat
            if (data.seatId) {
                const seat = await tx.seat.findUnique({ where: { id: data.seatId } })
                if (!seat) throw new Error('Seat not found')

                // Check conflicts
                const conflictingSub = await tx.studentSubscription.findFirst({
                    where: {
                        seatId: data.seatId,
                        status: { in: ['active', 'pending'] },
                        startDate: { lt: end },
                        endDate: { gt: start }
                    }
                })

                if (conflictingSub) throw new Error('Seat is already occupied for the selected dates')
            }

            // Create Subscription
            const subscription = await tx.studentSubscription.create({
                data: {
                    studentId: data.studentId,
                    libraryId: staff.libraryId,
                    branchId: staff.branchId,
                    planId: data.planId,
                    seatId: data.seatId,
                    startDate: start,
                    endDate: end,
                    amountPaid: data.amount,
                    discount: data.discount || 0,
                    finalAmount: data.amount,
                    status: 'active', // Immediate activation for staff payments
                    paymentStatus: 'paid'
                }
            })
            subscriptionId = subscription.id
        }

        // Handle Coupon/Promotion
        let promotionId = undefined
        if (data.promoCode) {
             // Logic to link promotion if needed, usually stored in Payment or Promotion usage table
             // For now, we assume validation was done on client/server before calling this, 
             // but strictly we should validate here too. 
             // Simplification: We just record the discount in the payment.
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
                notes: data.remarks,
                collectedBy: staff.id,
                verifiedBy: staff.id,
                verifierRole: 'staff',
                verifiedAt: new Date(),
                feeId: data.feeId || undefined,
                subscriptionId: subscriptionId,
                discountAmount: data.discount || 0
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
    } catch (error) {
        console.error('Failed to log staff activity:', error)
        // We don't throw here to avoid failing the request after successful payment
    }

    return payment
}

export async function getBranchDues(days = 7) {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

    const now = new Date()
    const futureDate = new Date(now)
    futureDate.setDate(now.getDate() + days)

    // 1. Expiring Soon
    const expiries = await prisma.studentSubscription.findMany({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            status: 'active',
            endDate: {
                gte: now,
                lte: futureDate
            }
        },
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
            plan: true,
            seat: true
        },
        orderBy: {
            endDate: 'asc'
        }
    })

    // 2. Overdue (Expired recently)
    const overdueDate = new Date(now)
    overdueDate.setDate(now.getDate() - 30) // Look back 30 days

    const overdue = await prisma.studentSubscription.findMany({
        where: {
            libraryId: staff.libraryId,
            branchId: staff.branchId,
            endDate: {
                lt: now,
                gte: overdueDate
            },
            status: { in: ['active', 'expired'] }
        },
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
            plan: true,
            seat: true
        },
        orderBy: {
            endDate: 'desc'
        }
    })

    return { expiries, overdue }
}

export async function getStaffBranchDetails() {
    const staff = await getAuthenticatedStaff()
    if (!staff) throw new Error('Unauthorized')

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

    if (!branch) throw new Error('Branch not found')

    // Transform seats to add isOccupied flag
    const seatsWithStatus = branch.seats.map(seat => ({
        ...seat,
        isOccupied: seat.subscriptions.length > 0,
        subscriptions: undefined // Remove detailed subscription info
    }))

    // Combine branch-specific and global items
    const allPlans = [
        ...branch.plans,
        ...(branch.library?.plans || [])
    ]

    const allFees = [
        ...branch.additionalFees,
        ...(branch.library?.additionalFees || [])
    ]

    return {
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
