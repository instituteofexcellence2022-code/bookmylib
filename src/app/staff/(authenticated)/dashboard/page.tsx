'use client'

import React from 'react'
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  IndianRupee,
  Armchair,
  CalendarDays
} from 'lucide-react'
import { AnimatedCard, CompactCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

const urgentTasks = [
  { id: 1, title: 'Check AC in Room A', type: 'maintenance', time: '10 min ago' },
  { id: 2, title: 'Collect dues from Seat 45', type: 'finance', time: '30 min ago' },
  { id: 3, title: 'New enquiry follow-up', type: 'sales', time: '1 hour ago' },
]

const recentActivity = [
  { id: 1, text: 'Checked in Student #123', time: '5 min ago' },
  { id: 2, text: 'Collected ₹5000 fee', time: '20 min ago' },
  { id: 3, text: 'Reported WiFi issue', time: '1 hour ago' },
]

export default function StaffDashboard() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Good Morning, Rahul</h1>
          <p className="text-gray-500 dark:text-gray-400">Here&apos;s your shift overview.</p>
        </div>
        <div className="hidden md:block">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

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

        <CompactCard>
          <div className="flex flex-col items-center text-center">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
              <UserPlus size={18} />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">3</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Pending Leads</span>
          </div>
        </CompactCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Urgent Tasks */}
        <CompactCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              Urgent Tasks
            </h3>
            <span className="text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full">
              3 Pending
            </span>
          </div>
          <div className="space-y-3">
            {urgentTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer">
                <div className="mt-0.5">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{task.time}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded border capitalize ${
                  task.type === 'maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  task.type === 'finance' ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {task.type}
                </span>
              </div>
            ))}
          </div>
        </CompactCard>

        {/* Recent Activity Log */}
        <CompactCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-500" />
              My Activity
            </h3>
            <AnimatedButton 
              variant="ghost" 
              size="xs" 
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 h-auto py-1 px-2 min-h-0"
            >
              View All
            </AnimatedButton>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{activity.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CompactCard>
      </div>
    </div>
  )
}
