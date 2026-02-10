import { Suspense } from 'react'
import { getBookings } from '@/actions/staff/bookings'
import { BookingsClient } from '@/components/staff/bookings/BookingsClient'

export default async function BookingsPage() {
  const bookingsResult = await getBookings()
  const bookings = bookingsResult.success && bookingsResult.data ? bookingsResult.data : []

  return (
    <div className="space-y-6 p-2 md:p-0">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Booking Management</h1>
        <p className="text-gray-500 dark:text-gray-400">
          View and manage student bookings, subscriptions, and assignments.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <BookingsClient initialBookings={bookings} />
      </Suspense>
    </div>
  )
}
