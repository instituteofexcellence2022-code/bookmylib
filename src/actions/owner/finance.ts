'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns'
import { sendReceiptEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import { Prisma } from '@prisma/client'

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

        const payment = await prisma.payment.update({
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

export async function getRevenueAnalytics(period: string = '6_months') {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const now = new Date()
        let startDate = subMonths(now, 6)
        if (period === 'year') startDate = subMonths(now, 12)
        
        const payments = await prisma.payment.findMany({
            where: {
                libraryId: owner.libraryId,
                status: 'completed',
                date: { gte: startOfMonth(startDate) }
            },
            select: {
                amount: true,
                date: true
            }
        })

        const monthlyData: Record<string, number> = {}
        // Initialize months
        const monthCount = period === 'year' ? 12 : 6
        for (let i = 0; i <= monthCount; i++) {
             const d = subMonths(now, monthCount - i)
             const key = format(d, 'MMM yyyy')
             monthlyData[key] = 0
        }

        payments.forEach(p => {
            const key = format(p.date, 'MMM yyyy')
            if (monthlyData[key] !== undefined) {
                monthlyData[key] += p.amount
            }
        })

        const data = Object.entries(monthlyData).map(([name, value]) => ({ name, value }))
        return { success: true, data }
    } catch (error) {
        console.error('Error fetching revenue analytics:', error)
        return { success: false, error: 'Failed to fetch revenue analytics' }
    }
}

export async function getRevenueDistribution() {
    const owner = await getAuthenticatedOwner()
    if (!owner) return { success: false, error: 'Unauthorized' }

    try {
        const payments = await prisma.payment.findMany({
            where: {
                libraryId: owner.libraryId,
                status: 'completed'
            },
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
