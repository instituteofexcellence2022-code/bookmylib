'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CreditCard, Banknote, QrCode, Building, 
  History, Receipt, AlertCircle, CheckCircle, 
  Loader2, Tag, Upload, ArrowRight, Download
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { 
  initiatePayment, 
  createManualPayment, 
  getPaymentHistory,
  getStudentBookingStatus 
} from '@/actions/payment'
import { generateReceiptPDF } from '@/lib/pdf-generator'
import { formatSeatNumber } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedCard } from '@/components/ui/AnimatedCard'

export default function PaymentClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'pay' | 'history'>('pay')
  const [history, setHistory] = useState<any[]>([])
  const [bookingStatus, setBookingStatus] = useState<{ 
    isNew: boolean, 
    lastBranchId: string | null,
    lastSubscription: any 
  } | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [status, historyData] = await Promise.all([
        getStudentBookingStatus(),
        getPaymentHistory()
      ])
      setBookingStatus(status)
      setHistory(historyData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load payment data')
    } finally {
      setLoading(false)
    }
  }

  const handleManageSubscription = () => {
    router.push('/student/my-plan')
  }

  const handleDownloadReceipt = (payment: any) => {
    // Calculate details
    let subTotal = payment.amount
    let discount = 0
    const items = []

    if (payment.description) {
        items.push({
            description: payment.description,
            amount: payment.amount
        })
    } else if (payment.subscription) {
        // If it's a subscription payment but no description
        subTotal = payment.subscription.plan.price
        
        // Calculate discount if paid amount is less than plan price
        if (subTotal > payment.amount) {
            discount = subTotal - payment.amount
        }
        
        items.push({
            description: `${payment.subscription.plan.name} Plan`,
            amount: subTotal
        })
        
        // Handle overpayment (fees)
        if (payment.amount > subTotal) {
             const extra = payment.amount - subTotal
             items.push({
                 description: 'Additional Fees / Services',
                 amount: extra
             })
             subTotal += extra
        }
    } else {
        // Fallback for other payments
        items.push({
            description: payment.description || 'Payment',
            amount: payment.amount
        })
    }

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '-'
        const [hours, minutes] = timeStr.split(':')
        const h = parseInt(hours)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${h12}:${minutes} ${ampm}`
    }

    const receiptData = {
        invoiceNo: payment.id.slice(0, 8).toUpperCase(),
        date: new Date(payment.createdAt),
        studentName: payment.student.name,
        studentEmail: payment.student.email,
        studentPhone: payment.student.phone,
        branchName: payment.branch?.name || 'Main Branch',
        branchAddress: payment.branch ? `${payment.branch.address}, ${payment.branch.city}` : '',
        planName: payment.subscription?.plan?.name || 'Payment',
        planType: payment.subscription?.plan?.category,
        planDuration: payment.subscription?.plan ? `${payment.subscription.plan.duration} ${payment.subscription.plan.durationUnit}` : undefined,
        planHours: payment.subscription?.plan?.hoursPerDay 
            ? `${payment.subscription.plan.hoursPerDay} Hrs/Day` 
            : (payment.subscription?.plan?.shiftStart && payment.subscription?.plan?.shiftEnd)
                ? `${formatTime(payment.subscription.plan.shiftStart)} - ${formatTime(payment.subscription.plan.shiftEnd)}`
                : undefined,
        seatNumber: payment.subscription?.seat?.number ? `${formatSeatNumber(payment.subscription.seat.number)} (${payment.subscription.seat.section || 'General'})` : undefined,
        startDate: payment.subscription?.startDate ? new Date(payment.subscription.startDate) : undefined,
        endDate: payment.subscription?.endDate ? new Date(payment.subscription.endDate) : undefined,
        amount: payment.amount,
        paymentMethod: payment.method.replace('_', ' '),
        subTotal: subTotal,
        discount: discount,
        items: items
    }

    generateReceiptPDF(receiptData)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('pay')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'pay' 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'history' 
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          History
        </button>
      </div>

      {activeTab === 'pay' && (
        <div className="max-w-2xl">
          <AnimatedCard className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {bookingStatus?.isNew ? 'Start Your Journey' : 'Manage Subscription'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {bookingStatus?.isNew 
                  ? 'Choose a library branch and plan to get started' 
                  : 'Renew your current plan, upgrade to a better one, or explore other options'}
              </p>
            </div>

            <div className="flex justify-center">
              <Button
                onClick={handleManageSubscription}
                size="lg"
                className="min-w-[200px]"
              >
                {bookingStatus?.isNew ? 'Book New Seat' : 'Renew / Upgrade Plan'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </AnimatedCard>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No payment history found</div>
          ) : (
            history.map(payment => (
              <div 
                key={payment.id} 
                className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    payment.status === 'completed' ? 'bg-green-100 text-green-600' :
                    payment.status === 'failed' ? 'bg-red-100 text-red-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {payment.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                     payment.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                     <History className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {payment.description || 'Payment'}
                    </h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-gray-900 dark:text-white">₹{payment.amount}</p>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                      payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status.replace('_', ' ')}
                    </span>
                  </div>
                  {payment.status === 'completed' && (
                    <button 
                      onClick={() => handleDownloadReceipt(payment)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                      title="Download Receipt"
                    >
                      <Download className="w-5 h-5 text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
