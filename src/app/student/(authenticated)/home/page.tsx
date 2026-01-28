import React from 'react'
import { getStudentProfile } from '@/actions/student'
import { getTodayAttendance, getAttendanceStats } from '@/actions/attendance'
import { getQuotes, getLikedQuoteIds } from '@/actions/quotes'
import HomeClient from './HomeClient'

export default async function StudentHome() {
  const [profile, todayAttendance, attendanceStats, quotes, likedQuoteIds] = await Promise.all([
    getStudentProfile(),
    getTodayAttendance(),
    getAttendanceStats(),
    getQuotes(),
    getLikedQuoteIds()
  ])

  const { student, stats: profileStats } = profile

  // Calculate days left in active subscription (Server Side to avoid Hydration Mismatch)
  const activeSubscription = student.subscriptions.find((s: any) => s.status === 'active')
  const daysLeft = activeSubscription 
    ? Math.ceil((new Date(activeSubscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0

  // Merge stats
  const combinedStats = {
    ...profileStats,
    ...attendanceStats,
    daysLeft
  }

  // Serialize dates to pass to client component
  const serializedStudent = JSON.parse(JSON.stringify(student))
  const serializedAttendance = todayAttendance ? JSON.parse(JSON.stringify(todayAttendance)) : null

  return (
    <HomeClient 
      student={serializedStudent} 
      stats={combinedStats} 
      todayAttendance={serializedAttendance}
      quotes={quotes}
      likedQuoteIds={likedQuoteIds}
    />
  )
}
