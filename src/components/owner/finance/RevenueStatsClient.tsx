'use client'

import React, { useEffect, useState } from 'react'
import { StatCard } from '@/components/ui/StatCard'
import { DollarSign, TrendingUp, AlertCircle, Wallet } from 'lucide-react'
import { getFinanceStats } from '@/actions/owner/finance'
import { toast } from 'sonner'

export function RevenueStatsClient() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    monthlyTrend: 0,
    pendingAmount: 0,
    pendingCount: 0
  })

  useEffect(() => {
    async function load() {
      try {
        const result = await getFinanceStats()
        if (result.success && result.data) {
          setStats(result.data)
        }
      } catch {
        toast.error('Failed to load finance stats')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        title="Total Revenue"
        value={`₹${stats.totalRevenue.toLocaleString()}`}
        icon={DollarSign}
        color="green"
        loading={loading}
        padding="sm"
      />
      <StatCard
        title="Monthly Revenue"
        value={`₹${stats.monthlyRevenue.toLocaleString()}`}
        icon={Wallet}
        trend={`${stats.monthlyTrend.toFixed(1)}%`}
        trendUp={stats.monthlyTrend >= 0}
        color="blue"
        loading={loading}
        padding="sm"
      />
      <StatCard
        title="Pending Collections"
        value={`₹${stats.pendingAmount.toLocaleString()}`}
        icon={AlertCircle}
        subValue={`${stats.pendingCount} transactions`}
        color="orange"
        loading={loading}
        padding="sm"
      />
      <StatCard
        title="Avg. Daily Revenue"
        value={`₹${Math.round(stats.monthlyRevenue / 30).toLocaleString()}`} // Approx
        icon={TrendingUp}
        color="purple"
        loading={loading}
        padding="sm"
      />
    </div>
  )
}
