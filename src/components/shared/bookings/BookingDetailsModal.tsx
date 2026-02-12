'use client'

import React, { useState } from 'react'
import { 
    X, Calendar, User, Armchair, Lock, CreditCard, 
    Mail, Phone, Clock, FileText, CheckCircle, AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { toast } from 'sonner'

interface BookingDetailsModalProps {
    booking: any
    onClose: () => void
    onRenew?: () => void
    onEdit?: () => void
    onRecordPayment?: (args: { subscriptionId: string; amount: number; method: string; remarks?: string }) => Promise<{ success: boolean; error?: string }>
}

export function BookingDetailsModal({ booking, onClose, onRenew, onEdit, onRecordPayment }: BookingDetailsModalProps) {
    if (!booking) return null
    const expected = Number(booking.amount || 0)
    const paid = (booking.payments || [])
      .filter((p: any) => p.status === 'completed')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
    const due = Math.max(expected - paid, 0)

    const [payAmount, setPayAmount] = useState(due > 0 ? String(due) : '')
    const [payMethod, setPayMethod] = useState('cash')
    const [payRemarks, setPayRemarks] = useState('')
    const [saving, setSaving] = useState(false)

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'expired': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-bold text-lg">
                            {booking.student.image ? (
                                <img src={booking.student.image} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                booking.student.name[0]
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{booking.student.name}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)} capitalize`}>
                                    {booking.status}
                                </span>
                                <span className="text-xs text-gray-500">ID: {booking.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Contact Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Contact Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <span className="text-gray-700 dark:text-gray-300">{booking.student.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <span className="text-gray-700 dark:text-gray-300">{booking.student.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Plan Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Plan Details</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">{booking.plan.name}</div>
                                        <div className="text-xs text-gray-500">₹{booking.plan.price} • {booking.branch.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {format(new Date(booking.startDate), 'MMM d, yyyy')} - {format(new Date(booking.endDate), 'MMM d, yyyy')}
                                        </div>
                                        <div className="text-xs text-gray-500">Duration: {booking.plan.duration} {booking.plan.durationUnit}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assignment */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Assignments</h3>
                            <div className="flex gap-4">
                                <div className="flex-1 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Armchair className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs font-medium text-gray-500">Seat</span>
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {booking.seat ? `${booking.seat.number} (${booking.seat.section || 'Gen'})` : 'Not Assigned'}
                                    </div>
                                </div>
                                <div className="flex-1 p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Lock className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs font-medium text-gray-500">Locker</span>
                                    </div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                        {booking.locker ? booking.locker.number : 'Not Assigned'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div className="space-y-4 md:col-span-2">
                            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Payment History</h3>
                            <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">Date</th>
                                            <th className="px-4 py-2 font-medium">Invoice</th>
                                            <th className="px-4 py-2 font-medium">Method</th>
                                            <th className="px-4 py-2 font-medium">Amount</th>
                                            <th className="px-4 py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {booking.payments && booking.payments.length > 0 ? (
                                            booking.payments.map((payment: any) => (
                                                <tr key={payment.id} className="bg-white dark:bg-gray-800">
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                        {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                        {payment.invoiceNo || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-300">
                                                        {payment.method || 'cash'}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                        ₹{payment.amount}
                                                        {(payment.discountAmount ?? 0) > 0 && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                <span>Subtotal: ₹{(payment.amount || 0) + (payment.discountAmount || 0)}</span>
                                                                <span className="ml-2">Discount: -₹{payment.discountAmount}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            payment.status === 'completed'
                                                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                                                : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                        }`}>
                                                            {payment.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-3 text-center text-gray-500 italic">
                                                    No payments recorded
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 flex items-center justify-between">
                                <div>
                                    <span className="font-medium">Total:</span> ₹{expected} &nbsp;•&nbsp;
                                    <span className="font-medium">Paid:</span> ₹{paid} &nbsp;•&nbsp;
                                    <span className="font-medium">Due:</span> ₹{due}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
                    <AnimatedButton
                        onClick={onClose}
                        variant="outline"
                        className="bg-white"
                    >
                        Close
                    </AnimatedButton>
                    
                    {onRenew && (
                        <AnimatedButton
                            onClick={onRenew}
                            className="bg-green-600 text-white hover:bg-green-700"
                        >
                            Renew Plan
                        </AnimatedButton>
                    )}

                    {onEdit && (
                        <AnimatedButton
                            className="bg-purple-600 text-white hover:bg-purple-700"
                            onClick={onEdit}
                        >
                            Edit Booking
                        </AnimatedButton>
                    )}

                    {due > 0 && (
                        <div className="flex items-center gap-2 ml-4">
                            <input
                                type="number"
                                min={1}
                                max={due}
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none"
                                placeholder="Amount"
                            />
                            <select
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none"
                            >
                                <option value="cash">Cash</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                            </select>
                            <input
                                type="text"
                                value={payRemarks}
                                onChange={(e) => setPayRemarks(e.target.value)}
                                className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none"
                                placeholder="Remarks (optional)"
                            />
                            <AnimatedButton
                                isLoading={saving}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                                onClick={async () => {
                                    if (!Number(payAmount) || Number(payAmount) <= 0) {
                                        toast.error('Enter a valid amount')
                                        return
                                    }
                                    try {
                                        setSaving(true)
                                        if (!onRecordPayment) {
                                            toast.error('Payment action is not available')
                                            return
                                        }
                                        const res = await onRecordPayment({
                                            subscriptionId: booking.id,
                                            amount: Number(payAmount),
                                            method: payMethod,
                                            remarks: payRemarks
                                        })
                                        if (res.success) {
                                            toast.success('Payment recorded')
                                            onClose()
                                        } else {
                                            toast.error(res.error || 'Failed to record payment')
                                        }
                                    } finally {
                                        setSaving(false)
                                    }
                                }}
                            >
                                Record Payment
                            </AnimatedButton>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
