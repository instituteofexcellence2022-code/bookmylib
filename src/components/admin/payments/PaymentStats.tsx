'use client'

import React from 'react'
import { StatCard } from '@/components/ui/StatCard'
import { IndianRupee, Clock, AlertTriangle, TrendingUp } from 'lucide-react'

interface PaymentStatsProps {
    stats: {
        totalRevenue: number
        monthlyRevenue: number
        lastMonthRevenue: number
        pendingCount: number
        failedCount: number
    }
}

export function PaymentStats({ stats }: PaymentStatsProps) {
    // Calculate growth
    const growth = stats.lastMonthRevenue > 0 
        ? ((stats.monthlyRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue) * 100 
        : 100

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
                title="Total Revenue"
                value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`}
                icon={<IndianRupee />}
                color="blue"
                trend={`${growth.toFixed(1)}% vs last month`}
                trendUp={growth >= 0}
            />
            <StatCard
                title="This Month"
                value={`₹${stats.monthlyRevenue.toLocaleString('en-IN')}`}
                icon={<TrendingUp />}
                color="green"
                trend={`${stats.pendingCount} pending payments`}
                trendUp={true}
            />
            <StatCard
                title="Pending Payments"
                value={stats.pendingCount.toString()}
                icon={<Clock />}
                color="orange"
                className={stats.pendingCount > 0 ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10" : ""}
            />
            <StatCard
                title="Failed Payments"
                value={stats.failedCount.toString()}
                icon={<AlertTriangle />}
                color="red"
                className={stats.failedCount > 0 ? "border-red-200 bg-red-50 dark:bg-red-900/10" : ""}
            />
        </div>
    )
}
