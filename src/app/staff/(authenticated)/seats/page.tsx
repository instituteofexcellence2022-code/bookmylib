import { getSeats } from '@/actions/staff/seats'
import { SeatsClient } from '@/components/staff/seats/SeatsClient'

export const metadata = {
  title: 'Seat Management',
  description: 'Manage library seats and allocations',
}

export default async function SeatsPage() {
  const result = await getSeats()
  
  // Provide empty array if fetch fails or no data, client handles empty state
  const initialSeats = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Seat Management</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage floor plan and seat allocations.</p>
      </div>

      <SeatsClient initialSeats={initialSeats} />
    </div>
  )
}
