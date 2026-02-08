import { redirect } from 'next/navigation'
import ProfileClient from './ProfileClient'
import { getAuthenticatedStaff } from '@/lib/auth/staff'

async function getStaffProfile() {
  const staff = await getAuthenticatedStaff()

  if (!staff) {
    redirect('/staff/login')
  }

  return staff
}

export default async function ProfilePage() {
  const staff = await getStaffProfile()

  return <ProfileClient staff={staff} />
}
