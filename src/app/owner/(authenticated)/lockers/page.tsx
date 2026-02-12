import { Suspense } from 'react'
import { getLockers } from '@/actions/owner/lockers'
import { getOwnerBranches } from '@/actions/branch'
import { LockersClient } from '@/components/owner/lockers/LockersClient'

export default async function LockersPage() {
  const lockersResult = await getLockers()
  const branchesResult = await getOwnerBranches()

  const lockers = lockersResult.success && lockersResult.data ? lockersResult.data : []
  const branches = branchesResult.success && branchesResult.data ? branchesResult.data : []

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Locker Management</h1>
        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">
          Manage lockers across all your branches.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <LockersClient initialLockers={lockers} branches={branches} />
      </Suspense>
    </div>
  )
}
