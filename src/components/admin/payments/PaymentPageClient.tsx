'use client'

import React, { useState } from 'react'
import { PlatformPayment, exportPayments } from '@/actions/admin/platform-payments'
import { PaymentList } from './PaymentList'
import { PaymentStats } from './PaymentStats'
import { ManualPaymentModal } from './ManualPaymentModal'
import { InvoiceModal } from './InvoiceModal'
import { Plus, Filter, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface PaymentPageClientProps {
    initialPayments: PlatformPayment[]
    stats: any
    totalPages: number
    currentPage: number
}

export function PaymentPageClient({ initialPayments, stats, totalPages, currentPage }: PaymentPageClientProps) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<PlatformPayment | null>(null)
    const [statusFilter, setStatusFilter] = useState('all')
    const [exporting, setExporting] = useState(false)

    const handleFilterChange = (status: string) => {
        setStatusFilter(status)
        const params = new URLSearchParams(window.location.search)
        if (status === 'all') params.delete('status')
        else params.set('status', status)
        params.set('page', '1') // Reset to page 1
        router.push(`/admin/payments?${params.toString()}`)
    }

    const handleExport = async () => {
        try {
            setExporting(true)
            const data = await exportPayments(statusFilter)
            
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
            link.setAttribute('download', `payments_export_${new Date().toISOString().slice(0,10)}.csv`)
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments & Billing</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage subscriptions, invoices, and revenue.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        disabled={exporting}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        <Download size={16} />
                        {exporting ? 'Exporting...' : 'Export Report'}
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                    >
                        <Plus size={16} />
                        Record Payment
                    </button>
                </div>
            </div>

            <PaymentStats stats={stats} />

            <div className="space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    <FilterButton 
                        label="All Payments" 
                        active={statusFilter === 'all'} 
                        onClick={() => handleFilterChange('all')} 
                    />
                    <FilterButton 
                        label="Succeeded" 
                        active={statusFilter === 'succeeded'} 
                        onClick={() => handleFilterChange('succeeded')} 
                    />
                    <FilterButton 
                        label="Pending" 
                        active={statusFilter === 'pending'} 
                        onClick={() => handleFilterChange('pending')} 
                    />
                    <FilterButton 
                        label="Failed" 
                        active={statusFilter === 'failed'} 
                        onClick={() => handleFilterChange('failed')} 
                    />
                </div>

                <PaymentList 
                    payments={initialPayments} 
                    onViewInvoice={setSelectedPayment}
                />
                
                {/* Pagination (Simple) */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => {
                                const params = new URLSearchParams(window.location.search)
                                params.set('page', (currentPage - 1).toString())
                                router.push(`/admin/payments?${params.toString()}`)
                            }}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-500">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button 
                            disabled={currentPage === totalPages}
                            onClick={() => {
                                const params = new URLSearchParams(window.location.search)
                                params.set('page', (currentPage + 1).toString())
                                router.push(`/admin/payments?${params.toString()}`)
                            }}
                            className="px-3 py-1 border rounded disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            <ManualPaymentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
            />
            
            <InvoiceModal
                payment={selectedPayment}
                isOpen={!!selectedPayment}
                onClose={() => setSelectedPayment(null)}
            />
        </div>
    )
}

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                active 
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' 
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
            }`}
        >
            {label}
        </button>
    )
}
