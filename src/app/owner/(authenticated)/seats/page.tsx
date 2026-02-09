import { Suspense } from 'react'
import { getSeats } from '@/actions/owner/seats'
import { getOwnerBranches } from '@/actions/branch'
import { SeatsClient } from '@/components/owner/seats/SeatsClient'

export default async function SeatsPage() {
  const [seatsResult, branchesResult] = await Promise.all([
    getSeats(),
    getOwnerBranches()
  ])

  const seats = seatsResult.success && seatsResult.data ? seatsResult.data : []
  const branches = branchesResult.success && branchesResult.data ? branchesResult.data : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Seat Management</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your library seats, assign them to students, and track availability.
        </p>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <SeatsClient initialSeats={seats} branches={branches} />
      </Suspense>
    </div>
  )
}
