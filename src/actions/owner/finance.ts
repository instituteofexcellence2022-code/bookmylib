'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns'
import { sendReceiptEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import { getAuthenticatedOwner } from '@/lib/auth/owner'

export async function getFinanceStats() {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const endOfCurrentMonth = endOfMonth(now)
    const startOfLastMonth = startOfMonth(subMonths(now, 1))
    const endOfLastMonth = endOfMonth(subMonths(now, 1))

    // 1. Total Revenue (All time)
    const totalRevenue = await prisma.payment.aggregate({
        where: {
        libraryId: owner.libraryId,
        status: 'completed'
        },
        _sum: { amount: true }
    })

    // 2. This Month Revenue
    const thisMonthRevenue = await prisma.payment.aggregate({
        where: {
        libraryId: owner.libraryId,
        status: 'completed',
        date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        },
        _sum: { amount: true }
    })

    // 3. Last Month Revenue (for trend)
    const lastMonthRevenue = await prisma.payment.aggregate({
        where: {
        libraryId: owner.libraryId,
        status: 'completed',
        date: { gte: startOfLastMonth, lte: endOfLastMonth }
        },
        _sum: { amount: true }
    })

    // 4. Pending Collections (Status = pending or pending_verification)
    const pendingCollections = await prisma.payment.aggregate({
        where: {
        libraryId: owner.libraryId,
        status: { in: ['pending', 'pending_verification'] }
        },
        _sum: { amount: true },
        _count: { id: true }
    })

    // Calculate Trend
    const current = thisMonthRevenue._sum.amount || 0
    const last = lastMonthRevenue._sum.amount || 0
    let trend = 0
    if (last > 0) {
        trend = ((current - last) / last) * 100
    } else if (current > 0) {
        trend = 100
    }

    return {
        success: true,
        data: {
            totalRevenue: totalRevenue._sum.amount || 0,
            monthlyRevenue: current,
            monthlyTrend: trend,
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
    branchId?: string
    planId?: string
    staffId?: string
    source?: string
    search?: string
    studentId?: string
}

export async function getFilterOptions() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const [branches, plans, staff, owners] = await Promise.all([
            prisma.branch.findMany({
                where: { libraryId: owner.libraryId },
                select: { id: true, name: true }
            }),
            prisma.plan.findMany({
                where: { libraryId: owner.libraryId },
                select: { id: true, name: true }
            }),
            prisma.staff.findMany({
                where: { libraryId: owner.libraryId },
                select: { id: true, name: true }
            }),
            prisma.owner.findMany({
                where: { libraryId: owner.libraryId },
                select: { id: true, name: true }
            })
        ])

        return { 
            success: true, 
            data: { branches, plans, staff, owners } 
        }
    } catch (error) {
        console.error('Error fetching filter options:', error)
        return { success: false, error: 'Failed to fetch filter options' }
    }
}

export async function getTransactions(filters: TransactionFilters = {}, limit = 50) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
      const whereClause: any = {
          libraryId: owner.libraryId
      }

      if (filters.status && filters.status !== 'all') {
          whereClause.status = filters.status
      }

      if (filters.method && filters.method !== 'all') {
          whereClause.method = filters.method
      }

      if (filters.source && filters.source !== 'all') {
          if (filters.source === 'frontdesk') {
              whereClause.gatewayProvider = null
          } else if (filters.source === 'upi_apps') {
              whereClause.method = { in: ['upi', 'upi_app'] }
          } else if (filters.source === 'qr_code') {
              whereClause.method = { in: ['qr', 'qr_code'] }
          } else {
              whereClause.gatewayProvider = {
                  equals: filters.source,
                  mode: 'insensitive'
              }
          }
      }

      if (filters.branchId && filters.branchId !== 'all') {
          whereClause.branchId = filters.branchId
      }

      if (filters.studentId) {
          whereClause.studentId = filters.studentId
      }

      if (filters.planId && filters.planId !== 'all') {
          whereClause.subscription = {
              planId: filters.planId
          }
      }

      const andConditions = []

      if (filters.staffId && filters.staffId !== 'all') {
          if (filters.staffId === 'all_staff') {
              andConditions.push({
                  verifierRole: 'staff'
              })
          } else {
              andConditions.push({
                  OR: [
                      { collectedBy: filters.staffId },
                      { verifiedBy: filters.staffId }
                  ]
              })
          }
      }

      if (filters.search) {
          andConditions.push({
              OR: [
                  { student: { name: { contains: filters.search, mode: 'insensitive' } } },
                  { student: { email: { contains: filters.search, mode: 'insensitive' } } },
                  { student: { phone: { contains: filters.search, mode: 'insensitive' } } },
                  { invoiceNo: { contains: filters.search, mode: 'insensitive' } },
                  { transactionId: { contains: filters.search, mode: 'insensitive' } }
              ]
          })
      }

      if (andConditions.length > 0) {
          whereClause.AND = andConditions
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
          branch: { select: { name: true, address: true, city: true, state: true } },
          subscription: { include: { plan: true, seat: true } },
          additionalFee: true,
          promotion: true
        }
      })

      // Enrich payments with verifier details
      const staffIds = new Set<string>()
      const ownerIds = new Set<string>()

      payments.forEach(p => {
        // Check verifiedBy
        if (p.verifiedBy) {
          if (p.verifierRole === 'staff') staffIds.add(p.verifiedBy)
          else if (p.verifierRole === 'owner') ownerIds.add(p.verifiedBy)
        }
        // Check collectedBy (fallback or explicit collection)
        if (p.collectedBy) {
           staffIds.add(p.collectedBy)
        }
      })

      const [staffMap, ownerMap] = await Promise.all([
        staffIds.size > 0 ? prisma.staff.findMany({
          where: { id: { in: Array.from(staffIds) } },
          select: { id: true, name: true }
        }).then(staff => new Map(staff.map(s => [s.id, s.name]))) : new Map(),
        ownerIds.size > 0 ? prisma.owner.findMany({
          where: { id: { in: Array.from(ownerIds) } },
          select: { id: true, name: true }
        }).then(owners => new Map(owners.map(o => [o.id, o.name]))) : new Map()
      ])

      const enrichedPayments = payments.map(p => {
          let name: string | undefined = undefined;
          
          if (p.verifiedBy) {
              name = (p.verifierRole === 'staff' ? staffMap.get(p.verifiedBy) : ownerMap.get(p.verifiedBy));
          }
          
          if (!name && p.collectedBy) {
              name = staffMap.get(p.collectedBy);
          }
          
          const hasId = p.verifiedBy || p.collectedBy;
          
          return {
              ...p,
              verifierName: hasId ? (name || 'Unknown User') : undefined
          }
      })

      return { success: true, data: enrichedPayments }
  } catch (error) {
      console.error('Error fetching transactions:', error)
      return { success: false, error: 'Failed to fetch transactions' }
  }
}

// Keeping for backward compatibility if needed, but getTransactions is superior
export async function getRecentTransactions(limit = 10) {
    return getTransactions({}, limit)
}

export async function getRevenueAnalytics(period: '6_months' | '12_months' = '6_months') {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
      const monthsToFetch = period === '6_months' ? 6 : 12
      const now = new Date()
      const startDate = startOfMonth(subMonths(now, monthsToFetch - 1))

      const payments = await prisma.payment.findMany({
        where: {
          libraryId: owner.libraryId,
          status: 'completed',
          date: { gte: startDate }
        },
        select: {
          amount: true,
          date: true
        }
      })

      // Group by month
      const monthlyData: Record<string, number> = {}
      
      // Initialize all months with 0
      for (let i = 0; i < monthsToFetch; i++) {
        const d = subMonths(now, i)
        const key = format(d, 'MMM yyyy')
        monthlyData[key] = 0
      }

      // Aggregate
      payments.forEach(p => {
        const key = format(p.date, 'MMM yyyy')
        if (monthlyData[key] !== undefined) {
          monthlyData[key] += p.amount
        }
      })

      // Convert to array and reverse to chronological order
      const chartData = Object.entries(monthlyData)
        .map(([name, value]) => ({ name, value }))
        .reverse()

      return { success: true, data: chartData }
  } catch (error) {
      console.error('Error fetching revenue analytics:', error)
      return { success: false, error: 'Failed to fetch revenue analytics' }
  }
}

export async function getRevenueDistribution() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        // 1. By Method
        const byMethod = await prisma.payment.groupBy({
            by: ['method'],
            where: {
                libraryId: owner.libraryId,
                status: 'completed'
            },
            _sum: { amount: true }
        })

        // 2. By Plan Name (Subscription Payments only)
        const byPlan = await prisma.payment.findMany({
            where: {
                libraryId: owner.libraryId,
                status: 'completed',
                type: 'subscription',
                subscription: {
                    isNot: null
                }
            },
            include: {
                subscription: {
                    include: {
                        plan: true
                    }
                }
            }
        })

        const planRevenue: Record<string, number> = {}
        
        byPlan.forEach(p => {
            const planName = p.subscription?.plan?.name || 'Unknown Plan'
            if (!planRevenue[planName]) planRevenue[planName] = 0
            planRevenue[planName] += p.amount
        })

        const byType = Object.entries(planRevenue).map(([name, value]) => ({ name, value }))

        return {
            success: true,
            data: {
                byMethod: byMethod.map(m => ({ name: m.method.replace('_', ' '), value: m._sum.amount || 0 })),
                byType
            }
        }
    } catch (error) {
        console.error('Error fetching revenue distribution:', error)
        return { success: false, error: 'Failed to fetch revenue distribution' }
    }
}

export async function getUpcomingExpiries(days = 7, branchId?: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const now = new Date()
        const futureDate = new Date(now)
        futureDate.setDate(now.getDate() + days)

        const where: any = {
            libraryId: owner.libraryId,
            status: 'active',
            endDate: {
                gte: now,
                lte: futureDate
            }
        }

        if (branchId && branchId !== 'all') {
            where.branchId = branchId
        }

        const expiries = await prisma.studentSubscription.findMany({
            where,
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
                seat: true,
                branch: { select: { name: true } }
            },
            orderBy: {
                endDate: 'asc'
            }
        })

        return { success: true, data: expiries }
    } catch (error) {
        console.error('Error fetching upcoming expiries:', error)
        return { success: false, error: 'Failed to fetch upcoming expiries' }
    }
}

export async function updatePaymentStatus(paymentId: string, status: 'completed' | 'failed') {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId, libraryId: owner.libraryId },
            include: { subscription: true }
        })

        if (!payment) return { success: false, error: 'Payment not found' }

        // If status is not changing, return
        if (payment.status === status) return { success: true }

        await prisma.$transaction(async (tx) => {
            // Update Payment
            const updateData: any = {
                status,
                verifiedBy: owner.id,
                verifierRole: 'owner',
                verifiedAt: new Date()
            }

            // Generate Invoice No if completing and missing
            if (status === 'completed' && !payment.invoiceNo) {
                updateData.invoiceNo = `INV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
            }

            await tx.payment.update({
                where: { id: paymentId },
                data: updateData
            })

            // Update Subscription if applicable
            if (payment.subscriptionId) {
                const subStatus = status === 'completed' ? 'active' : 'inactive'
                await tx.studentSubscription.update({
                    where: { id: payment.subscriptionId },
                    data: { status: subStatus }
                })
            }
        })

        revalidatePath('/owner/finance')
        return { success: true }
    } catch (error) {
        console.error('Error updating payment status:', error)
        return { success: false, error: 'Failed to update payment status' }
    }
}

export async function getOverdueSubscriptions(days = 30, branchId?: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const now = new Date()
        const pastDate = new Date(now)
        pastDate.setDate(now.getDate() - days)

        const where: any = {
            libraryId: owner.libraryId,
            endDate: {
                lt: now,
                gte: pastDate
            },
            // We include both 'active' (overdue but not updated) and 'expired'
            status: { in: ['active', 'expired'] }
        }

        if (branchId && branchId !== 'all') {
            where.branchId = branchId
        }

        // Find subscriptions that expired recently
        // We want to target students who might need renewal
        const overdue = await prisma.studentSubscription.findMany({
            where,
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
                seat: true,
                branch: { select: { name: true } }
            },
            orderBy: {
                endDate: 'desc'
            }
        })

        return { success: true, data: overdue }
    } catch (error) {
        console.error('Error fetching overdue subscriptions:', error)
        return { success: false, error: 'Failed to fetch overdue subscriptions' }
    }
}

export async function createManualPayment(data: {
    studentId: string
    amount: number
    method: string
    type: string
    remarks?: string
    planId?: string
    feeId?: string
}) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        // Validate student belongs to library (optional but good practice)
        const student = await prisma.student.findUnique({
            where: { id: data.studentId, libraryId: owner.libraryId },
            select: { id: true, branchId: true }
        })
        if (!student) return { success: false, error: 'Student not found' }
        if (!student.branchId) return { success: false, error: 'Student does not belong to a branch' }

        // Create Payment
        const payment = await prisma.payment.create({
            data: {
                amount: data.amount,
                method: data.method,
                status: 'completed', // Manual payments by owner are auto-completed
                type: data.type, // 'subscription' or 'one_time' or 'monthly_fee'
                date: new Date(),
                studentId: data.studentId,
                libraryId: owner.libraryId,
                branchId: student.branchId,
                notes: data.remarks,
                remarks: data.remarks,
                // Link to Plan or Fee if provided
                subscriptionId: data.type === 'subscription' && data.planId ? undefined : undefined, 
                feeId: data.feeId || undefined
            }
        })

        return { success: true, data: payment }
    } catch (error) {
        console.error('Error creating manual payment:', error)
        return { success: false, error: 'Failed to create manual payment' }
    }
}

export async function getPendingPayments() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const payments = await prisma.payment.findMany({
            where: {
                libraryId: owner.libraryId,
                status: 'pending_verification'
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
                            plan: plan,
                            // Mock other fields if necessary for UI compatibility
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

export async function verifyPayment(paymentId: string, action: 'approve' | 'reject') {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const status = action === 'approve' ? 'completed' : 'failed'

        // Use transaction to ensure payment and subscription update happen together
        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.update({
                where: {
                    id: paymentId,
                    libraryId: owner.libraryId
                },
                data: {
                    status,
                    collectedBy: owner.id,
                    verifiedBy: owner.id,
                    verifierRole: 'owner',
                    verifiedAt: new Date()
                },
                include: {
                    student: {
                        include: {
                            subscriptions: true
                        }
                    }
                }
            })

            // If approved and linked to a subscription, activate the subscription
            if (action === 'approve' && payment.type === 'subscription') {
                // 1. Try to use linked subscription
                if (payment.subscriptionId) {
                    await tx.studentSubscription.update({
                        where: { id: payment.subscriptionId },
                        data: { 
                            status: 'active'
                        }
                    })
                } 
                // 2. Fallback: Try to find by relatedId (Plan) or Branch
                else if (payment.relatedId) {
                    const plan = await tx.plan.findUnique({ where: { id: payment.relatedId } })
                    
                    if (plan) {
                        const startDate = new Date()
                        let endDate = new Date()
                        
                        if (plan.durationUnit === 'months') {
                            endDate.setMonth(endDate.getMonth() + plan.duration)
                        } else if (plan.durationUnit === 'days') {
                            endDate.setDate(endDate.getDate() + plan.duration)
                        }
                        
                        // Determine branch - prioritize payment branch, fallback to plan branch or student's first subscription branch
                        const branchId = payment.branchId || plan.branchId || payment.student.subscriptions[0]?.branchId
                        
                        if (branchId) {
                            // Check if there is a pending subscription for this plan/branch
                             const existing = await tx.studentSubscription.findFirst({
                                 where: { 
                                   studentId: payment.studentId, 
                                   branchId,
                                   status: 'pending' // Prioritize pending
                                 }
                             })
                             
                             if (existing) {
                                 await tx.studentSubscription.update({
                                     where: { id: existing.id },
                                     data: {
                                         planId: plan.id,
                                         startDate,
                                        endDate,
                                        status: 'active'
                                    }
                                })
                                
                                // Link payment to this subscription
                                await tx.payment.update({
                                    where: { id: payment.id },
                                    data: { subscriptionId: existing.id }
                                })
                            } else {
                                const newSub = await tx.studentSubscription.create({
                                    data: {
                                        libraryId: payment.libraryId,
                                        studentId: payment.studentId,
                                        branchId,
                                        planId: plan.id,
                                        startDate,
                                        endDate,
                                        status: 'active',
                                        amount: payment.amount
                                    }
                                })
                                 
                                 // Link payment to this new subscription
                                 await tx.payment.update({
                                     where: { id: payment.id },
                                     data: { subscriptionId: newSub.id }
                                 })
                             }
                        }
                    }
                }
            }
            
            return payment
        })

        // Send Receipt Email if approved
        if (action === 'approve') {
            try {
                const enrichedPayment = await prisma.payment.findUnique({
                    where: { id: paymentId },
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
                    let planName = 'N/A'
                    let duration = 'N/A'
                    let items: Array<{ description: string, amount: number }> = []
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
                        planHours: enrichedPayment.subscription?.plan?.hoursPerDay ? `${enrichedPayment.subscription.plan.hoursPerDay} Hrs/Day` : undefined,
                        seatNumber: enrichedPayment.subscription?.seat?.number ? `${formatSeatNumber(enrichedPayment.subscription.seat.number)}` : undefined,
                        startDate: enrichedPayment.subscription?.startDate || undefined,
                        endDate: enrichedPayment.subscription?.endDate || undefined,
                        amount: enrichedPayment.amount,
                        paymentMethod: enrichedPayment.method.replace('_', ' '),
                        subTotal: subTotal,
                        discount: enrichedPayment.discountAmount || 0,
                        items: items
                    })
                }
            } catch (emailError) {
                console.error('Failed to send receipt email during verification:', emailError)
                // Don't fail the verification if email fails
            }
        }

        revalidatePath('/owner/finance')
        revalidatePath('/owner/verification')
        return { success: true }
    } catch (error) {
        console.error('Error verifying payment:', error)
        return { success: false, error: 'Failed to verify payment' }
    }
}

export async function getPendingHandovers() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const handovers = await prisma.cashHandover.findMany({
            where: {
                libraryId: owner.libraryId,
                status: 'pending'
            },
            include: {
                staff: {
                    select: {
                        name: true,
                        email: true,
                        image: true
                    }
                },
                branch: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return { success: true, data: handovers }
    } catch (error) {
        console.error('Error fetching pending handovers:', error)
        return { success: false, error: 'Failed to fetch pending handovers' }
    }
}

export async function verifyHandover(handoverId: string, status: 'verified' | 'rejected') {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const handover = await prisma.cashHandover.update({
            where: {
                id: handoverId,
                libraryId: owner.libraryId
            },
            data: {
                status,
                verifiedBy: owner.id
            }
        })

        revalidatePath('/owner/finance')
        return { success: true, data: handover }
    } catch (error) {
        console.error('Error verifying handover:', error)
        return { success: false, error: 'Failed to verify handover' }
    }
}

export async function updatePaymentRemarks(paymentId: string, remarks: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const payment = await prisma.payment.findUnique({
            where: { id: paymentId, libraryId: owner.libraryId },
        })

        if (!payment) return { success: false, error: 'Payment not found' }

        await prisma.payment.update({
            where: { id: paymentId },
            data: { remarks, notes: remarks }
        })

        revalidatePath('/owner/finance')
        return { success: true }
    } catch (error) {
        console.error('Error updating payment remarks:', error)
        return { success: false, error: 'Failed to update payment remarks' }
    }
}
