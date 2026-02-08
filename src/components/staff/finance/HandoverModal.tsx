import React, { Fragment, useState, useRef, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { X, Wallet, Calendar, FileText, CreditCard, Banknote, Building2, Upload, Loader2, Coins, Calculator, Image as ImageIcon } from 'lucide-react'
import { format } from 'date-fns'
import { uploadFile } from '@/actions/upload'
import { toast } from 'sonner'

interface HandoverModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (e: React.FormEvent) => Promise<void>
    amount: string
    setAmount: (val: string) => void
    notes: string
    setNotes: (val: string) => void
    method: string
    setMethod: (val: string) => void
    attachmentUrl: string
    setAttachmentUrl: (val: string) => void
    submitting: boolean
    selectedCount: number
}

const DENOMINATIONS = [500, 200, 100, 50, 20, 10] as const

export function HandoverModal({
    isOpen,
    onClose,
    onSubmit,
    amount,
    setAmount,
    notes,
    setNotes,
    method,
    setMethod,
    attachmentUrl,
    setAttachmentUrl,
    submitting,
    selectedCount
}: HandoverModalProps) {
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showDenominations, setShowDenominations] = useState(false)
    const [counts, setCounts] = useState<Record<number, string>>({})

    // Reset local state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setShowDenominations(false)
            setCounts({})
        }
    }, [isOpen])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB')
            return
        }

        setUploading(true)
        try {
            const result = await uploadFile(file)
            if (result.success && result.data) {
                setAttachmentUrl(result.data)
                toast.success('Proof uploaded successfully')
            } else {
                toast.error(result.error || 'Failed to upload proof')
            }
        } catch (error) {
            toast.error('Failed to upload proof')
            console.error(error)
        } finally {
            setUploading(false)
            // Reset input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const updateDenomination = (denom: number, count: string) => {
        const newCounts = { ...counts, [denom]: count }
        setCounts(newCounts)
        
        // Auto-calculate total
        const total = DENOMINATIONS.reduce((sum, d) => {
            const c = parseInt(newCounts[d] || '0', 10)
            return sum + (isNaN(c) ? 0 : d * c)
        }, 0)
        
        if (total > 0) {
            setAmount(total.toString())
        }
    }

    const appendDenominationToNotes = () => {
        const parts = DENOMINATIONS
            .filter(d => counts[d] && parseInt(counts[d]) > 0)
            .map(d => `${d}x${counts[d]}`)
        
        if (parts.length > 0) {
            const denomString = `Cash Breakdown: ${parts.join(', ')}`
            setNotes(notes ? `${notes}\n${denomString}` : denomString)
            toast.success('Added breakdown to notes')
        }
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-100 dark:border-gray-700">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-bold leading-6 text-gray-900 dark:text-white flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                                            <Wallet className="w-5 h-5" />
                                        </div>
                                        Handover Cash
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </Dialog.Title>

                                <form onSubmit={onSubmit} className="mt-6 space-y-5">
                                    {/* Date Display */}
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
                                        <Calendar className="w-4 h-4" />
                                        <span>Date: <span className="font-medium text-gray-900 dark:text-white">{format(new Date(), 'dd MMM yyyy, hh:mm a')}</span></span>
                                    </div>

                                    {/* Amount Input */}
                                    <div className="space-y-2">
                                        <FormInput
                                            label="Amount to Handover"
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            required
                                            min="1"
                                            startIcon={<span className="text-gray-500 font-bold text-2xl">₹</span>}
                                            className="text-3xl font-bold h-14"
                                        />
                                        
                                        <div className="flex justify-between items-start">
                                            {selectedCount > 0 ? (
                                                <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                                    Auto-filled from {selectedCount} selected transactions
                                                </p>
                                            ) : (
                                                <div />
                                            )}

                                            {method === 'CASH' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDenominations(!showDenominations)}
                                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                >
                                                    <Calculator className="w-3 h-3" />
                                                    {showDenominations ? 'Hide Calculator' : 'Cash Calculator'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Denomination Calculator */}
                                    {showDenominations && method === 'CASH' && (
                                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3 animate-in slide-in-from-top-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                    <Coins className="w-4 h-4" />
                                                    Denominations
                                                </h4>
                                                <button
                                                    type="button"
                                                    onClick={appendDenominationToNotes}
                                                    className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                                >
                                                    Add to Notes
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {DENOMINATIONS.map(denom => (
                                                    <div key={denom} className="flex items-center gap-1 bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-700">
                                                        <span className="text-xs font-bold text-gray-500 w-8">₹{denom}</span>
                                                        <span className="text-gray-300 text-xs">x</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            placeholder="0"
                                                            className="w-full bg-transparent border-none p-0 text-sm font-medium focus:ring-0 text-right"
                                                            value={counts[denom] || ''}
                                                            onChange={(e) => updateDenomination(denom, e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Method */}
                                    <FormSelect
                                        label="Payment Mode"
                                        value={method}
                                        onChange={(e) => setMethod(e.target.value)}
                                        options={[
                                            { label: 'Cash', value: 'CASH' },
                                            { label: 'UPI / Online', value: 'UPI' },
                                            { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
                                            { label: 'Cheque', value: 'CHEQUE' }
                                        ]}
                                        icon={
                                            method === 'CASH' ? Banknote :
                                            method === 'UPI' ? CreditCard :
                                            method === 'BANK_TRANSFER' ? Building2 :
                                            Wallet
                                        }
                                    />

                                    {/* Notes */}
                                    <FormTextarea
                                        label="Remarks / Notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Enter details about this handover..."
                                        rows={3}
                                        icon={FileText}
                                    />

                                    {/* Attachment Upload */}
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-foreground block">
                                            Proof / Attachment (Optional)
                                        </label>
                                        
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*,.pdf"
                                            onChange={handleFileUpload}
                                        />

                                        {!attachmentUrl ? (
                                            <div 
                                                onClick={() => !uploading && fileInputRef.current?.click()}
                                                className={`
                                                    border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4
                                                    flex flex-col items-center justify-center gap-2 cursor-pointer
                                                    hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600
                                                    transition-all group
                                                `}
                                            >
                                                {uploading ? (
                                                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                                ) : (
                                                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full group-hover:scale-110 transition-transform">
                                                        <Upload className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {uploading ? 'Uploading...' : 'Click to upload proof'}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        Image or PDF (max 5MB)
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 group">
                                                <div className="p-3 flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                        <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                            Attachment Uploaded
                                                        </p>
                                                        <a 
                                                            href={attachmentUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate block"
                                                        >
                                                            View Attachment
                                                        </a>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAttachmentUrl('')}
                                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 flex gap-3">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="flex-1"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200 dark:shadow-none"
                                            disabled={submitting || uploading}
                                        >
                                            {submitting ? 'Submitting...' : 'Confirm Handover'}
                                        </Button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
