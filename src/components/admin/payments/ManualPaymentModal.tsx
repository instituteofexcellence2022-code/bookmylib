'use client'

import React, { useState, useEffect } from 'react'
import { PlatformPayment, createManualPayment, getPaymentPlans } from '@/actions/admin/platform-payments'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { getLibraries } from '@/actions/admin/platform-libraries'
import { toast } from 'react-hot-toast'
import { Loader2, Search, Calendar, DollarSign, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ManualPaymentModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ManualPaymentModal({ isOpen, onClose }: ManualPaymentModalProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [libraries, setLibraries] = useState<{id: string, name: string, subdomain: string}[]>([])
    const [searching, setSearching] = useState(false)
    const [plans, setPlans] = useState<{id: string, name: string, priceMonthly: number, priceYearly: number}[]>([])
    
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
    
    const [formData, setFormData] = useState({
        libraryId: '',
        planId: '',
        amount: '',
        subtotal: '',
        taxAmount: '0',
        description: 'Monthly Subscription',
        method: 'manual',
        referenceId: '',
        notes: '',
        status: 'succeeded',
        paymentDate: new Date().toISOString().split('T')[0],
        billingStart: new Date().toISOString().split('T')[0],
        billingEnd: ''
    })

    // Fetch plans on open
    useEffect(() => {
        if (isOpen) {
            getPaymentPlans().then(setPlans)
        }
    }, [isOpen])

    // Update financials when cycle changes (if plan selected)
    useEffect(() => {
        if (formData.planId) {
            const plan = plans.find(p => p.id === formData.planId)
            if (plan) {
                const price = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly
                const description = `${plan.name} SaaS Plan (${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'})`
                
                // Calculate billing end
                const start = new Date(formData.billingStart || new Date())
                const end = new Date(start)
                if (billingCycle === 'monthly') {
                    end.setMonth(end.getMonth() + 1)
                } else {
                    end.setFullYear(end.getFullYear() + 1)
                }
                // Subtract 1 day for inclusive period
                end.setDate(end.getDate() - 1)

                setFormData(prev => ({
                    ...prev,
                    amount: price.toString(),
                    subtotal: price.toString(),
                    description,
                    billingEnd: end.toISOString().split('T')[0]
                }))
            }
        }
    }, [billingCycle, formData.planId, formData.billingStart, plans])

    // Search libraries
    const handleSearch = async (term: string) => {
        setSearchTerm(term)
        if (term.length < 2) return
        
        setSearching(true)
        try {
            const results = await getLibraries(term)
            setLibraries(results)
        } catch (error) {
            console.error(error)
        } finally {
            setSearching(false)
        }
    }

    // Handle Plan Selection
    const handlePlanChange = (planId: string) => {
        setFormData(prev => ({ ...prev, planId }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.libraryId) {
            toast.error('Please select a library')
            return
        }

        setLoading(true)
        try {
            const result = await createManualPayment({
                ...formData,
                amount: parseFloat(formData.amount),
                subtotal: formData.subtotal ? parseFloat(formData.subtotal) : parseFloat(formData.amount),
                taxAmount: parseFloat(formData.taxAmount),
                method: formData.method as any,
                status: formData.status as any,
                planId: formData.planId || null,
                paymentDate: new Date(formData.paymentDate),
                billingStart: formData.billingStart ? new Date(formData.billingStart) : null,
                billingEnd: formData.billingEnd ? new Date(formData.billingEnd) : null,
            })

            if (result.success) {
                toast.success('Payment recorded successfully')
                onClose()
                router.refresh()
                // Reset form
                setFormData({
                    libraryId: '',
                    planId: '',
                    amount: '',
                    subtotal: '',
                    taxAmount: '0',
                    description: 'Monthly Subscription',
                    method: 'manual',
                    referenceId: '',
                    notes: '',
                    status: 'succeeded',
                    paymentDate: new Date().toISOString().split('T')[0],
                    billingStart: '',
                    billingEnd: ''
                })
                setSearchTerm('')
            } else {
                toast.error(result.error || 'Failed to record payment')
            }
        } catch (error) {
            console.error(error)
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Record Manual Payment</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Library Search */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Library</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search library by name or subdomain..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            />
                        </div>
                        {libraries.length > 0 && searchTerm && !formData.libraryId && (
                            <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg z-10 relative">
                                {libraries.map(lib => (
                                    <div
                                        key={lib.id}
                                        onClick={() => {
                                            setFormData({ ...formData, libraryId: lib.id })
                                            setSearchTerm(lib.name)
                                            setLibraries([])
                                        }}
                                        className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm"
                                    >
                                        <div className="font-medium">{lib.name}</div>
                                        <div className="text-xs text-gray-500">{lib.subdomain}.bookmylib.com</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {formData.libraryId && (
                            <div className="text-xs text-green-600 flex items-center gap-1">
                                ✓ Library selected
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setFormData({ ...formData, libraryId: '' })
                                        setSearchTerm('')
                                    }}
                                    className="text-red-500 hover:underline ml-2"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Plan & Cycle Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">SaaS Plan (Optional)</label>
                            <select
                                value={formData.planId}
                                onChange={(e) => handlePlanChange(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            >
                                <option value="">Select SaaS Plan</option>
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {formData.planId && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing Cycle</label>
                                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle('monthly')}
                                        className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                                            billingCycle === 'monthly' 
                                                ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' 
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBillingCycle('yearly')}
                                        className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                                            billingCycle === 'yearly' 
                                                ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' 
                                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        Yearly
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Dates Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Date</label>
                            <input
                                type="date"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing Start</label>
                            <input
                                type="date"
                                value={formData.billingStart}
                                onChange={(e) => setFormData({ ...formData, billingStart: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Billing End</label>
                            <input
                                type="date"
                                value={formData.billingEnd}
                                onChange={(e) => setFormData({ ...formData, billingEnd: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            />
                        </div>
                    </div>

                    {/* Financials Row */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0.00"
                                value={formData.subtotal}
                                onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.taxAmount}
                                onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Paid</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Method</label>
                            <select
                                value={formData.method}
                                onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            >
                                <option value="manual">Cash / Manual</option>
                                <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                                <option value="cheque">Cheque</option>
                                <option value="upi">UPI (Manual)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            >
                                <option value="succeeded">Succeeded</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reference / Transaction ID</label>
                        <input
                            type="text"
                            value={formData.referenceId}
                            onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                            placeholder="Optional"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Internal Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Optional internal notes..."
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm h-20 resize-none"
                        />
                    </div>
                </form>

                <DialogFooter>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        Record Payment
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
