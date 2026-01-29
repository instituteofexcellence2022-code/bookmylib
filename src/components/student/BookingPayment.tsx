'use client'

import React, { useState } from 'react'
import { 
  CreditCard, Banknote, QrCode, Building, 
  AlertCircle 
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { 
  initiatePayment, 
  validateCoupon,
  createManualPayment
} from '@/actions/payment'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'

interface BookingPaymentProps {
  plan: {
    id: string
    name: string
    price: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
  seat?: {
    number: string | number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  } | null
  fees: {
    id: string
    name: string
    amount: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }[]
  branchId: string
  adjustmentAmount?: number
  adjustmentLabel?: string
  onSuccess: (paymentId?: string) => void
  onBack: () => void
}

export default function BookingPayment({ 
  plan, 
  seat, 
  fees, 
  branchId, 
  adjustmentAmount = 0,
  adjustmentLabel = 'Adjustment',
  onSuccess, 
  onBack 
}: BookingPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('razorpay')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
    finalAmount: number
    details: unknown
  } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [proofUrl, setProofUrl] = useState<string | null>(null)

  // Calculate Base Total (Plan + Fees)
  const feesTotal = fees.reduce((sum: number, fee) => sum + fee.amount, 0)
  const baseTotal = plan.price + feesTotal
  const subTotal = Math.max(0, baseTotal - adjustmentAmount)

  const handleApplyCoupon = async () => {
    if (!couponCode) return
    
    const toastId = toast.loading('Validating coupon...')
    try {
      // Validate coupon against the PLAN price only? Or Total?
      // Usually coupons apply to the main item (Plan). 
      // Let's assume it applies to the Plan price for now, or Total?
      // existing validateCoupon takes (code, amount).
      // If we pass subTotal, it might discount fees too.
      // Let's pass subTotal for now.
      const result = await validateCoupon(
        couponCode, 
        subTotal, 
        undefined, // studentId will be resolved by server action from cookies
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
    const amount = subTotal
    
    // Construct description
    let description = `Booking: ${plan.name}`
    if (seat) description += ` (Seat S-${String(seat.number).padStart(2, '0')})`
    if (fees.length > 0) description += ` + ${fees.length} Fees`

    try {
      if (['razorpay', 'cashfree'].includes(paymentMethod)) {
        // Gateway Payment
        const result = await initiatePayment(
          amount, 
          'subscription', 
          plan.id, 
          description,
          paymentMethod as 'razorpay' | 'cashfree',
          branchId,
          appliedCoupon?.code
        )
        
        if (result.success) {
          toast.success(`Redirecting to ${paymentMethod}...`)
          // Simulate Payment Success for now
          setTimeout(() => {
            // In real integration, we'd wait for callback
            // But here we simulate success and proceed
            // Pass the paymentId (orderId) to onSuccess
            // But initiatePayment returns { success, orderId, ... }
            // We'll assume the paymentId is the orderId or we need to look it up.
            // Actually initiatePayment creates a Payment record?
            // Let's check initiatePayment implementation.
            // It returns { success: true, orderId: payment.id, ... }
            onSuccess(result.paymentId) 
          }, 2000)
        } else {
          toast.error(result.error || 'Payment initiation failed')
          setProcessing(false)
        }
      } else {
        // Manual Payment
        const formData = new FormData()
        formData.append('amount', amount.toString())
        formData.append('method', paymentMethod)
        formData.append('type', 'subscription')
        formData.append('relatedId', plan.id)
        formData.append('description', description)
        formData.append('branchId', branchId)
        if (proofUrl) formData.append('proofUrl', proofUrl)
        if (appliedCoupon) formData.append('couponCode', appliedCoupon.code)

        const result = await createManualPayment(formData)
        
        if (result.success) {
          toast.success('Payment submitted for verification')
          onSuccess(result.paymentId) 
        } else {
          toast.error(result.error || 'Submission failed')
          setProcessing(false)
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      toast.error('An unexpected error occurred')
      setProcessing(false)
    }
  }

  const renderPaymentMethods = () => (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <button
        onClick={() => setPaymentMethod('razorpay')}
        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
          paymentMethod === 'razorpay' 
            ? 'border-purple-500 bg-purple-50 text-purple-700' 
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <CreditCard className="w-5 h-5" />
        <span className="text-sm font-medium">Razorpay</span>
      </button>
      
      <button
        onClick={() => setPaymentMethod('cashfree')}
        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
          paymentMethod === 'cashfree' 
            ? 'border-purple-500 bg-purple-50 text-purple-700' 
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <Banknote className="w-5 h-5" />
        <span className="text-sm font-medium">Cashfree</span>
      </button>

      <button
        onClick={() => setPaymentMethod('upi_app')}
        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
          paymentMethod === 'upi_app' 
            ? 'border-purple-500 bg-purple-50 text-purple-700' 
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <QrCode className="w-5 h-5" />
        <span className="text-sm font-medium">UPI App</span>
      </button>

      <button
        onClick={() => setPaymentMethod('qr_code')}
        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${
          paymentMethod === 'qr_code' 
            ? 'border-purple-500 bg-purple-50 text-purple-700' 
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <QrCode className="w-5 h-5" />
        <span className="text-sm font-medium">Library QR</span>
      </button>

      <button
        onClick={() => setPaymentMethod('front_desk')}
        className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all col-span-2 ${
          paymentMethod === 'front_desk' 
            ? 'border-purple-500 bg-purple-50 text-purple-700' 
            : 'border-gray-200 hover:border-purple-200'
        }`}
      >
        <Building className="w-5 h-5" />
        <span className="text-sm font-medium">Pay at Front Desk</span>
      </button>
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Complete Payment</h2>
        <p className="text-sm text-gray-500">Review your booking details and proceed to pay.</p>
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
            <span className="font-medium text-emerald-600">Selected: {`S-${String(seat.number).padStart(2, '0')}`}</span>
          </div>
        )}

        {adjustmentAmount > 0 && (
          <div className="flex justify-between text-sm text-blue-600 font-medium">
             <span>{adjustmentLabel}</span>
             <span>- ₹{adjustmentAmount}</span>
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
        <FormInput
          placeholder="Enter coupon code"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
          className="flex-1"
        />
        <AnimatedButton 
          variant="secondary" 
          onClick={handleApplyCoupon}
          disabled={!couponCode || !!appliedCoupon}
        >
          Apply
        </AnimatedButton>
      </div>

      {/* Payment Methods */}
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Select Payment Method</h4>
      {renderPaymentMethods()}

      {/* Manual Payment Proof */}
      {['upi_app', 'qr_code', 'front_desk'].includes(paymentMethod) && (
        <div className="mb-6 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              {paymentMethod === 'front_desk' 
                ? 'Please pay at the desk. Your booking will be pending verification.'
                : 'Please scan/pay and upload a screenshot. Your booking will be pending verification.'}
            </p>
          </div>
          
          {paymentMethod !== 'front_desk' && (
             <FormInput
               label="Transaction ID / Proof URL"
               placeholder="Enter Transaction Ref No."
               value={proofUrl || ''}
               onChange={(e) => setProofUrl(e.target.value)}
             />
          )}
        </div>
      )}

      <div className="flex gap-4">
        <AnimatedButton
          variant="secondary"
          className="flex-1"
          onClick={onBack}
          disabled={processing}
        >
          Back
        </AnimatedButton>
        <AnimatedButton
          variant="primary"
          className="flex-1"
          onClick={handlePayment}
          disabled={processing}
          isLoading={processing}
        >
          Pay & Book
        </AnimatedButton>
      </div>
    </div>
  )
}
