'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  MapPin, 
  Users, 
  Armchair, 
  Search, 
  ArrowUpRight,
  Edit,
  Loader2
} from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import Link from 'next/link'
import { getOwnerBranches } from '@/actions/branch'

// Types
type BranchStatus = 'active' | 'maintenance' | 'coming_soon' | 'archived'

interface Branch {
  id: string
  name: string
  address: string
  area?: string
  city?: string
  status: string
  seats: { total: number; occupied: number }
  staff: number
  revenue: number
  amenities: string[]
  images?: string
}

const tabs = [
  { id: 'all', label: 'All Branches' },
  { id: 'active', label: 'Active' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'archived', label: 'Archived' }
]

export default function BranchesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const data = await getOwnerBranches()
        setBranches(data as Branch[])
      } catch (error) {
        console.error('Failed to load branches', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchBranches()
  }, [])

  const filteredBranches = branches.filter(branch => {
    const matchesTab = activeTab === 'all' || 
      (activeTab === 'maintenance' ? ['maintenance', 'coming_soon'].includes(branch.status) : branch.status === activeTab)
    const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      branch.address.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'maintenance': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'coming_soon': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'archived': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Branch Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage and monitor all your library locations</p>
        </div>
        <Link href="/owner/branches/add">
          <AnimatedButton variant="primary" size="sm" icon="add">
            Add New Branch
          </AnimatedButton>
        </Link>
      </div>

      {/* Controls & Tabs */}
      <div className="flex flex-col gap-4">
        {/* Search & Filter Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors outline-none ${
                  activeTab === tab.id
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeBranchTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Branch Cards Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredBranches.map((branch) => (
            <motion.div
              key={branch.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <CompactCard className="h-full group hover:border-purple-200 dark:hover:border-purple-900/50 transition-colors">
                {/* Branch Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 text-purple-600 dark:text-purple-400 overflow-hidden relative">
                      {(() => {
                        let imageUrl = null;
                        try {
                          if (branch.images) {
                            const parsed = JSON.parse(branch.images);
                            if (Array.isArray(parsed) && parsed.length > 0) {
                              imageUrl = parsed[0];
                            }
                          }
                        } catch (e) {}
                        
                        return imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={branch.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        );
                      })()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">{branch.name}</h3>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="line-clamp-1">
                          {(() => {
                            // Combine all parts, split by comma, trim, and deduplicate
                            const rawParts = [branch.address, branch.area, branch.city]
                              .filter(Boolean)
                              .join(', ')
                              .split(',')
                              .map(part => part.trim())
                              .filter(part => part.length > 0);
                            
                            return Array.from(new Set(rawParts)).join(', ');
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <AnimatedButton
                      variant="ghost"
                      size="xs"
                      compact
                      className="text-gray-400 hover:text-purple-600 dark:hover:text-purple-400"
                      onClick={() => router.push(`/owner/branches/${branch.id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                    </AnimatedButton>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Armchair className="w-3.5 h-3.5 text-blue-500" />
                      <span className="text-[10px] text-gray-500 font-medium">Seats</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {branch.seats.occupied}/{branch.seats.total}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Users className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-[10px] text-gray-500 font-medium">Staff</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {branch.staff}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ArrowUpRight className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-[10px] text-gray-500 font-medium">Rev</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{(branch.revenue / 1000).toFixed(1)}k
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className={`px-2 py-1 rounded-full text-[10px] font-medium ${getStatusColor(branch.status)}`}>
                    {branch.status.replace('_', ' ').toUpperCase()}
                  </div>
                  <Link href={`/owner/branches/${branch.id}`}>
                    <span className="text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">
                      View Details
                    </span>
                  </Link>
                </div>
              </CompactCard>
            </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {filteredBranches.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No branches found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
