'use server'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

// Helper to get current student
async function getStudent() {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_session')?.value
  if (!studentId) return null
  return prisma.student.findUnique({ 
    where: { id: studentId },
    include: { subscriptions: true }
  })
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
      plan: {
        select: {
          id: true,
          name: true,
          price: true,
          duration: true,
          durationUnit: true,
          description: true,
          category: true,
          shiftStart: true,
          shiftEnd: true,
          hoursPerDay: true,
          billingCycle: true
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
      status: true,
      startDate: true,
      endDate: true,
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
  gatewayProvider: 'razorpay' | 'cashfree' = 'razorpay',
  branchId?: string,
  couponCode?: string
) {
  const student = await getStudent()
  if (!student) return { success: false, error: 'Unauthorized' }

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
  let updatedDescription = description

  // 1. Coupon Logic
  if (couponCode) {
    const promo = await prisma.promotion.findUnique({
      where: { code: couponCode }
    })
    
    if (promo && promo.isActive) {
      promotionId = promo.id
      if (promo.discountType === 'percentage') {
        discountAmount = (amount * promo.discountValue) / 100
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount
        }
      } else if (promo.discountType === 'fixed') {
        discountAmount = promo.discountValue
      }
      finalAmount = Math.max(0, amount - discountAmount)
      updatedDescription += ` (Coupon: ${couponCode})`
    }
  } 
  // 2. Referral Logic (if no coupon)
  else {
    try {
        const referral = await prisma.referral.findFirst({
            where: { refereeId: student.id, status: 'pending' }
        })
        
        if (referral) {
          const lib = await prisma.library.findUnique({ where: { id: libraryId } })
          const settings = lib?.referralSettings as any || {}
          
          if (settings.refereeDiscountValue) {
            if (settings.refereeDiscountType === 'percentage') {
              discountAmount = (amount * settings.refereeDiscountValue) / 100
            } else {
              discountAmount = settings.refereeDiscountValue
            }
            finalAmount = Math.max(0, amount - discountAmount)
            updatedDescription = updatedDescription ? `${updatedDescription} (Referral Discount)` : `Referral Discount Applied`
          }
        }
    } catch (err) {
        console.error('Error checking referral discount:', err)
    }
  }

  try {
    // 1. Create Payment Record (Pending)
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
        gatewayProvider,
        // In a real app, you would call the gateway API here to get an order ID
        gatewayOrderId: `order_${Math.random().toString(36).substring(7)}`,
        promotionId,
        discountAmount
      }
    })

    return { 
      success: true, 
      paymentId: payment.id, 
      orderId: payment.gatewayOrderId,
      currency: 'INR',
      amount: payment.amount,
      key: 'rzp_test_placeholder' // Replace with env var
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

  const settings = payment.library.referralSettings as any || {}
  const referrerDiscountValue = settings.referrerDiscountValue || 100 // Default 100
  const referrerDiscountType = settings.referrerDiscountType || 'fixed'

  // Generate Coupon for Referrer
  // Format: REF-{ReferrerNamePrefix}-{Random4}
  const namePrefix = (referral.referrer.name || 'USER').replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase()
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const code = `REF-${namePrefix}-${randomSuffix}`

  try {
    // Create Promotion
    await prisma.promotion.create({
      data: {
        libraryId: payment.libraryId,
        code,
        description: `Referral Reward for referring ${payment.student.name}`,
        discountType: referrerDiscountType,
        discountValue: referrerDiscountValue,
        minOrderValue: 0,
        isActive: true,
        usageLimit: 1,
        // Valid for 90 days
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      }
    })

    // Update Referral
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: 'completed',
        referrerCouponCode: code,
        completedAt: new Date()
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
        status: 'active',
        paymentStatus: 'paid'
      }
    })
  } 
  // 2. Fallback: Try to find by relatedId (Plan) or Branch
  else if (payment.relatedId) {
    const plan = await prisma.plan.findUnique({ where: { id: payment.relatedId } })
    
    if (plan) {
      const startDate = new Date()
      let endDate = new Date()
      
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
                       status: 'active',
                       paymentStatus: 'paid'
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
                       paymentStatus: 'paid',
                       amountPaid: payment.amount,
                       finalAmount: payment.amount
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
    // In a real app, verify the signature using crypto/HMAC
    // For now, assume it's valid if present
    
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'completed',
        gatewayPaymentId,
        gatewaySignature,
        updatedAt: new Date()
      }
    })
    
    // Process referral rewards (async, don't block)
    processReferralRewards(paymentId).catch(err => console.error('Referral Processing Error', err))
    
    // Activate Subscription
    await activateSubscription(paymentId)

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
      if (promo.discountType === 'percentage') {
        discountAmount = (amount * promo.discountValue) / 100
        if (promo.maxDiscount && discountAmount > promo.maxDiscount) {
          discountAmount = promo.maxDiscount
        }
      } else if (promo.discountType === 'fixed') {
        discountAmount = promo.discountValue
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
            const settings = lib?.referralSettings as any || {}
            
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
        relatedId,
        description,
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

export async function validateCoupon(code: string, amount: number) {
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
    if (now < promo.startDate) {
      return { success: false, error: 'This coupon is not valid yet' }
    }
    
    if (now > promo.endDate) {
      return { success: false, error: 'This coupon has expired' }
    }

    if (promo.usageLimit) {
       // Check global usage limit if we can track it. 
       // Currently schema doesn't have usedCount, so skipping this check or implementing count query
       const usedCount = await prisma.payment.count({
         where: { promotionId: promo.id }
       })
       if (usedCount >= promo.usageLimit) {
         return { success: false, error: 'Coupon usage limit reached' }
       }
    }

    if (promo.minOrderValue && amount < promo.minOrderValue) {
      return { success: false, error: `Minimum order of ₹${promo.minOrderValue} required to use this coupon` }
    }
    
    // Calculate discount
    let discount = 0
    if (promo.discountType === 'percentage') {
      discount = (amount * promo.discountValue) / 100
      if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount
      }
    } else if (promo.discountType === 'fixed') {
      discount = promo.discountValue
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
  const cookieStore = await cookies()
  const ownerId = cookieStore.get('owner_session')?.value
  const staffId = cookieStore.get('staff_session')?.value
  
  if (!ownerId && !staffId) {
    return { success: false, error: 'Unauthorized' }
  }

  const verifierId = ownerId || staffId
  const verifierRole = ownerId ? 'owner' : 'staff'

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

    // Update Payment
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        verifiedBy: verifierId,
        verifiedAt: new Date(),
        verifierRole
      }
    })

    // If completed and subscription, activate it
    if (status === 'completed' && payment.type === 'subscription') {
      
      // Trigger Referral Rewards
      await processReferralRewards(paymentId)

      // Use shared helper
      await activateSubscription(paymentId)
    }

    revalidatePath('/owner/finance')
    revalidatePath('/staff/finance')
    return { success: true }
  } catch (error) {
    console.error('Verify payment error:', error)
    return { success: false, error: 'Verification failed' }
  }
}