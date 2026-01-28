'use client'

import React, { useState, useEffect } from 'react'
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
  Building2
} from 'lucide-react'
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
  ResponsiveContainer 
} from 'recharts'

// Mock Data
const revenueData = [
  { name: 'Mon', amount: 4000 },
  { name: 'Tue', amount: 3000 },
  { name: 'Wed', amount: 5000 },
  { name: 'Thu', amount: 2780 },
  { name: 'Fri', amount: 1890 },
  { name: 'Sat', amount: 6390 },
  { name: 'Sun', amount: 3490 },
]

const recentActivity = [
  { id: 1, user: 'Rahul Kumar', action: 'checked in', time: '2 min ago', branch: 'Main Branch' },
  { id: 2, user: 'Priya Singh', action: 'paid fees', time: '15 min ago', branch: 'City Center' },
  { id: 3, user: 'Amit Patel', action: 'reported issue', time: '1 hour ago', branch: 'Main Branch' },
  { id: 4, user: 'Sneha Gupta', action: 'renewed plan', time: '2 hours ago', branch: 'West Wing' },
]

const alerts = [
  { id: 1, title: 'Low Inventory', desc: 'Water bottles stock running low in Main Branch', type: 'warning' },
  { id: 2, title: 'Staff Late', desc: 'Rajesh is 15 mins late for shift', type: 'error' },
]

export default function OwnerDashboard() {
  const [isMounted, setIsMounted] = useState(false)

  const [timeRange, setTimeRange] = useState('Today')
  const [selectedBranch, setSelectedBranch] = useState('All Branches')

  useEffect(() => {
    // eslint-disable-next-line
    setIsMounted(true)
  }, [])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Welcome back, here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex gap-3">
          <FilterSelect
            icon={Calendar}
            options={['Today', 'This Week', 'Last Week', 'Last Month']}
            value={timeRange}
            onChange={setTimeRange}
            className="min-w-[140px]"
          />
          <FilterSelect
            icon={Building2}
            options={['All Branches', 'Main Branch', 'City Center']}
            value={selectedBranch}
            onChange={setSelectedBranch}
            className="min-w-[160px]"
          />
          <AnimatedButton 
            variant="ghost" 
            size="sm" 
            className="bg-purple-100 hover:bg-purple-200 border-transparent text-purple-700 w-10 h-10 p-0 rounded-lg"
            aria-label="Download Report"
            title="Download Report"
          >
            <Download className="w-5 h-5" />
          </AnimatedButton>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <CompactCard className="hover:border-green-200 dark:hover:border-green-900/50 transition-colors group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">₹1,24,500</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full w-fit">
                +12.5% <ArrowUpRight className="w-3 h-3 ml-1" />
              </div>
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">845</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full w-fit">
                +4.2% <ArrowUpRight className="w-3 h-3 ml-1" />
              </div>
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">78%</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full w-fit">
                -2.1% <ArrowDownRight className="w-3 h-3 ml-1" />
              </div>
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
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">12</h3>
              <div className="flex items-center mt-2 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full w-fit">
                3 Pending
              </div>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CompactCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2">
          <CompactCard className="h-full">
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
                  <BarChart data={revenueData}>
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
        </div>

        {/* Recent Activity & Alerts */}
        <div className="space-y-6">
          <CompactCard>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Actionable Alerts
            </h3>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors">
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${alert.type === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white leading-none">{alert.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{alert.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CompactCard>

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
              {recentActivity.map((item) => (
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
              ))}
            </div>
          </CompactCard>
        </div>
      </div>
    </div>
  )
}
