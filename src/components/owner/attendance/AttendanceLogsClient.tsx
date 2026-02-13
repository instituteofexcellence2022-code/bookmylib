'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
    ChevronDown,
    ChevronUp
} from 'lucide-react'
import Image from 'next/image'
import { format, subDays } from 'date-fns'
import { toast } from 'react-hot-toast'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { StatCard } from '@/components/ui/StatCard'
import { getOwnerAttendanceLogs, getOwnerAttendanceStats, updateAttendanceRecord } from '@/actions/owner/attendance'
import { getOwnerBranches } from '@/actions/branch'
import { EditAttendanceModal } from './EditAttendanceModal'
import { AddAttendanceModal } from './AddAttendanceModal'

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
    overstayMinutes?: number
    newUser?: boolean
    status: string
    method?: string | null
    remarks?: string | null
    student: Student
    branch: Branch
}

interface AttendanceLogsClientProps {
    defaultView?: 'day' | 'range'
}

export function AttendanceLogsClient({ defaultView = 'day' }: AttendanceLogsClientProps) {
    const [loading, setLoading] = useState(true)
    const [statsLoading, setStatsLoading] = useState(true)
    const [branches, setBranches] = useState<Branch[]>([])
    
    // View Mode
    const [viewMode, setViewMode] = useState<'day' | 'range'>(defaultView)

    // Filters
    const [filters, setFilters] = useState({
        branchId: '',
        status: 'all',
        date: format(new Date(), 'yyyy-MM-dd'),
        startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '',
        endTime: '',
        search: '',
        page: 1,
        limit: 10,
        durationMin: '',
        durationMax: ''
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
    const [adding, setAdding] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})
    const grouped = useMemo(() => {
        const map = new Map<string, {
            key: string
            student: Student
            dateKey: string
            branchName: string
            startTime: Date
            endTime: Date | null
            totalDuration: number
            sessions: AttendanceLog[]
            hasActive: boolean
            totalOverstay: number
        }>()
        logs.forEach(log => {
            const d = new Date(log.checkIn)
            const dateKey = format(d, 'yyyy-MM-dd')
            const stuKey = `${(log.student as any).email || log.student.name}-${dateKey}`
            const existing = map.get(stuKey)
            const durationVal = typeof log.duration === 'number' ? log.duration : 0
            const overstayVal = typeof log.overstayMinutes === 'number' ? log.overstayMinutes : 0
            const branchName = log.branch?.name || 'Unknown'
            if (!existing) {
                map.set(stuKey, {
                    key: stuKey,
                    student: log.student,
                    dateKey,
                    branchName,
                    startTime: new Date(log.checkIn),
                    endTime: log.checkOut ? new Date(log.checkOut) : null,
                    totalDuration: durationVal,
                    sessions: [log],
                    hasActive: !log.checkOut,
                    totalOverstay: overstayVal
                })
            } else {
                existing.startTime = new Date(Math.min(existing.startTime.getTime(), new Date(log.checkIn).getTime()))
                const eo = log.checkOut ? new Date(log.checkOut) : null
                if (eo) {
                    if (!existing.endTime || eo.getTime() > existing.endTime.getTime()) existing.endTime = eo
                }
                existing.totalDuration += durationVal
                existing.sessions.push(log)
                existing.hasActive = existing.hasActive || !log.checkOut
                if (existing.branchName !== branchName) existing.branchName = 'Multiple'
                existing.totalOverstay += overstayVal
            }
        })
        const rows = Array.from(map.values())
        rows.forEach(entry => {
            entry.sessions.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime())
            if (entry.sessions.length > 0) {
                entry.startTime = new Date(entry.sessions[0].checkIn)
                const last = entry.sessions[entry.sessions.length - 1]
                entry.endTime = last.checkOut ? new Date(last.checkOut) : null
            }
        })
        return rows.sort((a, b) => {
            if (a.dateKey === b.dateKey) return a.student.name.localeCompare(b.student.name)
            return b.dateKey.localeCompare(a.dateKey)
        })
    }, [logs])

    const toggleRow = (key: string) => {
        setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }))
    }
    useEffect(() => {
        setExpandedRows(prev => {
            const next: Record<string, boolean> = { ...prev }
            grouped.forEach(r => {
                if (typeof prev[r.key] === 'undefined') {
                    next[r.key] = r.sessions.length > 1
                }
            })
            return next
        })
    }, [grouped])
    const fetchBranches = useCallback(async () => {
        try {
            const result = await getOwnerBranches()
            if (result.success && result.data) {
                setBranches(result.data)
            }
        } catch (error) {
            console.error('Failed to fetch branches', error)
        }
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getOwnerAttendanceLogs({
                ...filters,
                date: viewMode === 'day' ? new Date(filters.date) : undefined,
                startDate: viewMode === 'range' ? new Date(filters.startDate) : undefined,
                endDate: viewMode === 'range' ? new Date(filters.endDate) : undefined,
                durationMin: filters.durationMin ? Number(filters.durationMin) : undefined,
                durationMax: filters.durationMax ? Number(filters.durationMax) : undefined,
            })
            if (result.success && result.data) {
                setLogs(result.data.logs as unknown as AttendanceLog[])
                setTotal(result.data.total)
            } else {
                toast.error(result.error || 'Failed to load attendance logs')
            }
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
            const result = await getOwnerAttendanceStats(
                filters.branchId || undefined, 
                dateToFetch
            )
            if (result.success && result.data) {
                setStats(result.data)
            } else {
                toast.error(result.error || 'Failed to load stats')
            }
        } catch (error) {
            console.error('Failed to load stats', error)
            toast.error('Failed to load stats')
        } finally {
            setStatsLoading(false)
        }
    }, [filters.branchId, filters.date, viewMode])

    useEffect(() => {
        fetchBranches()
    }, [fetchBranches])

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

    const handleQuickCheckout = async (record: AttendanceLog) => {
        try {
            const res = await updateAttendanceRecord(record.id, { checkOut: new Date() })
            if (res.success) {
                toast.success('Checked out')
                fetchData()
                fetchStats()
            } else {
                toast.error(res.error || 'Failed to checkout')
            }
        } catch {
            toast.error('Failed to checkout')
        }
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
                        value={`${Math.floor(stats.avgDuration / 60)}h ${stats.avgDuration % 60}m`} 
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
                <div className="flex flex-col gap-4 w-full flex-1">
                    
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
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-2 w-full md:w-auto">
                            <div className="w-full">
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="date"
                                        value={filters.startDate}
                                        max={filters.endDate}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setFilters(prev => ({
                                                ...prev,
                                                startDate: value,
                                                endDate: prev.endDate && prev.endDate < value ? value : prev.endDate,
                                                page: 1
                                            }))
                                        }}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="w-full">
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Start Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="time"
                                        value={filters.startTime}
                                        onChange={(e) => setFilters(prev => ({ ...prev, startTime: e.target.value, page: 1 }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="w-full">
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">End Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="date"
                                        value={filters.endDate}
                                        min={filters.startDate}
                                        onChange={(e) => {
                                            const value = e.target.value
                                            setFilters(prev => ({
                                                ...prev,
                                                endDate: value,
                                                startDate: prev.startDate && prev.startDate > value ? value : prev.startDate,
                                                page: 1
                                            }))
                                        }}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="w-full">
                                <label className="text-xs font-medium text-gray-500 mb-1.5 block">End Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input 
                                        type="time"
                                        value={filters.endTime}
                                        onChange={(e) => setFilters(prev => ({ ...prev, endTime: e.target.value, page: 1 }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-2 w-full">
                        <div className="w-full">
                            <FormSelect 
                                label="Branch"
                                value={filters.branchId}
                                onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value, page: 1 }))}
                                options={[
                                    { label: 'All Branches', value: '' },
                                    ...branches.map(b => ({ label: b.name, value: b.id }))
                                ]}
                                icon={MapPin}
                                className="text-sm py-2"
                            />
                        </div>
    
                        <div className="w-full">
                            <FormSelect 
                                label="Status"
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                                options={[
                                    { label: 'All Status', value: 'all' },
                                    { label: 'Active', value: 'active' },
                                    { label: 'Present', value: 'present' },
                                    { label: 'Short Session', value: 'short_session' },
                                    { label: 'Overstay', value: 'overstay' }
                                ]}
                                icon={Filter}
                                className="text-sm py-2"
                            />
                        </div>
    
                        <div className="w-full">
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
                    
                </div>

                <div className="flex gap-2">
                    <AnimatedButton variant="outline" onClick={handleRefresh} className="h-10 w-10 p-0 flex items-center justify-center">
                        <RefreshCw size={18} />
                    </AnimatedButton>
                    
                    <AnimatedButton onClick={() => setAdding(true)} className="h-10 bg-blue-600 hover:bg-blue-700 text-white">
                        Add Attendance
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
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Duration</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Overstay Duration</th>
                                <th className="p-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <RefreshCw className="animate-spin w-4 h-4" /> Loading logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : grouped.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-8 text-center text-gray-500">
                                        No attendance records found.
                                    </td>
                                </tr>
                            ) : (
                                grouped.map(row => (
                                    <>
                                    <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => toggleRow(row.key)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title={expandedRows[row.key] ? 'Hide Sessions' : 'Show Sessions'}
                                                >
                                                    {expandedRows[row.key] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </button>
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs relative overflow-hidden">
                                                    {row.student.image ? (
                                                        <Image src={row.student.image} alt={row.student.name} fill className="object-cover" sizes="32px" />
                                                    ) : (
                                                        row.student.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white text-sm">{row.student.name}</div>
                                                    <div className="text-xs text-gray-500">{(row.student as any).email || ''}</div>
                                                    <div className="mt-1">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            {row.sessions.length} sessions
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {format(new Date(row.startTime), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-gray-400" />
                                                {row.branchName}
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">
                                            {format(new Date(row.startTime), 'hh:mm a')}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {row.endTime ? format(new Date(row.endTime), 'hh:mm a') : (
                                                <span className="text-green-600 dark:text-green-400 text-xs font-medium px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded-full animate-pulse">Active</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {row.totalDuration ? `${Math.floor(row.totalDuration / 60)}h ${row.totalDuration % 60}m` : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize
                                                    ${row.hasActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}
                                                `}>
                                                    {row.hasActive ? 'active' : 'present'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                            {row.totalOverstay > 0 ? `+${Math.floor(row.totalOverstay / 60)}h ${row.totalOverstay % 60}m` : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => toggleRow(row.key)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title={expandedRows[row.key] ? 'Hide Sessions' : 'Show Sessions'}
                                            >
                                                {expandedRows[row.key] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedRows[row.key] && (
                                        <tr key={row.key + '-details'} className="bg-gray-50/50 dark:bg-gray-800/50">
                                            <td colSpan={9} className="p-4">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-sm">
                                                        <thead className="text-gray-500">
                                                            <tr>
                                                                <th className="p-2">Branch</th>
                                                                <th className="p-2">Start</th>
                                                                <th className="p-2">End</th>
                                                                <th className="p-2">Duration</th>
                                                                <th className="p-2">Status</th>
                                                                <th className="p-2">Method</th>
                                                                <th className="p-2">Remarks</th>
                                                                <th className="p-2 text-right">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {row.sessions.map(s => (
                                                                <tr key={s.id} className="border-t border-gray-200 dark:border-gray-700">
                                                                    <td className="p-2">{s.branch?.name || '-'}</td>
                                                                    <td className="p-2">{format(new Date(s.checkIn), 'MMM dd, yyyy hh:mm a')}</td>
                                                                    <td className="p-2">{s.checkOut ? format(new Date(s.checkOut), 'MMM dd, yyyy hh:mm a') : 'Active'}</td>
                                                                    <td className="p-2">{typeof s.duration === 'number' ? `${Math.floor(s.duration / 60)}h ${s.duration % 60}m` : '-'}</td>
                                                                    <td className="p-2 capitalize">{(s.status === 'full_day' ? 'present' : s.status).replace('_', ' ')}</td>
                                                                    <td className="p-2">{s.method || '-'}</td>
                                                                    <td className="p-2">{s.remarks || '-'}</td>
                                                                    <td className="p-2 text-right">
                                                                        <button 
                                                                            onClick={() => setEditingRecord(s)}
                                                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                                        >
                                                                            <Edit size={16} />
                                                                        </button>
                                                                        {!s.checkOut && (
                                                                            <button
                                                                                onClick={() => handleQuickCheckout(s)}
                                                                                className="p-1.5 ml-1 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                                            >
                                                                                <UserCheck size={16} />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <button 
                        onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={filters.page === 1}
                        className="text-sm text-gray-600 disabled:opacity-50 hover:text-gray-900"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-500">
                        Page {filters.page} of {Math.ceil(total / filters.limit)}
                    </span>
                    <button 
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={filters.page >= Math.ceil(total / filters.limit)}
                        className="text-sm text-gray-600 disabled:opacity-50 hover:text-gray-900"
                    >
                        Next
                    </button>
                </div>
            </div>

            {editingRecord && (
                <EditAttendanceModal 
                    record={editingRecord} 
                    onClose={() => setEditingRecord(null)}
                    onSuccess={handleRefresh}
                />
            )}
            {adding && (
                <AddAttendanceModal 
                    onClose={() => setAdding(false)}
                    onSuccess={handleRefresh}
                />
            )}
        </div>
    )
}
