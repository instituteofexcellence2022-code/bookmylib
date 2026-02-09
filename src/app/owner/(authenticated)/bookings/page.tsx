import { Suspense } from 'react'
import { getBookings } from '@/actions/owner/bookings'
import { getOwnerBranches } from '@/actions/branch'
import { BookingsClient } from '@/components/owner/bookings/BookingsClient'

export default async function BookingsPage() {
  const [bookingsResult, branchesResult] = await Promise.all([
    getBookings(),
    getOwnerBranches()
  ])

  const bookings = bookingsResult.success && bookingsResult.data ? bookingsResult.data : []
  const branches = branchesResult.success && branchesResult.data ? branchesResult.data : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
        <p className="text-gray-500 dark:text-gray-400">
          View and manage student bookings, subscriptions, and assignments.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <BookingsClient initialBookings={bookings} branches={branches} />
      </Suspense>
    </div>
  )
}
