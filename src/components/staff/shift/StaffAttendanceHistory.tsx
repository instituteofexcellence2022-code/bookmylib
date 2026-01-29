'use client'

import React from 'react'
import { format } from 'date-fns'
import { Clock, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { cn } from '@/lib/utils'

interface AttendanceRecord {
    id: string
    date: Date
    checkIn: Date
    checkOut: Date | null
    duration: number | null
    status: string
}

interface StaffAttendanceHistoryProps {
    history: AttendanceRecord[]
}

export function StaffAttendanceHistory({ history }: StaffAttendanceHistoryProps) {
    if (!history || history.length === 0) {
        return (
            <AnimatedCard className="p-6">
                <div className="text-center py-8">
                    <div className="bg-gray-100 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Attendance History</h3>
                    <p className="text-sm text-gray-500">Your attendance records will appear here.</p>
                </div>
            </AnimatedCard>
        )
    }

    return (
        <AnimatedCard className="overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock size={20} className="text-purple-500" />
                    Attendance History
                </h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800/50 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-medium">Date</th>
                            <th className="px-6 py-4 font-medium">Check In</th>
                            <th className="px-6 py-4 font-medium">Check Out</th>
                            <th className="px-6 py-4 font-medium">Duration</th>
                            <th className="px-6 py-4 font-medium text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {history.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                    {format(new Date(record.date), 'MMM d, yyyy')}
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        {format(new Date(record.checkIn), 'h:mm a')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                    {record.checkOut ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            {format(new Date(record.checkOut), 'h:mm a')}
                                        </div>
                                    ) : (
                                        <span className="text-orange-500 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 rounded-full w-fit">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></div>
                                            Active
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                    {record.duration ? (
                                        <span>
                                            {Math.floor(record.duration / 60)}h {record.duration % 60}m
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={cn(
                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                        record.status === 'present' 
                                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30"
                                            : record.status === 'half_day' || record.status === 'short_session'
                                                ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900/30"
                                                : "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                                    )}>
                                        {record.status === 'present' ? 'Present' : 
                                         record.status === 'half_day' ? 'Half Day' :
                                         record.status === 'short_session' ? 'Short Session' : 
                                         record.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AnimatedCard>
    )
}
