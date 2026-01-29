import React from 'react'
import { getStaffTickets } from '@/actions/ticket'
import StaffTicketListClient from '@/components/staff/issues/StaffTicketListClient'

export const dynamic = 'force-dynamic'

export default async function IssuesPage() {
  const tickets = await getStaffTickets()

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
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issue Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage support tickets for your branch</p>
        </div>
      </div>

      <StaffTicketListClient tickets={serializedTickets} baseUrl="/staff/issues" />
    </div>
  )
}
