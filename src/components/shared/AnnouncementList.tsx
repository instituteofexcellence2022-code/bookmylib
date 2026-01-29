'use client'

import React from 'react'
import { AlertTriangle, AlertOctagon, Tag, Newspaper, CheckCircle, Info, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

interface Announcement {
  id: string
  title: string
  content: string
  type: string
  createdAt: Date
  expiresAt: Date | null
}

interface AnnouncementListProps {
  announcements: Announcement[]
  title?: string
}

export function AnnouncementList({ announcements, title = "Announcements" }: AnnouncementListProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  if (!announcements || announcements.length === 0) return null

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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30'
      case 'alert': return 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'
      case 'offers': return 'bg-purple-50 dark:bg-purple-900/10 border-purple-100 dark:border-purple-900/30'
      case 'news': return 'bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30'
      case 'success': return 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30'
      default: return 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
        {title}
        <span className="text-xs font-normal px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500">
          {announcements.length}
        </span>
      </h2>
      <div className="grid gap-3">
        {announcements.map((announcement) => (
          <div
            key={announcement.id}
            className={`p-4 rounded-xl border ${getTypeColor(announcement.type)} transition-all duration-200 cursor-pointer hover:shadow-sm`}
            onClick={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
          >
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                {getTypeIcon(announcement.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm sm:text-base pr-4">
                    {announcement.title}
                  </h3>
                  <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true })}
                  </span>
                </div>
                
                <AnimatePresence>
                  {expandedId === announcement.id ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                        {announcement.content}
                      </p>
                      {announcement.expiresAt && (
                        <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          Expires {new Date(announcement.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      {announcement.content}
                    </p>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
