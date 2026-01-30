'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { StaffRevenueStatsClient } from '@/components/staff/finance/StaffRevenueStatsClient'
import { StaffPaymentHistoryClient } from '@/components/staff/finance/StaffPaymentHistoryClient'
import { StaffAcceptPaymentClient } from '@/components/staff/finance/StaffAcceptPaymentClient'
import { StaffDuesClient } from '@/components/staff/finance/StaffDuesClient'
import { LayoutDashboard, PlusCircle, AlertCircle } from 'lucide-react'

export function StaffFinanceTabsClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'overview' | 'accept' | 'dues')
    const validTabs = ['overview', 'accept', 'dues']
    const currentTab = validTabs.includes(activeTab || '') ? activeTab : 'overview'

    const setActiveTab = (tab: 'overview' | 'accept' | 'dues') => {
        router.push(`/staff/finance?tab=${tab}`)
    }

    return (
        <div className="space-y-6">
            {/* Tabs Header */}
            <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        currentTab === 'overview'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Overview</span>
                </button>
                <button
                    onClick={() => setActiveTab('dues')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        currentTab === 'dues'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate">Dues & Expiries</span>
                    <span className="sm:hidden truncate">Dues</span>
                </button>
                <button
                    onClick={() => setActiveTab('accept')}
                    className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                        currentTab === 'accept'
                            ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate">Accept Payment</span>
                    <span className="sm:hidden truncate">Accept</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {currentTab === 'overview' && (
                    <div className="space-y-6">
                        <StaffRevenueStatsClient />
                        <StaffPaymentHistoryClient />
                    </div>
                )}

                {currentTab === 'dues' && (
                    <div className="mt-2">
                        <StaffDuesClient />
                    </div>
                )}
                
                {currentTab === 'accept' && (
                    <div className="mt-2">
                        <StaffAcceptPaymentClient />
                    </div>
                )}
            </div>
        </div>
    )
}
