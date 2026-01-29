import React from 'react'
import { getStaffAnnouncements } from '@/actions/announcement'
import { getStaffProfile } from '@/actions/staff'
import DashboardClient from './DashboardClient'

export default async function StaffDashboard() {
  const [announcements, staff] = await Promise.all([
    getStaffAnnouncements(),
    getStaffProfile()
  ])

  const serializedAnnouncements = JSON.parse(JSON.stringify(announcements))
  const staffName = staff ? staff.name : 'Staff'

  return (
    <DashboardClient 
      announcements={serializedAnnouncements}
      staffName={staffName}
    />
  )
}