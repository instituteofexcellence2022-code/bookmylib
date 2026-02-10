import React from 'react'
import { getPlatformSubscription, getPlatformPayments, getAvailableSaasPlans, getOwnerPlatformTickets } from '@/actions/owner/platform-subscription'
import { PlatformSubscriptionPageClient } from '@/components/owner/platform-subscription/PlatformSubscriptionPageClient'

export default async function OwnerPlatformSubscriptionPage() {
    const [currentSubscription, availablePlans, payments, tickets] = await Promise.all([
        getPlatformSubscription(),
        getAvailableSaasPlans(),
        getPlatformPayments(),
        getOwnerPlatformTickets()
    ])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Subscription</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your subscription and view payment history.</p>
            </div>
            
            <PlatformSubscriptionPageClient 
                currentSubscription={currentSubscription}
                availablePlans={availablePlans}
                payments={payments}
                tickets={tickets}
            />
        </div>
    )
}
