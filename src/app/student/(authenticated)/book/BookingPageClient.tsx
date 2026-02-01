'use client'

import React, { useState } from 'react'
import { LayoutGrid, List, Building2, Search, MapPin } from 'lucide-react'
import { BranchCard, BranchCardProps } from '@/components/student/BranchCard'
import { BranchListItem } from '@/components/student/BranchListItem'

interface BookingPageClientProps {
  branches: BranchCardProps['branch'][] | null
  activeBranchIds: string[]
}

export function BookingPageClient({ branches, activeBranchIds }: BookingPageClientProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredBranches = branches?.filter(branch => {
    if (!searchQuery) return true
    
    const query = searchQuery.toLowerCase()
    return (
      branch.name.toLowerCase().includes(query) || 
      branch.library.name.toLowerCase().includes(query) ||
      branch.address.toLowerCase().includes(query) || 
      branch.city.toLowerCase().includes(query) ||
      branch.state.toLowerCase().includes(query) ||
      branch.pincode.includes(query)
    )
  }) || []

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
      <div className="flex flex-row gap-4 justify-between items-center">
          {/* Search Input */}
          <div className="flex-1 w-full md:max-w-xl group">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Search by library name, area, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all sm:text-sm"
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-1.5 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-sm ring-1 ring-black/5 dark:ring-white/10'
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
