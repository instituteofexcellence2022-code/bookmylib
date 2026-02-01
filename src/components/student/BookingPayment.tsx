'use client'

import React, { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { 
  CreditCard, Banknote, QrCode, Building, 
  AlertCircle, Check 
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { 
  initiatePayment, 
  validateCoupon,
  createManualPayment,
  verifyPaymentSignature
} from '@/actions/payment'
import Script from 'next/script'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { formatSeatNumber } from '@/lib/utils'

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
  upiId?: string
  payeeName?: string
  onSuccess: (paymentId?: string, status?: 'completed' | 'pending_verification') => void
  onBack: () => void
}

export default function BookingPayment({ 
  plan, 
  seat, 
  fees, 
  branchId, 
  adjustmentAmount = 0,
  adjustmentLabel = 'Adjustment',
  upiId,
  payeeName,
  onSuccess, 
  onBack 
}: BookingPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('front_desk')
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount: number
    finalAmount: number
    details: unknown
  } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)

  // Calculate Base Total (Plan + Fees)
  const feesTotal = fees.reduce((sum: number, fee) => sum + fee.amount, 0)
  const baseTotal = plan.price + feesTotal
  const subTotal = Math.max(0, baseTotal - adjustmentAmount)
  
  // Calculate Final Amount
  const finalAmount = appliedCoupon ? appliedCoupon.finalAmount : subTotal

  // Generate UPI Link
  const upiLink = React.useMemo(() => {
    if (!upiId) return ''
    
    const params = new URLSearchParams()
    params.append('pa', upiId) // Payee Address
    params.append('pn', payeeName || 'Library') // Payee Name
    params.append('am', finalAmount.toString()) // Amount
    params.append('cu', 'INR') // Currency
    
    // Transaction Note (tn) - Keep it short and safe
    const note = `Pay for ${plan.name}`.substring(0, 50)
    params.append('tn', note)

    return `upi://pay?${params.toString()}`
  }, [upiId, payeeName, finalAmount, plan.name])

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
    if (seat) description += ` (Seat ${formatSeatNumber(seat.number)})`
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
          if (paymentMethod === 'razorpay') {
              if (!window.Razorpay) {
                  toast.error('Razorpay SDK failed to load')
                  setProcessing(false)
                  return
              }

              const options = {
                  key: result.key || '',
                  amount: (result.amount || 0) * 100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
                  currency: result.currency || 'INR',
                  name: "Library Subscription",
                  description: description,
                  image: "/logo.png", // Ensure you have a logo or remove this
                  order_id: result.gatewayOrderId || '', 
                  handler: async function (response: any) {
                      const verifyResult = await verifyPaymentSignature(
                          result.paymentId!,
                          response.razorpay_payment_id,
                          response.razorpay_signature
                      )
                      if (verifyResult.success) {
                          toast.success('Payment Successful!')
                          onSuccess(result.paymentId, 'completed')
                      } else {
                          toast.error('Payment Verification Failed')
                          setProcessing(false)
                      }
                  },
                  prefill: {
                      name: "Student", // ideally should come from student profile
                      email: "student@example.com",
                      contact: "9999999999"
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
                  paymentSessionId: result.paymentSessionId || '',
                  redirectTarget: "_modal" as const, // "_self", "_blank", or "_modal"
              }

              cashfree.checkout(checkoutOptions).then(async (checkoutResult: any) => {
                  if(checkoutResult.error){
                      // This will be true whenever user clicks on close icon inside the modal or any error happens during the payment
                      console.log("User has closed the popup or there is some payment error", checkoutResult.error);
                      setProcessing(false)
                  }
                  if(checkoutResult.redirect){
                      // This will be true when the payment redirection page couldnt be opened in the same window
                      console.log("Payment will be redirected");
                  }
                  if(checkoutResult.paymentDetails){
                      // This will be called whenever the payment is completed irrespective of transaction status
                      console.log("Payment has been completed, verifying...");
                      
                      // Verify Payment on Backend
                      // We pass the paymentId (internal) and let backend check status via API
                      const verifyResult = await verifyPaymentSignature(
                          result.paymentId!,
                          'PENDING_FETCH', 
                          'PENDING_FETCH'
                      )

                      if (verifyResult.success) {
                          toast.success('Payment Successful!')
                          onSuccess(result.paymentId, 'completed')
                      } else {
                          toast.error('Payment Verification Failed')
                          setProcessing(false)
                      }
                  }
              });
              
              // NOTE: Cashfree JS SDK logic needs careful variable handling to access paymentId
              // I will fix this in the code replacement below by renaming the inner variable
          }

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
        if (transactionId) formData.append('transactionId', transactionId)
        if (appliedCoupon) formData.append('couponCode', appliedCoupon.code)

        const result = await createManualPayment(formData)
        
        if (result.success) {
          toast.success('Payment submitted for verification')
          onSuccess(result.paymentId, 'pending_verification') 
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

  const renderPaymentMethods = () => {
    const isOnline = paymentMethod !== 'front_desk'

    return (
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
           {/* Cash / Front Desk Card */}
           <button
            onClick={() => setPaymentMethod('front_desk')}
            className={`relative p-3 rounded-xl border transition-all group text-left overflow-hidden h-full flex flex-col justify-between gap-2 ${
              !isOnline
                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/20' 
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-emerald-200 dark:hover:border-emerald-700 hover:shadow-lg'
            }`}
          >
            {/* Background Decorator */}
            <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full -mr-3 -mt-3 transition-transform group-hover:scale-110 ${
                !isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-gray-50 dark:bg-gray-700/30'
            }`}></div>

            {/* Selection Indicator */}
            {!isOnline && (
              <div className="absolute top-2 right-2 text-emerald-600 dark:text-emerald-400 z-10">
                <div className="w-4 h-4 bg-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                   <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              </div>
            )}
            
            <div className={`relative p-2 rounded-lg w-fit group-hover:scale-110 transition-transform shadow-sm ${
                !isOnline ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
               <Building className="w-4 h-4" />
            </div>

            <div className="relative">
               <h3 className={`font-bold text-xs ${!isOnline ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-900 dark:text-white'}`}>Pay at Desk</h3>
               <p className={`text-[9px] leading-tight ${!isOnline ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500'}`}>
                 Pay cash at desk
               </p>
            </div>
          </button>

          {/* Online Payment Card */}
          <button
            onClick={() => {
                if (!isOnline) setPaymentMethod('razorpay')
            }}
            className={`relative p-3 rounded-xl border transition-all group text-left overflow-hidden h-full flex flex-col justify-between gap-2 ${
              isOnline
                ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 ring-1 ring-purple-500/20' 
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-lg'
            }`}
          >
            {/* Background Decorator */}
            <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full -mr-3 -mt-3 transition-transform group-hover:scale-110 ${
                isOnline ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-50 dark:bg-gray-700/30'
            }`}></div>

            {/* Selection Indicator */}
            {isOnline && (
              <div className="absolute top-2 right-2 text-purple-600 dark:text-purple-400 z-10">
                <div className="w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center shadow-sm">
                   <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                </div>
              </div>
            )}

            <div className={`relative p-2 rounded-lg w-fit group-hover:scale-110 transition-transform shadow-sm ${
                isOnline ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
               <CreditCard className="w-4 h-4" />
            </div>

            <div className="relative">
               <h3 className={`font-bold text-xs ${isOnline ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>Online Pay</h3>
               <p className={`text-[9px] leading-tight ${isOnline ? 'text-purple-700 dark:text-purple-300' : 'text-gray-500'}`}>
                 UPI, Cards & more
               </p>
            </div>
          </button>
        </div>

        {isOnline && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 px-1 pt-2">
               <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
               <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Select Gateway</span>
               <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
               {[
                   { id: 'razorpay', label: 'Razorpay', icon: CreditCard, desc: 'Cards, UPI' },
                   { id: 'cashfree', label: 'Cashfree', icon: Banknote, desc: 'Secure Gateway' },
                   // Only show UPI options if UPI ID is configured
                   ...(upiId ? [
                     { id: 'upi_app', label: 'UPI App', icon: QrCode, desc: 'PhonePe/GPay' },
                     { id: 'qr_code', label: 'Library QR', icon: QrCode, desc: 'Scan to Pay' }
                   ] : [])
               ].map((method) => (
                   <button
                   key={method.id}
                   onClick={() => setPaymentMethod(method.id)}
                   className={`relative p-2 rounded-xl border text-left transition-all group overflow-hidden ${
                       paymentMethod === method.id
                       ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 ring-1 ring-purple-500/20' 
                       : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-md'
                   }`}
                   >
                     {/* Mini Decorator */}
                     <div className={`absolute top-0 right-0 w-10 h-10 rounded-bl-full -mr-2 -mt-2 transition-transform group-hover:scale-110 ${
                        paymentMethod === method.id ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-gray-50 dark:bg-gray-700/30'
                     }`}></div>

                     <div className="relative flex items-start gap-2">
                       <div className={`p-1.5 rounded-lg shrink-0 ${
                           paymentMethod === method.id 
                           ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                           : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                       }`}>
                          <method.icon className="w-3 h-3" />
                       </div>
                       <div>
                          <h4 className={`text-[10px] font-bold ${paymentMethod === method.id ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'}`}>
                            {method.label}
                          </h4>
                          <p className="text-[8px] text-gray-500 mt-0.5 leading-tight">{method.desc}</p>
                       </div>
                     </div>
                   </button>
               ))}
            </div>
          </div>
        )}
      </div>
    )
  }

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
            <span className="font-medium text-emerald-600">Selected: {formatSeatNumber(seat.number)}</span>
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
          
          {/* Dynamic UPI Section */}
          {paymentMethod !== 'front_desk' && upiId && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-4 flex flex-col items-center gap-4 text-center">
               {paymentMethod === 'qr_code' ? (
                  <>
                    <div className="bg-white p-3 rounded-lg border shadow-sm">
                      <QRCodeSVG value={upiLink} size={160} level="M" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">Scan to Pay ₹{finalAmount}</p>
                      <p className="text-xs text-gray-500">Using any UPI App (GPay, PhonePe, Paytm)</p>
                    </div>
                    {/* Always show Pay via App button below QR on mobile as fallback */}
                    <div className="block md:hidden w-full">
                         <a 
                           href={upiLink}
                           className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                         >
                           <QrCode className="w-4 h-4" />
                           Open UPI App
                         </a>
                    </div>
                  </>
               ) : (
                 <>
                    <a 
                      href={upiLink}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm animate-pulse"
                    >
                      <QrCode className="w-5 h-5" />
                      Pay ₹{finalAmount} via UPI App
                    </a>
                    <p className="text-xs text-gray-500">Clicking this will open your installed UPI app (GPay, PhonePe, etc.) with the amount pre-filled.</p>
                 </>
               )}
            </div>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800 flex gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
            <div className="text-xs text-yellow-700 dark:text-yellow-400">
              {paymentMethod === 'front_desk' ? (
                <p>Please pay cash to library staff/owner. Your booking will be pending verification till they mark as accept.</p>
              ) : (
                <div className="space-y-1">
                    {!upiId && <p className="font-semibold">Scan QR Code available at the Library Desk</p>}
                    <p>After payment, please enter the Transaction ID / UTR below for verification.</p>
                </div>
              )}
            </div>
          </div>
          
          {paymentMethod !== 'front_desk' && (
             <FormInput
               label="Transaction ID / UTR (Required)"
               placeholder="Enter 12-digit UPI Reference ID"
               value={transactionId}
               onChange={(e) => setTransactionId(e.target.value)}
               required
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
      {/* Load Payment Gateways */}
      <Script 
        src="https://checkout.razorpay.com/v1/checkout.js" 
        strategy="lazyOnload"
      />
      <Script 
        src="https://sdk.cashfree.com/js/v3/cashfree.js" 
        strategy="lazyOnload"
      />
    </div>
  )
}
