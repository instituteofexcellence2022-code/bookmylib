import React from 'react'
import { getPlatformTickets } from '@/actions/admin/platform-tickets'
import { TicketPageClient } from '@/components/admin/tickets/TicketPageClient'

export const dynamic = 'force-dynamic'

export default async function AdminTicketsPage() {
    const tickets = await getPlatformTickets('all')

    return (
        <TicketPageClient initialTickets={tickets} />
    )
}
