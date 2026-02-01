import React from 'react'
import { getPublishedBranches } from '@/actions/booking'
import { BookingPageClient } from './BookingPageClient'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export default async function BookPage() {
  const { success, branches, error } = await getPublishedBranches()
  
  // Get current student session and active subscriptions
  const cookieStore = await cookies()
  const studentId = cookieStore.get(COOKIE_KEYS.STUDENT)?.value
  
  let activeBranchIds: string[] = []
  
  if (studentId) {
    try {
      const subscriptions = await prisma.studentSubscription.findMany({
        where: {
          studentId,
          status: 'active',
          endDate: { gt: new Date() }
        },
        select: { branchId: true }
      })
      activeBranchIds = subscriptions.map(s => s.branchId)
    } catch (err) {
      console.error('Error fetching active subscriptions:', err)
    }
  }

  if (!success) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg">
        {error || 'Failed to load branches'}
      </div>
    )
  }

  return (
    <div className="space-y-2 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Book Your Seat</h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Explore our library branches and find your perfect study spot.
        </p>
      </div>

      <BookingPageClient branches={branches ?? null} activeBranchIds={activeBranchIds} />
    </div>
  )
}
