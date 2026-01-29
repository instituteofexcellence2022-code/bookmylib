'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  TrendingUp, 
  Users, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Download,
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
  History
} from 'lucide-react'
import { differenceInDays, differenceInCalendarDays } from 'date-fns'
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
import { getDashboardStats } from '@/actions/owner/dashboard'
import { getOwnerBranches } from '@/actions/branch'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'

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
    time: string
    branch?: string
  }>
  revenueChart: Array<{ name: string; amount: number }>
  upcomingExpirations: Array<{
    id: string
    studentName: string
    studentImage: string | null
    planName: string
    endDate: string | Date
  }>
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
}

const initialData: DashboardData = {
  kpi: {
    revenue: { value: 0, trend: 0 },
    students: { value: 0, trend: 0 },
    occupancy: { value: 0, trend: 0 },
    issues: { value: 0, pending: 0 }
  },
  recentActivity: [],
  revenueChart: [],
  upcomingExpirations: [],
  attendance: { today: 0, totalActive: 0, percentage: 0 },
  revenueByMethod: [],
  alerts: []
}

const COLORS = ['#9333EA', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];


export default function OwnerDashboard() {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<DashboardData>(initialData)
  
  const [timeRange, setTimeRange] = useState('Today') // Note: API currently doesn't filter KPI by timeRange except for chart/activity potentially
  const [selectedBranch, setSelectedBranch] = useState('All Branches')
  const [branches, setBranches] = useState<{id: string, name: string}[]>([])
  const [expiredFilterDays, setExpiredFilterDays] = useState('7')
  const [expiringSoonFilterDays, setExpiringSoonFilterDays] = useState('7')

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const branchId = branches.find(b => b.name === selectedBranch)?.id
      const stats = await getDashboardStats(branchId)
      setData(stats)
    } catch (error) {
      console.error(error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [selectedBranch, branches])

  useEffect(() => {
    setIsMounted(true)
    
    // Load branches first
    const loadBranches = async () => {
      try {
        const branchList = await getOwnerBranches()
        setBranches(branchList)
      } catch (error) {
        console.error('Failed to load branches', error)
      }
    }
    loadBranches()
  }, [])

  // Fetch stats when branch changes or branches are loaded
  useEffect(() => {
    if (isMounted) {
      fetchData()
    }
  }, [fetchData, isMounted])

  const formatTrend = (trend: number) => {
    const isPositive = trend >= 0
    return (
      <div className={`flex items-center mt-2 text-xs font-medium ${isPositive ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'} px-2 py-0.5 rounded-full w-fit`}>
        {isPositive ? '+' : ''}{trend.toFixed(1)}% 
        {isPositive ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
      </div>
    )
  }

  const filteredExpired = (data.recentlyExpired || []).filter(sub => {
    const daysAgo = differenceInCalendarDays(new Date(), new Date(sub.endDate))
    
    if (expiredFilterDays === 'today') return daysAgo === 0
    if (expiredFilterDays === 'yesterday') return daysAgo === 1
    
    return daysAgo >= 0 && daysAgo <= parseInt(expiredFilterDays)
  })

  const filteredUpcoming = (data.upcomingExpirations || []).filter(sub => {
    const daysUntil = differenceInCalendarDays(new Date(sub.endDate), new Date())
    
    if (expiringSoonFilterDays === 'today') return daysUntil === 0
    if (expiringSoonFilterDays === 'tomorrow') return daysUntil === 1
    
    return daysUntil >= 0 && daysUntil <= parseInt(expiringSoonFilterDays)
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Welcome back, here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            icon={Calendar}
            options={['Today', 'This Week', 'Last Week', 'Last Month']}
            value={timeRange}
            onChange={setTimeRange}
            className="min-w-[140px] flex-shrink-0"
          />
          <FilterSelect
            icon={Building2}
            options={['All Branches', ...branches.map(b => b.name)]}
            value={selectedBranch}
            onChange={setSelectedBranch}
            className="min-w-[160px] flex-shrink-0"
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
            { label: 'Add Student', icon: UserPlus, href: '/owner/students/new', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' },
            { label: 'Add Staff', icon: Plus, href: '/owner/staff/new', color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400' },
            { label: 'New Ticket', icon: Ticket, href: '/owner/tickets/new', color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400' },
            { label: 'Broadcast', icon: Megaphone, href: '/owner/announcements', color: 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400' },
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
               <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-100 dark:border-green-900/30">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-[10px] font-medium text-green-700 dark:text-green-400 uppercase tracking-wide">Live</span>
               </div>
             </div>
             <div className="space-y-4">
               {(data.recentActivity || []).length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No recent activity.</p>
               ) : (
                   (data.recentActivity || []).map((item) => (
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
                             <span>{item.time}</span>
                             <span>•</span>
                             <span>{item.branch}</span>
                           </div>
                         </div>
                       </div>
                     </div>
                   ))
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
              <div className="space-y-3">
                {filteredUpcoming.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No upcoming expirations.</p>
                ) : (
                    filteredUpcoming.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-400">
                                {sub.studentName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.studentName}</p>
                                <p className="text-xs text-gray-500">{sub.planName}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-md">
                                {formatDate(new Date(sub.endDate))}
                              </p>
                          </div>
                        </div>
                    ))
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
            <div className="space-y-3">
              {filteredExpired.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No recently expired subscriptions.</p>
              ) : (
                filteredExpired.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-orange-400">
                        {sub.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{sub.studentName}</p>
                        <p className="text-xs text-gray-500">{sub.planName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-500">
                        {formatRelativeTime(new Date(sub.endDate))}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CompactCard>

        </div>
      </div>
    </div>
  )
}
