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
    topStudent?: { id: string; name: string; visits: number }
    branchAvgDurations?: { name: string; avgDuration: number }[]
    avgDailyVisits?: number
  }
  dailyTrends: { date: string; count: number }[]
  hourlyDistribution: { hour: string; count: number }[]
  hourlyAvgDuration: { hour: string; avgDuration: number }[]
  branchComparison: { id: string; name: string; count: number }[]
  branchDailyStack: Array<{ [key: string]: number | string }>
  statusDistribution: { label: string; count: number }[]
  methodDistribution: { method: string; count: number }[]
}

export function AttendanceAnalyticsClient() {
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
  const [selectedBranchName, setSelectedBranchName] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const result = await getAttendanceAnalytics(days, selectedBranchId || undefined)
        if (result.success && result.data) {
          setData(result.data)
        } else {
          toast.error(result.error || 'Failed to load analytics')
        }
      } catch {
        toast.error('Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days, selectedBranchId])

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
      <div className="flex justify-between space-x-2 items-center">
        <div className="flex items-center gap-2">
          {selectedBranchId && selectedBranchName && (
            <div className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
              Branch: {selectedBranchName}
            </div>
          )}
          {selectedBranchId && (
            <button
              className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={() => { setSelectedBranchId(null); setSelectedBranchName(null) }}
            >
              Reset
            </button>
          )}
        </div>
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
          value={`${Math.floor(data.summary.avgDuration / 60)}h ${data.summary.avgDuration % 60}m`}
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
                      onClick={(data: any, index: number) => {
                        const entry = data?.payload
                        if (entry?.id && entry?.name) {
                          setSelectedBranchId(entry.id)
                          setSelectedBranchName(entry.name)
                        }
                      }}
                    >
                      {data.branchComparison.map((entry: { id: string; name: string; count: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
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
        
        {/* Branch Avg Durations + Top Student */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-orange-500" />
            Branch Avg Duration & Top Student
          </h3>
          <div className="space-y-4">
            {data.summary.branchAvgDurations && data.summary.branchAvgDurations.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.summary.branchAvgDurations.map((b, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                      <div className="text-sm font-medium">{b.name}</div>
                      <div className="text-xs text-gray-500">{Math.floor(b.avgDuration / 60)}h {b.avgDuration % 60}m</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No duration data</div>
            )}
            {data.summary.topStudent && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium">Top Student</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {data.summary.topStudent.name} • {data.summary.topStudent.visits} visits
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Daily Stack (Top 5) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-blue-500" />
            Branch Activity Over Time
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.branchDailyStack}>
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
                <Tooltip />
                {Object.keys(data.branchDailyStack[0] || {}).filter(k => k !== 'date').map((key, index) => (
                  <Bar key={key} dataKey={key} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Avg Duration */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Clock size={18} className="text-purple-500" />
            Avg Duration by Hour
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.hourlyAvgDuration}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="hour" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  interval={3}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="avgDuration" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Status Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.statusDistribution.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {data.statusDistribution.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{entry.label} ({entry.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Method Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">Method Mix</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.methodDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {data.methodDistribution.map((entry, index) => (
                    <Cell key={`method-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {data.methodDistribution.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{entry.method} ({entry.count})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
