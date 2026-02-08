import React, { Suspense } from 'react'
import { VerificationTabsClient } from '@/components/owner/verification/VerificationTabsClient'

export const metadata = {
  title: 'Verification Center',
  description: 'Verify student documents and payments',
}

export default function VerificationPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Verification Center</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all pending verifications in one place.</p>
        </div>
      </div>

      <Suspense>
        <VerificationTabsClient />
      </Suspense>
    </div>
  )
}
