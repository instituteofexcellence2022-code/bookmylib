'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CreditCard, RefreshCw, TrendingUp, Compass, ArrowRight, Loader2,
  Clock, MapPin, Download, Receipt, Sparkles, Building, Lock, Calendar,
  AlertTriangle, ArrowDown, CalendarClock, ArrowRightCircle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getStudentBookingStatus } from '@/actions/payment'
import { Button } from '@/components/ui/button'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { motion } from 'framer-motion'
import { generateReceiptPDF } from '@/lib/pdf-generator'
import { formatSeatNumber } from '@/lib/utils'

interface SubscriptionDetails {
  id: string
  branchId: string
  planId: string
  plan: {
    id: string
    name: string
    description?: string | null
    price: number
    duration: number
    durationUnit: string
    includesSeat: boolean
    includesLocker: boolean
    category?: string | null
    shiftStart?: string | null
    shiftEnd?: string | null
    hoursPerDay?: number | null
  }
  branch: {
    name: string
    address: string | null
  }
  status: string
  startDate: Date
  endDate: Date
  hasLocker: boolean
  seat: {
    number: string
    section?: string | null
  } | null
  payment: {
    id: string
    amount: number
    createdAt: Date
    method: string
    student: {
      name: string
      email: string | null
      phone: string | null
    }
    branch?: {
      name: string
      address: string | null
      city: string | null
    } | null
  } | null
}

export default function MyPlanClient() {
  const router = useRouter()
  const [bookingStatus, setBookingStatus] = useState<{ 
    isNew: boolean, 
    lastBranchId: string | null,
    lastSubscription: SubscriptionDetails | null,
    activeSubscription: SubscriptionDetails | null,
    queuedSubscriptions: SubscriptionDetails[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const status = await getStudentBookingStatus()
      // @ts-expect-error - Type mismatch in booking status
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

  const calculateProgress = (start: string | Date, end: string | Date) => {
    const total = new Date(end).getTime() - new Date(start).getTime()
    const current = new Date().getTime() - new Date(start).getTime()
    const percentage = (current / total) * 100
    return Math.min(Math.max(percentage, 0), 100)
  }

  const getDaysRemaining = (end: string | Date) => {
    const diff = new Date(end).getTime() - new Date().getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const handleDownloadReceipt = (subscription: SubscriptionDetails) => {
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

  const getGapInfo = (prev: SubscriptionDetails, next: SubscriptionDetails) => {
    const prevEnd = new Date(prev.endDate)
    const nextStart = new Date(next.startDate)
    // Add 1 hour buffer to handle slight time differences
    const diffTime = nextStart.getTime() - prevEnd.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return {
      hasGap: diffDays > 1,
      days: diffDays,
      isSeamless: diffDays <= 1 && diffDays >= 0
    }
  }

  const getChangeInfo = (prev: SubscriptionDetails, next: SubscriptionDetails) => {
    return {
      branchChanged: prev.branchId !== next.branchId,
      seatChanged: prev.seat?.number !== next.seat?.number,
      planChanged: prev.planId !== next.planId
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    )
  }

  const activeSub = bookingStatus?.activeSubscription
  const queuedSubs = bookingStatus?.queuedSubscriptions || []
  const lastSub = bookingStatus?.lastSubscription
  
  // Determine primary subscription to show
  const primarySub = activeSub || (queuedSubs.length > 0 ? queuedSubs[0] : lastSub)
  
  // Determine queue list to show
  // If active exists, show all queued
  // If no active, show queued starting from index 1 (since index 0 is primary)
  const displayQueue = activeSub ? queuedSubs : (queuedSubs.length > 0 ? queuedSubs.slice(1) : [])

  const isNewUser = bookingStatus?.isNew && !primarySub
  
  const getPrimaryStatus = () => {
    if (activeSub) return 'active'
    if (queuedSubs.length > 0 && !activeSub) return 'upcoming'
    return primarySub?.status || 'expired'
  }
  
  const primaryStatus = getPrimaryStatus()
  const daysRemaining = primarySub ? getDaysRemaining(primarySub.endDate) : 0
  const isUrgent = primaryStatus === 'active' && daysRemaining <= 7 && daysRemaining > 0

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

  // Connector Component
  const Connector = ({ prev, next }: { prev: SubscriptionDetails, next: SubscriptionDetails }) => {
    const { hasGap, days } = getGapInfo(prev, next)
    const { branchChanged, seatChanged } = getChangeInfo(prev, next)
    
    if (!hasGap && !branchChanged && !seatChanged) {
      return (
        <div className="flex justify-center py-1">
          <div className="flex flex-col items-center">
             <div className="h-3 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
             <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-1 rounded-full border border-green-200 dark:border-green-900/50">
                <ArrowDown className="w-3 h-3" />
             </div>
             <div className="h-3 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      )
    }
    
    return (
      <motion.div variants={item} className="my-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-sm space-y-2">
         {hasGap && (
           <div className="flex items-start gap-2 text-amber-600 dark:text-amber-400">
             <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
             <p>
               <span className="font-semibold">Service Gap:</span> There is a {days} day gap between these plans. 
               You won&apos;t have access from {new Date(prev.endDate).toLocaleDateString()} to {new Date(next.startDate).toLocaleDateString()}.
             </p>
           </div>
         )}
         
         {branchChanged && (
           <div className="flex items-start gap-2 text-blue-600 dark:text-blue-400">
             <Building className="w-4 h-4 mt-0.5 shrink-0" />
             <p>
               <span className="font-semibold">Branch Change:</span> Moving from {prev.branch.name} to {next.branch.name}.
             </p>
           </div>
         )}

         {seatChanged && !branchChanged && (
           <div className="flex items-start gap-2 text-purple-600 dark:text-purple-400">
             <ArrowRightCircle className="w-4 h-4 mt-0.5 shrink-0" />
             <p>
               <span className="font-semibold">Seat Change:</span> Moving from Seat {prev.seat?.number ? formatSeatNumber(prev.seat.number) : 'Assigned'} to {next.seat?.number ? formatSeatNumber(next.seat.number) : 'Assigned'}.
             </p>
           </div>
         )}
      </motion.div>
    )
  }

  const PlanCard = ({ sub, type = 'primary' }: { sub: SubscriptionDetails, type?: 'primary' | 'compact' }) => {
    const isActive = type === 'primary' && primaryStatus === 'active'
    const isUpcoming = type === 'compact' || (type === 'primary' && primaryStatus === 'upcoming')
    // const isExpired = type === 'primary' && primaryStatus !== 'active' && primaryStatus !== 'upcoming'
    
    const gradientClass = isActive 
      ? 'from-purple-600 via-indigo-600 to-blue-700'
      : isUpcoming
        ? 'from-amber-500 via-orange-500 to-amber-600'
        : 'from-gray-600 via-gray-700 to-gray-800'

    if (type === 'compact') {
      return (
        <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center group hover:border-purple-300 dark:hover:border-purple-700 transition-all relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900 dark:text-white">{sub.plan.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium uppercase tracking-wider">
                  Starts {new Date(sub.startDate).toLocaleDateString()}
                </span>
                {sub.branch.name !== (primarySub?.branch.name) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium uppercase tracking-wider flex items-center gap-1">
                    <Building className="w-3 h-3" /> New Branch
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                <span>{sub.branch.name}</span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {sub.seat?.number ? formatSeatNumber(sub.seat.number) : 'Seat assigned'}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
             <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Duration</p>
                <p className="font-medium">{sub.plan.duration} {sub.plan.durationUnit}</p>
             </div>
             {sub.payment && (
                <Button variant="ghost" size="sm" onClick={() => handleDownloadReceipt(sub)}>
                  <Download className="w-4 h-4" />
                </Button>
             )}
          </div>
        </motion.div>
      )
    }

    // Primary Card
    return (
      <motion.div variants={item} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} text-white shadow-lg shadow-purple-900/20`}>
        {/* Background Decorations */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
        
        <div className="relative p-5 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="space-y-3 flex-1 w-full">
              {/* Header: Name + Status */}
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">{sub.plan.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 border border-white/20 backdrop-blur-md shadow-sm
                  ${isActive ? 'text-green-300 border-green-300/30' : 
                    isUpcoming ? 'text-amber-200 border-amber-200/30' : 
                    'text-gray-300 border-gray-300/30'}`}>
                  {isActive ? 'Active Now' : isUpcoming ? 'Upcoming' : sub.status}
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
              {sub.plan.description && (
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
                    ₹{sub.plan.price}/{sub.plan.durationUnit.replace(/s$/, '')}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Schedule</span>
                  <span className="font-medium truncate flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {sub.plan.category === 'fixed' && sub.plan.shiftStart 
                      ? `${sub.plan.shiftStart} - ${sub.plan.shiftEnd}`
                      : sub.plan.hoursPerDay 
                        ? `${sub.plan.hoursPerDay} Hours/Day`
                        : 'Full Day Access'
                    }
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Location</span>
                  <span className="font-medium truncate flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5" />
                    {sub.branch.name}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Seat</span>
                  <span className="font-medium truncate flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    {sub.seat?.number ? `${formatSeatNumber(sub.seat.number)} ${sub.seat.section ? `(${sub.seat.section})` : ''}` : 'No Seat'}
                  </span>
                </div>

                {(sub.plan.includesLocker || sub.hasLocker) && (
                  <div className="flex flex-col gap-1">
                    <span className="text-purple-200/60 uppercase tracking-wider text-[10px]">Locker</span>
                    <span className="font-medium truncate flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      Included
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Bar & Actions Footer */}
          <div className="flex items-center gap-4 pt-3 border-t border-white/10">
            <div className="flex-1 space-y-1.5">
               <div className="flex justify-between text-sm font-medium text-purple-200/70">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(sub.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                <span className="text-purple-200/40 uppercase tracking-widest text-xs">Validity</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(sub.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              <div className="h-1.5 bg-black/20 rounded-full overflow-hidden" title={`${calculateProgress(sub.startDate, sub.endDate).toFixed(0)}% Completed`}>
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-out relative
                    ${isUrgent ? 'bg-yellow-400' : 'bg-green-400'}`}
                  style={{ width: `${calculateProgress(sub.startDate, sub.endDate)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
               {sub.payment && (
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
    )
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

      {isNewUser ? (
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
              <Button onClick={handleBookNew} size="lg" className="min-w-[240px] shadow-lg shadow-purple-500/20 text-lg py-6 bg-purple-600 hover:bg-purple-700 text-white">
                Book New Seat <ArrowRight className="w-6 h-6 ml-2" />
              </Button>
            </div>
          </AnimatedCard>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Primary Plan Section */}
          {primarySub && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  {primaryStatus === 'active' ? 'Current Active Plan' : 
                   primaryStatus === 'upcoming' ? 'Next Upcoming Plan' : 'Last Expired Plan'}
                </h2>
              </div>
              <PlanCard sub={primarySub} type="primary" />
            </div>
          )}

          {/* Queued Plans Section */}
          {displayQueue.length > 0 && (
            <motion.div variants={container} className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                Upcoming Queue <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{displayQueue.length} plans</span>
              </h2>
              <div className="space-y-1">
                {displayQueue.map((sub, index) => {
                  // Determine previous subscription for connection logic
                  // If index is 0, previous is primarySub (if it exists)
                  // If index > 0, previous is displayQueue[index-1]
                  const prevSub = index === 0 ? primarySub : displayQueue[index - 1]
                  
                  return (
                    <React.Fragment key={sub.id}>
                      {prevSub && <Connector prev={prevSub} next={sub} />}
                      <PlanCard sub={sub} type="compact" />
                    </React.Fragment>
                  )
                })}
              </div>
            </motion.div>
          )}

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
                  <h3 className="font-semibold text-gray-900 dark:text-white">Renew / Add Plan</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Extend your current seat or add a new plan to the queue.</p>
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
                  <h3 className="font-semibold text-gray-900 dark:text-white">Upgrade Plan</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Switch to a better plan or change your seat.</p>
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
              <div className="absolute top-0 right-0 w-20 h-20 bg-pink-50 dark:bg-pink-900/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="relative space-y-1.5">
                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg w-fit group-hover:scale-110 transition-transform text-pink-600 dark:text-pink-400 shadow-sm">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Explore Branches</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Check out other locations and amenities.</p>
                </div>
              </div>
            </motion.button>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}