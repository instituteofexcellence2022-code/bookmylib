import React from 'react'
import { getStaffProfile } from '@/actions/staff'
import { getStaffAnnouncements } from '@/actions/announcement'
import StaffLayoutClient from './StaffLayoutClient'
import { redirect } from 'next/navigation'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staffRes = await getStaffProfile()

  if (!staffRes.success || !staffRes.data) {
      redirect('/api/auth/clear-session?role=staff')
  }

  const staff = staffRes.data

  const announcements = await getStaffAnnouncements(
    { libraryId: staff.libraryId, branchId: staff.branchId }
  )
  const serializedAnnouncements = JSON.parse(JSON.stringify(announcements))

  const user = {
      name: staff.name,
      role: 'staff',
      image: staff.image,
      initials: staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return <StaffLayoutClient user={user} announcements={serializedAnnouncements}>{children}</StaffLayoutClient>
}
