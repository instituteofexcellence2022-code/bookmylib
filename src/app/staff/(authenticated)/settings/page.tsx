import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import SettingsClient from './SettingsClient'
import { COOKIE_KEYS } from '@/lib/auth/session'

async function getStaffProfile() {
  const cookieStore = await cookies()
  const staffId = cookieStore.get(COOKIE_KEYS.STAFF)?.value

  if (!staffId) {
    redirect('/staff/login')
  }

  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      library: true,
      branch: true
    }
  })

  if (!staff) {
    redirect('/staff/login')
  }

  return staff
}

export default async function SettingsPage() {
  const staff = await getStaffProfile()

  return <SettingsClient staff={staff} />
}
