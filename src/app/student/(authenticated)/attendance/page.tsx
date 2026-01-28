import React from 'react'
import { getTodayAttendance, getAttendanceHistory, getAttendanceStats } from '@/actions/attendance'
import AttendanceClient from './AttendanceClient'

export default async function AttendancePage() {
  const [todayAttendance, history, stats] = await Promise.all([
    getTodayAttendance(),
    getAttendanceHistory(),
    getAttendanceStats()
  ])
  
  const recentActivity = history.slice(0, 3)

  // Serialize
  const serializedAttendance = todayAttendance ? JSON.parse(JSON.stringify(todayAttendance)) : null
  const serializedHistory = JSON.parse(JSON.stringify(history))
  
  return (
    <AttendanceClient 
      todayAttendance={serializedAttendance} 
      recentActivity={recentActivity}
      history={serializedHistory}
      stats={stats}
    />
  )
}
