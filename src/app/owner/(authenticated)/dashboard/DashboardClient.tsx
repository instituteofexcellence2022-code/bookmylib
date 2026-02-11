'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock,
  FileText,
  Calendar,
  Building2,
  RefreshCw,
  Plus,
  UserPlus,
  Ticket,
  Megaphone,
  CreditCard,
  LogOut,
  CheckCircle2,
  History,
  Filter
} from 'lucide-react'
import { differenceInCalendarDays } from 'date-fns'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { getDashboardStats, getMoreActivities, getExpiringSubscriptions, getExpiredSubscriptions } from '@/actions/owner/dashboard'
import { toast } from 'sonner'
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils'
import Link from 'next/link'

interface SubscriptionData {
    id: string
    studentId: string
    studentName: string
    studentImage: string | null
    planName: string
    startDate: string | Date
    endDate: string | Date
    phone?: string | null
    email?: string | null
    amount?: number
    isPresentToday?: boolean
}

interface DashboardData {
  kpi: {
    revenue: { value: number; trend: number }
    students: { value: number; trend: number }
    occupancy: { value: number; trend: number }
    issues: { value: number; pending: number }
  }
  recentActivity: Array<{
    id: string
    type: string
    user: string
    action: string
    time: string | Date
    branch?: string
  }>
  revenueChart: Array<{ name: string; amount: number }>
  upcomingExpirations: Array<SubscriptionData>
  attendance: {
    today: number
    totalActive: number
    percentage: number
  }
  revenueByMethod: Array<{ name: string; value: number }>
  alerts: Array<{
    id: string
    type: 'error' | 'warning' | 'info'
    title: string
    desc: string
  }>
  recentlyExpired: Array<SubscriptionData>
}

const defaultInitialData: DashboardData = {
  kpi: {
    revenue: { value: 0, trend: 0 },
    students: { value: 0, trend: 0 },
    occupancy: { value: 0, trend: 0 },
    issues: { value: 0, pending: 0 }
  },
  recentActivity: [],
  revenueChart: [],
  upcomingExpirations: [],
  recentlyExpired: [],
  attendance: { today: 0, totalActive: 0, percentage: 0 },
  revenueByMethod: [],
  alerts: []
}

const COLORS = ['#9333EA', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

type DashboardTimeRange = 'Today' | 'Yesterday' | 'This Week' | 'Last Week' | 'This Month' | 'Last Month' | 'Custom Range'

const WhatsAppButton = ({ phone, name, type, startDate, endDate, planName, isPresentToday }: { phone?: string | null, name: string, type?: 'expiring' | 'expired', startDate?: string | Date, endDate?: string | Date, planName?: string, isPresentToday?: boolean }) => {
  if (!phone) return null;
  const cleanPhone = phone.replace(/\D/g, '')
  
  let message = `Hi ${name},`
  const startStr = startDate ? formatDate(new Date(startDate)) : ''
  const endStr = endDate ? formatDate(new Date(endDate)) : ''

  if (type === 'expiring' && endDate) {
      if (isPresentToday) {
          message = `Hi ${name}! 👋 Great to see you at the library today! Just a heads-up that your ${planName || 'library'} subscription (started: ${startStr}) is expiring on ${endStr}. Since you're here, why not renew it at the desk? 📚✨`
      } else {
          message = `Hello ${name}! 👋 We hope you're having a productive time at our library. Just a gentle reminder that your ${planName || 'library'} subscription (started: ${startStr}) is set to expire on ${endStr}. We'd love to keep supporting your studies! Please renew soon to avoid any interruption. 📚✨`
      }
  } else if (type === 'expired' && endDate) {
      if (isPresentToday) {
          message = `Hi ${name}! 👋 We see you're at the library today - that's dedication! Your ${planName || 'library'} subscription expired on ${endStr}. Please renew it to avoid interruption to your access. Keep up the good work! 📚✨`
      } else {
          const daysSinceExpiry = differenceInCalendarDays(new Date(), new Date(endDate))
          
          if (daysSinceExpiry <= 3) {
              message = `Hi ${name}, your ${planName || 'library'} subscription ended on ${endStr}. Hope you had a great run! Renew soon to keep your study momentum going. 📚`
          } else if (daysSinceExpiry <= 7) {
              message = `Hello ${name}, it's been a few days since your ${planName || 'library'} subscription expired (${endStr}). We miss your energy! Come back and reclaim your focus. 🚀`
          } else if (daysSinceExpiry <= 30) {
              message = `Hi ${name}, your ${planName || 'library'} subscription expired on ${endStr}. Hope you're doing well! We're ready to support your next study goal whenever you are. 📖`
          } else {
              message = `Hello ${name}, it's been over a month since your ${planName || 'library'} subscription ended. We'd love to see you back at the library to crush your goals! ✨`
          }
      }
  }

  return (
    <a 
      href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 p-1 rounded-full transition-colors"
      title="Chat on WhatsApp"
      onClick={(e) => e.stopPropagation()}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
    </a>
  )
}

export default function DashboardClient({ 
  initialData, 
  initialBranches 
}: { 
  initialData: DashboardData | null, 
  initialBranches: {id: string, name: string}[] 
}) {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DashboardData>(initialData || defaultInitialData)
  
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('Today')
  const [selectedBranch, setSelectedBranch] = useState('All Branches')
  const [branches, setBranches] = useState<{id: string, name: string}[]>(initialBranches)
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  
  // Tab State
  const [expiringSoonFilterDays, setExpiringSoonFilterDays] = useState('3')
  const [expiredFilterDays, setExpiredFilterDays] = useState('3')
  
  const [expiringList, setExpiringList] = useState<SubscriptionData[]>(initialData?.upcomingExpirations || [])
  const [isExpiringLoading, setIsExpiringLoading] = useState(false)
  const [expiringPage, setExpiringPage] = useState(1)
  const [expiringHasMore, setExpiringHasMore] = useState(true)

  const [expiredList, setExpiredList] = useState<SubscriptionData[]>(initialData?.recentlyExpired || [])
  const [isExpiredLoading, setIsExpiredLoading] = useState(false)
  const [expiredPage, setExpiredPage] = useState(1)
  const [expiredHasMore, setExpiredHasMore] = useState(true)

  const [activityFilter, setActivityFilter] = useState('All')

  // Activity Feed State
  const [activities, setActivities] = useState<DashboardData['recentActivity']>(initialData?.recentActivity || [])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState((initialData?.recentActivity.length || 0) >= 50)

  const isFirstRender = useRef(true)

  const fetchExpiring = useCallback(async (reset = false) => {
    const page = reset ? 1 : expiringPage
    if (!reset && (isExpiringLoading || !expiringHasMore)) return

    setIsExpiringLoading(true)
    try {
        const branchId = branches.find(b => b.name === selectedBranch)?.id
        const result = await getExpiringSubscriptions(expiringSoonFilterDays, page, 30, branchId)
        if (result.success && result.data) {
            setExpiringList(prev => reset ? result.data : [...prev, ...result.data])
            setExpiringHasMore(result.hasMore || false)
            if (!reset) setExpiringPage(prev => prev + 1)
            if (reset) setExpiringPage(2) 
        }
    } catch (error) {
        console.error(error)
        toast.error('Failed to load expiring subscriptions')
    } finally {
        setIsExpiringLoading(false)
    }
  }, [selectedBranch, branches, expiringSoonFilterDays, expiringPage, isExpiringLoading, expiringHasMore])

  const fetchExpired = useCallback(async (reset = false) => {
    const page = reset ? 1 : expiredPage
    if (!reset && (isExpiredLoading || !expiredHasMore)) return

    setIsExpiredLoading(true)
    try {
        const branchId = branches.find(b => b.name === selectedBranch)?.id
        const result = await getExpiredSubscriptions(expiredFilterDays, page, 30, branchId)
        if (result.success && result.data) {
            setExpiredList(prev => reset ? result.data : [...prev, ...result.data])
            setExpiredHasMore(result.hasMore || false)
            if (!reset) setExpiredPage(prev => prev + 1)
            if (reset) setExpiredPage(2)
        }
    } catch (error) {
        console.error(error)
        toast.error('Failed to load expired subscriptions')
    } finally {
        setIsExpiredLoading(false)
    }
  }, [selectedBranch, branches, expiredFilterDays, expiredPage, isExpiredLoading, expiredHasMore])

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const branchId = branches.find(b => b.name === selectedBranch)?.id
      const startArg = timeRange === 'Custom Range' && customStart ? new Date(customStart) : undefined
      const endArg = timeRange === 'Custom Range' && customEnd ? new Date(customEnd) : undefined
      const result = await getDashboardStats(branchId, timeRange as any, startArg, endArg)
      if (result.success && result.data) {
        setData(result.data)
        setActivities(result.data.recentActivity)
        setHasMore(result.data.recentActivity.length >= 50)
        
        // Also refresh lists based on new data if needed, or rely on separate calls?
        // Actually, getDashboardStats returns upcomingExpirations and recentlyExpired too (first page).
        // So we should update those too.
        setExpiringList(result.data.upcomingExpirations)
        setExpiredList(result.data.recentlyExpired)
        setExpiringPage(1)
        setExpiredPage(1)
      } else {
        toast.error(result.error || 'Failed to load dashboard data')
      }
    } catch (error) {
      console.error(error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [selectedBranch, branches, timeRange, customStart, customEnd])

  // Effects for Tabs
  useEffect(() => {
    if (isMounted) fetchExpiring(true)
  }, [expiringSoonFilterDays, isMounted]) // Removed selectedBranch dependency to avoid double fetch with fetchData

  useEffect(() => {
    if (isMounted) fetchExpired(true)
  }, [expiredFilterDays, isMounted])

  const loadMoreActivities = async () => {
    if (isLoadingMore || !hasMore || activities.length === 0) return

    setIsLoadingMore(true)
    try {
        const lastActivity = activities[activities.length - 1]
        const lastTime = new Date(lastActivity.time).toISOString()
        const branchId = branches.find(b => b.name === selectedBranch)?.id
        
        const result = await getMoreActivities(lastTime, branchId)
        
        if (result.success && result.data) {
            if (result.data.length < 50) {
                setHasMore(false)
            }
            setActivities(prev => [...prev, ...result.data])
        } else {
            setHasMore(false)
        }
    } catch (error) {
        console.error('Failed to load more activities', error)
        toast.error('Failed to load more activities')
    } finally {
        setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Fetch stats when branch changes
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false
        return
    }
    fetchData()
  }, [selectedBranch, fetchData]) // Only fetch when branch changes (after first render)

  // Refetch when time range changes
  useEffect(() => {
    if (isMounted) {
      fetchData()
    }
  }, [timeRange, isMounted, fetchData])

  useEffect(() => {
    if (isMounted && timeRange === 'Custom Range' && customStart && customEnd) {
      fetchData()
    }
  }, [customStart, customEnd, timeRange, isMounted, fetchData])

  const formatTrend = (trend: number) => {
    const isPositive = trend >= 0
    return (
      <div className={`flex items-center mt-2 text-xs font-medium ${isPositive ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'} px-2 py-0.5 rounded-full w-fit`}>
        {isPositive ? '+' : ''}{trend.toFixed(1)}% 
        {isPositive ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
      </div>
    )
  }

  const filteredActivity = (activities || []).filter(item => {
    if (activityFilter === 'All') return true
    if (activityFilter === 'Check In') return item.type === 'attendance' && item.action === 'checked in'
    if (activityFilter === 'Out') return item.type === 'attendance' && item.action === 'checked out'
    if (activityFilter === 'Payment') return item.type === 'payment'
    if (activityFilter === 'Issue') return item.type === 'ticket'
    if (activityFilter === 'Other') return !['attendance', 'payment', 'ticket'].includes(item.type)
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Welcome back, here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <FilterSelect
            icon={Calendar}
            options={['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Last Month', 'Custom Range']}
            value={timeRange}
            onChange={(v) => setTimeRange(v as DashboardTimeRange)}
            className="flex-1 md:min-w-[140px] md:flex-none"
          />
          {timeRange === 'Custom Range' && (
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={customStart} 
                onChange={(e) => setCustomStart(e.target.value)} 
                className="text-xs border bg-white dark:bg-gray-800 rounded-md px-2 py-1 outline-none"
              />
              <span className="text-xs text-gray-500">to</span>
              <input 
                type="date" 
                value={customEnd} 
                onChange={(e) => setCustomEnd(e.target.value)} 
                className="text-xs border bg-white dark:bg-gray-800 rounded-md px-2 py-1 outline-none"
              />
            </div>
          )}
          <FilterSelect
            icon={Building2}
            options={['All Branches', ...branches.map(b => b.name)]}
            value={selectedBranch}
            onChange={setSelectedBranch}
            className="flex-1 md:min-w-[120px] md:flex-none"
          />
          <AnimatedButton 
            variant="ghost" 
            size="sm" 
            onClick={fetchData}
            className="bg-purple-100 hover:bg-purple-200 border-transparent text-purple-700 w-10 h-10 p-0 rounded-lg flex-shrink-0"
            aria-label="Refresh Data"
            title="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </AnimatedButton>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
            { label: 'Add Student', icon: UserPlus, href: '/owner/students/add', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
            { label: 'Add Staff', icon: Plus, href: '/owner/staff/add', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
            { label: 'Create Booking', icon: Calendar, href: '/owner/bookings?view=create&tab=existing', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' },
            { label: 'Verify', icon: FileText, href: '/owner/verification', color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400' },
            { label: 'New Ticket', icon: Ticket, href: '/owner/issues', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
            { label: 'Broadcast', icon: Megaphone, href: '/owner/marketing', color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400' },
        ].map((action) => (
            <Link key={action.label} href={action.href} className="block group">
                <CompactCard className="hover:border-purple-200 dark:hover:border-purple-900/50 transition-all cursor-pointer hover:shadow-md py-4 px-4 h-full">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg transition-transform group-hover:scale-110 ${action.color}`}>
                            <action.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{action.label}</span>
                    </div>
                </CompactCard>
            </Link>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <CompactCard className="hover:border-green-200 dark:hover:border-green-900/50 transition-colors group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                {formatCurrency(data.kpi.revenue.value)}
              </h3>
              {formatTrend(data.kpi.revenue.trend)}
            </div>
            <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CompactCard>

        <CompactCard className="hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Students</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {data.kpi.students.value}
              </h3>
              {formatTrend(data.kpi.students.trend)}
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CompactCard>

        <CompactCard className="hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Occupancy</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {data.kpi.occupancy.value}%
              </h3>
              {formatTrend(data.kpi.occupancy.trend)}
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CompactCard>

        <CompactCard className="hover:border-amber-200 dark:hover:border-amber-900/50 transition-colors group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open Issues</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {data.kpi.issues.value}
              </h3>
              <div className="flex items-center mt-2 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full w-fit">
                {data.kpi.issues.pending} Pending
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CompactCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Chart */}
        <div className="lg:col-span-2 space-y-6">
          <CompactCard>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Revenue Analytics</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Monthly revenue overview</p>
              </div>
              <AnimatedButton 
                variant="ghost" 
                size="sm" 
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 w-9 h-9 p-0 rounded-lg"
                aria-label="View Full Report"
                title="View Full Report"
              >
                <FileText className="w-5 h-5" />
              </AnimatedButton>
            </div>
            <div className="h-[300px] w-full">
              {isMounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}

                    />
                    <Bar 
                      dataKey="amount" 
                      fill="#9333EA" 
                      radius={[4, 4, 0, 0]}
                      barSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="animate-pulse w-full h-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
                </div>
              )}
            </div>
          </CompactCard>

          {/* Recent Activity */}
          <CompactCard>
             <div className="flex items-center justify-between mb-4">
               <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                 <Clock className="w-4 h-4 text-blue-500" />
                 Live Feed
               </h3>
               <div className="flex items-center gap-2">
                 <FilterSelect
                    icon={Filter}
                    options={['All', 'Check In', 'Out', 'Payment', 'Issue', 'Other']}
                    value={activityFilter}
                    onChange={setActivityFilter}
                    className="w-[120px]"
                 />
                 <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-100 dark:border-green-900/30">
                   <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Live</span>
                 </div>
               </div>
             </div>
             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
               {filteredActivity.length === 0 && !isLoadingMore ? (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity.</p>
               ) : (
                   <>
                       {filteredActivity.map((item) => (
                         <div key={item.id} className="group flex items-center justify-between p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                               {item.user.charAt(0)}
                             </div>
                             <div>
                               <p className="text-sm text-gray-900 dark:text-white">
                                 <span className="font-semibold">{item.user}</span> <span className="text-gray-500 dark:text-gray-400 font-normal">{item.action}</span>
                               </p>
                               <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                                 <span>{formatRelativeTime(new Date(item.time))}</span>
                                 <span>•</span>
                                 <span>{item.branch}</span>
                               </div>
                             </div>
                           </div>
                         </div>
                       ))}
                       
                       {hasMore && (
                           <div className="pt-2 text-center">
                               <AnimatedButton
                                   variant="ghost"
                                   size="sm"
                                   onClick={loadMoreActivities}
                                   disabled={isLoadingMore}
                                   className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 w-full"
                               >
                                   {isLoadingMore ? (
                                       <span className="flex items-center justify-center gap-2">
                                           <RefreshCw className="w-3 h-3 animate-spin" />
                                           Loading...
                                       </span>
                                   ) : (
                                       'Load More'
                                   )}
                               </AnimatedButton>
                           </div>
                       )}
                   </>
               )}
             </div>
          </CompactCard>
        </div>

        {/* Right Column - Widgets */}
        <div className="space-y-8">
          
          {/* Attendance Widget */}
          <CompactCard className="relative overflow-hidden">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Today&apos;s Attendance
              </h3>
              <div className="flex flex-wrap items-end justify-between mb-2 gap-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{data.attendance.today}</span>
                <span className="text-sm text-gray-500 whitespace-nowrap">of {data.attendance.totalActive} active</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                <div className="bg-green-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.min(data.attendance.percentage, 100)}%` }}></div>
              </div>
              <p className="text-xs text-right mt-2 text-gray-500 font-medium">{data.attendance.percentage}% Present</p>
          </CompactCard>

          {/* Revenue Distribution */}
          <CompactCard className="relative">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-purple-500" />
                Payment Methods
              </h3>
              <div className="h-[320px] w-full">
                {isMounted && data.revenueByMethod.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                          <Pie
                              data={data.revenueByMethod}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={70}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {data.revenueByMethod.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                              ))}
                          </Pie>
                          <Tooltip 
                              formatter={(value) => formatCurrency(Number(value))}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 50 }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            align="center" 
                            iconType="circle" 
                            height={36}
                            wrapperStyle={{ fontSize: '12px' }} 
                          />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-400">
                        No payment data
                    </div>
                )}
              </div>
          </CompactCard>

          {/* Actionable Alerts */}
          <CompactCard>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Actionable Alerts
            </h3>
            <div className="space-y-3">
              {(data.alerts || []).map((alert) => (
                <div key={alert.id} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${alert.type === 'error' ? 'bg-red-500' : alert.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-none">{alert.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CompactCard>

          {/* Upcoming Expirations */}
          <CompactCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-red-500" />
                  Expiring Soon
                </h3>
                <select
                  value={expiringSoonFilterDays}
                  onChange={(e) => setExpiringSoonFilterDays(e.target.value)}
                  className="text-xs border-none bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 focus:ring-0 cursor-pointer outline-none"
                >
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="3">Next 3 days</option>
                  <option value="7">Next 7 days</option>
                  <option value="15">Next 15 days</option>
                  <option value="30">Next 30 days</option>
                </select>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {expiringList.length === 0 && !isExpiringLoading ? (
                    <p className="text-sm text-gray-500 text-center py-4">No upcoming expirations.</p>
                ) : (
                    <>
                        {expiringList.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-3">
                                  <Link href={`/owner/students/${sub.studentId}`} className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-400 hover:opacity-80 transition-opacity">
                                    {sub.studentName.charAt(0)}
                                  </Link>
                                  <div>
                                    <div className="flex items-center gap-2">
                                        <Link href={`/owner/students/${sub.studentId}`} className="text-sm font-medium text-gray-900 dark:text-white hover:underline">
                                            {sub.studentName}
                                        </Link>
                                        <WhatsAppButton 
                                            phone={sub.phone} 
                                            name={sub.studentName} 
                                            type="expiring"
                                            startDate={sub.startDate}
                                            endDate={sub.endDate}
                                            planName={sub.planName}
                                            isPresentToday={sub.isPresentToday}
                                         />
                                    </div>
                                    <p className="text-xs text-gray-500">{sub.phone || sub.email || 'No contact'}</p>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <p className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md inline-block mb-1">
                                    {formatDate(new Date(sub.endDate))}
                                  </p>
                                  <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                                    <span>{sub.planName}</span>
                                    {sub.amount !== undefined && (
                                       <span className="font-medium text-gray-900 dark:text-gray-300">
                                         • {formatCurrency(sub.amount)}
                                       </span>
                                    )}
                                  </div>
                              </div>
                            </div>
                        ))}
                        {expiringHasMore && (
                            <div className="pt-2 text-center">
                                <AnimatedButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => fetchExpiring(false)}
                                    disabled={isExpiringLoading}
                                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 w-full"
                                >
                                    {isExpiringLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            Loading...
                                        </span>
                                    ) : (
                                        'Load More'
                                    )}
                                </AnimatedButton>
                            </div>
                        )}
                    </>
                )}
              </div>
          </CompactCard>

          {/* Recently Expired */}
          <CompactCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-orange-500" />
                Recently Expired
              </h3>
              <select
                value={expiredFilterDays}
                onChange={(e) => setExpiredFilterDays(e.target.value)}
                className="text-xs border-none bg-gray-100 dark:bg-gray-800 rounded-md px-2 py-1 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="3">Last 3 days</option>
                <option value="7">Last 7 days</option>
                <option value="15">Last 15 days</option>
                <option value="30">Last 30 days</option>
              </select>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {expiredList.length === 0 && !isExpiredLoading ? (
                <p className="text-sm text-gray-500 text-center py-4">No recently expired subscriptions.</p>
              ) : (
                <>
                    {expiredList.map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <Link href={`/owner/students/${sub.studentId}`} className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-400 hover:opacity-80 transition-opacity">
                            {sub.studentName.charAt(0)}
                          </Link>
                          <div>
                            <div className="flex items-center gap-2">
                                <Link href={`/owner/students/${sub.studentId}`} className="text-sm font-medium text-gray-900 dark:text-white hover:underline">
                                    {sub.studentName}
                                </Link>
                                <WhatsAppButton 
                                     phone={sub.phone} 
                                     name={sub.studentName} 
                                     type="expired"
                                      startDate={sub.startDate}
                                      endDate={sub.endDate}
                                      planName={sub.planName}
                                      isPresentToday={sub.isPresentToday}
                                  />
                            </div>
                            <p className="text-xs text-gray-500">{sub.phone || sub.email || 'No contact'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-gray-500 inline-block mb-1">
                            {formatRelativeTime(new Date(sub.endDate))}
                          </p>
                          <div className="flex items-center justify-end gap-1 text-xs text-gray-500">
                            <span>{sub.planName}</span>
                            {sub.amount !== undefined && (
                               <span className="font-medium text-gray-900 dark:text-gray-300">
                                 • {formatCurrency(sub.amount)}
                               </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {expiredHasMore && (
                        <div className="pt-2 text-center">
                            <AnimatedButton
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchExpired(false)}
                                disabled={isExpiredLoading}
                                className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 w-full"
                            >
                                {isExpiredLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        Loading...
                                    </span>
                                ) : (
                                    'Load More'
                                )}
                            </AnimatedButton>
                        </div>
                    )}
                </>
              )}
            </div>
          </CompactCard>

        </div>
      </div>
    </div>
  )
}
