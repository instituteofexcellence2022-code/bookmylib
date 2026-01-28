import React from 'react'
import { getAttendanceHistory, getAttendanceStats } from '@/actions/attendance'
import HistoryClient from './HistoryClient'

export default async function AttendanceHistoryPage() {
  const [history, stats] = await Promise.all([
    getAttendanceHistory(),
    getAttendanceStats()
  ])
  
  // Serialize dates
  const serializedHistory = JSON.parse(JSON.stringify(history))
  
  return (
    <HistoryClient history={serializedHistory} stats={stats} />
  )
}
