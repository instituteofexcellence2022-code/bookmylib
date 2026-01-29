import React from 'react'
import { getStaffProfile } from '@/actions/staff'
import { getStaffDashboardStats } from '@/actions/staff/dashboard'
import DashboardClient from './DashboardClient'

export default async function StaffDashboard() {
  const staff = await getStaffProfile()
  const dashboardData = await getStaffDashboardStats()
  
  const staffName = staff ? staff.name : 'Staff'

  return (
    <DashboardClient 
      staffName={staffName}
      stats={dashboardData?.stats}
      attendance={dashboardData?.attendance}
      recentActivity={dashboardData?.recentActivity}
    />
  )
}