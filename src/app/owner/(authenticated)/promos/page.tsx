import React, { Suspense } from 'react'
import { PromosTabsClient } from '@/components/owner/promos/PromosTabsClient'

export const metadata = {
  title: 'Promotions & Offers',
  description: 'Manage promotions and referral program',
}

export default function PromotionsPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Promotions & Offers</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage coupon codes, discounts, and referral rewards.
          </p>
        </div>
      </div>

      <Suspense>
        <PromosTabsClient />
      </Suspense>
    </div>
  )
}
