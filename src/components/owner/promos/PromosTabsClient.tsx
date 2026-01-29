'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { PromotionsList } from '@/components/owner/promos/PromotionsList'
import { ReferAndEarnTab } from '@/components/owner/promos/ReferAndEarnTab'
import { Tag, Users } from 'lucide-react'

export function PromosTabsClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTab = (searchParams.get('tab') as 'promotions' | 'referral') || 'promotions'

    const setActiveTab = (tab: 'promotions' | 'referral') => {
        router.push(`/owner/promos?tab=${tab}`)
    }

    return (
        <div className="space-y-6">
            {/* Tabs Header */}
            <div className="flex p-1 space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md">
                <button
                    onClick={() => setActiveTab('promotions')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'promotions'
                            ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-950 dark:text-purple-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <Tag className="w-4 h-4" />
                    <span>Promotions</span>
                </button>
                <button
                    onClick={() => setActiveTab('referral')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                        activeTab === 'referral'
                            ? 'bg-white text-purple-600 shadow-sm dark:bg-gray-950 dark:text-purple-400'
                            : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700/50'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Refer & Earn</span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeTab === 'promotions' && <PromotionsList />}
                {activeTab === 'referral' && <ReferAndEarnTab />}
            </div>
        </div>
    )
}
