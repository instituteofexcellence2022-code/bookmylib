'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Loader2, IndianRupee, Calendar } from 'lucide-react'
import { getSaasPlans } from '@/actions/admin/platform-plans'

interface SubscriptionApprovalModalProps {
    isOpen: boolean
    onClose: () => void
    onApprove: (data: any) => Promise<void>
    ticketId: string
    planName: string // Extracted from ticket subject
}

export function SubscriptionApprovalModal({ isOpen, onClose, onApprove, ticketId, planName }: SubscriptionApprovalModalProps) {
    const [loading, setLoading] = useState(false)
    const [plan, setPlan] = useState<any>(null)
    const [fetchingPlan, setFetchingPlan] = useState(true)

    // Form State
    const [createPayment, setCreatePayment] = useState(true)
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
    const [amount, setAmount] = useState('0')
    const [method, setMethod] = useState('manual')
    const [paymentStatus, setPaymentStatus] = useState('succeeded')
    const [referenceId, setReferenceId] = useState('')
    const [notes, setNotes] = useState('')

    // Fetch Plan Details to pre-fill amount
    useEffect(() => {
        if (isOpen && planName) {
            setFetchingPlan(true)
            getSaasPlans().then(plans => {
                const foundPlan = plans.find(p => p.name === planName)
                if (foundPlan) {
                    setPlan(foundPlan)
                    setAmount(foundPlan.priceMonthly.toString())
                }
                setFetchingPlan(false)
            })
        }
    }, [isOpen, planName])

    // Update amount when cycle changes
    useEffect(() => {
        if (plan) {
            setAmount(billingCycle === 'monthly' ? plan.priceMonthly.toString() : plan.priceYearly.toString())
        }
    }, [billingCycle, plan])

    const handleConfirm = async () => {
        setLoading(true)
        try {
            await onApprove({
                ticketId,
                shouldCreatePayment: createPayment,
                paymentDetails: createPayment ? {
                    amount: parseFloat(amount),
                    method,
                    status: paymentStatus,
                    referenceId,
                    notes,
                    billingCycle
                } : {
                    billingCycle // Even if no payment, we need to know cycle for expiry
                }
            })
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Approve Subscription Request</DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Plan Summary */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-blue-900 dark:text-blue-300">Requested Plan: {planName}</h3>
                                {fetchingPlan ? (
                                    <span className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                                        <Loader2 size={10} className="animate-spin" /> Fetching details...
                                    </span>
                                ) : plan ? (
                                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                        Standard Price: ₹{plan.priceMonthly}/mo or ₹{plan.priceYearly}/yr
                                    </p>
                                ) : (
                                    <p className="text-xs text-red-500 mt-1">Plan not found in system</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Configuration */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing Cycle</label>
                            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${billingCycle === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${billingCycle === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                                >
                                    Yearly
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="createPayment"
                                checked={createPayment}
                                onChange={(e) => setCreatePayment(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor="createPayment" className="text-sm text-gray-700 dark:text-gray-300">
                                Create Payment Record & Invoice
                            </label>
                        </div>

                        {createPayment && (
                            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Amount (₹)</label>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Status</label>
                                        <select
                                            value={paymentStatus}
                                            onChange={(e) => setPaymentStatus(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                        >
                                            <option value="succeeded">Paid (Succeeded)</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Method</label>
                                        <select
                                            value={method}
                                            onChange={(e) => setMethod(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                        >
                                            <option value="manual">Manual / Cash</option>
                                            <option value="bank_transfer">Bank Transfer</option>
                                            <option value="cheque">Cheque</option>
                                            <option value="upi">UPI</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Reference ID</label>
                                        <input
                                            type="text"
                                            value={referenceId}
                                            onChange={(e) => setReferenceId(e.target.value)}
                                            placeholder="Txn ID (Optional)"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Notes</label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Internal notes..."
                                        rows={2}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading || fetchingPlan}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        Confirm Approval
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
