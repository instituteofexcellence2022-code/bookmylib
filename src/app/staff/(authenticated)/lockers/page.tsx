import { getLockers } from '@/actions/staff/lockers'
import { LockersClient } from '@/components/staff/lockers/LockersClient'

export const metadata = {
  title: 'Locker Management',
  description: 'Manage library lockers and allocations',
}

export default async function LockersPage() {
  const result = await getLockers()
  
  // Provide empty array if fetch fails or no data, client handles empty state
  const initialLockers = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Locker Management</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage lockers and allocations.</p>
      </div>

      <LockersClient initialLockers={initialLockers} />
    </div>
  )
}
