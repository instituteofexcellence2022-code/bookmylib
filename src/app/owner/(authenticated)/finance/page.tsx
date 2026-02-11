import React, { Suspense } from 'react'
import { FinanceTabsClient } from '@/components/owner/finance/FinanceTabsClient'
import { FinanceResetButton } from '@/components/owner/finance/FinanceResetButton'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Icon } from '@/components/ui/Icon'
import Link from 'next/link'

export default function RevenuePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue & Collection</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor your library's financial performance.</p>
        </div>
        <Suspense>
          <div className="flex items-center gap-2">
            <AnimatedButton 
              asChild 
              variant="purple" 
              size="icon" 
              icon="add" 
              aria-label="Create Booking / Accept Payment"
              className="shadow-sm"
            >
              <Link href="/owner/bookings?view=create&tab=existing">
                <Icon name="add" size="md" />
              </Link>
            </AnimatedButton>
            <FinanceResetButton />
          </div>
        </Suspense>
      </div>

      <Suspense>
        <FinanceTabsClient />
      </Suspense>
    </div>
  )
}
