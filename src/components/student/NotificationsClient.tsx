'use client'

import React, { useState } from 'react'
import { format, isPast, differenceInDays } from 'date-fns'
import { 
  Megaphone, 
  Calendar, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  AlertOctagon, 
  Tag, 
  Newspaper,
  Clock,
  Search,
  Filter
} from 'lucide-react'
import { CompactCard } from '@/components/ui/AnimatedCard'

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  target: string
  branchId: string | null
  isActive: boolean
  expiresAt: Date | null
  createdAt: Date
}

interface NotificationsClientProps {
  initialAnnouncements: Announcement[]
}

export function NotificationsClient({ initialAnnouncements }: NotificationsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'alert': return <AlertOctagon className="w-5 h-5 text-red-500" />
      case 'offers': return <Tag className="w-5 h-5 text-purple-500" />
      case 'news': return <Newspaper className="w-5 h-5 text-indigo-500" />
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      default: return <Info className="w-5 h-5 text-blue-500" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'warning': return 'Warning'
      case 'alert': return 'Important'
      case 'offers': return 'Offer'
      case 'news': return 'News'
      case 'success': return 'Success'
      default: return 'Info'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800'
      case 'alert': return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'offers': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800'
      case 'news': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
      case 'success': return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
    }
  }

  const filteredAnnouncements = initialAnnouncements.filter(announcement => {
    if (filterType !== 'all' && announcement.type !== filterType) return false
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        announcement.title.toLowerCase().includes(searchLower) ||
        announcement.content.toLowerCase().includes(searchLower)
      )
    }
    
    return true
  })

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search updates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
        <div className="relative min-w-[150px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
          >
            <option value="all">All Types</option>
            <option value="info">Information</option>
            <option value="warning">Warning</option>
            <option value="alert">Important</option>
            <option value="offers">Offers</option>
            <option value="news">News</option>
            <option value="success">Success</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No updates found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || filterType !== 'all' 
                ? "Try adjusting your search or filters" 
                : "Check back later for new announcements"}
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <CompactCard 
              key={announcement.id} 
              className={`p-5 border-l-4 overflow-hidden ${getTypeColor(announcement.type).split(' ')[0].replace('bg-', 'border-l-')}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(announcement.type)}
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {announcement.title}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </p>

                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(announcement.type)}`}>
                    {getTypeLabel(announcement.type)}
                  </span>

                  {announcement.expiresAt && (
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 border ${
                      differenceInDays(new Date(announcement.expiresAt), new Date()) <= 3
                        ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
                        : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                    }`}>
                      <Clock className="w-3 h-3" />
                      Expires: {format(new Date(announcement.expiresAt), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            </CompactCard>
          ))
        )}
      </div>
    </div>
  )
}
