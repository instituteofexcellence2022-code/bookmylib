
import { Skeleton } from "@/components/ui/Skeleton"
import { AnimatedCard, CompactCard } from '@/components/ui/AnimatedCard'

export default function Loading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton type="rect" className="h-8 w-64 mb-2" />
          <Skeleton type="rect" className="h-4 w-48" />
        </div>
        <div className="hidden md:block">
          <Skeleton type="rect" className="h-4 w-48" />
        </div>
      </div>
      
      {/* Announcements Skeleton */}
      <div className="space-y-4">
        <Skeleton type="rect" className="h-6 w-32" />
        <div className="space-y-3">
          <Skeleton type="rect" className="h-24 w-full rounded-xl" />
          <Skeleton type="rect" className="h-24 w-full rounded-xl" />
        </div>
      </div>

      {/* Shift Timer Card Skeleton */}
      <div className="rounded-xl overflow-hidden h-48 bg-gray-100 dark:bg-gray-800 animate-pulse relative">
        <div className="p-5">
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <Skeleton type="rect" className="h-4 w-24 bg-gray-200 dark:bg-gray-700" />
                    <Skeleton type="rect" className="h-8 w-32 bg-gray-200 dark:bg-gray-700" />
                    <Skeleton type="rect" className="h-3 w-40 bg-gray-200 dark:bg-gray-700" />
                </div>
            </div>
        </div>
      </div>

      {/* Quick Stats Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
