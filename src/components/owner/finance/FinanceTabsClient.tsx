'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { RevenueStatsClient } from '@/components/owner/finance/RevenueStatsClient'
import { RevenueChartClient } from '@/components/owner/finance/RevenueChartClient'
import { RevenueDistributionClient } from '@/components/owner/finance/RevenueDistributionClient'
import { PaymentHistoryClient } from '@/components/owner/finance/PaymentHistoryClient'
import { FinanceFilterBar } from '@/components/owner/finance/FinanceFilterBar'
import { LayoutDashboard, History } from 'lucide-react'

export function FinanceTabsClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'overview' | 'transactions') || 'overview'

    const setActiveTab = (tab: 'overview' | 'transactions') => {
        router.push(`/owner/finance?tab=${tab}`)
    }

    return (
        <div className="space-y-6">
            {/* Tabs Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                            activeTab === 'overview'
                                ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-950 dark:text-emerald-400'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Overview</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                            activeTab === 'transactions'
                                ? 'bg-white text-emerald-600 shadow-sm dark:bg-gray-950 dark:text-emerald-400'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                        }`}
                    >
                        <History className="w-4 h-4" />
                        <span>Recent Transactions</span>
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <FinanceFilterBar />
                        <RevenueStatsClient />
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="lg:col-span-1">
                                <RevenueChartClient />
                            </div>
                            <div className="lg:col-span-1">
                                <RevenueDistributionClient />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (
                    <PaymentHistoryClient />
                )}
            </div>
        </div>
    )
}
