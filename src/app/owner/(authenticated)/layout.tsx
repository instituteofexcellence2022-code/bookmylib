import React from 'react'
import { getOwnerProfile } from '@/actions/owner'
import { OwnerLayoutClient } from '@/components/owner/layout/OwnerLayoutClient'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/lib/auth/constants'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwnerProfile()

  if (!owner) {
    redirect('/api/auth/clear-session?role=owner')
  }

  const cookieStore = await cookies()
  const isAdminImpersonating = !!cookieStore.get(COOKIE_KEYS.ADMIN)

  const user = {
    name: owner.name,
    role: 'owner',
    image: owner.image || undefined,
    initials: owner.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <OwnerLayoutClient user={user} isAdminImpersonating={isAdminImpersonating}>
      {children}
    </OwnerLayoutClient>
  )
}
