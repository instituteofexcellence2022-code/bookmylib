import React from 'react'
import { getOwnerProfile } from '@/actions/owner'
import { OwnerLayoutClient } from '@/components/owner/layout/OwnerLayoutClient'
import { redirect } from 'next/navigation'

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const owner = await getOwnerProfile()

  if (!owner) {
    redirect('/owner/login')
  }

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
    <OwnerLayoutClient user={user}>
      {children}
    </OwnerLayoutClient>
  )
}
