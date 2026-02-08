import React from 'react'
import { notFound } from 'next/navigation'
import { getStudentTicketDetails } from '@/actions/ticket'
import { getStudentProfile } from '@/actions/student'
import TicketDetailClient from './TicketDetailClient'

export const dynamic = 'force-dynamic'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ticket = await getStudentTicketDetails(id)
  const profileResult = await getStudentProfile()

  if (!ticket || !profileResult.success || !profileResult.data) {
    notFound()
  }

  // Serialize ticket dates
  const serializedTicket = {
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    comments: ticket.comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    }))
  }

  // Serialize student dates (basic serialization for profile use)
  const serializedStudent = JSON.parse(JSON.stringify(profileResult.data.student))

  return <TicketDetailClient ticket={serializedTicket} student={serializedStudent} />
}
