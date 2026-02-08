import React, { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@/components/ui/button'
import { X, Wallet, Calendar, FileText, Link as LinkIcon, CheckCircle, XCircle, Clock, ExternalLink, Image as ImageIcon, Banknote, CreditCard, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils'
import Image from 'next/image'

interface VerifyHandoverModalProps {
    isOpen: boolean
    onClose: () => void
    onVerify: () => Promise<void>
    onReject: () => Promise<void>
    transaction: {
        id: string
        amount: number
        date: Date
        description: string
        status: string
        notes?: string
        details?: {
            method?: string
        }
        attachmentUrl?: string | null
        staffName: string
        staffImage?: string | null
    } | null
    loading: boolean
}

export function VerifyHandoverModal({
    isOpen,
    onClose,
    onVerify,
    onReject,
    transaction,
    loading
}: VerifyHandoverModalProps) {
    if (!transaction) return null

    const methodIcon = {
        'CASH': Banknote,
        'UPI': CreditCard,
        'BANK_TRANSFER': Building2,
        'CHEQUE': Wallet
    }[transaction.details?.method || 'CASH'] || Wallet

    const MethodIcon = methodIcon

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
                            <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-0 text-left align-middle shadow-xl transition-all border border-gray-100 dark:border-gray-700">
                                {/* Header */}
                                <div className="p-6 pb-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold leading-6 text-gray-900 dark:text-white flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                Verify Handover
                                                <p className="text-xs font-normal text-gray-500 mt-0.5">
                                                    From {transaction.staffName}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={onClose}
                                            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </Dialog.Title>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Amount Display */}
                                    <div className="text-center py-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount to Receive</p>
                                        <div className="text-4xl font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(transaction.amount)}
                                        </div>
                                        <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            <MethodIcon className="w-4 h-4" />
                                            <span className="font-medium">{transaction.details?.method || 'CASH'}</span>
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Date</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white font-medium">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {format(new Date(transaction.date), 'MMM d, yyyy h:mm a')}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes Section */}
                                    {transaction.notes && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Notes / Breakdown</p>
                                            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line border border-gray-100 dark:border-gray-700">
                                                {transaction.notes}
                                            </div>
                                        </div>
                                    )}

                                    {/* Attachment Section */}
                                    {transaction.attachmentUrl && (
                                        <div className="space-y-2">
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Proof / Attachment</p>
                                            <a 
                                                href={transaction.attachmentUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block group"
                                            >
                                                <div className="relative border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-900 transition-all hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm">
                                                    <div className="p-3 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                                            <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 transition-colors">
                                                                View Attachment
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                Click to open in new tab
                                                            </p>
                                                        </div>
                                                        <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                                    </div>
                                                </div>
                                            </a>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <Button
                                            onClick={onReject}
                                            variant="outline"
                                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/10"
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : (
                                                <>
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Reject
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            onClick={onVerify}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200 dark:shadow-none"
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Verify & Accept
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}
