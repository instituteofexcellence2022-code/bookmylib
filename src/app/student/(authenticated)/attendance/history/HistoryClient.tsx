'use client'

import React, { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, Download, Filter, ChevronDown, ChevronUp, Clock, LogIn, LogOut, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { format, isSameDay } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

import { AttendanceHeatmap } from '@/components/ui/attendance-heatmap'

interface HistoryClientProps {
  history: any[]
  stats: any
  embedded?: boolean
}

export default function HistoryClient({ history, stats, embedded = false }: HistoryClientProps) {
  // Group history by day
  const dailyRecords = useMemo(() => {
    const groups: Record<string, any> = {}

    history.forEach(record => {
      const dateKey = format(new Date(record.checkIn), 'yyyy-MM-dd')
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: new Date(record.checkIn),
          sessions: [],
          totalDuration: 0,
          firstIn: new Date(record.checkIn),
          lastOut: record.checkOut ? new Date(record.checkOut) : null,
          tags: new Set()
        }
      }

      const group = groups[dateKey]
      group.sessions.push(record)
      group.totalDuration += record.duration || 0
      
      // Update first In
      if (new Date(record.checkIn) < group.firstIn) {
        group.firstIn = new Date(record.checkIn)
      }

      // Update last Out
      if (record.checkOut) {
        if (!group.lastOut || new Date(record.checkOut) > group.lastOut) {
          group.lastOut = new Date(record.checkOut)
        }
      }

      // Collect tags
      if (record.tags) {
        record.tags.forEach((tag: any) => group.tags.add(tag))
      }
    })

    return Object.values(groups).sort((a: any, b: any) => b.date.getTime() - a.date.getTime())
  }, [history])

  // Calculate duration string
  const formatDuration = (minutes: number) => {
    if (!minutes) return '-'
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return `${h}h ${m}m`
  }

  return (
    <div className="space-y-6">
      {!embedded && (
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/student/attendance" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance History</h1>
        </div>
        <AnimatedButton variant="ghost" size="sm" className="rounded-full w-9 h-9 p-0 text-gray-600 dark:text-gray-300">
          <Download className="w-5 h-5" />
        </AnimatedButton>
      </div>
      )}

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Activity Log</h3>
          <AttendanceHeatmap data={history.map(h => ({ date: new Date(h.checkIn), duration: h.duration || 0, status: h.status }))} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalSessions || 0}</div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium uppercase tracking-wider">Total Days</div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
           <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
             {stats?.totalHours || 0}h
           </div>
           <div className="text-xs text-purple-600/70 dark:text-purple-400/70 font-medium uppercase tracking-wider">Total Hours</div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {stats?.currentStreak || 0}
          </div>
          <div className="text-xs text-orange-600/70 dark:text-orange-400/70 font-medium uppercase tracking-wider">Current Streak</div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats?.averageDailyHours || 0}h
          </div>
          <div className="text-xs text-green-600/70 dark:text-green-400/70 font-medium uppercase tracking-wider">Avg Daily</div>
        </div>
      </div>

      {/* Daily Records List */}
      <div className="space-y-4">
        {dailyRecords.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              No attendance records found.
            </div>
        ) : (
          dailyRecords.map((day: any) => (
            <DailyRecordCard key={day.date.toISOString()} day={day} formatDuration={formatDuration} />
          ))
        )}
      </div>
    </div>
  )
}

function DailyRecordCard({ day, formatDuration }: { day: any, formatDuration: (m: number) => string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Convert Set to Array for tags
  const tags = Array.from(day.tags) as any[]
  const hasOverstay = tags.some(t => t.type === 'destructive')
  const hasLate = tags.some(t => t.type === 'warning')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      {/* Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
           <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg border ${
             hasOverstay ? 'bg-red-50 border-red-100 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' :
             hasLate ? 'bg-amber-50 border-amber-100 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' :
             'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
           }`}>
              <span className="text-xs font-bold uppercase">{format(day.date, 'MMM')}</span>
              <span className="text-xl font-bold">{format(day.date, 'dd')}</span>
           </div>
           
           <div>
             <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {format(day.date, 'EEEE')}
                </h3>
                {hasOverstay && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                    Overstay
                  </span>
                )}
                {hasLate && !hasOverstay && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Late
                  </span>
                )}
             </div>
             
             <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <div className="flex items-center gap-1">
                  <LogIn className="w-3.5 h-3.5" />
                  {format(day.firstIn, 'hh:mm a')}
                </div>
                <span>-</span>
                <div className="flex items-center gap-1">
                  <LogOut className="w-3.5 h-3.5" />
                  {day.lastOut ? format(day.lastOut, 'hh:mm a') : 'Active'}
                </div>
             </div>
           </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 pl-[4.5rem] md:pl-0">
           <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Duration</div>
              <div className="text-lg font-bold text-gray-900 dark:text-white">{formatDuration(day.totalDuration)}</div>
           </div>
           
           <button 
             className={`p-2 rounded-full transition-colors ${isExpanded ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
           >
             {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
           </button>
        </div>
      </div>

      {/* Expandable Sessions List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50"
          >
            <div className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Sessions ({day.sessions.length})
              </h4>
              {day.sessions.map((session: any, idx: number) => (
                <div key={session.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md text-blue-600 dark:text-blue-400 font-medium text-xs">
                      #{day.sessions.length - idx}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                        <span>{format(new Date(session.checkIn), 'hh:mm a')}</span>
                        <span className="text-gray-400">→</span>
                        <span>{session.checkOut ? format(new Date(session.checkOut), 'hh:mm a') : 'Active'}</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                         {session.branch?.name || 'Library'} • {session.planName || 'Standard'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-10 sm:pl-0">
                    <div className="flex flex-wrap gap-1 justify-end">
                       {session.tags?.map((tag: any, i: number) => (
                         <span key={i} className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${
                            tag.type === 'destructive' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
                            tag.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
                            tag.type === 'secondary' ? 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700' :
                            'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                         }`}>
                           {tag.label}
                         </span>
                       ))}
                    </div>
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-16 text-right">
                       {formatDuration(session.duration)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
