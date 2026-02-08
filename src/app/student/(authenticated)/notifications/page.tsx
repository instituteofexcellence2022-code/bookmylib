import React from 'react'
import { getStudentAnnouncements } from '@/actions/announcement'
import { NotificationsClient } from '@/components/student/NotificationsClient'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const announcements = await getStudentAnnouncements()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Updates & Announcements</h1>
        <p className="text-gray-600 dark:text-gray-400">Stay informed about library news and important updates.</p>
      </div>
      
      <NotificationsClient initialAnnouncements={announcements.map(a => ({ ...a, priority: 'normal' }))} />
    </div>
  )
}
