'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CreditCard, RefreshCw, TrendingUp, Compass, ArrowRight, Loader2,
  Calendar, Clock, MapPin, CheckCircle, AlertCircle, Download, Receipt, Sparkles, Building
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getStudentBookingStatus } from '@/actions/payment'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { motion } from 'framer-motion'
import { generateReceiptPDF } from '@/lib/pdf-generator'
import { formatSeatNumber } from '@/lib/utils'

export default function MyPlanClient() {
  const router = useRouter()
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
      const status = await getStudentBookingStatus()
      setBookingStatus(status)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load subscription data')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (action: 'renew' | 'upgrade' | 'explore') => {
    if (!bookingStatus) return

    if (bookingStatus.isNew || !bookingStatus.lastBranchId) {
      router.push('/student/book')
      return
    }

    const branchId = bookingStatus.lastBranchId
    
    switch (action) {
      case 'renew':
        router.push(`/student/book/${branchId}?action=renew&planId=${bookingStatus.lastSubscription?.planId}`)
        break
      case 'upgrade':
        router.push(`/student/book/${branchId}?action=upgrade`)
        break
      case 'explore':
        router.push(`/student/book/${branchId}?action=explore`)
        break
    }
  }

  const handleBookNew = () => {
    router.push('/student/book')
  }

  const calculateProgress = (start: string, end: string) => {
    const total = new Date(end).getTime() - new Date(start).getTime()
    const current = new Date().getTime() - new Date(start).getTime()
    const percentage = (current / total) * 100
    return Math.min(Math.max(percentage, 0), 100)
  }

  const getDaysRemaining = (end: string) => {
    const diff = new Date(end).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const handleDownloadReceipt = (subscription: any) => {
    const payment = subscription.payment
    if (!payment) return

    // Calculate details
    const subTotal = subscription.plan.price
    let discount = 0
    if (subTotal > payment.amount) {
        discount = subTotal - payment.amount
    }
    
    const items = [{
        description: `${subscription.plan.name} Plan`,
        amount: subTotal
    }]

    const receiptData = {
        invoiceNo: payment.id.slice(0, 8).toUpperCase(),
        date: new Date(payment.createdAt),
        studentName: payment.student.name,
        studentEmail: payment.student.email,
        studentPhone: payment.student.phone,
        branchName: payment.branch?.name || subscription.branch.name || 'Main Branch',
        branchAddress: payment.branch ? `${payment.branch.address}, ${payment.branch.city}` : (subscription.branch.address || ''),
        planName: subscription.plan.name,
        planType: subscription.plan.durationUnit,
        planDuration: subscription.plan.duration?.toString(),
        seatNumber: subscription.seat?.number ? formatSeatNumber(subscription.seat.number) : undefined,
        startDate: subscription.startDate ? new Date(subscription.startDate) : undefined,
        endDate: subscription.endDate ? new Date(subscription.endDate) : undefined,
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
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    )
  }

  const sub = bookingStatus?.lastSubscription
  const isActive = sub?.status === 'active'
  const isExpired = sub?.status === 'expired' || sub?.status === 'cancelled'
  const daysRemaining = sub ? getDaysRemaining(sub.endDate) : 0
  const isUrgent = isActive && daysRemaining <= 7 && daysRemaining > 0

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            My Plan <Sparkles className="w-5 h-5 text-yellow-500" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your subscription and preferences</p>
        </div>
      </div>

      {bookingStatus?.isNew ? (
        <motion.div variants={item}>
          <AnimatedCard className="p-12 text-center space-y-6 bg-gradient-to-br from-purple-50 to-white dark:from-gray-800 dark:to-gray-900 border-2 border-dashed border-purple-200 dark:border-purple-800">
            <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm animate-pulse">
              <CreditCard className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Start Your Journey</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-lg">
                Unlock your potential with a dedicated study space. Choose a branch and plan that fits your needs.
              </p>
            </div>
            <div className="pt-4">
              <AnimatedButton onClick={handleBookNew} size="lg" className="min-w-[240px] shadow-lg shadow-purple-500/20 text-lg py-6">
                Book New Seat <ArrowRight className="w-6 h-6 ml-2" />
              </AnimatedButton>
            </div>
          </AnimatedCard>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Active Plan Card - Compact Version */}
          <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 text-white shadow-lg shadow-purple-900/20">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
            
            <div className="relative p-5 space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-3 flex-1 w-full">
                  {/* Header: Name + Status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{sub?.plan?.name}</h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/20 backdrop-blur-md shadow-sm
                      ${isActive ? 'text-green-300 border-green-300/30' : 'text-red-300 border-red-300/30'}`}>
                      {sub?.status}
                    </span>
                    {isActive && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center bg-white/10 border border-white/10 backdrop-blur-md
                        ${isUrgent ? 'text-yellow-300 border-yellow-300/50 animate-pulse' : 'text-purple-100'}`}>
                        <Clock className="w-3 h-3 mr-1" />
                        {daysRemaining} days left
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {sub?.plan?.description && (
                    <p className="text-purple-100/90 text-xs leading-relaxed line-clamp-2">
                      {sub.plan.description}
                    </p>
                  )}

                  {/* Compact Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-purple-100/90 bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="flex flex-col gap-1">
                      <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Plan Type</span>
                      <span className="font-medium truncate flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5" />
                        ₹{sub?.plan?.price}/{sub?.plan?.durationUnit?.replace(/s$/, '')}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Schedule</span>
                      <span className="font-medium truncate flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {sub?.plan?.category === 'fixed' && sub?.plan?.shiftStart 
                          ? `${sub.plan.shiftStart} - ${sub.plan.shiftEnd}`
                          : sub?.plan?.hoursPerDay 
                            ? `${sub.plan.hoursPerDay} Hours/Day`
                            : 'Full Day Access'
                        }
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Location</span>
                      <span className="font-medium truncate flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" />
                        {sub?.branch?.name}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Seat</span>
                      <span className="font-medium truncate flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {sub?.seat?.number ? `${formatSeatNumber(sub.seat.number)} ${sub.seat.section ? `(${sub.seat.section})` : ''}` : 'No Seat'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar & Actions Footer */}
              <div className="flex items-center gap-4 pt-3 border-t border-white/10">
                <div className="flex-1 space-y-1.5">
                   <div className="flex justify-between text-sm font-medium text-purple-200/70">
                    <span>{new Date(sub?.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    <span className="text-purple-200/40 uppercase tracking-widest text-xs">Validity</span>
                    <span>{new Date(sub?.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="h-1.5 bg-black/20 rounded-full overflow-hidden" title={`${calculateProgress(sub?.startDate, sub?.endDate).toFixed(0)}% Completed`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative
                        ${isUrgent ? 'bg-yellow-400' : 'bg-green-400'}`}
                      style={{ width: `${calculateProgress(sub?.startDate, sub?.endDate)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   {sub?.payment && (
                    <button
                      onClick={() => handleDownloadReceipt(sub)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10"
                      title="Download Receipt"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Actions Grid */}
          <motion.div variants={container} className="grid gap-3 md:grid-cols-3">
            <motion.button
              variants={item}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('renew')}
              className={`relative p-4 rounded-xl border bg-white dark:bg-gray-800 hover:shadow-lg transition-all group text-left overflow-hidden h-full flex flex-col justify-between
                ${isUrgent ? 'border-yellow-400 ring-2 ring-yellow-400/20 dark:border-yellow-500' : 'border-gray-100 dark:border-gray-800'}`}
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-50 dark:bg-purple-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative space-y-1.5">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg w-fit group-hover:scale-110 transition-transform text-purple-600 dark:text-purple-400 shadow-sm">
                  <RefreshCw className={`w-5 h-5 ${isUrgent ? 'animate-spin-slow' : ''}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base flex items-center gap-2">
                    Renew
                    {isUrgent && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-yellow-100 text-yellow-800">Soon</span>}
                  </h3>
                  <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-1">
                    Extend your current plan.
                  </p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={item}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('upgrade')}
              className="relative p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:shadow-lg transition-all group text-left overflow-hidden h-full flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 dark:bg-blue-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative space-y-1.5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg w-fit group-hover:scale-110 transition-transform text-blue-600 dark:text-blue-400 shadow-sm">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Upgrade</h3>
                  <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-1">
                    Switch to a better plan.
                  </p>
                </div>
              </div>
            </motion.button>

            <motion.button
              variants={item}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction('explore')}
              className="relative p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:shadow-lg transition-all group text-left overflow-hidden h-full flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-teal-50 dark:bg-teal-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative space-y-1.5">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg w-fit group-hover:scale-110 transition-transform text-teal-600 dark:text-teal-400 shadow-sm">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">Explore</h3>
                  <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-1">
                    Browse other seats.
                  </p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
