'use client'

import React from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { RevenueStatsClient } from '@/components/owner/finance/RevenueStatsClient'
import { RevenueChartClient } from '@/components/owner/finance/RevenueChartClient'
import { RevenueDistributionClient } from '@/components/owner/finance/RevenueDistributionClient'
import { PaymentHistoryClient } from '@/components/owner/finance/PaymentHistoryClient'
import { LayoutDashboard } from 'lucide-react'

export function FinanceTabsClient() {
    return (
        <div className="space-y-6">
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
            </div>
        </div>
    )
}
