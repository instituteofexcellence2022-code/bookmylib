'use client'

import React, { useState } from 'react'
import { exportSubscriptions } from '@/actions/admin/platform-subscriptions'
import { SubscriptionList } from './SubscriptionList'
import { Filter, Download, Search, TicketCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { LibraryDetailsModal } from '@/components/admin/libraries/LibraryDetailsModal'

interface SubscriptionPageClientProps {
    initialSubscriptions: any[]
    plans: any[]
    totalPages: number
    currentPage: number
}

export function SubscriptionPageClient({ initialSubscriptions, plans, totalPages, currentPage }: SubscriptionPageClientProps) {
    const router = useRouter()
    const [exporting, setExporting] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [planFilter, setPlanFilter] = useState('all')
    
    // Modal state
    const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        applyFilters()
    }

    const handleFilterChange = (key: string, value: string) => {
        if (key === 'status') setStatusFilter(value)
        if (key === 'plan') setPlanFilter(value)
        
        // We need to pass the new value directly because state update is async
        applyFilters({ [key]: value })
    }

    const applyFilters = (overrides: Record<string, string> = {}) => {
        const params = new URLSearchParams()
        
        const s = overrides.status !== undefined ? overrides.status : statusFilter
        const p = overrides.plan !== undefined ? overrides.plan : planFilter
        const q = search // Search is always from state as it's submitted via form

        if (s !== 'all') params.set('status', s)
        if (p !== 'all') params.set('planId', p)
        if (q) params.set('search', q)
        
        params.set('page', '1') // Reset to page 1 on filter change
        router.push(`/admin/subscriptions?${params.toString()}`)
    }

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', newPage.toString())
        router.push(`/admin/subscriptions?${params.toString()}`)
    }
    
    const handleManage = (libraryId: string) => {
        setSelectedLibraryId(libraryId)
        setIsModalOpen(true)
    }

    const handleExport = async () => {
        try {
            setExporting(true)
            const data = await exportSubscriptions(statusFilter)
            
            if (!data || data.length === 0) {
                toast.error('No data to export')
                return
            }

            // Convert to CSV
            const headers = Object.keys(data[0])
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => {
                    const value = (row as any)[header]
                    // Escape quotes and wrap in quotes if needed
                    return `"${String(value || '').replace(/"/g, '""')}"`
                }).join(','))
            ].join('\n')

            // Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `subscriptions_export_${new Date().toISOString().slice(0,10)}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            toast.success('Export successful')
        } catch (error) {
            console.error(error)
            toast.error('Failed to export data')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Subscriptions</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage active platform subscriptions.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <Download size={16} />
                        {exporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Search library or subdomain..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </form>

                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <select 
                            value={statusFilter}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="canceled">Canceled</option>
                            <option value="past_due">Past Due</option>
                            <option value="trialing">Trialing</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <TicketCheck size={16} className="text-gray-400" />
                        <select 
                            value={planFilter}
                            onChange={(e) => handleFilterChange('plan', e.target.value)}
                            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Plans</option>
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <SubscriptionList 
                subscriptions={initialSubscriptions} 
                onManage={handleManage}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Previous
                    </button>
                    <span className="px-3 py-1 text-gray-500">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Next
                    </button>
                </div>
            )}
            
            <LibraryDetailsModal 
                libraryId={selectedLibraryId}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    )
}
