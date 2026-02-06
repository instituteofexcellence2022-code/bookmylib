'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Phone, MessageSquare } from 'lucide-react'
import { getLeads, LeadFilter } from '@/actions/staff/leads'
import { StaffCreateLeadModal } from './StaffCreateLeadModal'
import { StaffLeadDetailsModal } from './StaffLeadDetailsModal'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { format } from 'date-fns'
import { useDebounce } from '@/hooks/use-debounce'

interface Lead {
    id: string
    name: string
    phone: string
    status: string
    createdAt: Date
    interactions: {
        createdAt: Date
        notes: string | null
    }[]
}

interface Metadata {
    page: number
    limit: number
    total: number
    totalPages: number
}

export function StaffLeadListClient() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [metadata, setMetadata] = useState<Metadata | null>(null)
    const [filters, setFilters] = useState<LeadFilter>({
        page: 1,
        limit: 10,
        status: 'all',
        source: 'all',
        search: ''
    })
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
    
    const debouncedSearch = useDebounce(filters.search, 500)

    const fetchLeads = async () => {
        setLoading(true)
        try {
            const result = await getLeads(filters)
            if (result.success && result.data) {
                setLeads(result.data.leads)
                setMetadata(result.data.metadata)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLeads()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters.page, filters.status, filters.source, debouncedSearch])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
            case 'contacted': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            case 'interested': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            case 'hot': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
            case 'converted': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            case 'cold': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    
                    <FilterSelect
                        value={filters.status || 'all'}
                        onChange={(val) => setFilters(prev => ({ ...prev, status: val, page: 1 }))}
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'new', label: 'New' },
                            { value: 'contacted', label: 'Contacted' },
                            { value: 'interested', label: 'Interested' },
                            { value: 'hot', label: 'Hot' },
                            { value: 'converted', label: 'Converted' },
                        ]}
                        icon={Filter}
                    />
                </div>

                <AnimatedButton onClick={() => setIsCreateModalOpen(true)}>
                    <Plus size={18} />
                    New Lead
                </AnimatedButton>
            </div>

            {/* Leads Grid/List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                    ))
                ) : leads.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No leads found. Create one to get started.
                    </div>
                ) : (
                    leads.map((lead) => (
                        <div 
                            key={lead.id}
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="group bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                        {lead.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{lead.phone}</p>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}`}>
                                    {lead.status}
                                </span>
                            </div>

                            <div className="space-y-3">
                                {lead.interactions[0] ? (
                                    <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg line-clamp-2">
                                        <span className="font-medium text-xs text-gray-400 block mb-1">
                                            Last interaction • {format(new Date(lead.interactions[0].createdAt), 'MMM d')}
                                        </span>
                                        &quot;{lead.interactions[0].notes}&quot;
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-400 italic p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                        No interactions yet
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <span className="text-xs text-gray-400">
                                    Added {format(new Date(lead.createdAt), 'MMM d')}
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-primary transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.location.href = `tel:${lead.phone}`
                                        }}
                                    >
                                        <Phone size={16} />
                                    </button>
                                    <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-primary transition-colors">
                                        <MessageSquare size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {metadata && metadata.totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <button
                        disabled={metadata.page === 1}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                        Page {metadata.page} of {metadata.totalPages}
                    </span>
                    <button
                        disabled={metadata.page === metadata.totalPages}
                        onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                        className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                        Next
                    </button>
                </div>
            )}

            {isCreateModalOpen && (
                <StaffCreateLeadModal 
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={fetchLeads}
                />
            )}

            {selectedLeadId && (
                <StaffLeadDetailsModal
                    leadId={selectedLeadId}
                    onClose={() => setSelectedLeadId(null)}
                    onUpdate={fetchLeads}
                />
            )}
        </div>
    )
}
