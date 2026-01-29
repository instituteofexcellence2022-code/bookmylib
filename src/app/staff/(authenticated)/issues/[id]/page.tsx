import React from 'react'
import { getTicketDetails } from '@/actions/ticket'
import TicketResponseClient from '@/app/owner/(authenticated)/issues/[id]/TicketResponseClient'
import { notFound } from 'next/navigation'

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params
  const ticket = await getTicketDetails(id)

  if (!ticket) {
    notFound()
  }

  return (
    <TicketResponseClient 
        ticket={ticket} 
        baseUrl="/staff/issues"
        studentUrlPrefix="/staff/students"
    />
  )
}
