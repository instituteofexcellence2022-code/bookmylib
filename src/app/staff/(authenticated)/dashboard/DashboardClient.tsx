'use client'

import React from 'react'
import { 
  Clock, 
  Armchair,
  IndianRupee,
  CalendarDays
} from 'lucide-react'
import { AnimatedCard, CompactCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnnouncementList } from '@/components/shared/AnnouncementList'

interface DashboardClientProps {
  announcements: any[]
  staffName: string
}

export default function DashboardClient({ announcements, staffName }: DashboardClientProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Good Morning, {staffName}</h1>
          <p className="text-gray-500 dark:text-gray-400">Here&apos;s your shift overview.</p>
        </div>
        <div className="hidden md:block">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>
      
      {/* Announcements */}
      <AnnouncementList announcements={announcements} />

      {/* Shift Timer Card */}
      <AnimatedCard variant="gradient" className="bg-gradient-to-br from-green-600 to-emerald-600 text-white relative overflow-hidden border-none shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Clock size={80} />
        </div>
        <div className="p-5 relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-green-100 font-medium mb-1 text-sm">Current Shift</h3>
              <div className="text-2xl font-bold mb-2">04:30:15</div>
              <p className="text-xs text-green-100">Started at 08:00 AM • Ends at 02:00 PM</p>
            </div>
            <AnimatedButton 
              variant="ghost" 
              size="xs" 
              className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white hover:text-white border-transparent"
            >
              End Shift
            </AnimatedButton>
          </div>
          <div className="mt-5 w-full bg-black/20 rounded-full h-1.5">
            <div className="bg-white h-1.5 rounded-full w-[75%]" />
          </div>
        </div>
      </AnimatedCard>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CompactCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
              <Armchair size={18} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">85%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Occupancy</span>
          </div>
        </CompactCard>
        
        <CompactCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-2">
              <IndianRupee size={18} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">₹12k</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Collected</span>
          </div>
        </CompactCard>

        <CompactCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
              <CalendarDays size={18} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">5</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Due Renewals</span>
          </div>
        </CompactCard>
      </div>
    </div>
  )
}
