import React from 'react'
import { notFound } from 'next/navigation'
import { getTicketDetails } from '@/actions/ticket'
import TicketResponseClient from './TicketResponseClient'

export const dynamic = 'force-dynamic'

export default async function OwnerTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ticket = await getTicketDetails(id)

  if (!ticket) {
    notFound()
  }

  return <TicketResponseClient ticket={ticket} />
}
