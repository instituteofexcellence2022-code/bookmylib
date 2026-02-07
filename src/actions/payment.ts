'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { sendReceiptEmail } from '@/actions/email'
import { formatSeatNumber } from '@/lib/utils'
import { addDays, addMonths } from 'date-fns'
import { razorpay } from '@/lib/payment/razorpay'
import { cashfree } from '@/lib/payment/cashfree'
import crypto from 'crypto'

import { getAuthenticatedStudent } from '@/lib/auth/student'
import { getAuthenticatedOwner } from '@/lib/auth/owner'
import { getAuthenticatedStaff } from '@/lib/auth/staff'

import { calculateDiscount } from '@/lib/payment-utils'

interface ReferralSettings {
    all?: ReferralConfig;
    refereeReward?: RewardConfig;
    refereeDiscountValue?: number;
    refereeDiscountType?: string;
    referrerReward?: RewardConfig;
    referrerDiscountValue?: number;
    referrerDiscountType?: string;
    enabled?: boolean;
}

interface ReferralConfig {
    refereeReward?: RewardConfig;
    refereeDiscountValue?: number;
    refereeDiscountType?: string;
    referrerReward?: RewardConfig;
    referrerDiscountValue?: number;
    referrerDiscountType?: string;
    enabled?: boolean;
}

interface RewardConfig {
    value: number;
    type: string;
}

export async function getStudent() {
  const student = await getAuthenticatedStudent()
  return student
}

export async function getPaymentHistory() {
  const student = await getStudent()
  if (!student) return []

  try {
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      include: {
        promotion: true,
        library: {
          select: {
            name: true,
            address: true,
            contactEmail: true,
            contactPhone: true,
            website: true
          }
        },
        branch: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true
          }
        },
        student: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // Fetch subscription details for relevant payments
    const enrichedPayments = await Promise.all(payments.map(async (payment) => {
      if (payment.type === 'subscription' && payment.relatedId) {
        const subscription = await prisma.studentSubscription.findUnique({
          where: { id: payment.relatedId },
          include: {
            plan: true,
            seat: {
              select: {
                number: true,
                section: true
              }
            }
          }
        })
        return { ...payment, subscription }
      }
      return { ...payment, subscription: null }
    }))

    return enrichedPayments
  } catch (error) {
    console.error('Error fetching payment history:', error)
    return []
  }
}

export async function getStudentBookingStatus() {
  const student = await getStudent()
  if (!student) return { isNew: true, lastBranchId: null, lastSubscription: null }

  // Check for any subscription (active or expired)
  const lastSubscription = await prisma.studentSubscription.findFirst({
    where: { studentId: student.id },
    orderBy: { endDate: 'desc' },
    select: { 
      id: true,
      branchId: true,
      planId: true,
      seatId: true,
      plan: true,
      branch: {
        select: {
          name: true,
          address: true,
          city: true,
          state: true
        }
      },
      status: true,
      startDate: true,
      endDate: true,
      hasLocker: true,
      seat: {
        select: {
          number: true,
          section: true
        }
      }
    }
  })

  let latestPayment = null
  if (lastSubscription) {
    latestPayment = await prisma.payment.findFirst({
      where: { 
        studentId: student.id,
        relatedId: lastSubscription.id,
        type: 'subscription',
        status: 'completed'
      },
      include: {
        library: {
          select: {
            name: true,
            address: true,
            contactEmail: true,
            contactPhone: true,
            website: true
          }
        },
        branch: {
          select: {
            name: true,
            address: true,
            city: true,
            state: true
          }
        },
        student: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        promotion: true
      }
    })
  }

  return {
    isNew: !lastSubscription,
    lastBranchId: lastSubscription?.branchId || null,
    lastSubscription: lastSubscription ? { ...lastSubscription, payment: latestPayment } : null
  }
}

export async function getAvailablePlansForStudent() {
  const student = await getStudent()
  if (!student) return { plans: [], branches: [] }

  // improved logic to find library context
  // 1. Try to find from subscriptions
  let libraryId = student.subscriptions[0]?.libraryId
  
  // 2. If no subscription, try to find from payments
  if (!libraryId) {
    const lastPayment = await prisma.payment.findFirst({
      where: { studentId: student.id }
    })
    if (lastPayment) libraryId = lastPayment.libraryId
  }

  // 3. If still no libraryId, we can't show plans (or show all? No, that's bad)
  if (!libraryId) return { plans: [], branches: [] }

  const [plans, branches] = await Promise.all([
    prisma.plan.findMany({
      where: { libraryId, isActive: true },
      include: { branch: true }
    }),
    prisma.branch.findMany({
      where: { libraryId, isActive: true },
      select: { id: true, name: true }
    })
  ])

  return { plans, branches }
}

export async function initiatePayment(
  amount: number,
  type: string,
  relatedId?: string,
  description?: string,
  gatewayProvider: string = 'razorpay',
  branchId?: string,
  couponCode?: string,
  studentId?: string,
  manualPaymentData?: {
    transactionId?: string
    proofUrl?: string
  },
  subscriptionId?: string
) {
  let student
  if (studentId) {
    student = await prisma.student.findUnique({ 
        where: { id: studentId },
        include: { subscriptions: true }
    })
  } else {
    student = await getStudent()
  }

  if (!student) return { success: false, error: 'Unauthorized' }

  // Check for Gateway Configuration (only for online gateways)
  if (gatewayProvider === 'razorpay') {
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
          return { success: false, error: 'Gateway not connected yet', code: 'GATEWAY_NOT_CONFIGURED' }
      }
  } else if (gatewayProvider === 'cashfree') {
      if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
          return { success: false, error: 'Gateway not connected yet', code: 'GATEWAY_NOT_CONFIGURED' }
      }
  }

  // Resolve libraryId from related entity
  let libraryId = ''
  if (type === 'subscription' && relatedId) {
    const plan = await prisma.plan.findUnique({ where: { id: relatedId } })
    if (plan) libraryId = plan.libraryId
  } else if (type === 'fee' && relatedId) {
    const fee = await prisma.additionalFee.findUnique({ where: { id: relatedId } })
    if (fee) libraryId = fee.libraryId
  }
  
  if (!libraryId && student.subscriptions.length > 0) {
     libraryId = student.subscriptions[0].libraryId
  }

  if (!libraryId) {
      console.error('Payment Error: Could not determine Library context', { type, relatedId, studentSubs: student.subscriptions.length })
      // Fallback or error
      return { success: false, error: 'Could not determine Library context' }
  }

  if (!branchId) {
      console.error('Payment Error: Branch context is missing', { branchId })
      return { success: false, error: 'Branch context is missing' }
  }

  // Calculate Final Amount with Discount
  let finalAmount = amount
  let promotionId = null
  let discountAmount = 0
  let updatedDescription: string | null | undefined = description

  // 1. Prepare Coupon Config
  let couponConfig = null
  if (couponCode) {
    const promo = await prisma.promotion.findUnique({
      where: { code: couponCode }
    })
    
    if (promo && promo.isActive) {
      promotionId = promo.id
      couponConfig = {
        type: promo.type,
        value: promo.value || 0,
        maxDiscount: promo.maxDiscount
      }
    }
  } 

  // 2. Prepare Referral Config
  let referralConfig = null
  if (!couponConfig) { // Only check referral if no coupon
    try {
        const referral = await prisma.referral.findFirst({
            where: { refereeId: student.id, status: 'pending' }
        })
        
        if (referral) {
          const lib = await prisma.library.findUnique({ where: { id: libraryId } })
          const settings = (lib?.referralSettings as unknown as ReferralSettings) || {}
          
          const s = settings.all || settings
          const refereeDiscountValue = s.refereeReward?.value || s.refereeDiscountValue
          const refereeDiscountType = s.refereeReward?.type || s.refereeDiscountType || 'fixed'
          
          if (refereeDiscountValue) {
            referralConfig = {
              value: refereeDiscountValue,
              type: refereeDiscountType
            }
          }
        }
    } catch (err) {
        console.error('Error checking referral discount:', err)
    }
  }

  // 3. Calculate
  const calculation = calculateDiscount(
    amount, 
    description || null, 
    couponConfig, 
    couponCode || null, 
    referralConfig
  )

  finalAmount = calculation.finalAmount
  discountAmount = calculation.discountAmount
  updatedDescription = calculation.updatedDescription

  try {
    // 1. Create Payment Record (Pending)
    const isManual = ['upi_app', 'qr_code', 'front_desk'].includes(gatewayProvider)
    
    const payment = await prisma.payment.create({
      data: {
        libraryId,
        branchId,
        studentId: student.id,
        amount: finalAmount,
        method: gatewayProvider,
        status: 'pending',
        type,
        relatedId,
        description: updatedDescription,
        gatewayProvider: isManual ? null : gatewayProvider,
        // We will update this with real Order ID shortly for gateways
        gatewayOrderId: isManual ? null : `temp_${Math.random().toString(36).substring(7)}`,
        promotionId,
        discountAmount,
        transactionId: manualPaymentData?.transactionId,
        proofUrl: manualPaymentData?.proofUrl,
        subscriptionId
      }
    })

    // If Manual, return immediately
    if (isManual) {
        return {
            success: true,
            paymentId: payment.id,
            amount: finalAmount,
            status: 'pending_verification'
        }
    }

    // 2. Initiate Gateway Order
    let gatewayOrderId = ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let gatewayResponse: any = null

    if (gatewayProvider === 'razorpay') {
       const order = await razorpay.orders.create({
           amount: Math.round(finalAmount * 100), // Razorpay uses paise
           currency: 'INR',
           receipt: payment.id,
           notes: {
               paymentId: payment.id,
               studentId: student.id,
               branchId: branchId || ''
           }
       })
       gatewayOrderId = order.id
       gatewayResponse = order
    } else if (gatewayProvider === 'cashfree') {
       const request = {
           order_amount: finalAmount,
           order_currency: 'INR',
           order_id: payment.id,
           customer_details: {
               customer_id: student.id,
               customer_phone: student.phone || '9999999999',
               customer_name: student.name || 'Student',
               customer_email: student.email || 'student@example.com'
           },
           order_meta: {
               return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback?order_id={order_id}`
           }
       }
       // Use Cashfree SDK
       const response = await cashfree.PGCreateOrder(request)
       gatewayOrderId = response.data.order_id || '' 
       gatewayResponse = response.data
    }

    // 3. Update Payment with Real Gateway Order ID
    await prisma.payment.update({
        where: { id: payment.id },
        data: { 
            gatewayOrderId,
        }
    })

    return { 
      success: true, 
      paymentId: payment.id, 
      gatewayOrderId, // e.g. order_DaZl... or payment.id
      currency: 'INR',
      amount: finalAmount,
      key: gatewayProvider === 'razorpay' ? process.env.RAZORPAY_KEY_ID : undefined,
      paymentSessionId: gatewayProvider === 'cashfree' ? gatewayResponse?.payment_session_id : undefined
    }

  } catch (error) {
    console.error('Payment initiation error:', error)
    // Return the actual error message for debugging (in dev)
    return { success: false, error: `Failed to initiate payment: ${(error as Error).message}` }
  }
}

// Helper: Process Referral Rewards
async function processReferralRewards(paymentId: string) {
  console.log('Processing referral rewards for payment:', paymentId)
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { 
      student: true, 
      library: true 
    }
  })

  if (!payment || !payment.libraryId || payment.type !== 'subscription' || payment.status !== 'completed') {
    return
  }

  // Check if student was referred and referral is pending
  const referral = await prisma.referral.findFirst({
    where: {
      refereeId: payment.studentId,
      status: 'pending'
    },
    include: { referrer: true }
  })

  if (!referral) {
    return
  }

  const settings = (payment.library.referralSettings as unknown as ReferralSettings) || {}
  
  // Check if referral program is enabled
  // Migration logic: if 'enabled' property exists in root, use it. If 'all' exists, check all.enabled.
  // Default to true if settings exist but no explicit enabled flag? No, safer to default to false if not found?
  // Based on ReferAndEarnTab.tsx, structure might be { all: { enabled: true, ... } } or old flat structure
  const isEnabled = settings.all?.enabled ?? settings.enabled ?? false
  
  if (!isEnabled) {
    console.log('Referral program disabled, skipping reward generation')
    return
  }

  const referrerDiscountValue = settings.all?.referrerReward?.value || settings.referrerReward?.value || settings.all?.referrerDiscountValue || settings.referrerDiscountValue || 100 
  const referrerDiscountType = settings.all?.referrerReward?.type || settings.referrerReward?.type || settings.all?.referrerDiscountType || settings.referrerDiscountType || 'fixed'

  // Generate Coupon for Referrer with retry logic for uniqueness
  const namePrefix = (referral.referrer.name || 'USER').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase()
  let code = ''
  let attempts = 0
  const maxAttempts = 3
  
  while (attempts < maxAttempts) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    code = `REF-${namePrefix}-${randomSuffix}`
    
    // Check if code exists
    const existing = await prisma.promotion.findUnique({ where: { code } })
    if (!existing) break
    
    attempts++
  }
  
  if (attempts >= maxAttempts) {
     // Fallback to timestamp if random collisions persist
     code = `REF-${namePrefix}-${Date.now().toString().slice(-6)}`
  }

  try {
    // Create Promotion
    const reward = await prisma.promotion.create({
      data: {
        libraryId: payment.libraryId,
        code,
        type: referrerDiscountType,
        value: referrerDiscountValue,
        minOrderValue: 0,
        isActive: true,
        usageLimit: 1,
        startDate: new Date(),
        // Valid for 90 days
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    })

    // Update Referral
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'completed',
        couponId: reward.id
      }
    })
    
    console.log('Referral reward generated:', code)
  } catch (error) {
    console.error('Error generating referral reward:', error)
  }
}

// Helper to activate subscription after payment
async function activateSubscription(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { student: { include: { subscriptions: true } } }
  })

  if (!payment || payment.type !== 'subscription' || payment.status !== 'completed') return

  // 1. Try to use linked subscription
  if (payment.subscriptionId) {
    await prisma.studentSubscription.update({
      where: { id: payment.subscriptionId },
      data: { 
        status: 'active'
      }
    })
  } 
  // 2. Fallback: Try to find by relatedId (Plan) or Branch
  else if (payment.relatedId) {
    const plan = await prisma.plan.findUnique({ where: { id: payment.relatedId } })
    
    if (plan) {
      const startDate = new Date()
      const endDate = new Date()
      
      if (plan.durationUnit === 'months') {
        endDate.setMonth(endDate.getMonth() + plan.duration)
      } else if (plan.durationUnit === 'days') {
        endDate.setDate(endDate.getDate() + plan.duration)
      }
      
      const branchId = plan.branchId || payment.student.subscriptions[0]?.branchId
      
      if (branchId) {
           const existing = await prisma.studentSubscription.findFirst({
               where: { 
                 studentId: payment.studentId, 
                 branchId,
                 status: 'pending' // Prioritize pending
               }
           })
           
           if (existing) {
               await prisma.studentSubscription.update({
                   where: { id: existing.id },
                   data: {
                       planId: plan.id,
                       startDate,
                       endDate,
                       status: 'active'
                   }
               })
           } else {
               await prisma.studentSubscription.create({
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
           }
      }
    }
  }
}

export async function verifyPaymentSignature(
  paymentId: string,
  gatewayPaymentId: string,
  gatewaySignature: string
) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    })

    if (!payment) {
      return { success: false, error: 'Payment record not found' }
    }

    if (payment.status === 'completed') {
      return { success: true, message: 'Payment already verified' }
    }

    let isValid = false

    if (payment.gatewayProvider === 'razorpay') {
      // Verify Razorpay Signature
      // signature = hmac_sha256(order_id + "|" + payment_id, secret)
      const body = payment.gatewayOrderId + "|" + gatewayPaymentId
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body.toString())
        .digest('hex')

      if (expectedSignature === gatewaySignature) {
        isValid = true
      } else {
        console.error('Razorpay signature verification failed')
      }
    } else if (payment.gatewayProvider === 'cashfree') {
      // Verify Cashfree Status by fetching from API
       // We ignore the client-passed signature/ids for security, and fetch fresh status
       try {
         const response = await cashfree.PGOrderFetchPayments(payment.gatewayOrderId!)
         // Check if any payment transaction for this order is success
         const payments = response.data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const successfulPayment = payments.find((p: any) => p.payment_status === 'SUCCESS')
        
        if (successfulPayment) {
          isValid = true
          // Update gatewayPaymentId with the actual one from Cashfree
          gatewayPaymentId = successfulPayment.cf_payment_id || gatewayPaymentId
        } else {
           console.error('Cashfree payment status check failed: No successful transaction found')
        }
      } catch (err) {
        console.error('Error fetching Cashfree payment status:', err)
      }
    }

    if (!isValid) {
      // Mark as failed? Or just return error?
      // Let's return error so frontend knows.
      return { success: false, error: 'Payment verification failed' }
    }
    
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        gatewayPaymentId,
        gatewaySignature: payment.gatewayProvider === 'razorpay' ? gatewaySignature : 'verified_by_api',
        updatedAt: new Date()
      }
    })
    
    // Process referral rewards (async, don't block)
    processReferralRewards(paymentId).catch(err => console.error('Referral Processing Error', err))
    
    // Activate Subscription
    await activateSubscription(paymentId)

    // Send Receipt Email
    try {
        const enrichedPayment = await prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                student: true,
                branch: true,
                subscription: {
                    include: { plan: true, seat: true }
                },
                additionalFee: true
            }
        })

        if (enrichedPayment && enrichedPayment.student.email) {
            let planName = 'N/A'
            let duration = 'N/A'

            if (enrichedPayment.subscription?.plan) {
                planName = enrichedPayment.subscription.plan.name
                duration = `${enrichedPayment.subscription.plan.duration} ${enrichedPayment.subscription.plan.durationUnit}`
            } else if (enrichedPayment.additionalFee) {
                planName = enrichedPayment.additionalFee.name
            }

            await sendReceiptEmail({
                studentName: enrichedPayment.student.name,
                studentEmail: enrichedPayment.student.email,
                amount: enrichedPayment.amount,
                date: enrichedPayment.date,
                invoiceNo: enrichedPayment.invoiceNo || enrichedPayment.id.slice(0, 8).toUpperCase(),
                planName,
                planDuration: duration,
                branchName: enrichedPayment.branch?.name || 'N/A',
                paymentMethod: enrichedPayment.method,
                seatNumber: enrichedPayment.subscription?.seat ? formatSeatNumber(enrichedPayment.subscription.seat.number) : undefined,
                subTotal: enrichedPayment.amount,
                discount: 0,
                items: [{
                    description: planName,
                    amount: enrichedPayment.amount
                }]
            })
        }
    } catch (emailError) {
        console.error('Failed to send receipt email:', emailError)
    }

    revalidatePath('/student/payments')
    return { success: true }
  } catch (error) {
    console.error('Payment verification error:', error)
    return { success: false, error: 'Verification failed' }
  }
}

export async function createManualPayment(formData: FormData) {
  const student = await getStudent()
  if (!student) return { success: false, error: 'Unauthorized' }

  const amount = parseFloat(formData.get('amount') as string)
  const method = formData.get('method') as string // 'upi_app', 'qr_code', 'front_desk'
  const type = formData.get('type') as string
  const relatedId = formData.get('relatedId') as string
  let description = formData.get('description') as string
  const transactionId = formData.get('transactionId') as string
  const proofUrl = formData.get('proofUrl') as string // In real app, upload file and get URL
  const branchId = formData.get('branchId') as string

    // Resolve libraryId from related entity
  let libraryId = ''
  if (type === 'subscription' && relatedId) {
    const plan = await prisma.plan.findUnique({ where: { id: relatedId } })
    if (plan) libraryId = plan.libraryId
  } else if (type === 'fee' && relatedId) {
    const fee = await prisma.additionalFee.findUnique({ where: { id: relatedId } })
    if (fee) libraryId = fee.libraryId
  }
  
  if (!libraryId && student.subscriptions.length > 0) {
     libraryId = student.subscriptions[0].libraryId
  }

  if (!libraryId) {
      console.error('Manual Payment Error: Could not determine Library context')
      // Fallback or error
      return { success: false, error: 'Could not determine Library context' }
  }

  if (!branchId) {
      console.error('Manual Payment Error: Branch context is missing')
      return { success: false, error: 'Branch context is missing' }
  }

  // Coupon handling
  const couponCode = formData.get('couponCode') as string
  let finalAmount = amount
  let promotionId = null
  let discountAmount = 0

  if (couponCode) {
    const promo = await prisma.promotion.findUnique({
      where: { code: couponCode }
    })
    // Basic validation (should be more robust)
    if (promo && promo.isActive) {
      promotionId = promo.id
      if (promo.type === 'percentage' && promo.value !== null) {
        discountAmount = (amount * promo.value) / 100
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount
        }
      } else if (promo.type === 'fixed' && promo.value !== null) {
        discountAmount = promo.value
      }
      finalAmount = Math.max(0, amount - discountAmount)
    }
  } else {
    // Check for referral discount eligibility if no coupon used
    try {
        const referral = await prisma.referral.findFirst({
            where: { refereeId: student.id, status: 'pending' }
        })
        
        if (referral) {
            const lib = await prisma.library.findUnique({ where: { id: libraryId } })
            const settings = (lib?.referralSettings as unknown as ReferralSettings) || {}
            
            if (settings.refereeDiscountValue) {
                if (settings.refereeDiscountType === 'percentage') {
                    discountAmount = (amount * settings.refereeDiscountValue) / 100
                } else {
                    discountAmount = settings.refereeDiscountValue
                }
                finalAmount = Math.max(0, amount - discountAmount)
                description = description ? `${description} (Referral Discount)` : `Referral Discount Applied`
            }
        }
    } catch (err) {
        console.error('Error checking referral discount:', err)
    }
  }

  // Create pending subscription if needed
  let subscriptionId = null
  if (type === 'subscription' && relatedId) {
    try {
      const plan = await prisma.plan.findUnique({ where: { id: relatedId } })
      if (plan) {
        const startDate = new Date()
        let endDate = startDate
        
        if (plan.durationUnit === 'months') {
          endDate = addMonths(startDate, plan.duration)
        } else {
          endDate = addDays(startDate, plan.duration)
        }

        const sub = await prisma.studentSubscription.create({
          data: {
            libraryId,
            branchId,
            studentId: student.id,
            planId: plan.id,
            startDate,
            endDate,
            status: 'pending',
            amount: finalAmount
          }
        })
        subscriptionId = sub.id
      }
    } catch (error) {
      console.error('Failed to create pending subscription:', error)
    }
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        libraryId,
        branchId,
        studentId: student.id,
        amount: finalAmount,
        method, // 'upi', 'cash', etc.
        status: 'pending_verification',
        type,
        relatedId: subscriptionId || relatedId,
        description,
        transactionId,
        proofUrl,
        promotionId,
        discountAmount
      }
    })

    // if (promotionId) {
    //   // Increment usage count - TODO: Add usedCount to schema
    //   await prisma.promotion.update({
    //     where: { id: promotionId },
    //     data: { usedCount: { increment: 1 } }
    //   })
    // }

    revalidatePath('/student/payments')
    return { success: true, paymentId: payment.id }
  } catch (error) {
    console.error('Manual payment error:', error)
    return { success: false, error: `Failed to submit payment: ${(error as Error).message}` }
  }
}

export async function validateCoupon(code: string, amount: number, studentId?: string, planId?: string, branchId?: string) {
  try {
    const promo = await prisma.promotion.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!promo) {
      return { success: false, error: 'Invalid coupon code' }
    }

    if (!promo.isActive) {
      return { success: false, error: 'This coupon is no longer active' }
    }

    const now = new Date()
    if (promo.startDate && now < promo.startDate) {
      return { success: false, error: 'This coupon is not valid yet' }
    }
    
    if (promo.endDate && now > promo.endDate) {
      return { success: false, error: 'This coupon has expired' }
    }

    // Branch Restriction Check
    if (promo.branchId && branchId && promo.branchId !== branchId) {
      return { success: false, error: 'This coupon is not valid for this branch' }
    }

    // Plan Restriction Check
    if (promo.planId && planId && promo.planId !== planId) {
      return { success: false, error: 'This coupon is not valid for this plan' }
    }

    if (promo.usageLimit) {
       // Check global usage limit
       const usedCount = await prisma.payment.count({
         where: { promotionId: promo.id, status: 'completed' }
       })
       if (usedCount >= promo.usageLimit) {
         return { success: false, error: 'Coupon usage limit reached' }
       }
    }

    // Resolve studentId if not provided (for student self-service)
    let targetStudentId = studentId
    if (!targetStudentId) {
        const currentStudent = await getStudent()
        if (currentStudent) {
            targetStudentId = currentStudent.id
        }
    }

    // Per-user usage limit
    if (promo.perUserLimit && targetStudentId) {
        const userUsageCount = await prisma.payment.count({
            where: { 
                promotionId: promo.id, 
                studentId: targetStudentId,
                status: 'completed' 
            }
        })
        if (userUsageCount >= promo.perUserLimit) {
            return { success: false, error: 'You have reached the usage limit for this coupon' }
        }
    }

    if (promo.minOrderValue && amount < promo.minOrderValue) {
      return { success: false, error: `Minimum order of ₹${promo.minOrderValue} required to use this coupon` }
    }
    
    // Calculate discount
    let discount = 0
    if (promo.type === 'percentage' && promo.value !== null) {
      discount = (amount * promo.value) / 100
      if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount
      }
    } else if (promo.type === 'fixed' && promo.value !== null) {
      discount = promo.value
    }

    return { 
      success: true, 
      discount,
      finalAmount: Math.max(0, amount - discount),
      promo 
    }
  } catch (error) {
    console.error('Coupon validation error:', error)
    return { success: false, error: 'Error validating coupon' }
  }
}

export async function verifyPayment(paymentId: string, status: 'completed' | 'failed') {
  const owner = await getAuthenticatedOwner()
  const staff = await getAuthenticatedStaff()
  
  if (!owner && !staff) {
    return { success: false, error: 'Unauthorized' }
  }

  const verifierId = (owner?.id || staff?.id) as string
  const verifierRole = owner ? 'owner' : 'staff'

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { 
        student: {
          include: {
            subscriptions: true
          }
        },
        library: true
      }
    })

    if (!payment) return { success: false, error: 'Payment not found' }

    // Check if already completed to avoid duplicate processing/emails
    const wasAlreadyCompleted = payment.status === 'completed'
    if (wasAlreadyCompleted && status === 'completed') {
        return { success: true, message: 'Payment already verified' }
    }

    // Update Payment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      status,
      verifiedBy: verifierId,
      verifiedAt: new Date(),
      verifierRole
    }

    // If payment is being completed and has no collector (e.g. manual payment),
    // mark the verifier as the collector for finance tracking.
    if (status === 'completed' && !payment.collectedBy) {
      updateData.collectedBy = verifierId
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: updateData
    })

    // If completed and subscription, activate it
    if (status === 'completed' && payment.type === 'subscription') {
      
      // Trigger Referral Rewards
      await processReferralRewards(paymentId)

      // Use shared helper
      await activateSubscription(paymentId)
    }

    // Send Receipt Email if completed
    if (status === 'completed') {
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
            seatNumber: enrichedPayment.subscription?.seat?.number ? `${enrichedPayment.subscription.seat.number}` : undefined,
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
    revalidatePath('/staff/finance')
    revalidatePath('/owner/verification')
    revalidatePath('/staff/verification')
    revalidatePath('/staff/khatabook')
    revalidatePath('/owner/khatabook')
    return { success: true }
  } catch (error) {
    console.error('Verify payment error:', error)
    return { success: false, error: 'Verification failed' }
  }
}
