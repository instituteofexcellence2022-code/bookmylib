'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
    Calendar, 
    Search, 
    Filter, 
    RefreshCw, 
    Clock,
    UserCheck,
    Users,
    MapPin,
    Edit,
    ArrowRight
} from 'lucide-react'
import Image from 'next/image'
import { format, subDays } from 'date-fns'
import { toast } from 'react-hot-toast'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { StatCard } from '@/components/ui/StatCard'
import { getStaffAttendanceLogs, getStaffAttendanceStats } from '@/actions/staff/attendance'
import { StaffEditAttendanceModal } from './StaffEditAttendanceModal'

interface Branch {
    id: string
    name: string
}

interface Student {
    name: string
    email: string
    image?: string | null
}

interface AttendanceLog {
    id: string
    checkIn: string | Date
    checkOut?: string | Date | null
    duration?: number
    status: string
    student: Student
    branch: Branch
}

interface StaffAttendanceLogsClientProps {
    defaultView?: 'day' | 'range'
}

export function StaffAttendanceLogsClient({ defaultView = 'day' }: StaffAttendanceLogsClientProps) {
    const [loading, setLoading] = useState(true)
    const [statsLoading, setStatsLoading] = useState(true)
    
    // View Mode
    const [viewMode, setViewMode] = useState<'day' | 'range'>(defaultView)

    // Filters
    const [filters, setFilters] = useState({
        status: 'all',
        date: format(new Date(), 'yyyy-MM-dd'),
        startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        search: '',
        page: 1,
        limit: 10
    })

    // Data
    const [logs, setLogs] = useState<AttendanceLog[]>([])
    const [total, setTotal] = useState(0)
    const [stats, setStats] = useState({
        totalPresent: 0,
        currentlyCheckedIn: 0,
        avgDuration: 0,
        peakHour: '-'
    })

    // Modal
    const [editingRecord, setEditingRecord] = useState<AttendanceLog | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getStaffAttendanceLogs({
                ...filters,
                date: viewMode === 'day' ? new Date(filters.date) : undefined,
                startDate: viewMode === 'range' ? new Date(filters.startDate) : undefined,
                endDate: viewMode === 'range' ? new Date(filters.endDate) : undefined,
            })
            setLogs(result.logs as unknown as AttendanceLog[])
            setTotal(result.total)
        } catch {
            toast.error('Failed to load attendance logs')
        } finally {
            setLoading(false)
        }
    }, [filters, viewMode])

    const fetchStats = useCallback(async () => {
        // Only fetch daily stats for now, even in range mode (shows stats for "End Date" or today)
        setStatsLoading(true)
        try {
            const dateToFetch = viewMode === 'day' ? new Date(filters.date) : new Date()
            const result = await getStaffAttendanceStats(dateToFetch)
            setStats(result)
        } catch (error) {
            console.error('Failed to load stats', error)
        } finally {
            setStatsLoading(false)
        }
    }, [filters.date, viewMode])

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchData()
            fetchStats()
        }, 300)
        return () => clearTimeout(timeout)
    }, [fetchData, fetchStats])

    const handleRefresh = () => {
        fetchData()
        fetchStats()
        toast.success('Refreshed')
    }

    return (
        <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex justify-end">
                <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg inline-flex">
                    <button
                        onClick={() => setViewMode('day')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                            viewMode === 'day' 
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                        }`}
                    >
                        Daily View
                    </button>
                    <button
                        onClick={() => setViewMode('range')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                            viewMode === 'range' 
                                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                        }`}
                    >
                        History Range
                    </button>
                </div>
            </div>

            {/* Stats Cards (Only show in Day View or defaulting to Today) */}
            {viewMode === 'day' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                        title="Total Present" 
                        value={stats.totalPresent} 
                        icon={Users}
                        color="blue"
                        delay={0.1}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Currently In" 
                        value={stats.currentlyCheckedIn} 
                        icon={UserCheck}
                        color="green"
                        delay={0.2}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Avg Duration" 
                        value={`${stats.avgDuration}h`} 
                        icon={Clock}
                        color="purple"
                        delay={0.3}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Peak Hour" 
                        value={stats.peakHour} 
                        icon={Users}
                        color="orange"
                        delay={0.4}
                        loading={statsLoading}
                    />
                </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto flex-1">
                    
                    {viewMode === 'day' ? (
                        <div className="w-full md:w-48">
                            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input 
                                    type="date"
                                    value={filters.date}
                                    onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value, page: 1 }))}
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2 w-full md:w-auto">
                            <div className="w-full md:w-40">
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="date"
                                        value={filters.startDate}
                                        onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center pt-6 text-gray-400">
                                <ArrowRight size={16} />
                            </div>
                            <div className="w-full md:w-40">
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="date"
                                        value={filters.endDate}
                                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="w-full md:w-40">
                         <FormSelect 
                            label="Status"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                            options={[
                                { label: 'All Status', value: 'all' },
                                { label: 'Present', value: 'present' },
                                { label: 'Full Day', value: 'full_day' },
                                { label: 'Short Session', value: 'short_session' }
                            ]}
                            icon={Filter}
                            className="text-sm py-2"
                        />
                    </div>

                    <div className="w-full md:w-64">
                        <FormInput 
                            label="Search Student"
                            icon={Search}
                            placeholder="Name..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                            className="text-sm py-2"
                        />
                    </div>
                </div>

                <div className="flex gap-2">
                    <AnimatedButton variant="outline" onClick={handleRefresh} className="h-10 w-10 p-0 flex items-center justify-center">
                        <RefreshCw size={18} />
                    </AnimatedButton>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="animate-spin w-4 h-4" /> Loading logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        No attendance records found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs relative overflow-hidden">
                                                {log.student.image ? (
                                                    <Image src={log.student.image} alt={log.student.name} fill className="object-cover" sizes="32px" />
                                                ) : (
                                                    log.student.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white text-sm">{log.student.name}</div>
                                                    <div className="text-xs text-gray-500">{log.student.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {format(new Date(log.checkIn), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">
                                            {format(new Date(log.checkIn), 'hh:mm a')}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {log.checkOut ? format(new Date(log.checkOut), 'hh:mm a') : <span className="text-green-600 dark:text-green-400 text-xs font-medium px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded-full animate-pulse">Active</span>}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${log.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                  log.status === 'short_session' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                  log.status === 'full_day' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}
                                            `}>
                                                {log.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setEditingRecord(log)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit Record"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {logs.length > 0 && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Showing {(filters.page - 1) * filters.limit + 1} to {Math.min(filters.page * filters.limit, total)} of {total} results
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                disabled={filters.page === 1}
                                className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={filters.page * filters.limit >= total}
                                className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded-md disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {editingRecord && (
                <StaffEditAttendanceModal 
                    record={editingRecord}
                    onClose={() => setEditingRecord(null)}
                    onSuccess={() => {
                        fetchData()
                        fetchStats()
                    }}
                />
            )}
        </div>
    )
}
