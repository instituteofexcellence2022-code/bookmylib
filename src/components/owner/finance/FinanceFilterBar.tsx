'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { getFilterOptions } from '@/actions/owner/finance'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear, format, parseISO } from 'date-fns'
import { Filter, RefreshCcw } from 'lucide-react'

export function FinanceFilterBar() {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
    const [loading, setLoading] = useState(true)

    // State for local inputs
    const [period, setPeriod] = useState(searchParams.get('period') || 'this_month')
    const [branchId, setBranchId] = useState(searchParams.get('branchId') || 'all')
    const [customStart, setCustomStart] = useState(searchParams.get('startDate') || '')
    const [customEnd, setCustomEnd] = useState(searchParams.get('endDate') || '')

    useEffect(() => {
        async function loadOptions() {
            try {
                const result = await getFilterOptions()
                if (result.success && result.data) {
                    setBranches(result.data.branches)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
        loadOptions()
    }, [])

    // Sync state with URL params on mount/change
    useEffect(() => {
        setPeriod(searchParams.get('period') || 'this_month')
        setBranchId(searchParams.get('branchId') || 'all')
        setCustomStart(searchParams.get('startDate') || '')
        setCustomEnd(searchParams.get('endDate') || '')
    }, [searchParams])

    const applyFilters = (newPeriod: string, newBranch: string, start?: string, end?: string) => {
        const params = new URLSearchParams(searchParams.toString())
        
        // Update Branch
        if (newBranch && newBranch !== 'all') {
            params.set('branchId', newBranch)
        } else {
            params.delete('branchId')
        }

        // Update Period & Dates
        params.set('period', newPeriod)
        
        let startDate: Date | undefined
        let endDate: Date | undefined
        const now = new Date()

        switch (newPeriod) {
            case 'today':
                startDate = startOfDay(now)
                endDate = endOfDay(now)
                break
            case 'yesterday':
                startDate = startOfDay(subDays(now, 1))
                endDate = endOfDay(subDays(now, 1))
                break
            case 'this_week':
                startDate = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
                endDate = endOfWeek(now, { weekStartsOn: 1 })
                break
            case 'last_week':
                const lastWeek = subDays(now, 7)
                startDate = startOfWeek(lastWeek, { weekStartsOn: 1 })
                endDate = endOfWeek(lastWeek, { weekStartsOn: 1 })
                break
            case 'this_month':
                startDate = startOfMonth(now)
                endDate = endOfMonth(now)
                break
            case 'last_month':
                const lastMonth = subMonths(now, 1)
                startDate = startOfMonth(lastMonth)
                endDate = endOfMonth(lastMonth)
                break
            case 'last_3_months':
                startDate = startOfMonth(subMonths(now, 3))
                endDate = endOfMonth(now)
                break
            case 'last_6_months':
                startDate = startOfMonth(subMonths(now, 6))
                endDate = endOfMonth(now)
                break
            case 'this_year':
                startDate = startOfYear(now)
                endDate = endOfYear(now)
                break
            case 'custom':
                if (start) startDate = parseISO(start)
                if (end) endDate = parseISO(end)
                break
        }

        if (startDate) params.set('startDate', startDate.toISOString())
        else if (newPeriod !== 'custom') params.delete('startDate')

        if (endDate) params.set('endDate', endDate.toISOString())
        else if (newPeriod !== 'custom') params.delete('endDate')

        router.push(`/owner/finance?${params.toString()}`)
    }

    const handlePeriodChange = (val: string) => {
        setPeriod(val)
        if (val !== 'custom') {
            applyFilters(val, branchId)
        }
    }

    const handleBranchChange = (val: string) => {
        setBranchId(val)
        applyFilters(period, val, customStart, customEnd)
    }

    const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
        if (type === 'start') setCustomStart(val)
        else setCustomEnd(val)

        const s = type === 'start' ? val : customStart
        const e = type === 'end' ? val : customEnd
        
        if (s && e) {
            applyFilters('custom', branchId, s, e)
        }
    }

    const clearFilters = () => {
        router.push('/owner/finance?tab=overview')
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
            {/* Label */}
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 min-w-fit">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filters:</span>
            </div>

            {/* Filters Container */}
            <div className="flex-1 flex flex-row items-center gap-2 overflow-x-auto no-scrollbar w-full">
                {/* Branch Filter */}
                <div className="flex-1 min-w-[140px] max-w-[200px]">
                    <FilterSelect
                        value={branchId}
                        onChange={handleBranchChange}
                        options={[
                            { value: 'all', label: 'All Branches' },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                        placeholder="Select Branch"
                    />
                </div>

                {/* Period Filter */}
                <div className="flex-1 min-w-[140px] max-w-[200px]">
                    <FilterSelect
                        value={period}
                        onChange={handlePeriodChange}
                        options={[
                            { value: 'today', label: 'Today' },
                            { value: 'yesterday', label: 'Yesterday' },
                            { value: 'this_week', label: 'This Week' },
                            { value: 'last_week', label: 'Last Week' },
                            { value: 'this_month', label: 'This Month' },
                            { value: 'last_month', label: 'Last Month' },
                            { value: 'last_3_months', label: 'Last 3 Months' },
                            { value: 'last_6_months', label: 'Last 6 Months' },
                            { value: 'this_year', label: 'This Year' },
                            { value: 'custom', label: 'Custom Range' },
                        ]}
                        placeholder="Select Period"
                    />
                </div>

                {/* Custom Date Inputs */}
                {period === 'custom' && (
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            <input
                                type="date"
                                value={customStart ? format(parseISO(customStart), 'yyyy-MM-dd') : ''}
                                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                                className="w-[130px] px-2 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <span className="text-gray-400">-</span>
                        <div className="relative">
                            <input
                                type="date"
                                value={customEnd ? format(parseISO(customEnd), 'yyyy-MM-dd') : ''}
                                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                                className="w-[130px] px-2 py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
