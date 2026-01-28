'use client'

import React, { useState } from 'react'
import { ChevronLeft, Filter, Search, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { format } from 'date-fns'

interface Ticket {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  createdAt: Date | string
}

export default function TicketHistoryClient({ tickets }: { tickets: Ticket[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ticket.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filter === 'all' || ticket.status === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link href="/student/issues" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">All Tickets</h1>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tickets..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <AnimatedButton 
          variant="outline" 
          className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          onClick={() => setFilter(filter === 'all' ? 'open' : filter === 'open' ? 'resolved' : 'all')}
        >
          <Filter className="w-4 h-4 mr-2 text-gray-500" />
          {filter === 'all' ? 'All' : filter === 'open' ? 'Open' : 'Resolved'}
        </AnimatedButton>
      </div>

      {/* Ticket List */}
      <div className="space-y-4">
        {filteredTickets.length === 0 ? (
           <div className="text-center py-10 text-gray-500">No tickets found</div>
        ) : (
            filteredTickets.map((ticket) => (
            <Link key={ticket.id} href={`/student/issues/${ticket.id}`} className="block">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">#{ticket.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                        ticket.status === 'resolved' || ticket.status === 'closed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : ticket.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                        {ticket.status === 'resolved' || ticket.status === 'closed' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {ticket.status}
                        </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{ticket.subject}</h3>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                        <span>{ticket.category}</span>
                    </div>
                    {ticket.priority === 'high' && (
                        <div className="flex items-center text-red-500 text-xs font-medium">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        High Priority
                        </div>
                    )}
                    </div>
                </div>
            </Link>
            ))
        )}
      </div>
    </div>
  )
}
