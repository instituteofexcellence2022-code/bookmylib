import React from 'react'
import { getPublishedBranches } from '@/actions/booking'
import { BookingPageClient } from '@/app/student/book/BookingPageClient'
import { getAuthenticatedStudent } from '@/lib/auth/student'
import { prisma } from '@/lib/prisma'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Discover Libraries | BookMyLib',
  description: 'Find and book the perfect study space near you. Explore amenities, pricing, and more.',
}

export default async function DiscoverPage() {
  const { success, branches, error } = await getPublishedBranches()
  
  // Optional: Check for session to show active status if user happens to be logged in
  const student = await getAuthenticatedStudent()
  
  let activeBranchIds: string[] = []
  
  if (student) {
    try {
      const subscriptions = await prisma.studentSubscription.findMany({
        where: {
          studentId: student.id,
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
      <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg min-h-screen flex items-center justify-center">
        {error || 'Failed to load branches'}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Discover Your Perfect Study Space
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Browse our network of premium libraries, check amenities, and find the right plan for your success.
          </p>
        </div>

        <BookingPageClient branches={branches ?? null} activeBranchIds={activeBranchIds} theme="indigo" publicMode={true} />
      </div>
    </div>
  )
}
