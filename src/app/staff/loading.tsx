import { Skeleton } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div className="flex h-screen w-full">
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex w-64 flex-col gap-4 border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 mb-8">
            <Skeleton type="circle" size="md" />
            <Skeleton type="text" className="w-32" />
        </div>
        <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} type="rect" className="h-10 w-full" />
            ))}
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
                <Skeleton type="text" size="xl" className="w-64" />
                <Skeleton type="text" size="sm" className="w-48" />
            </div>
            <Skeleton type="circle" size="md" />
        </div>

        {/* Dashboard Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} type="card" className="h-32" />
            ))}
        </div>

        {/* Chart/Table Skeleton */}
        <Skeleton type="rect" className="h-96 w-full rounded-xl" />
      </div>
    </div>
  )
}
