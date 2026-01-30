'use client'

import React from 'react'
import { AlertTriangle, AlertOctagon, Tag, Newspaper, CheckCircle, Info, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

interface Announcement {
  id: string
  title: string
  content: string
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
            className={`p-4 rounded-xl border bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 transition-all duration-200 cursor-pointer hover:shadow-sm`}
            onClick={() => setExpandedId(expandedId === announcement.id ? null : announcement.id)}
          >
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                <Info className="w-5 h-5 text-blue-500" />
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
