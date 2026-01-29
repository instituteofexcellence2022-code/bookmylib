import React from 'react'
import { getStaffAnnouncements } from '@/actions/announcement'
import { getStaffProfile } from '@/actions/staff'
import { getStaffDashboardStats } from '@/actions/staff/dashboard'
import DashboardClient from './DashboardClient'

export default async function StaffDashboard() {
  const staff = await getStaffProfile()
  const dashboardData = await getStaffDashboardStats()
  
  const announcements = await getStaffAnnouncements(
    staff ? { libraryId: staff.libraryId, branchId: staff.branchId } : undefined
  )
  
  const serializedAnnouncements = JSON.parse(JSON.stringify(announcements))
  const staffName = staff ? staff.name : 'Staff'

  return (
    <DashboardClient 
      announcements={serializedAnnouncements}
      staffName={staffName}
      stats={dashboardData?.stats}
      attendance={dashboardData?.attendance}
      recentActivity={dashboardData?.recentActivity}
    />
  )
}