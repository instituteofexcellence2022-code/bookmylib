'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface AttendanceHeatmapProps {
    data: { date: Date; duration: number; status?: string }[]
}

export function AttendanceHeatmap({ data }: AttendanceHeatmapProps) {
    const days = useMemo(() => {
        const today = new Date()
        const daysArray = []
        // Generate last 90 days for mobile friendliness, or more for desktop
        // Let's do roughly 3 months or 12 weeks
        const numDays = 84 // 12 weeks * 7 days
        
        for (let i = numDays - 1; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            date.setHours(0, 0, 0, 0)
            
            const dayRecords = data.filter(d => {
                const rDate = new Date(d.date)
                rDate.setHours(0, 0, 0, 0)
                return rDate.getTime() === date.getTime()
            })
            
            const totalDuration = dayRecords.reduce((acc, curr) => acc + curr.duration, 0)
            // Use the status of the longest session or 'present' if any exists
            const mainStatus = dayRecords.length > 0 ? (dayRecords.find(d => d.duration === Math.max(...dayRecords.map(r => r.duration)))?.status || 'present') : 'absent'
            
            daysArray.push({
                date,
                duration: totalDuration,
                status: mainStatus
            })
        }
        return daysArray
    }, [data])

    const getIntensityClass = (duration: number) => {
        if (duration === 0) return 'bg-gray-100 dark:bg-gray-800'
        if (duration < 120) return 'bg-green-200 dark:bg-green-900/40' // < 2 hours
        if (duration < 240) return 'bg-green-300 dark:bg-green-800/60' // < 4 hours
        if (duration < 360) return 'bg-green-400 dark:bg-green-700/80' // < 6 hours
        return 'bg-green-500 dark:bg-green-600' // > 6 hours
    }

    return (
        <div className="w-full overflow-x-auto pb-4">
            <div className="min-w-[600px] flex flex-col gap-2">
                <div className="flex text-xs text-gray-400 gap-1 mb-1">
                    <span className="w-8"></span>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <span key={i} className="flex-1 text-center">
                            W{i + 1}
                        </span>
                    ))}
                </div>
                
                <div className="grid grid-rows-7 grid-flow-col gap-1.5 h-[140px]">
                    {/* Day labels */}
                    <div className="row-span-7 flex flex-col justify-between text-[10px] text-gray-400 pr-2 py-1 h-full">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                    </div>

                    {days.map((day, i) => (
                        <TooltipProvider key={i}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: i * 0.005 }}
                                        className={cn(
                                            "w-3 h-3 rounded-sm cursor-help transition-colors",
                                            getIntensityClass(day.duration)
                                        )}
                                    />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-xs">
                                        <p className="font-semibold">{day.date.toLocaleDateString()}</p>
                                        <p>{day.duration > 0 ? `${Math.floor(day.duration / 60)}h ${day.duration % 60}m` : 'No attendance'}</p>
                                        {day.status && day.duration > 0 && <p className="capitalize text-gray-400">{day.status.replace('_', ' ')}</p>}
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 justify-end">
                <span>Less</span>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-800/60"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700/80"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600"></div>
                </div>
                <span>More</span>
            </div>
        </div>
    )
}
