'use client'

import React, { useState, useEffect } from 'react'
import { LayoutGrid, List, Building2, Search, MapPin } from 'lucide-react'
import { BranchCard, BranchCardProps } from '@/components/student/BranchCard'
import { BranchListItem } from '@/components/student/BranchListItem'
import { getThemeClasses } from '@/lib/utils'
import type { ThemeColor } from '@/lib/utils'

interface BookingPageClientProps {
  branches: BranchCardProps['branch'][] | null
  activeBranchIds: string[]
  theme?: ThemeColor
  publicMode?: boolean
}

export function BookingPageClient({ branches, activeBranchIds, theme = 'emerald', publicMode = false }: BookingPageClientProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const themeClasses = getThemeClasses(theme)

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.log('Geolocation error:', error)
        }
      )
    }
  }, [])

  // Helper function to calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371 // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180)
    const dLon = (lon2 - lon1) * (Math.PI / 180)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
  }
  
  const branchesWithDistance = branches?.map(branch => {
    let distance: number | null = null
    if (userLocation && branch.latitude && branch.longitude) {
      distance = calculateDistance(userLocation.lat, userLocation.lng, branch.latitude, branch.longitude)
    }
    return { ...branch, distance }
  }) || []

  const filteredBranches = branchesWithDistance.filter(branch => {
    if (!searchQuery.trim()) return true
    
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/)
    const searchableText = [
      branch.name,
      branch.library?.name,
      branch.address,
      branch.city,
      branch.state,
      branch.pincode
    ].filter(Boolean).join(' ').toLowerCase()

    return searchTerms.every(term => searchableText.includes(term))
  }).sort((a, b) => {
    if (a.distance !== null && b.distance !== null) {
      return a.distance - b.distance
    }
    if (a.distance !== null) return -1
    if (b.distance !== null) return 1
    return 0
  })

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
                <Search className={`h-5 w-5 text-gray-400 ${themeClasses.iconFocus} transition-colors`} />
              </div>
              <input 
                type="text"
                placeholder="Search by library name, area, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-800 focus:ring-2 ${themeClasses.ringFocus} ${themeClasses.borderFocus} transition-all sm:text-sm`}
              />
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center p-1.5 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shrink-0 self-end md:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? `bg-white dark:bg-gray-800 ${themeClasses.textLight} shadow-sm ring-1 ring-black/5 dark:ring-white/10`
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
                  ? `bg-white dark:bg-gray-800 ${themeClasses.textLight} shadow-sm ring-1 ring-black/5 dark:ring-white/10`
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

      {/* Content */}
      {filteredBranches.length === 0 ? (
        <div className="py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No matching branches found</p>
          <p className="text-sm mt-1">Try adjusting your search query</p>
          <button 
            onClick={() => setSearchQuery('')}
            className={`mt-4 text-sm ${themeClasses.textLight} ${themeClasses.textHover} font-medium hover:underline`}
          >
            Clear search
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => (
            <BranchCard 
              key={branch.id} 
              branch={branch} 
              isActiveMember={activeBranchIds.includes(branch.id)}
              theme={theme}
              publicMode={publicMode}
              distance={branch.distance}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBranches.map((branch) => (
            <BranchListItem
              key={branch.id} 
              branch={branch} 
              isActiveMember={activeBranchIds.includes(branch.id)}
              theme={theme}
              publicMode={publicMode}
              distance={branch.distance}
            />
          ))}
        </div>
      )}
    </div>
  )
}
