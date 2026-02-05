'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Flame, 
  MapPin, 
  Clock, 
  QrCode,
  Zap,
  BookOpen
} from 'lucide-react'
import { AnimatedCard, CompactCard } from '@/components/ui/AnimatedCard'
import { QuoteCard } from '@/components/student/QuoteCard'
import { DigitalIdCard } from '@/components/student/DigitalIdCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { useRouter } from 'next/navigation'

interface HomeClientProps {
  student: any
  stats: any
  todayAttendance: any
  quotes: any[]
  likedQuoteIds: number[]
}

import { formatSeatNumber, getGreeting } from '@/lib/utils'

export default function HomeClient({ student, stats, todayAttendance, quotes, likedQuoteIds }: HomeClientProps) {
  const router = useRouter()
  const activeSubscription = student.subscriptions[0]
  const isCheckedIn = !!todayAttendance && !todayAttendance.checkOut
  const isPending = activeSubscription?.status === 'pending'
  
  // Use pre-calculated daysLeft from server to avoid hydration mismatch
  const daysLeft = stats.daysLeft || 0

  const [greeting, setGreeting] = useState('Good Morning')

  useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  return (
    <div className="flex flex-col gap-6 pb-safe">
      {/* Greeting Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white" suppressHydrationWarning>{greeting}, {student.name.split(' ')[0]}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Ready to achieve your goals today?</p>
        </div>
        <div className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-full">
          <Flame size={16} className="fill-current" />
          <span className="text-sm font-bold">{stats.currentStreak || 0}</span>
        </div>
      </div>

      {/* Announcements */}

      {/* Daily Quote */}
      <QuoteCard quotes={quotes} initialLikedIds={likedQuoteIds} />

      {/* Main Action Card (Check-in/Out) */}
      <AnimatedCard variant="gradient" className={`bg-gradient-to-br ${
        isCheckedIn ? 'from-green-600 to-emerald-600' : 
        isPending ? 'from-amber-500 to-orange-600' :
        'from-blue-600 to-indigo-600'
      } text-white relative overflow-hidden border-none shadow-xl`}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <QrCode size={120} />
        </div>
        <div className="p-6 relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 ${isCheckedIn ? 'bg-white' : isPending ? 'bg-amber-200' : 'bg-red-400'} rounded-full animate-pulse`} />
            <span className="text-white/90 text-sm font-medium">
              {isCheckedIn 
                ? `Checked In • ${todayAttendance.branch.name}` 
                : activeSubscription 
                  ? (isPending ? `Pending Approval • ${activeSubscription.branch.name}` : `Not Checked In • ${activeSubscription.branch.name}`)
                  : 'No Active Plan'}
            </span>
          </div>
          
          <h2 className="text-2xl font-bold mb-1">
            {activeSubscription?.seat ? `Seat ${formatSeatNumber(activeSubscription.seat.number)}` : 'General Seating'}
          </h2>
          <p className="text-white/80 text-sm mb-6">
            {activeSubscription?.seat?.section || activeSubscription?.plan?.name || 'No Plan Active'}
          </p>
          
          <div className="flex gap-3">
            <AnimatedButton 
              variant="secondary" 
              size="sm" 
              className={`flex-1 bg-white ${
                isCheckedIn ? 'text-green-600 hover:bg-green-50' : 
                isPending ? 'text-amber-600 hover:bg-amber-50 cursor-not-allowed opacity-80' :
                'text-blue-600 hover:bg-blue-50'
              } shadow-lg border-transparent`}
              onClick={() => !isPending && router.push('/student/attendance/scan')}
              disabled={!activeSubscription || isPending}
            >
              {isCheckedIn ? 'Check Out' : isPending ? 'Approval Pending' : 'Check In'}
            </AnimatedButton>
            <AnimatedButton 
              variant="ghost" 
              size="sm" 
              className="bg-white/20 hover:bg-white/30 text-white dark:backdrop-blur-md border-transparent px-4"
              onClick={() => !isPending && router.push('/student/attendance/scan')}
              disabled={!activeSubscription || isPending}
            >
              <QrCode size={20} />
            </AnimatedButton>
          </div>
        </div>
      </AnimatedCard>

      {/* Live Status Widgets */}
      <div className="grid grid-cols-2 gap-4">
        <CompactCard>
          <div className="flex flex-col gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Attendance</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.monthAttendance} Days</p>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full" style={{ width: `${Math.min((stats.monthAttendance / 30) * 100, 100)}%` }} />
            </div>
          </div>
        </CompactCard>

        <CompactCard>
          <div className="flex flex-col gap-3">
            <div className={`w-8 h-8 rounded-full ${isPending ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'} flex items-center justify-center`}>
              {isPending ? <Clock size={16} /> : <Clock size={16} />}
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Plan Status</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {isPending ? 'Under Review' : `${daysLeft} Days Left`}
              </p>
            </div>
            <div className={`text-xs font-medium ${
              isPending ? 'text-amber-600 dark:text-amber-400' :
              daysLeft < 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
            }`}>
              {isPending ? 'Waiting for staff' : daysLeft < 7 ? 'Renew Now' : 'Active'}
            </div>
          </div>
        </CompactCard>
      </div>

      {/* Digital ID Card */}
      <DigitalIdCard student={student} activeSubscription={activeSubscription} />
    </div>
  )
}
