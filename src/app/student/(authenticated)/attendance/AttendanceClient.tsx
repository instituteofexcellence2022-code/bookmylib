'use client'

import React, { useState, useEffect } from 'react'
import { QrCode, MapPin, Clock, Timer, AlertTriangle, CheckCircle2, Flame, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { format } from 'date-fns'
import HistoryClient from './history/HistoryClient'
import { motion } from 'framer-motion'
import { getManualCheckInOptions, markManualAttendance } from '@/actions/attendance'
import { toast } from 'sonner'

import { useRouter } from 'next/navigation'

function ManualCheckInModal({ onClose, onSuccess, currentBranchId }: { onClose: () => void, onSuccess: () => void, currentBranchId?: string }) {
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<{id: string, name: string}[]>([])
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    getManualCheckInOptions().then(res => {
      if (res.success && res.branches) {
        setBranches(res.branches)
      } else {
        toast.error(res.error || "Failed to load branches")
      }
      setLoading(false)
    })
  }, [])

  const handleCheckIn = async (branchId: string) => {
    setMarking(branchId)
    
    // Get Location
    if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser")
        setMarking(null)
        return
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords
        try {
            const res = await markManualAttendance(branchId, { lat: latitude, lng: longitude })
            if (res.success) {
                toast.success(res.type === 'check-in' ? "Checked in successfully" : "Checked out successfully")
                onSuccess()
                onClose()
            } else {
                toast.error(res.error || "Failed to mark attendance")
            }
        } catch (e) {
            toast.error("Something went wrong")
        } finally {
            setMarking(null)
        }
    }, (error) => {
        console.error(error)
        if (error.code === 1) { // PERMISSION_DENIED
             toast.error("Location permission denied. Please enable location to use manual check-in.")
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
             toast.error("Location unavailable. Please check your GPS.")
        } else {
             toast.error("Failed to get location")
        }
        setMarking(null)
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {currentBranchId ? 'Manual Check-Out / Switch' : 'Manual Check-In'}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-6 space-y-2">
                <p className="text-gray-500">No active subscriptions found.</p>
                <p className="text-xs text-gray-400">Please ensure you have an active plan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {currentBranchId 
                  ? "Select current branch to check out, or another to switch:" 
                  : "Select your branch to mark attendance:"}
              </p>
              {branches.map(branch => {
                const isCurrent = branch.id === currentBranchId
                return (
                  <button
                    key={branch.id}
                    disabled={!!marking}
                    onClick={() => handleCheckIn(branch.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all group disabled:opacity-50 disabled:cursor-not-allowed ${
                        isCurrent 
                        ? 'border-orange-200 bg-orange-50 hover:border-orange-500 dark:border-orange-900/50 dark:bg-orange-900/20 dark:hover:border-orange-500' 
                        : 'border-gray-200 hover:border-blue-500 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-500 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full transition-colors ${
                          isCurrent 
                          ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50'
                      }`}>
                        {isCurrent ? <CheckCircle2 className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      </div>
                      <div className="text-left">
                          <span className="font-medium text-gray-900 dark:text-white block">{branch.name}</span>
                          {isCurrent && <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">Click to Check Out</span>}
                      </div>
                    </div>
                    {marking === branch.id && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface AttendanceClientProps {
  todayAttendance: any
  recentActivity: any[]
  history: any[]
  stats: any
}

function StatsCard({ stats }: { stats: any }) {
  return (
    <AnimatedCard className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-0 overflow-hidden shadow-sm">
      <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
         <div className="p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-1 text-orange-500">
               <Flame className="w-4 h-4" />
               <span className="text-xs font-semibold uppercase tracking-wider">Streak</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.currentStreak || 0}</div>
         </div>
         <div className="p-4 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-1 text-blue-500">
               <Clock className="w-4 h-4" />
               <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.thisMonthHours || 0}h</div>
         </div>
      </div>
    </AnimatedCard>
  )
}

function ActiveSessionCard({ attendance }: { attendance: any }) {
  const [elapsedMs, setElapsedMs] = useState(0)
  const [tags, setTags] = useState<{ label: string, type: 'warning' | 'destructive' | 'success' }[]>([])

  useEffect(() => {
    if (!attendance || attendance.checkOut) return

    const checkInTime = new Date(attendance.checkIn).getTime()
    
    const updateTimer = () => {
      const now = new Date().getTime()
      const diffMs = now - checkInTime
      setElapsedMs(diffMs)

      // Calculate Tags based on minutes
      const diffMinutes = Math.floor(diffMs / 60000)
      const newTags: { label: string, type: 'warning' | 'destructive' | 'success' }[] = []
      
      if (attendance.plan) {
        // Overstay Check (Flexible)
        if (attendance.plan.hoursPerDay) {
           const maxMinutes = attendance.plan.hoursPerDay * 60
           if (diffMinutes > maxMinutes) {
             const extra = diffMinutes - maxMinutes
             newTags.push({ 
               label: `Overstay (+${Math.floor(extra/60)}h ${extra%60}m)`, 
               type: 'destructive' 
             })
           }
        }

        // Shift Checks (Fixed)
        if (attendance.plan.shiftStart) {
          const [h, m] = attendance.plan.shiftStart.split(':').map(Number)
          const shiftStart = new Date(attendance.checkIn)
          shiftStart.setHours(h, m, 0, 0)
          
          // Late Check
          const lateThreshold = new Date(shiftStart.getTime() + 15 * 60000)
          if (new Date(attendance.checkIn) > lateThreshold) {
            const lateDiff = Math.floor((new Date(attendance.checkIn).getTime() - shiftStart.getTime()) / 60000)
             newTags.push({ label: `Late (+${lateDiff}m)`, type: 'warning' })
          }

           // Overstay Shift End
           if (attendance.plan.shiftEnd) {
              const [eh, em] = attendance.plan.shiftEnd.split(':').map(Number)
              const shiftEnd = new Date(attendance.checkIn)
              shiftEnd.setHours(eh, em, 0, 0)
              
              if (new Date() > shiftEnd) {
                 const overDiff = Math.floor((new Date().getTime() - shiftEnd.getTime()) / 60000)
                 if (overDiff > 10) {
                    newTags.push({ label: `Overstay (+${overDiff}m)`, type: 'destructive' })
                 }
              }
           }
        }
      }
      
      if (newTags.length === 0) {
          newTags.push({ label: 'On Track', type: 'success' })
      }

      setTags(newTags)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000) // Update every second
    return () => clearInterval(interval)
  }, [attendance])

  if (!attendance || attendance.checkOut) return null

  const formatElapsed = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    return `${h}h ${m}m ${s}s`
  }

  return (
    <AnimatedCard className="bg-white dark:bg-gray-800 border-l-4 border-l-green-500 border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
           <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 mb-1">
             <span className="relative flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
             </span>
             <h3 className="font-bold text-sm uppercase tracking-wider">Active Session</h3>
           </div>
           <p className="text-3xl font-bold text-gray-900 dark:text-white tabular-nums tracking-tight">
             {formatElapsed(elapsedMs)}
           </p>
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
             Started at {format(new Date(attendance.checkIn), 'hh:mm:ss a')}
           </p>
        </div>
        <div className="text-right">
           <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
             {attendance.plan?.name || 'Standard Plan'}
           </div>
           <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-end gap-1">
             <MapPin className="w-3 h-3" />
             {attendance.branch?.name}
           </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
         {tags.map((tag, idx) => (
           <span key={idx} className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
             tag.type === 'destructive' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' :
             tag.type === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' :
             'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
           }`}>
             {tag.type === 'destructive' && <AlertTriangle className="w-3 h-3 mr-1" />}
             {tag.type === 'warning' && <Clock className="w-3 h-3 mr-1" />}
             {tag.type === 'success' && <CheckCircle2 className="w-3 h-3 mr-1" />}
             {tag.label}
           </span>
         ))}
      </div>
    </AnimatedCard>
  )
}

export default function AttendanceClient({ todayAttendance, recentActivity, history, stats }: AttendanceClientProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview')
  const [showManualModal, setShowManualModal] = useState(false)
  const router = useRouter()
  const isCheckedIn = !!todayAttendance && !todayAttendance.checkOut

  // Calculate Today's Activity (Expanded Events)
  const todaysEvents = React.useMemo(() => {
    const today = new Date().setHours(0,0,0,0)
    const todayLogs = history.filter(h => {
        const d = new Date(h.checkIn)
        d.setHours(0,0,0,0)
        return d.getTime() === today
    })

    // Flatten to events
    const events: { id: string, type: 'check-in' | 'check-out', time: Date, branchName: string }[] = []
    
    todayLogs.forEach(log => {
        // Add Check In
        events.push({
            id: log.id + '_in',
            type: 'check-in',
            time: new Date(log.checkIn),
            branchName: log.branch?.name || 'Library'
        })
        // Add Check Out if exists
        if (log.checkOut) {
            events.push({
                id: log.id + '_out',
                type: 'check-out',
                time: new Date(log.checkOut),
                branchName: log.branch?.name || 'Library'
            })
        }
    })

    // Sort by time descending
    return events.sort((a, b) => b.time.getTime() - a.time.getTime())
  }, [history])

  // Fallback to recent history if no events today (optional, but requested "of the day")
  // If user strictly wants "of the day", we show empty if none. 
  // But standard UI usually shows *something*. Let's stick to "Today's Activity" if strict.
  // Actually, let's keep it "Recent Activity" but prioritize Today's expanded view.
  // If no today's events, show standard history collapsed view?
  // User said "recent activity should show all check in check out of the day".
  // Let's render Today's events if any, otherwise fallback to last 3 sessions.
  
  const showExpandedToday = todaysEvents.length > 0
  const displayActivity = showExpandedToday ? todaysEvents : history.slice(0, 3)

  return (
    <div className="space-y-6">
      {showManualModal && (
        <ManualCheckInModal 
          onClose={() => setShowManualModal(false)} 
          onSuccess={() => {
            router.refresh()
          }}
          currentBranchId={isCheckedIn ? todayAttendance?.branchId : undefined}
        />
      )}
      {/* Header with Status */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance</h1>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isCheckedIn 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
          }`}>
            {isCheckedIn ? 'Checked In' : 'Checked Out'}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex relative">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 text-sm font-medium rounded-md relative transition-colors ${
              activeTab === 'overview' 
                ? 'text-white' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="relative z-10">Overview</span>
            {activeTab === 'overview' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-blue-600 dark:bg-blue-500 rounded-md shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-sm font-medium rounded-md relative transition-colors ${
              activeTab === 'history' 
                ? 'text-white' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <span className="relative z-10">History</span>
            {activeTab === 'history' && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-blue-600 dark:bg-blue-500 rounded-md shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          {/* Active Session Card */}
          {isCheckedIn && <ActiveSessionCard attendance={todayAttendance} />}
          
          {/* Summary Stats Card */}
          <StatsCard stats={stats} />

          <Link href="/student/attendance/scan">
            <AnimatedCard className="bg-blue-600 text-white p-5 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-3 bg-white/20 rounded-full">
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Scan QR Code</h3>
                  <p className="text-blue-100 text-sm">Scan library QR to check-in or check-out</p>
                </div>
              </div>
            </AnimatedCard>
          </Link>

          <div className="text-center">
            <button 
                onClick={() => setShowManualModal(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
                Scanner not working? Manual {isCheckedIn ? 'Check-out' : 'Check-in'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {showExpandedToday ? "Today's Activity" : "Recent Activity"}
            </h2>
            {displayActivity.length === 0 ? (
               <p className="text-sm text-gray-500">No activity yet.</p>
            ) : (
            <div className="space-y-4">
              {showExpandedToday ? (
                  // Expanded View for Today
                  (displayActivity as any[]).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${event.type === 'check-out' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                          {event.type === 'check-out' ? 
                            <Timer className="w-4 h-4 text-orange-600 dark:text-orange-400" /> : 
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {event.type === 'check-out' ? 'Checked Out' : 'Checked In'}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{event.branchName} • {format(event.time, 'hh:mm a')}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(event.time, 'MMM dd')}
                      </span>
                    </div>
                  ))
              ) : (
                  // Standard History View (Fallback)
                  (displayActivity as any[]).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${log.checkOut ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                          <Clock className={`w-4 h-4 ${log.checkOut ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {log.checkOut ? 'Check Out' : 'Check In'}
                          </p>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{log.branch?.name || 'Library'} • {format(new Date(log.checkOut || log.checkIn), 'hh:mm a')}</span>
                          </div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(log.checkIn), 'MMM dd')}
                      </span>
                    </div>
                  ))
              )}
            </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          <HistoryClient history={history} stats={stats} embedded={true} />
        </motion.div>
      )}
    </div>
  )
}
