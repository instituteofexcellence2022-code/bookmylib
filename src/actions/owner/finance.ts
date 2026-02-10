'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns'
import { sendReceiptEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import { Prisma } from '@prisma/client'

import { getAuthenticatedOwner } from '@/lib/auth/owner'

export async function getFinanceStats(filters: { startDate?: Date, endDate?: Date, branchId?: string } = {}) {
  const owner = await getAuthenticatedOwner()
  if (!owner) return { success: false, error: 'Unauthorized' }

  try {
    const whereClause: Prisma.PaymentWhereInput = {
      libraryId: owner.libraryId,
      status: 'completed'
    }

    if (filters.branchId && filters.branchId !== 'all') {
      whereClause.branchId = filters.branchId
    }

    if (filters.startDate) {
      whereClause.date = { ...whereClause.date as Prisma.DateTimeFilter, gte: startOfDay(filters.startDate) }
    }

    if (filters.endDate) {
      whereClause.date = { ...whereClause.date as Prisma.DateTimeFilter, lte: endOfDay(filters.endDate) }
    }

    // 1. Total Revenue (in selected period)
    const totalRevenue = await prisma.payment.aggregate({
        where: whereClause,
        _sum: { amount: true }
    })

    // 2. Calculate comparison (previous period)
    let previousRevenue = 0
    let trend = 0

    if (filters.startDate && filters.endDate) {
        const duration = filters.endDate.getTime() - filters.startDate.getTime()
        const prevEnd = new Date(filters.startDate.getTime() - 1)
        const prevStart = new Date(prevEnd.getTime() - duration)

        const prevWhere = { ...whereClause }
        prevWhere.date = { gte: prevStart, lte: prevEnd }

        const prevResult = await prisma.payment.aggregate({
            where: prevWhere,
            _sum: { amount: true }
        })
        previousRevenue = prevResult._sum.amount || 0
    } else {
        // Default comparison: Last Month vs This Month if no specific date filter (or just default to Month logic)
        // Actually, if no filters, let's keep original logic (All Time + This Month)
        // But for consistency with the UI filter which defaults to something, let's adapt.
        // If "All Time" (no date filters), we can't really show a "trend" easily unless we define it (e.g. this month vs last month).
        
        // Let's stick to: if no date filter, show All Time Total, and Monthly Trend.
    }
    
    // For simplicity in this iteration:
    // If no date filters are provided, we calculate "This Month" stats for the trend card.
    // If date filters ARE provided, we calculate "Selected Period" vs "Previous Period".

    const currentRevenue = totalRevenue._sum.amount || 0
    
    if (previousRevenue > 0) {
        trend = ((currentRevenue - previousRevenue) / previousRevenue) * 100
    } else if (currentRevenue > 0 && filters.startDate) {
        trend = 100 // 100% growth from 0
    } else if (!filters.startDate) {
        // Fallback to original "This Month vs Last Month" logic for the trend card if no date filter
        const now = new Date()
        const startOfCurrentMonth = startOfMonth(now)
        const endOfCurrentMonth = endOfMonth(now)
        const startOfLastMonth = startOfMonth(subMonths(now, 1))
        const endOfLastMonth = endOfMonth(subMonths(now, 1))
        
        const thisMonth = await prisma.payment.aggregate({
            where: { 
                ...whereClause, 
                date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth } 
            },
            _sum: { amount: true }
        })
        const lastMonth = await prisma.payment.aggregate({
            where: { 
                ...whereClause, 
                date: { gte: startOfLastMonth, lte: endOfLastMonth } 
            },
            _sum: { amount: true }
        })
        
        const tm = thisMonth._sum.amount || 0
        const lm = lastMonth._sum.amount || 0
        if (lm > 0) trend = ((tm - lm) / lm) * 100
        else if (tm > 0) trend = 100
        
        // Also if no date filter, "monthlyRevenue" in the return object usually meant "This Month".
        // But the UI shows "Total Revenue" and "Monthly Revenue".
        // Let's populate 'monthlyRevenue' with the trend-basis revenue.
        previousRevenue = lm // repurpose for return
    }

    // 4. Pending Collections
    const pendingWhere: Prisma.PaymentWhereInput = {
        libraryId: owner.libraryId,
        status: { in: ['pending', 'pending_verification'] }
    }
    if (filters.branchId && filters.branchId !== 'all') {
        pendingWhere.branchId = filters.branchId
    }
    // Pending usually ignores date range (it's current state), but maybe we want "Created in date range"?
    // Usually "Pending" means "currently pending", regardless of when it was created (within reason).
    // Let's keep it unfiltered by date for now, or maybe filter by date created?
    // Let's filter by date if provided, assuming user wants to see "Pending payments from last month".
    if (filters.startDate) {
      pendingWhere.date = { ...pendingWhere.date as Prisma.DateTimeFilter, gte: startOfDay(filters.startDate) }
    }
    if (filters.endDate) {
      pendingWhere.date = { ...pendingWhere.date as Prisma.DateTimeFilter, lte: endOfDay(filters.endDate) }
    }

    const pendingCollections = await prisma.payment.aggregate({
        where: pendingWhere,
        _sum: { amount: true },
        _count: { id: true }
    })

    return {
        success: true,
        data: {
            totalRevenue: totalRevenue._sum.amount || 0,
            monthlyRevenue: filters.startDate ? currentRevenue : (await prisma.payment.aggregate({
                where: { ...whereClause, date: { gte: startOfMonth(new Date()), lte: endOfMonth(new Date()) } },
                _sum: { amount: true }
            }))._sum.amount || 0, // specific fix for "Monthly Revenue" card when filtered
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
      const whereClause: Prisma.PaymentWhereInput = {
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

      const andConditions: Prisma.PaymentWhereInput[] = []

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
                  { student: { phone: { contains: filters.search } } },
                  { transactionId: { contains: filters.search } }
              ]
          })
      }

      if (filters.startDate) {
          andConditions.push({
              date: { gte: startOfDay(filters.startDate) }
          })
      }

      if (filters.endDate) {
          andConditions.push({
              date: { lte: endOfDay(filters.endDate) }
          })
      }

      if (andConditions.length > 0) {
          whereClause.AND = andConditions
      }

      const transactions = await prisma.payment.findMany({
          where: whereClause,
          include: {
              student: {
                  select: { id: true, name: true, image: true, phone: true }
              },
              branch: {
                  select: { name: true }
              },
              subscription: {
                  select: {
                      plan: {
                          select: { name: true }
                      }
                  }
              }
          },
          orderBy: { date: 'desc' },
          take: limit
      })

      return { success: true, data: transactions }
  } catch (error) {
      console.error('Error fetching transactions:', error)
      return { success: false, error: 'Failed to fetch transactions' }
  }
}

export async function verifyPayment(paymentId: string, action: 'approve' | 'reject' = 'approve') {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        if (action === 'reject') {
             await prisma.payment.update({
                where: { id: paymentId, libraryId: owner.libraryId },
                data: {
                    status: 'rejected',
                    verifiedAt: new Date(),
                    verifiedBy: owner.id,
                    verifierRole: 'owner'
                }
            })
            return { success: true }
        }

        const payment = await prisma.$transaction(async (tx) => {
            let updatedPayment = await tx.payment.update({
                where: { id: paymentId, libraryId: owner.libraryId },
                data: {
                    status: 'completed',
                    verifiedAt: new Date(),
                    verifiedBy: owner.id,
                    verifierRole: 'owner'
                },
                include: {
                    student: true,
                    branch: true,
                    subscription: {
                        include: {
                            plan: true
                        }
                    }
                }
            })

            // Check for remarks (Lockers or Multi-quantity)
            let lockerIdToAdd: string | null = null
            let activatedIds: string[] = []
            
            if (updatedPayment.remarks) {
                try {
                    const parsed = JSON.parse(updatedPayment.remarks)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Activate all listed subscriptions
                        await tx.studentSubscription.updateMany({
                            where: { id: { in: parsed } },
                            data: { status: 'active' }
                        })
                        activatedIds = parsed
                    } else if (typeof parsed === 'object' && parsed !== null) {
                        if (parsed.lockerId) lockerIdToAdd = parsed.lockerId
                    }
                } catch (e) {
                    // Ignore parsing error
                }
            }

            if (updatedPayment.subscriptionId && !activatedIds.includes(updatedPayment.subscriptionId)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updateData: any = { status: 'active' }
                
                if (lockerIdToAdd) {
                    updateData.hasLocker = true
                    updateData.lockerId = lockerIdToAdd
                }

                await tx.studentSubscription.update({
                    where: { id: updatedPayment.subscriptionId },
                    data: updateData
                })
            } else if (updatedPayment.type === 'subscription' && updatedPayment.relatedId && activatedIds.length === 0) {
                // If no subscription is linked, try to create/link one based on the plan (relatedId)
                const plan = await tx.plan.findUnique({ where: { id: updatedPayment.relatedId } })
                
                if (plan) {
                    const startDate = new Date()
                    const endDate = new Date()
                    
                    if (plan.durationUnit === 'months') {
                        endDate.setMonth(endDate.getMonth() + plan.duration)
                    } else if (plan.durationUnit === 'days') {
                        endDate.setDate(endDate.getDate() + (plan.duration || 30))
                    } else {
                        // Default to 30 days if unit unknown
                         endDate.setDate(endDate.getDate() + 30)
                    }

                    const branchId = updatedPayment.branchId || plan.branchId

                    if (branchId) {
                         // Check for existing pending subscription to reuse
                         const existing = await tx.studentSubscription.findFirst({
                             where: {
                                 studentId: updatedPayment.studentId,
                                 branchId: branchId,
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
                                     branchId: branchId,
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
                         
                         // Link payment to subscription
                         updatedPayment = await tx.payment.update({
                             where: { id: updatedPayment.id },
                             data: { subscriptionId: subId },
                             include: {
                                student: true,
                                branch: true,
                                subscription: {
                                    include: {
                                        plan: true
                                    }
                                }
                            }
                         })
                    }
                }
            }

            return updatedPayment
        })

        if (payment.student.email) {
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

        revalidatePath('/owner/finance')
        revalidatePath('/student/home')
        revalidatePath('/student/attendance')
        return { success: true }
    } catch (error) {
        console.error('Error verifying payment:', error)
        return { success: false, error: 'Failed to verify payment' }
    }
}

export async function getPendingPayments() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const payments = await prisma.payment.findMany({
            where: {
                libraryId: owner.libraryId,
                status: { in: ['pending', 'pending_verification'] }
            },
            include: {
                student: {
                    select: { name: true, phone: true }
                },
                subscription: {
                    include: {
                        plan: { select: { name: true } }
                    }
                },
                additionalFee: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        })
        return { success: true, data: payments }
    } catch (error) {
        console.error('Error fetching pending payments:', error)
        return { success: false, error: 'Failed to fetch pending payments' }
    }
}

export async function getRevenueAnalytics(filters: { startDate?: Date, endDate?: Date, branchId?: string } = {}) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const now = new Date()
        let startDate = filters.startDate || subMonths(now, 6)
        let endDate = filters.endDate || now
        
        const whereClause: Prisma.PaymentWhereInput = {
            libraryId: owner.libraryId,
            status: 'completed',
            date: { 
                gte: startOfDay(startDate),
                lte: endOfDay(endDate)
            }
        }

        if (filters.branchId && filters.branchId !== 'all') {
            whereClause.branchId = filters.branchId
        }

        const payments = await prisma.payment.findMany({
            where: whereClause,
            select: {
                amount: true,
                date: true
            },
            orderBy: { date: 'asc' }
        })

        // Determine grouping based on duration
        const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        const isDaily = durationDays <= 31

        const dataMap: Record<string, number> = {}
        
        // Initialize keys
        if (isDaily) {
            for (let i = 0; i <= durationDays; i++) {
                const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
                const key = format(d, 'MMM dd')
                dataMap[key] = 0
            }
        } else {
             // Monthly initialization
             let current = startOfMonth(startDate)
             const end = endOfMonth(endDate)
             while (current <= end) {
                 const key = format(current, 'MMM yyyy')
                 dataMap[key] = 0
                 current = new Date(current.setMonth(current.getMonth() + 1))
             }
        }

        payments.forEach(p => {
            const key = format(p.date, isDaily ? 'MMM dd' : 'MMM yyyy')
            if (dataMap[key] !== undefined) {
                dataMap[key] += p.amount
            }
        })

        const data = Object.entries(dataMap).map(([name, value]) => ({ name, value }))
        return { success: true, data }
    } catch (error) {
        console.error('Error fetching revenue analytics:', error)
        return { success: false, error: 'Failed to fetch revenue analytics' }
    }
}

export async function getRevenueDistribution(filters: { startDate?: Date, endDate?: Date, branchId?: string } = {}) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const whereClause: Prisma.PaymentWhereInput = {
            libraryId: owner.libraryId,
            status: 'completed'
        }

        if (filters.branchId && filters.branchId !== 'all') {
            whereClause.branchId = filters.branchId
        }

        if (filters.startDate) {
            whereClause.date = { ...whereClause.date as Prisma.DateTimeFilter, gte: startOfDay(filters.startDate) }
        }

        if (filters.endDate) {
            whereClause.date = { ...whereClause.date as Prisma.DateTimeFilter, lte: endOfDay(filters.endDate) }
        }

        const payments = await prisma.payment.findMany({
            where: whereClause,
            select: {
                amount: true,
                method: true,
                type: true 
            }
        })

        const byMethod: Record<string, number> = {}
        const byType: Record<string, number> = {}

        payments.forEach(p => {
            // Method
            const method = p.method || 'unknown'
            byMethod[method] = (byMethod[method] || 0) + p.amount

            // Type
            const type = p.type || 'other'
            byType[type] = (byType[type] || 0) + p.amount
        })

        return {
            success: true,
            data: {
                byMethod: Object.entries(byMethod).map(([name, value]) => ({ name, value })),
                byType: Object.entries(byType).map(([name, value]) => ({ name, value }))
            }
        }
    } catch (error) {
        console.error('Error fetching revenue distribution:', error)
        return { success: false, error: 'Failed to fetch revenue distribution' }
    }
}

export async function updatePaymentRemarks(id: string, remarks: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.payment.update({
            where: { id, libraryId: owner.libraryId },
            data: { remarks }
        })
        revalidatePath('/owner/finance')
        return { success: true }
    } catch (error) {
        console.error('Error updating payment remarks:', error)
        return { success: false, error: 'Failed to update payment remarks' }
    }
}

export async function updatePaymentStatus(id: string, status: string) {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        await prisma.payment.update({
            where: { id, libraryId: owner.libraryId },
            data: { status }
        })
        revalidatePath('/owner/finance')
        return { success: true }
    } catch (error) {
        console.error('Error updating payment status:', error)
        return { success: false, error: 'Failed to update payment status' }
    }
}
