'use client'

import React from 'react'
import { Calendar, Clock, MapPin } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/AnimatedCard'

interface StaffShift {
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
}

interface StaffShiftScheduleProps {
    shifts: StaffShift[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function StaffShiftSchedule({ shifts }: StaffShiftScheduleProps) {
    if (shifts.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Shifts Assigned</h3>
                <p className="text-gray-500 mt-1">You don&apos;t have any active shifts assigned yet.</p>
            </div>
        )
    }

    // Sort shifts by day starting from today
    const today = new Date().getDay()
    const sortedShifts = [...shifts].sort((a, b) => {
        const diffA = (a.dayOfWeek - today + 7) % 7
        const diffB = (b.dayOfWeek - today + 7) % 7
        return diffA - diffB
    })

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Calendar size={20} className="text-blue-500" />
                Your Weekly Schedule
            </h3>

            <div className="space-y-4">
                {sortedShifts.map((shift) => {
                    const isToday = shift.dayOfWeek === today
                    return (
                        <div 
                            key={shift.id} 
                            className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                                isToday 
                                    ? 'bg-blue-50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30' 
                                    : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                                    isToday 
                                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                                        : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                                }`}>
                                    {DAYS[shift.dayOfWeek].substring(0, 3)}
                                </div>
                                <div>
                                    <h4 className={`font-medium ${isToday ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'}`}>
                                        {DAYS[shift.dayOfWeek]}
                                        {isToday && <span className="ml-2 text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-800 dark:text-blue-300">Today</span>}
                                    </h4>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {shift.startTime} - {shift.endTime}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                isToday 
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                                {isToday ? 'Active' : 'Scheduled'}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
