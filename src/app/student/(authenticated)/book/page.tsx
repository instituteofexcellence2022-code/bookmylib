import React from 'react'
import { getPublishedBranches } from '@/actions/booking'
import { BookingPageClient } from './BookingPageClient'

export default async function BookPage() {
  const { success, branches, error } = await getPublishedBranches()

  if (!success) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg">
        {error || 'Failed to load branches'}
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Book Your Seat</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Explore our library branches and find your perfect study spot.
        </p>
      </div>

      <BookingPageClient branches={branches ?? null} />
    </div>
  )
}
