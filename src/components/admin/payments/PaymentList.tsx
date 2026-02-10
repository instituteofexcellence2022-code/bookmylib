'use client'

import React from 'react'
import { PlatformPayment } from '@/actions/admin/platform-payments'
import { CheckCircle2, XCircle, Clock, FileText, Download } from 'lucide-react'
import { format } from 'date-fns'

interface PaymentListProps {
    payments: PlatformPayment[]
    loading?: boolean
    onViewInvoice: (payment: PlatformPayment) => void
}

export function PaymentList({ payments, loading, onViewInvoice }: PaymentListProps) {
    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading payments...</div>
    }

    if (payments.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No payments found</h3>
                <p className="text-gray-500 text-sm">No payment records match your filters.</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Invoice</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Library</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="py-3 px-4">
                                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                                        {payment.invoiceNumber || '-'}
                                    </div>
                                    <div className="text-xs text-gray-500 capitalize">{payment.method}</div>
                                </td>
                                <td className="py-3 px-4">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                                        {payment.library.name}
                                    </div>
                                    <div className="text-xs text-gray-500">{payment.library.subdomain}</div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                    {payment.description || 'Subscription Payment'}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                    {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                                </td>
                                <td className="py-3 px-4 text-sm font-semibold text-gray-900 dark:text-white">
                                    ₹{payment.amount.toLocaleString('en-IN')}
                                </td>
                                <td className="py-3 px-4">
                                    <StatusBadge status={payment.status} />
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button 
                                        onClick={() => onViewInvoice(payment)}
                                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 hover:text-blue-600 transition-colors"
                                        title="Download Invoice"
                                    >
                                        <FileText size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'succeeded':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 size={12} />
                    Paid
                </span>
            )
        case 'pending':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Clock size={12} />
                    Pending
                </span>
            )
        case 'failed':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    <XCircle size={12} />
                    Failed
                </span>
            )
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                    {status}
                </span>
            )
    }
}
