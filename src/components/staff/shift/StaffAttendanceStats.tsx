'use client'

import React from 'react'
import { CalendarDays, Clock, Timer, CheckCircle2 } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/AnimatedCard'

interface StaffAttendanceStatsProps {
    stats: {
        totalSessions: number
        totalHours: number
        avgDurationHours: number
        fullDays: number
    } | null
}

export function StaffAttendanceStats({ stats }: StaffAttendanceStatsProps) {
    if (!stats) return null

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnimatedCard className="p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border-blue-100 dark:border-blue-800/30">
                <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                        <CalendarDays size={20} />
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">This Month</p>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.totalSessions} <span className="text-sm font-normal text-gray-500">days</span>
                    </h4>
                </div>
            </AnimatedCard>

            <AnimatedCard className="p-4 bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800 border-purple-100 dark:border-purple-800/30">
                <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
                        <Clock size={20} />
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Hours</p>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.totalHours} <span className="text-sm font-normal text-gray-500">hrs</span>
                    </h4>
                </div>
            </AnimatedCard>

            <AnimatedCard className="p-4 bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/20 dark:to-gray-800 border-orange-100 dark:border-orange-800/30">
                <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg text-orange-600 dark:text-orange-400">
                        <Timer size={20} />
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Avg Duration</p>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.avgDurationHours} <span className="text-sm font-normal text-gray-500">hrs/day</span>
                    </h4>
                </div>
            </AnimatedCard>

            <AnimatedCard className="p-4 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-gray-800 border-green-100 dark:border-green-800/30">
                <div className="flex items-start justify-between mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg text-green-600 dark:text-green-400">
                        <CheckCircle2 size={20} />
                    </div>
                </div>
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Full Days</p>
                    <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                        {stats.fullDays} <span className="text-sm font-normal text-gray-500">days</span>
                    </h4>
                </div>
            </AnimatedCard>
        </div>
    )
}
