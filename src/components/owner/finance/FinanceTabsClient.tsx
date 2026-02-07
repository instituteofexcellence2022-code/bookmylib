'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { RevenueStatsClient } from '@/components/owner/finance/RevenueStatsClient'
import { RevenueChartClient } from '@/components/owner/finance/RevenueChartClient'
import { RevenueDistributionClient } from '@/components/owner/finance/RevenueDistributionClient'
import { PaymentHistoryClient } from '@/components/owner/finance/PaymentHistoryClient'
import { AcceptPaymentClient } from '@/components/owner/finance/AcceptPaymentClient'
import { HandoverVerificationClient } from '@/components/owner/finance/HandoverVerificationClient'
import { LayoutDashboard, PlusCircle, Wallet } from 'lucide-react'

export function FinanceTabsClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'overview' | 'accept' | 'handovers') || 'overview'

    const setActiveTab = (tab: 'overview' | 'accept' | 'handovers') => {
        router.push(`/owner/finance?tab=${tab}`)
    }

    return (
        <div className="space-y-6">
            {/* Tabs Header */}
            <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'overview'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Overview</span>
                </button>
                <button
                    onClick={() => setActiveTab('accept')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'accept'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate">Accept Payment</span>
                    <span className="sm:hidden truncate">Accept</span>
                </button>
                <button
                    onClick={() => setActiveTab('handovers')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'handovers'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <Wallet className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate">Verification</span>
                    <span className="sm:hidden truncate">Verify</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <RevenueStatsClient />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="lg:col-span-1">
                                <RevenueChartClient />
                            </div>
                            <div className="lg:col-span-1">
                                <RevenueDistributionClient />
                            </div>
                        </div>

                        <PaymentHistoryClient />
                    </div>
                )}
                
                {activeTab === 'accept' && (
                    <div className="mt-2">
                        <AcceptPaymentClient />
                    </div>
                )}

                {activeTab === 'handovers' && (
                    <div className="mt-2">
                        <HandoverVerificationClient />
                    </div>
                )}
            </div>
        </div>
    )
}
