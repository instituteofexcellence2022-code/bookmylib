'use client'

import React, { useState, useEffect } from 'react'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Users, 
  Clock, 
  CalendarDays, 
  TrendingUp, 
  Loader2 
} from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import { getAttendanceAnalytics } from '@/actions/owner/attendance'
import { toast } from 'sonner'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d']

interface AnalyticsData {
  summary: {
    totalVisits: number
    attendanceRate: number
    uniqueStudents: number
    avgDuration: number
    avgDailyVisits?: number
  }
  dailyTrends: { date: string; count: number }[]
  hourlyDistribution: { hour: string; count: number }[]
  branchComparison: { name: string; count: number }[]
}

export function AttendanceAnalyticsClient() {
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await getAttendanceAnalytics(days)
        setData(result)
      } catch {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex justify-end space-x-2">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 3 Months</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Visits"
          value={data.summary.totalVisits}
          icon={Users}
          trend={`${data.summary.attendanceRate} / day`}
          trendUp={true}
          color="blue"
        />
        <StatCard
          title="Unique Students"
          value={data.summary.uniqueStudents}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Avg Duration"
          value={`${data.summary.avgDuration} min`}
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Avg Daily Visits"
          value={data.summary.attendanceRate}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-500" />
            Attendance Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.dailyTrends}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-purple-500" />
            Peak Hours
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  interval={3} // Show every 3rd hour to avoid clutter
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Comparison */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-green-500" />
            Visits by Branch
          </h3>
          <div className="h-64">
             {data.branchComparison.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.branchComparison}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {data.branchComparison.map((entry: { name: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                    No data available
                </div>
             )}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {data.branchComparison.map((entry: { name: string; count: number }, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{entry.name} ({entry.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
