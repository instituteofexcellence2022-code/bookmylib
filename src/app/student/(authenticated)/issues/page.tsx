import React from 'react'
import { Plus, CheckCircle, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { getStudentTickets } from '@/actions/ticket'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function IssuesPage() {
  const tickets = await getStudentTickets()
  
  const openTickets = tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  const recentTickets = tickets.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issues & Support</h1>
      </div>

      {/* Report New Issue Card */}
      <Link href="/student/issues/new">
        <AnimatedCard className="bg-blue-600 text-white p-5 cursor-pointer hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-xl font-bold">Report an Issue</h2>
              <p className="text-blue-100 text-sm">Facing a problem? Let us know and we&apos;ll fix it.</p>
            </div>
            <div className="bg-white/20 p-3 rounded-full">
              <Plus className="w-6 h-6" />
            </div>
          </div>
        </AnimatedCard>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">Open Tickets</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{openTickets}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="text-gray-500 dark:text-gray-400 text-sm mb-1">Resolved</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{resolvedTickets}</div>
        </div>
      </div>

      {/* Recent Tickets List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Tickets</h3>
          <Link href="/student/issues/history" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {recentTickets.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <div className="bg-gray-50 dark:bg-gray-700/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-gray-400" />
              </div>
              <p>No tickets found</p>
            </div>
          ) : (
            recentTickets.map((ticket) => (
              <Link key={ticket.id} href={`/student/issues/${ticket.id}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg mt-1 ${
                      ticket.status === 'resolved' || ticket.status === 'closed'
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                        : ticket.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                    }`}>
                      {ticket.status === 'resolved' || ticket.status === 'closed' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{ticket.subject}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-mono text-xs">#{ticket.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>{ticket.category}</span>
                        <span>•</span>
                        <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
