'use client'

import React, { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { 
  Megaphone, 
  Info, 
  AlertTriangle, 
  Clock,
  Search
} from 'lucide-react'
import { CompactCard } from '@/components/ui/AnimatedCard'

interface Announcement {
  id: string
  title: string
  content: string
  priority: string
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

  const filteredAnnouncements = initialAnnouncements.filter(announcement => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        announcement.title.toLowerCase().includes(searchLower) ||
        announcement.content.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const getPriorityColor = (priority: string) => {
    return priority === 'high' 
      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800'
  }

  const getPriorityIcon = (priority: string) => {
    return priority === 'high'
      ? <AlertTriangle className="w-5 h-5 text-red-500" />
      : <Info className="w-5 h-5 text-blue-500" />
  }

  return (
    <div className="space-y-6">
      {/* Search */}
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
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No updates found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm 
                ? "Try adjusting your search" 
                : "Check back later for new announcements"}
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <CompactCard 
              key={announcement.id} 
              className={`p-5 border-l-4 overflow-hidden ${announcement.priority === 'high' ? 'border-l-red-500' : 'border-l-blue-500'}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-2">
                    {getPriorityIcon(announcement.priority)}
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
                  {announcement.priority === 'high' && (
                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(announcement.priority)}`}>
                      Important
                    </span>
                  )}

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
