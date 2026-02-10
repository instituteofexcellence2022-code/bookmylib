'use client'

import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCcw } from 'lucide-react'

export function FinanceResetButton() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const activeTab = searchParams.get('tab') || 'overview'
    
    // Check if there are any filters active to optionally disable or style the button
    // The filters we care about are: branchId, period, startDate, endDate
    const hasFilters = searchParams.has('branchId') || 
                       searchParams.has('period') || 
                       searchParams.has('startDate') || 
                       searchParams.has('endDate')

    const resetFilters = () => {
        router.push(`/owner/finance?tab=${activeTab}`)
    }

    return (
        <button 
            onClick={resetFilters}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Reset Filters"
        >
            <RefreshCcw className={`w-4 h-4 ${hasFilters ? 'text-purple-500' : ''}`} />
        </button>
    )
}
