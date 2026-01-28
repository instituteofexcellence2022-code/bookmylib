import React from 'react'
import { getPublishedBranches } from '@/actions/booking'
import { Building2 } from 'lucide-react'
import { BranchCard } from '@/components/student/BranchCard'

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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches?.map((branch) => (
          <BranchCard key={branch.id} branch={branch} />
        ))}

        {branches?.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No branches found currently.</p>
          </div>
        )}
      </div>
    </div>
  )
}
