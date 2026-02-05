import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'
import { getAuthenticatedStaff } from '@/lib/auth/staff'

async function getStaffProfile() {
  const staff = await getAuthenticatedStaff()

  if (!staff) {
    redirect('/staff/login')
  }

  return staff
}

export default async function SettingsPage() {
  const staff = await getStaffProfile()

  return <SettingsClient staff={staff} />
}
