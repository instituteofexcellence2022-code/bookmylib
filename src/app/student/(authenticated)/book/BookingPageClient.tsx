'use client'

import React, { useState } from 'react'
import { LayoutGrid, List, Building2 } from 'lucide-react'
import { BranchCard, BranchCardProps } from '@/components/student/BranchCard'
import { BranchListItem } from '@/components/student/BranchListItem'

interface BookingPageClientProps {
  branches: BranchCardProps['branch'][] | null
  activeBranchIds: string[]
}

export function BookingPageClient({ branches, activeBranchIds }: BookingPageClientProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  if (!branches || branches.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-lg">No branches found currently.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-end">
        <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all ${
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <BranchCard 
              key={branch.id} 
              branch={branch} 
              isActiveMember={activeBranchIds.includes(branch.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {branches.map((branch) => (
            <BranchListItem 
              key={branch.id} 
              branch={branch} 
              isActiveMember={activeBranchIds.includes(branch.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
