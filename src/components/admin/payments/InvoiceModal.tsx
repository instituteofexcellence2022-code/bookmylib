'use client'

import React, { useRef } from 'react'
import { PlatformPayment } from '@/actions/admin/platform-payments'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Printer, Download, X } from 'lucide-react'
import { format } from 'date-fns'
import { useReactToPrint } from 'react-to-print'

interface InvoiceModalProps {
    payment: PlatformPayment | null
    isOpen: boolean
    onClose: () => void
}

export function InvoiceModal({ payment, isOpen, onClose }: InvoiceModalProps) {
    const printRef = useRef<HTMLDivElement>(null)
    
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: payment ? `Invoice-${payment.invoiceNumber}` : 'Invoice',
    })

    if (!payment) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto p-0 gap-0">
                {/* Header Actions */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                        Invoice Preview
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handlePrint()}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                            <Printer size={16} />
                            Print / Save PDF
                        </button>
                        <button 
                            onClick={onClose}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
                        >
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Invoice Content */}
                <div className="p-8 bg-white min-h-[600px] text-gray-900" ref={printRef}>
                    {/* Header */}
                    <div className="flex justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h1>
                            <p className="text-gray-500 font-mono text-sm">#{payment.invoiceNumber}</p>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-xl text-gray-900">BookMyLib</div>
                            <div className="text-sm text-gray-500 mt-1">
                                123 Library Lane<br />
                                Tech City, TC 500012<br />
                                support@bookmylib.com
                            </div>
                        </div>
                    </div>

                    {/* Bill To & Details */}
                    <div className="flex justify-between mb-8 border-t border-b border-gray-100 py-6">
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase mb-2">Bill To</div>
                            <div className="font-semibold text-lg">{payment.library.name}</div>
                            <div className="text-gray-600 text-sm">{payment.library.subdomain}.bookmylib.com</div>
                        </div>
                        <div className="text-right space-y-2">
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase mr-4">Date</span>
                                <span className="font-medium">{format(new Date(payment.createdAt), 'MMM d, yyyy')}</span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase mr-4">Status</span>
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                    payment.status === 'succeeded' ? 'bg-green-100 text-green-800' : 
                                    payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                }`}>
                                    {payment.status}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase mr-4">Method</span>
                                <span className="font-medium capitalize">{payment.method}</span>
                            </div>
                        </div>
                    </div>

                    {/* Line Items */}
                    <table className="w-full mb-8">
                        <thead>
                            <tr className="border-b-2 border-gray-900">
                                <th className="text-left py-3 font-bold text-sm uppercase">Description</th>
                                <th className="text-right py-3 font-bold text-sm uppercase">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-gray-100">
                                <td className="py-4 text-gray-800">
                                    {payment.description || 'Platform Subscription'}
                                </td>
                                <td className="py-4 text-right font-medium">
                                    ₹{payment.amount.toLocaleString('en-IN')}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end mb-12">
                        <div className="w-64 space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{payment.amount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Tax (0%)</span>
                                <span>₹0.00</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg pt-3 border-t border-gray-900">
                                <span>Total</span>
                                <span>₹{payment.amount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center text-gray-500 text-sm mt-12 pt-8 border-t border-gray-100">
                        <p>Thank you for your business!</p>
                        <p className="mt-2 text-xs">For questions about this invoice, please contact support@bookmylib.com</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
