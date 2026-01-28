import React from 'react'
import { FinanceTabsClient } from '@/components/owner/finance/FinanceTabsClient'

export default function RevenuePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue & Collection</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor your library's financial performance.</p>
        </div>
      </div>

      <FinanceTabsClient />
    </div>
  )
}
