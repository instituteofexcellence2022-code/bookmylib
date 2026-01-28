import React from 'react'
import { getOwnerTickets } from '@/actions/ticket'
import { getOwnerBranches } from '@/actions/branch'
import TicketListClient from './TicketListClient'

export const dynamic = 'force-dynamic'

export default async function IssuesPage() {
  const [tickets, branches] = await Promise.all([
    getOwnerTickets(),
    getOwnerBranches()
  ])

  const serializedTickets = tickets.map((ticket: any) => ({
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
    student: ticket.student
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issues & Support</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and resolve student reported issues</p>
        </div>
      </div>
      
      <TicketListClient tickets={serializedTickets} branches={branches as any} />
    </div>
  )
}
