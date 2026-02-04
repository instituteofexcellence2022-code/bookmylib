'use client'

import React, { useState, useRef } from 'react'
import { 
  CreditCard, Banknote, Check, Shield, Lock, Smartphone,
  QrCode, Upload, X, Loader2, Copy, AlertCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { initiatePublicBooking } from '@/actions/public-booking'
import { verifyPaymentSignature, validateCoupon } from '@/actions/payment'
import { formatSeatNumber, cn } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import { uploadFile } from '@/actions/upload'
import { createWorker } from 'tesseract.js'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'

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
  upiId?: string
  payeeName?: string
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
  upiId,
  payeeName,
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
  const [uploading, setUploading] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Calculate Base Total (Plan + Fees)
  const feesTotal = fees.reduce((sum: number, fee) => sum + Number(fee.amount), 0)
  const baseTotal = Number(plan.price) + feesTotal
  const subTotal = Math.round(baseTotal)
  
  // Calculate Final Amount
  const finalAmount = Math.round(appliedCoupon ? appliedCoupon.finalAmount : subTotal)

  // Generate UPI Links
  const { upiLinkQr, upiLinkIntent } = React.useMemo(() => {
    if (!upiId) return { upiLinkQr: '', upiLinkIntent: '' }
    
    // Clean inputs
    const cleanUpiId = upiId.trim()
    const cleanPayeeName = (payeeName || 'Library').trim()
    const cleanNote = `Pay for ${plan.name}`.substring(0, 50).trim()
    
    // Generate a pseudo-unique transaction ref
    const tr = `LIB${Date.now().toString().slice(-8)}`

    // Format Amount
    const amountStr = Number.isInteger(finalAmount) 
        ? finalAmount.toString() 
        : finalAmount.toFixed(2)

    const buildParams = (mode?: string) => {
        const params = new URLSearchParams()
        params.append('pa', cleanUpiId)
        params.append('pn', cleanPayeeName)
        params.append('am', amountStr)
        params.append('cu', 'INR')
        params.append('tn', cleanNote)
        params.append('tr', tr)
        if (mode) params.append('mode', mode)
        
        return `upi://pay?${params.toString()}`
    }

    return {
        upiLinkQr: buildParams('01'), // QR Code mode
        upiLinkIntent: buildParams() // Intent mode
    }
  }, [upiId, payeeName, finalAmount, plan.name])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
    }

    setUploading(true)
    setIsScanning(true)

    try {
        // Run Upload and OCR in parallel
        const uploadPromise = uploadFile(file)
        
        const ocrPromise = (async () => {
            try {
                const worker = await createWorker('eng')
                const ret = await worker.recognize(file)
                await worker.terminate()
                return ret.data.text
            } catch (err) {
                console.error("OCR Failed", err)
                return null
            }
        })()

        const [url, text] = await Promise.all([uploadPromise, ocrPromise])

        if (url) {
            setProofUrl(url)
            toast.success('Screenshot uploaded successfully')
        }

        if (text) {
             const cleanText = text.toLowerCase().replace(/\s+/g, ' ')
             const keywordPatterns = [
                 /(?:upi\s*ref(?:erence)?\s*(?:id|no|num)?|utr|txn\s*id|transaction\s*id)[\s\:\-\.]*(\d{12})/i,
                 /(\d{12})/
             ]

             let detectedId = null
             for (const pattern of keywordPatterns) {
                 const match = cleanText.match(pattern)
                 if (match && match[1]) {
                     detectedId = match[1]
                     break
                 } else if (match && match[0] && /^\d{12}$/.test(match[0])) {
                    detectedId = match[0]
                    break
                 }
             }
             
             if (!detectedId) {
                 const twelveDigitRegex = /\b\d{12}\b/g
                 const matches = text.match(twelveDigitRegex)
                 if (matches && matches.length > 0) {
                     detectedId = matches[0]
                 }
             }

             if (detectedId) {
                 if (!transactionId) {
                     setTransactionId(detectedId)
                     toast.success('Transaction ID detected!', { icon: '✨' })
                 }
             } else {
                 toast('Could not auto-detect Transaction ID. Please enter manually.', { icon: '📝' })
             }
        }
    } catch (error) {
        toast.error('Failed to upload screenshot')
        console.error(error)
    } finally {
        setUploading(false)
        setIsScanning(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleApplyCoupon = async () => {
    if (!couponCode) return
    
    const toastId = toast.loading('Validating coupon...')
    try {
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
    // Validation for Manual Payments
    if (['upi_app', 'qr_code'].includes(paymentMethod)) {
        if (!proofUrl) {
            toast.error('Please upload a payment screenshot')
            return
        }
    }

    setProcessing(true)
    const amount = finalAmount

    try {
        const result = await initiatePublicBooking({
            ...studentDetails,
            amount,
            planId: plan.id,
            seatId: seat?.id,
            fees: fees.map(f => String(f.id)),
            branchId,
            gatewayProvider: paymentMethod, // Now supports 'upi_app' and 'qr_code'
            couponCode: appliedCoupon?.code,
            manualPaymentData: ['upi_app', 'qr_code'].includes(paymentMethod) ? {
                transactionId: transactionId || undefined,
                proofUrl: proofUrl || undefined
            } : undefined
        })
        
        if (result.success && result.paymentData) {
            const paymentResult = result.paymentData
            const studentId = result.studentId

            // Handle Manual Payment Success Immediately
            if (['upi_app', 'qr_code'].includes(paymentMethod)) {
                toast.success('Payment submitted for verification')
                onSuccess(paymentResult.paymentId, 'pending_verification', studentId)
                return
            }

            // Handle Gateways
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
                    mode: "sandbox" 
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
            { id: 'cashfree', label: 'Cashfree', icon: Banknote, desc: 'Secure Payment Gateway' },
            { id: 'upi_app', label: 'UPI App', icon: Smartphone, desc: 'GPay, PhonePe, Paytm' },
            { id: 'qr_code', label: 'Scan QR', icon: QrCode, desc: 'Scan & Pay' }
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

      {/* Manual Payment Verification UI */}
      {['upi_app', 'qr_code'].includes(paymentMethod) && (
        <div className="mb-6 p-4 rounded-xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-600" />
                Complete Payment
            </h3>

            {/* QR Code Display */}
            {paymentMethod === 'qr_code' && upiId && (
                <div className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="bg-white p-2 rounded-lg shadow-sm mb-2">
                        <QRCodeSVG value={upiLinkQr} size={180} level="M" includeMargin={true} />
                    </div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 text-center mb-1">
                        Scan to pay <span className="text-gray-900 dark:text-white font-bold">₹{finalAmount}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 text-center">
                        {payeeName}
                    </p>
                </div>
            )}

            {/* UPI App Link (Mobile) */}
            {paymentMethod === 'upi_app' && upiId && (
                <div className="flex flex-col gap-2">
                    <a 
                        href={upiLinkIntent}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 rounded-xl transition-all shadow-sm group"
                    >
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Smartphone className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Open UPI App</span>
                    </a>
                    <p className="text-xs text-center text-gray-500">
                        Tap to open GPay, PhonePe, Paytm etc.
                    </p>
                </div>
            )}

            {/* Fallback if no UPI ID */}
            {!upiId && (
                 <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Payment details not configured for this branch.</span>
                 </div>
            )}

            <div className="h-px bg-purple-200/50 dark:bg-purple-800/30" />

            {/* Transaction Verification Form */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Payment Screenshot <span className="text-red-500">*</span>
                    </label>
                    <div 
                        className={cn(
                            "relative border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer hover:bg-white/50 dark:hover:bg-gray-800/50",
                            proofUrl ? "border-emerald-500 bg-emerald-50/30" : "border-gray-300 dark:border-gray-700 hover:border-purple-400"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileUpload}
                        />
                        
                        {uploading ? (
                            <div className="flex flex-col items-center gap-2 py-2">
                                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                                <span className="text-xs text-gray-500">Scanning image...</span>
                            </div>
                        ) : proofUrl ? (
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                                    <Check className="w-4 h-4" />
                                    <span>Screenshot Uploaded</span>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setProofUrl(null)
                                        setTransactionId('')
                                    }}
                                    className="p-1 hover:bg-red-100 rounded-full text-red-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 py-1">
                                <Upload className="w-5 h-5 text-gray-400" />
                                <span className="text-xs text-gray-500">Click to upload screenshot</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Transaction ID (UTR)
                    </label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="Enter 12-digit UTR / Ref No."
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="w-full pl-3 pr-9 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        />
                        {transactionId && (
                             <div className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500">
                                <Check className="w-4 h-4" />
                             </div>
                        )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                        Auto-detected from screenshot if visible.
                    </p>
                </div>
            </div>
        </div>
      )}

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
          disabled={processing || (['upi_app', 'qr_code'].includes(paymentMethod) && !proofUrl)}
          className="flex-[2] px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {processing ? (
             <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
             </>
          ) : (
             <>
                {['upi_app', 'qr_code'].includes(paymentMethod) ? 'Submit Payment' : `Pay ₹${finalAmount}`}
             </>
          )}
        </button>
      </div>
    </div>
  )
}
