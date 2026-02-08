import React from 'react'
import { AnnouncementManager } from '@/components/owner/marketing/AnnouncementManager'

export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage announcements and notifications for your library.</p>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 px-6 py-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Announcements</h2>
        </div>
        <div className="p-6">
           <AnnouncementManager />
        </div>
      </div>
    </div>
  )
}
