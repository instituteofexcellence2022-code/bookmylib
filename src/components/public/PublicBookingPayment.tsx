'use client'

import React, { useState } from 'react'
import { 
  CreditCard, Banknote, Check, Shield, Lock, Smartphone
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { initiatePublicBooking } from '@/actions/public-booking'
import { verifyPaymentSignature } from '@/actions/payment'
import { validateCoupon } from '@/actions/payment'
import { formatSeatNumber } from '@/lib/utils'

interface PublicBookingPaymentProps {
  plan: {
    id: string
    name: string
    price: number
    [key: string]: any
  }
  seat?: {
    number: string | number
    [key: string]: any
  } | null
  fees: {
    id: string
    name: string
    amount: number
    [key: string]: any
  }[]
  branchId: string
  studentDetails: {
    name: string
    email: string
    phone: string
    dob: string
  }
  onSuccess: (paymentId?: string, status?: 'completed' | 'pending_verification', studentId?: string) => void
  onBack: () => void
}

export default function PublicBookingPayment({ 
  plan, 
  seat, 
  fees, 
  branchId, 
  studentDetails,
  onSuccess, 
  onBack 
}: PublicBookingPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('razorpay')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
    finalAmount: number
    details: unknown
  } | null>(null)
  const [processing, setProcessing] = useState(false)

  // Calculate Base Total (Plan + Fees)
  const feesTotal = fees.reduce((sum: number, fee) => sum + Number(fee.amount), 0)
  const baseTotal = Number(plan.price) + feesTotal
  const subTotal = Math.round(baseTotal)
  
  // Calculate Final Amount
  const finalAmount = Math.round(appliedCoupon ? appliedCoupon.finalAmount : subTotal)

  const handleApplyCoupon = async () => {
    if (!couponCode) return
    
    const toastId = toast.loading('Validating coupon...')
    try {
      // Validate coupon
      // Note: validateCoupon usually checks if student has used it. 
      // For public user (guest), we might fail if we don't pass studentId.
      // But validateCoupon might handle undefined studentId?
      // Let's assume generic validation for now.
      const result = await validateCoupon(
        couponCode, 
        subTotal, 
        undefined, 
        plan.id, 
        branchId
      )
      
      if (result.success && result.discount !== undefined && result.finalAmount !== undefined) {
        setAppliedCoupon({
          code: couponCode,
          discount: result.discount,
          finalAmount: result.finalAmount,
          details: result.promo
        })
        toast.success(`Coupon applied! Saved ₹${result.discount}`, { id: toastId })
      } else {
        setAppliedCoupon(null)
        toast.error(result.error || 'Invalid coupon', { id: toastId })
      }
    } catch {
      toast.error('Failed to apply coupon', { id: toastId })
    }
  }

  const handlePayment = async () => {
    setProcessing(true)
    const amount = finalAmount // Use calculated final amount

    try {
        // Call the Public Booking Action
        const result = await initiatePublicBooking({
            ...studentDetails,
            amount,
            planId: plan.id,
            seatId: seat?.id,
            fees: fees.map(f => String(f.id)),
            branchId,
            gatewayProvider: paymentMethod as 'razorpay' | 'cashfree',
            couponCode: appliedCoupon?.code
        })
        
        if (result.success && result.paymentData && result.paymentData.success) {
            const paymentResult = result.paymentData
            const studentId = result.studentId

            if (paymentMethod === 'razorpay') {
                if (!window.Razorpay) {
                    toast.error('Razorpay SDK failed to load')
                    setProcessing(false)
                    return
                }

                const options = {
                    key: paymentResult.key || '',
                    amount: (paymentResult.amount || 0) * 100,
                    currency: paymentResult.currency || 'INR',
                    name: "Library Subscription",
                    description: `Booking for ${studentDetails.name}`,
                    image: "/logo.png",
                    order_id: paymentResult.gatewayOrderId || '', 
                    handler: async function (response: any) {
                        const verifyResult = await verifyPaymentSignature(
                            paymentResult.paymentId!,
                            response.razorpay_payment_id,
                            response.razorpay_signature
                        )
                        if (verifyResult.success) {
                            toast.success('Payment Successful!')
                            onSuccess(paymentResult.paymentId, 'completed', studentId)
                        } else {
                            toast.error('Payment Verification Failed')
                            setProcessing(false)
                        }
                    },
                    prefill: {
                        name: studentDetails.name,
                        email: studentDetails.email,
                        contact: studentDetails.phone
                    },
                    theme: {
                        color: "#9333ea"
                    }
                }
                const rzp1 = new window.Razorpay(options)
                rzp1.on('payment.failed', function (response: any){
                    toast.error(response.error.description || 'Payment Failed')
                    setProcessing(false)
                })
                rzp1.open()

            } else if (paymentMethod === 'cashfree') {
                if (!window.Cashfree) {
                    toast.error('Cashfree SDK failed to load')
                    setProcessing(false)
                    return
                }

                const cashfree = new window.Cashfree({
                    mode: "sandbox" // Change to "production" in prod env
                })

                const checkoutOptions = {
                    paymentSessionId: paymentResult.paymentSessionId || '',
                    redirectTarget: "_modal" as const,
                }

                cashfree.checkout(checkoutOptions).then(async (checkoutResult: any) => {
                    if(checkoutResult.error){
                        console.log("User closed popup or error", checkoutResult.error);
                        setProcessing(false)
                    }
                    if(checkoutResult.paymentDetails){
                        console.log("Payment completed, verifying...");
                        
                        const verifyResult = await verifyPaymentSignature(
                            paymentResult.paymentId!,
                            'PENDING_FETCH', 
                            'PENDING_FETCH'
                        )

                        if (verifyResult.success) {
                            toast.success('Payment Successful!')
                            onSuccess(paymentResult.paymentId, 'completed', studentId)
                        } else {
                            toast.error('Payment Verification Failed')
                            setProcessing(false)
                        }
                    }
                });
            }

        } else {
            toast.error(result.error || result.paymentData?.error || 'Payment initiation failed')
            setProcessing(false)
        }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('An unexpected error occurred')
      setProcessing(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Review & Pay</h2>
        <p className="text-sm text-gray-500">Confirm details and complete payment.</p>
      </div>

      {/* Student Details Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4 border border-blue-100 dark:border-blue-800">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Student Details</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
                <span className="text-blue-600/70 dark:text-blue-400 block text-xs">Name</span>
                <span className="text-blue-900 dark:text-blue-100 font-medium">{studentDetails.name}</span>
            </div>
            <div>
                <span className="text-blue-600/70 dark:text-blue-400 block text-xs">Phone</span>
                <span className="text-blue-900 dark:text-blue-100 font-medium">{studentDetails.phone}</span>
            </div>
            <div className="col-span-2">
                <span className="text-blue-600/70 dark:text-blue-400 block text-xs">Email</span>
                <span className="text-blue-900 dark:text-blue-100 font-medium">{studentDetails.email}</span>
            </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-300">Plan: {plan.name}</span>
          <span className="font-medium">₹{plan.price}</span>
        </div>
        {fees.map((fee) => (
          <div key={fee.id} className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">{fee.name}</span>
            <span className="font-medium">₹{fee.amount}</span>
          </div>
        ))}
        {seat && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">Seat Selection</span>
            <span className="font-medium text-emerald-600">Selected: {formatSeatNumber(seat.number)}</span>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold">
          <span>Subtotal</span>
          <span>₹{subTotal}</span>
        </div>

        {appliedCoupon && (
          <div className="flex justify-between text-sm text-green-600 font-medium">
            <span>Discount ({appliedCoupon.code})</span>
            <span>- ₹{appliedCoupon.discount}</span>
          </div>
        )}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 flex justify-between font-bold text-lg text-purple-600">
          <span>Total Payable</span>
          <span>₹{appliedCoupon ? appliedCoupon.finalAmount : subTotal}</span>
        </div>
      </div>

      {/* Coupon */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Coupon Code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none uppercase"
        />
        <button
          onClick={handleApplyCoupon}
          disabled={!couponCode || !!appliedCoupon}
          className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {appliedCoupon ? 'Applied' : 'Apply'}
        </button>
      </div>

      {/* Payment Method Selection */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
            { id: 'razorpay', label: 'Razorpay', icon: CreditCard, desc: 'Cards, UPI, Netbanking' },
            { id: 'cashfree', label: 'Cashfree', icon: Banknote, desc: 'Secure Payment Gateway' }
        ].map((method) => (
            <button
            key={method.id}
            onClick={() => setPaymentMethod(method.id)}
            className={`relative p-3 rounded-xl border text-left transition-all group overflow-hidden ${
                paymentMethod === method.id
                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 ring-1 ring-purple-500/20' 
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-md'
            }`}
            >
                <div className="relative flex items-start gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${
                    paymentMethod === method.id 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                    <method.icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className={`text-sm font-bold ${paymentMethod === method.id ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>
                    {method.label}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5 leading-tight">{method.desc}</p>
                </div>
                </div>
                
                {paymentMethod === method.id && (
                    <div className="absolute top-2 right-2 text-purple-600 dark:text-purple-400">
                        <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                    </div>
                )}
            </button>
        ))}
      </div>

      {/* Trust Signals */}
      <div className="flex items-center justify-center gap-6 mb-8 py-4 border-t border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Secure Payment</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Encrypted</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
            <span>UPI Supported</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 rounded-xl font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handlePayment}
          disabled={processing}
          className="flex-[2] px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {processing ? 'Processing...' : `Pay ₹${finalAmount}`}
        </button>
      </div>
    </div>
  )
}
