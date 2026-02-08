import React from 'react'
import { StaffFinanceTabsClient } from '@/components/staff/finance/StaffFinanceTabsClient'

export const metadata = {
  title: 'Finance & Payments',
  description: 'Manage payments and collections'
}

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financials & Cash Ops</h1>
      <StaffFinanceTabsClient />
    </div>
  )
}
