import React from 'react'
import { getStudentTickets } from '@/actions/ticket'
import TicketHistoryClient from './TicketHistoryClient'

export const dynamic = 'force-dynamic'

export default async function TicketHistoryPage() {
  const tickets = await getStudentTickets()
  
  // Serialize dates for client component
  const serializedTickets = tickets.map(ticket => ({
    ...ticket,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    comments: ticket.comments.map(c => ({
      ...c,
      createdAt: c.createdAt.toISOString()
    }))
  }))

  return <TicketHistoryClient tickets={serializedTickets} />
}
