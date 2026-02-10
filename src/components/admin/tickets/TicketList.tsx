import React from 'react'
import { CheckCircle2, XCircle, Clock, MessageSquare, AlertTriangle, ExternalLink, Library } from 'lucide-react'
import { format } from 'date-fns'
import { PlatformSupportTicket } from '@prisma/client'

interface TicketWithRelations extends PlatformSupportTicket {
    library: {
        name: string
        subdomain: string
    }
    owner: {
        name: string
        email: string
    }
}

interface TicketListProps {
    tickets: TicketWithRelations[]
    loading?: boolean
    onApprove: (ticketId: string) => void
    onReject: (ticketId: string) => void
}

export function TicketList({ tickets, loading, onApprove, onReject }: TicketListProps) {
    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading tickets...</div>
    }

    if (tickets.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No tickets found</h3>
                <p className="text-gray-500 text-sm">No support tickets match your filters.</p>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            case 'investigating': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            case 'resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'closed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return 'text-red-600 dark:text-red-400 font-bold'
            case 'normal': return 'text-blue-600 dark:text-blue-400'
            case 'low': return 'text-gray-500'
            default: return 'text-gray-500'
        }
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Subject</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Library / Owner</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Status</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Priority</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Created</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {tickets.map(ticket => (
                            <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4 max-w-xs">
                                    <div className="font-medium text-gray-900 dark:text-white truncate" title={ticket.subject}>
                                        {ticket.subject}
                                    </div>
                                    <div className="text-xs text-gray-500 truncate" title={ticket.message}>
                                        {ticket.message}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Library className="w-4 h-4 text-gray-400" />
                                        <span className="font-medium text-gray-900 dark:text-white">{ticket.library.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 ml-6">{ticket.owner.name}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                        {ticket.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
                                        {ticket.priority}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {ticket.subject.startsWith('Platform Subscription Change Request:') && ticket.status !== 'resolved' && (
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => onApprove(ticket.id)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Approve Request"
                                            >
                                                <CheckCircle2 size={18} />
                                            </button>
                                            <button 
                                                onClick={() => onReject(ticket.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Reject Request"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
