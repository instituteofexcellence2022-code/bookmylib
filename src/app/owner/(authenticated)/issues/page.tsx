import React from 'react'
import { getOwnerTickets } from '@/actions/ticket'
import { getOwnerBranches } from '@/actions/branch'
import TicketListClient from './TicketListClient'

export const dynamic = 'force-dynamic'

export default async function IssuesPage() {
  const [tickets, branchesResult] = await Promise.all([
    getOwnerTickets(),
    getOwnerBranches()
  ])

  const branches = (branchesResult.success && branchesResult.data) ? branchesResult.data : []

  const serializedTickets = tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
    student: ticket.student ? {
      name: ticket.student.name,
      email: ticket.student.email || '',
      image: ticket.student.image,
      branchId: ticket.student.branchId || '',
      branch: ticket.student.branch || undefined
    } : null
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issues & Support</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage and resolve student reported issues</p>
        </div>
      </div>
      
      <TicketListClient tickets={serializedTickets} branches={branches} />
    </div>
  )
}
