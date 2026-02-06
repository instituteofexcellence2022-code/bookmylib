import React from 'react'
import { getStaffShifts } from '@/actions/staff/shift'
import { getStaffSelfAttendanceToday, getStaffSelfAttendanceHistory, getStaffSelfAttendanceStats } from '@/actions/staff/attendance'
import { StaffShiftSchedule } from '@/components/staff/shift/StaffShiftSchedule'
import { StaffSelfAttendanceScanner } from '@/components/staff/shift/StaffSelfAttendanceScanner'
import { StaffAttendanceHistory } from '@/components/staff/shift/StaffAttendanceHistory'
import { StaffAttendanceStats } from '@/components/staff/shift/StaffAttendanceStats'
import { Clock, MapPin, CheckCircle, XCircle } from 'lucide-react'

export default async function ShiftPage() {
  const shiftsResult = await getStaffShifts()
  const todayResult = await getStaffSelfAttendanceToday()
  const historyResult = await getStaffSelfAttendanceHistory()
  const statsResult = await getStaffSelfAttendanceStats()

  const shifts = (shiftsResult.success && shiftsResult.data) ? shiftsResult.data : []
  const todayAttendance = (todayResult.success && todayResult.data) ? todayResult.data : null
  const history = (historyResult.success && historyResult.data) ? historyResult.data : []
  const stats = (statsResult.success && statsResult.data) ? statsResult.data : null

  const isCheckedIn = todayAttendance && !todayAttendance.checkOut

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shift & Attendance</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your shifts and mark your daily attendance.</p>
        </div>
        
        {/* Status Badge */}
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
            isCheckedIn 
                ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' 
                : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700'
        }`}>
            <div className={`w-3 h-3 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {isCheckedIn ? 'Currently On Shift' : 'Off Shift'}
                </div>
                {isCheckedIn && todayAttendance?.checkIn && (
                    <div className="text-xs text-green-600 dark:text-green-400">
                        Since {todayAttendance.checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <StaffAttendanceStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scanner & Current Status */}
        <div className="lg:col-span-1 space-y-6">
            <StaffSelfAttendanceScanner isCheckedIn={isCheckedIn || false} />
            
            {todayAttendance && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Activity</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1">
                                <CheckCircle size={18} className="text-green-500" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Check In</div>
                                <div className="text-sm text-gray-500">
                                    {todayAttendance.checkIn.toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                        {todayAttendance.checkOut && (
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    <CheckCircle size={18} className="text-blue-500" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">Check Out</div>
                                    <div className="text-sm text-gray-500">
                                        {todayAttendance.checkOut.toLocaleTimeString()}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Duration: {todayAttendance.duration ? `${Math.floor(todayAttendance.duration / 60)}h ${todayAttendance.duration % 60}m` : '0m'}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Right Column: Weekly Schedule */}
        <div className="lg:col-span-2">
            <StaffShiftSchedule shifts={shifts} />
        </div>
      </div>

      {/* Attendance History */}
      <StaffAttendanceHistory history={history} />
    </div>
  )
}
