import React from 'react'
import { getStaffProfile } from '@/actions/staff'
import { getStaffDashboardStats } from '@/actions/staff/dashboard'
import DashboardClient from './DashboardClient'

export default async function StaffDashboard() {
  const staffRes = await getStaffProfile()
  const dashboardRes = await getStaffDashboardStats()
  
  const staffName = (staffRes.success && staffRes.data) ? staffRes.data.name : 'Staff'
  const dashboardData = (dashboardRes.success && dashboardRes.data) ? dashboardRes.data : null

  return (
    <DashboardClient 
      staffName={staffName}
      stats={dashboardData?.stats}
      attendance={dashboardData?.attendance}
      recentActivity={dashboardData?.recentActivity}
    />
  )
}