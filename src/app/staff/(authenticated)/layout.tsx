import React from 'react'
import { getStaffProfile } from '@/actions/staff'
import { getStaffAnnouncements } from '@/actions/announcement'
import StaffLayoutClient from './StaffLayoutClient'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/lib/auth/session'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffProfile()

  if (!staff) {
      const cookieStore = await cookies()
      cookieStore.delete(COOKIE_KEYS.STAFF)
      redirect('/staff/login')
  }

  const announcements = await getStaffAnnouncements(
    staff ? { libraryId: staff.libraryId, branchId: staff.branchId } : undefined
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
