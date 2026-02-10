'use client'

import React, { useState } from 'react'
import { PlatformPayment, createManualPayment } from '@/actions/admin/platform-payments'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { getLibraries } from '@/actions/admin/platform-libraries'
import { toast } from 'react-hot-toast'
import { Loader2, Search } from 'lucide-react'
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
    
    const [formData, setFormData] = useState({
        libraryId: '',
        amount: '',
        description: 'Monthly Subscription',
        method: 'manual',
        referenceId: '',
        notes: '',
        status: 'succeeded'
    })

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
                method: formData.method as any,
                status: formData.status as any
            })

            if (result.success) {
                toast.success('Payment recorded successfully')
                onClose()
                router.refresh()
                // Reset form
                setFormData({
                    libraryId: '',
                    amount: '',
                    description: 'Monthly Subscription',
                    method: 'manual',
                    referenceId: '',
                    notes: '',
                    status: 'succeeded'
                })
                setSearchTerm('')
            } else {
                toast.error(result.error || 'Failed to record payment')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
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
                            <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg">
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (INR)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-sm"
                            />
                        </div>
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
