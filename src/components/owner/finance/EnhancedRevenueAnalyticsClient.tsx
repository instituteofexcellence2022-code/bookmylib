 'use client'
 
 import React, { useEffect, useState } from 'react'
 import { StatCard } from '@/components/ui/StatCard'
 import { ArrowUpRight, ArrowDownRight, IndianRupee, AlertTriangle, RotateCcw } from 'lucide-react'
 import { useSearchParams } from 'next/navigation'
 import { getEnhancedRevenueInsights } from '@/actions/owner/finance'
 import {
   BarChart,
   Bar,
   Line,
   ComposedChart,
   Brush,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   ResponsiveContainer
 } from 'recharts'
 
 export function EnhancedRevenueAnalyticsClient() {
   const searchParams = useSearchParams()
   const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<{
     totals: { revenue: number; previousRevenue: number; growthPercent: number; transactionCount: number; averageTransactionValue: number; refundRate: number; bestPeriod: { name: string; revenue: number; count: number } }
     pending: { amount: number; count: number }
     refunded: { amount: number; count: number }
     byBranch: { name: string; value: number }[]
     byPlan: { name: string; value: number }[]
     byMethod: { name: string; value: number }[]
     bySource: { name: string; value: number }[]
     topStudents: { name: string; value: number }[]
     timeseries: { name: string; revenue: number; count: number }[]
     byDayOfWeek: { name: string; value: number }[]
     byHourOfDay: { name: string; value: number }[]
   } | null>(null)
 
   useEffect(() => {
     async function load() {
       setLoading(true)
       const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
       const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
       const branchId = searchParams.get('branchId') || undefined
       const result = await getEnhancedRevenueInsights({ startDate, endDate, branchId })
       if (result.success && result.data) {
         setInsights(result.data)
       } else {
         setInsights(null)
       }
       setLoading(false)
     }
     load()
   }, [searchParams])
 
   const isFiltered = !!searchParams.get('startDate')
   const growthUp = (insights?.totals.growthPercent || 0) >= 0
 
  const totalRevenue = insights?.totals.revenue || 0
  const timeseries = insights?.timeseries || []
  const cumulative = timeseries.reduce<{ name: string; cumulative: number }[]>((acc, cur, idx) => {
    const prev = idx > 0 ? acc[idx - 1].cumulative : 0
    acc.push({ name: cur.name, cumulative: prev + cur.revenue })
    return acc
  }, [])
  const movingAvg = timeseries.map((_, idx) => {
    const start = Math.max(0, idx - 6)
    const span = idx - start + 1
    const sum = timeseries.slice(start, idx + 1).reduce((s, p) => s + p.revenue, 0)
    return { name: timeseries[idx].name, avg: span > 0 ? sum / span : 0 }
  })

  const PercentTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const v = Number(payload[0].value || 0)
      const pct = totalRevenue > 0 ? (v / totalRevenue) * 100 : 0
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-gray-600">₹{v.toLocaleString()} ({pct.toFixed(1)}%)</p>
        </div>
      )
    }
    return null
  }

  const TimeseriesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const revenue = Number(payload.find((p: any) => p.dataKey === 'revenue')?.value || 0)
      const count = Number(payload.find((p: any) => p.dataKey === 'count')?.value || 0)
      const avg = count > 0 ? revenue / count : 0
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-sm text-sm">
          <p className="font-medium">{label}</p>
          <p className="text-gray-600">Revenue: ₹{revenue.toLocaleString()}</p>
          <p className="text-gray-600">Transactions: {count}</p>
          <p className="text-gray-600">Avg/Txn: ₹{Math.round(avg).toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

   return (
     <div className="space-y-6">
       <div className="grid grid-cols-2 gap-3">
         <StatCard
           title={isFiltered ? 'Revenue (Selected Period)' : 'Revenue (This Month)'}
           value={`₹${(insights?.totals.revenue || 0).toLocaleString()}`}
           icon={IndianRupee}
           color="purple"
           loading={loading}
           padding="sm"
         />
         <StatCard
           title="Growth vs Previous"
           value={`${Math.abs(insights?.totals.growthPercent || 0).toFixed(1)}%`}
           icon={growthUp ? ArrowUpRight : ArrowDownRight}
           trend={`${(insights?.totals.revenue || 0) - (insights?.totals.previousRevenue || 0) >= 0 ? '+' : ''}${(((insights?.totals.revenue || 0) - (insights?.totals.previousRevenue || 0))).toLocaleString()}`}
           trendUp={growthUp}
           color={growthUp ? 'green' : 'red'}
           loading={loading}
           padding="sm"
         />
         <StatCard
           title="Pending"
           value={`₹${(insights?.pending.amount || 0).toLocaleString()}`}
           icon={AlertTriangle}
           subValue={`${insights?.pending.count || 0} transactions`}
           color="orange"
           loading={loading}
           padding="sm"
         />
         <StatCard
           title="Refunded"
           value={`₹${(insights?.refunded.amount || 0).toLocaleString()}`}
           icon={RotateCcw}
           subValue={`${insights?.refunded.count || 0} transactions`}
           color="blue"
           loading={loading}
           padding="sm"
         />
       </div>
 
       <div className="grid grid-cols-2 gap-3">
         <StatCard
           title="Transactions"
           value={`${(insights?.totals.transactionCount || 0).toLocaleString()}`}
           icon={ArrowUpRight}
           color="green"
           loading={loading}
           padding="sm"
         />
         <StatCard
           title="Avg. Transaction Value"
           value={`₹${Math.round(insights?.totals.averageTransactionValue || 0).toLocaleString()}`}
           icon={IndianRupee}
           color="blue"
           loading={loading}
           padding="sm"
         />
         <StatCard
           title="Refund Rate"
           value={`${(insights?.totals.refundRate || 0).toFixed(1)}%`}
           icon={RotateCcw}
           color="red"
           loading={loading}
           padding="sm"
         />
         <StatCard
           title="Best Period"
           value={`${insights?.totals.bestPeriod?.name || '-'}`}
           icon={ArrowUpRight}
           subValue={`₹${Math.round(insights?.totals.bestPeriod?.revenue || 0).toLocaleString()}`}
           color="purple"
           loading={loading}
           padding="sm"
         />
       </div>
 
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue & Transactions</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <ComposedChart data={timeseries}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis yAxisId="left" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <YAxis yAxisId="right" orientation="right" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <Tooltip content={<TimeseriesTooltip />} />
                 <Bar yAxisId="left" dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                 <Line yAxisId="right" type="monotone" dataKey="count" stroke="#10B981" strokeWidth={2} dot={false} />
                 <Line yAxisId="left" type="monotone" dataKey="cumulative" stroke="#6B7280" strokeWidth={1.5} dot={false} data={cumulative} />
                 <Line yAxisId="left" type="monotone" dataKey="avg" stroke="#A78BFA" strokeWidth={1.5} dot={false} data={movingAvg} />
                 <Brush dataKey="name" height={16} stroke="#4F46E5" />
               </ComposedChart>
             </ResponsiveContainer>
           </div>
         </div>
 
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Branch</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={(insights?.byBranch || []).sort((a, b) => b.value - a.value).slice(0, 8)}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <Tooltip content={<PercentTooltip />} />
                 <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
 
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Plan</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={(insights?.byPlan || []).sort((a, b) => b.value - a.value).slice(0, 8)}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <Tooltip content={<PercentTooltip />} />
                 <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
 
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Method</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={(insights?.byMethod || []).sort((a, b) => b.value - a.value).slice(0, 8)}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <Tooltip content={<PercentTooltip />} />
                 <Bar dataKey="value" fill="#F59E0B" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
 
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Source</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={(insights?.bySource || []).sort((a, b) => b.value - a.value).slice(0, 8)}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <Tooltip content={<PercentTooltip />} />
                 <Bar dataKey="value" fill="#EF4444" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
 
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Top Students</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={(insights?.topStudents || []).slice(0, 8)}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <Tooltip content={<PercentTooltip />} />
                 <Bar dataKey="value" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
 
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Day of Week</h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={insights?.byDayOfWeek || []}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <Tooltip content={<PercentTooltip />} />
                 <Bar dataKey="value" fill="#4F46E5" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
 
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
           <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Hour of Day</h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={insights?.byHourOfDay || []}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                 <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`} />
                 <Tooltip content={<PercentTooltip />} />
                 <Bar dataKey="value" fill="#10B981" radius={[6, 6, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
       </div>
     </div>
   )
 }
