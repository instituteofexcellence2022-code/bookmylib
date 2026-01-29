'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Clock, 
  Armchair,
  IndianRupee,
  CalendarDays,
  UserPlus,
  QrCode,
  AlertCircle,
  ChevronRight,
  Receipt
} from 'lucide-react'
import { AnimatedCard, CompactCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { format } from 'date-fns'

interface DashboardStats {
  occupancyRate: number
  occupiedSeats: number
  totalSeats: number
  collectedToday: number
  dueRenewals: number
}

interface StaffAttendance {
  checkIn: Date
  checkOut: Date | null
  duration: number | null
}

interface PaymentActivity {
  id: string
  amount: number
  student: {
    name: string
  }
  createdAt: Date
  type: string
}

interface DashboardClientProps {
  staffName: string
  stats?: DashboardStats
  attendance?: StaffAttendance | null
  recentActivity?: PaymentActivity[]
}

export default function DashboardClient({ 
  staffName,
  stats,
  attendance,
  recentActivity
}: DashboardClientProps) {
  const router = useRouter()
  const isCheckedIn = attendance?.checkIn && !attendance.checkOut

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Good Morning, {staffName}</h1>
          <p className="text-gray-500 dark:text-gray-400">Here's your daily overview.</p>
        </div>
        <div className="hidden md:block">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-100 dark:border-gray-700">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Shift & Quick Actions */}
        <div className="space-y-6">
            {/* Shift Card */}
            <AnimatedCard 
                variant="gradient" 
                className={`relative overflow-hidden border-none shadow-xl ${
                    isCheckedIn 
                        ? 'bg-gradient-to-br from-green-600 to-emerald-600' 
                        : 'bg-gradient-to-br from-gray-700 to-gray-900'
                } text-white`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Clock size={80} />
                </div>
                <div className="p-5 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className={`font-medium mb-1 text-sm ${isCheckedIn ? 'text-green-100' : 'text-gray-300'}`}>
                                Shift Status
                            </h3>
                            <div className="text-2xl font-bold flex items-center gap-2">
                                {isCheckedIn ? 'On Shift' : 'Off Shift'}
                                {isCheckedIn && <span className="flex h-3 w-3 rounded-full bg-white animate-pulse" />}
                            </div>
                        </div>
                    </div>
                    
                    {isCheckedIn ? (
                        <div className="space-y-2">
                             <p className="text-sm text-green-100">
                                Checked in at {format(new Date(attendance!.checkIn), 'h:mm a')}
                             </p>
                             <AnimatedButton 
                                onClick={() => router.push('/staff/shift')}
                                variant="ghost" 
                                size="sm" 
                                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-transparent mt-2"
                            >
                                Manage Shift
                            </AnimatedButton>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-300">You haven't checked in yet.</p>
                            <AnimatedButton 
                                onClick={() => router.push('/staff/shift')}
                                variant="ghost" 
                                size="sm" 
                                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-transparent mt-2"
                            >
                                Start Shift
                            </AnimatedButton>
                        </div>
                    )}
                </div>
            </AnimatedCard>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                    <Link href="/staff/students/add" className="flex flex-col items-center justify-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400 transition-colors">
                        <UserPlus size={20} className="mb-2" />
                        <span className="text-xs font-medium">Register</span>
                    </Link>
                    <Link href="/staff/attendance" className="flex flex-col items-center justify-center p-3 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-400 transition-colors">
                        <QrCode size={20} className="mb-2" />
                        <span className="text-xs font-medium">Scan QR</span>
                    </Link>
                    <Link href="/staff/issues" className="flex flex-col items-center justify-center p-3 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 text-orange-700 dark:text-orange-400 transition-colors">
                        <AlertCircle size={20} className="mb-2" />
                        <span className="text-xs font-medium">Report Issue</span>
                    </Link>
                     <Link href="/staff/finance" className="flex flex-col items-center justify-center p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 transition-colors">
                        <Receipt size={20} className="mb-2" />
                        <span className="text-xs font-medium">Payments</span>
                    </Link>
                </div>
            </div>
        </div>

        {/* Middle & Right Column: Stats & Activity */}
        <div className="md:col-span-2 space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <CompactCard className="hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                            <Armchair size={20} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stats?.occupancyRate || 0}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            Occupancy ({stats?.occupiedSeats || 0}/{stats?.totalSeats || 0})
                        </span>
                    </div>
                </CompactCard>
                
                <CompactCard className="hover:border-green-200 dark:hover:border-green-800 transition-colors">
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-2">
                            <IndianRupee size={20} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stats ? (stats.collectedToday > 1000 ? `${(stats.collectedToday / 1000).toFixed(1)}k` : stats.collectedToday) : 0}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Collected Today</span>
                    </div>
                </CompactCard>

                <CompactCard className="col-span-2 sm:col-span-1 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                    <div className="flex flex-col items-center text-center p-2">
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                            <CalendarDays size={20} />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {stats?.dueRenewals || 0}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Due Renewals (3 Days)</span>
                    </div>
                </CompactCard>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Recent Payments</h3>
                    <Link href="/staff/finance" className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center">
                        View All <ChevronRight size={14} />
                    </Link>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentActivity && recentActivity.length > 0 ? (
                        recentActivity.map((activity) => (
                            <div key={activity.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                        <span className="text-sm font-bold text-gray-500">{activity.student.name.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white text-sm">{activity.student.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(activity.createdAt), 'h:mm a')} • {activity.type}</div>
                                    </div>
                                </div>
                                <div className="font-semibold text-green-600 dark:text-green-400 text-sm">
                                    +{formatCurrency(activity.amount)}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No recent activity found.
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
