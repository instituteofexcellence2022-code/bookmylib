import { Suspense } from 'react'
import { ExpiriesClient } from '@/components/owner/expiries/ExpiriesClient'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dues & Expiries | BookMyLib',
  description: 'Manage subscription expirations and overdue payments',
}

export default function ExpiriesPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading expiries...</div>}>
        <ExpiriesClient />
      </Suspense>
    </div>
  )
}
