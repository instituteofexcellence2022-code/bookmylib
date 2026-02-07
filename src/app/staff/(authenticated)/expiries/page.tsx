import { Suspense } from 'react'
import { StaffDuesClient } from '@/components/staff/finance/StaffDuesClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dues & Expiries | Staff Portal',
  description: 'Manage subscription expirations and overdue payments',
}

export default function StaffExpiriesPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dues & Expiries</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage upcoming expirations and overdue subscriptions</p>
      </div>
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading expiries...</div>}>
        <StaffDuesClient />
      </Suspense>
    </div>
  )
}
