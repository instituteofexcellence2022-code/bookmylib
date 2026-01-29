'use client'

import React, { useState } from 'react'
import { Search, Filter, CheckCircle, Clock, AlertTriangle, ChevronRight, User, Building, X } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Ticket {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  createdAt: Date | string
  student: {
    name: string
    email: string
    image: string | null
    branchId: string
    branch?: {
      id: string
      name: string
    }
  } | null
}

export default function StaffTicketListClient({ 
  tickets, 
  baseUrl = '/staff/issues' 
}: { 
  tickets: Ticket[], 
  baseUrl?: string 
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Removed 'staff' category as per requirements
  const categories = [
    { id: 'discipline', label: 'Discipline & Reports' },
    { id: 'service', label: 'Library Service' },
    { id: 'payment', label: 'Payment' },
    { id: 'other', label: 'Other' }
  ]
  const priorities = ['low', 'medium', 'high', 'urgent']

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) || 
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ticket.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesCategory && matchesPriority
  })

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setCategoryFilter('all')
    setPriorityFilter('all')
  }

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all'

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        {/* Search and Status Tabs */}
        <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
                type="text"
                placeholder="Search by subject, ID, or student..."
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                >
                {status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                </button>
            ))}
            </div>
        </div>

        {/* Secondary Filters - Removed Branch Filter */}
        <div className="grid grid-cols-2 gap-4">
            <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
            </select>

            <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
                <option value="all">All Priorities</option>
                {priorities.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Results Summary & Clear */}
      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
        <span>
            Showing {filteredTickets.length} {filteredTickets.length === 1 ? 'ticket' : 'tickets'}
            {tickets.length !== filteredTickets.length && ` (filtered from ${tickets.length})`}
        </span>
        {hasActiveFilters && (
            <button 
                onClick={clearFilters}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
                <X className="w-4 h-4" />
                Clear Filters
            </button>
        )}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium">Ticket Info</th>
                <th className="px-6 py-4 font-medium">Student</th>
                {/* Removed Branch Column as it's implied */}
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No tickets found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white mb-1">{ticket.subject}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-mono">#{ticket.id.slice(0, 8)}</span>
                          <span>•</span>
                          <span className="capitalize">{ticket.category}</span>
                          {ticket.category === 'discipline' ? (
                             <span className="flex items-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded font-medium">
                               <AlertTriangle className="w-3 h-3 mr-1" />
                               Reported Student
                             </span>
                          ) : ticket.priority === 'high' || ticket.priority === 'urgent' ? (
                            <span className="flex items-center text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.student ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 overflow-hidden">
                            {ticket.student.image ? (
                              <img src={ticket.student.image} alt={ticket.student.name} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{ticket.student.name}</div>
                            <div className="text-xs text-gray-500">{ticket.student.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unknown Student</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${
                        ticket.status === 'resolved' || ticket.status === 'closed'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : ticket.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : ticket.status === 'reopen_requested'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {ticket.status === 'resolved' || ticket.status === 'closed' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                         ticket.status === 'reopen_requested' ? <Clock className="w-3.5 h-3.5" /> : 
                         <Clock className="w-3.5 h-3.5" />}
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`${baseUrl}/${ticket.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
