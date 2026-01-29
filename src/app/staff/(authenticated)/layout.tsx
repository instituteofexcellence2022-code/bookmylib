import React from 'react'
import { getStaffProfile } from '@/actions/staff'
import StaffLayoutClient from './StaffLayoutClient'
import { redirect } from 'next/navigation'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffProfile()

  if (!staff) {
      redirect('/staff/login')
  }

  const user = {
      name: staff.name,
      role: 'staff',
      image: staff.image,
      initials: staff.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return <StaffLayoutClient user={user}>{children}</StaffLayoutClient>
}
