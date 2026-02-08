'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { VerifyDocumentList } from '@/components/owner/verification/VerifyDocumentList'
import { VerifyPaymentList } from '@/components/owner/finance/VerifyPaymentList'
import { FileText, CreditCard } from 'lucide-react'

export function VerificationTabsClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'documents' | 'payments') || 'documents'

    const setActiveTab = (tab: 'documents' | 'payments') => {
        router.push(`/owner/verification?tab=${tab}`)
    }

    return (
        <div className="space-y-6">
            {/* Tabs Header */}
            <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md">
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'documents'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    <span>Document Verification</span>
                </button>
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'payments'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <CreditCard className="w-4 h-4" />
                    <span>Payment Verification</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'documents' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Documents</h2>
                                <p className="text-sm text-gray-500">Verify student identity documents</p>
                            </div>
                        </div>
                        <VerifyDocumentList />
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pending Payments</h2>
                                <p className="text-sm text-gray-500">Verify offline payment proofs</p>
                            </div>
                        </div>
                        <VerifyPaymentList />
                    </div>
                )}
            </div>
        </div>
    )
}
