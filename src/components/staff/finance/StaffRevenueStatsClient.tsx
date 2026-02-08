'use client'

import React, { useEffect, useState } from 'react'
import { StatCard } from '@/components/ui/StatCard'
import { DollarSign, TrendingUp, AlertCircle, Wallet } from 'lucide-react'
import { getStaffFinanceStats } from '@/actions/staff/finance'
import { toast } from 'sonner'

export function StaffRevenueStatsClient() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalCollectedByMe: 0,
    collectedTodayByMe: 0,
    branchMonthlyRevenue: 0,
    pendingAmount: 0,
    pendingCount: 0
  })

  useEffect(() => {
    async function load() {
      try {
        const result = await getStaffFinanceStats()
        if (result.success && result.data) {
          setStats(result.data)
        } else {
          toast.error(result.error || 'Failed to load finance stats')
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
    <div className="grid grid-cols-2 gap-4">
      <StatCard
        title="Collected Today"
        value={`₹${stats.collectedTodayByMe.toLocaleString()}`}
        icon={TrendingUp}
        color="green"
        loading={loading}
        padding="sm"
        subValue="By You"
      />
      <StatCard
        title="Total Collected"
        value={`₹${stats.totalCollectedByMe.toLocaleString()}`}
        icon={DollarSign}
        color="blue"
        loading={loading}
        padding="sm"
        subValue="All Time (You)"
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
        title="Branch Monthly"
        value={`₹${stats.branchMonthlyRevenue.toLocaleString()}`}
        icon={Wallet}
        color="purple"
        loading={loading}
        padding="sm"
        subValue="Total Branch Revenue"
      />
    </div>
  )
}
