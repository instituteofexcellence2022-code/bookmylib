'use client'

import React, { useState } from 'react'
import { TicketList } from './TicketList'
import { approveSubscriptionRequest, rejectSubscriptionRequest } from '@/actions/admin/platform-tickets'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { MessageSquare, RefreshCw } from 'lucide-react'
import { PlatformSupportTicket } from '@prisma/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { SubscriptionApprovalModal } from './SubscriptionApprovalModal'

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

interface TicketPageClientProps {
    initialTickets: TicketWithRelations[]
}

export function TicketPageClient({ initialTickets }: TicketPageClientProps) {
    const router = useRouter()
    const [tickets, setTickets] = useState(initialTickets)
    const [loading, setLoading] = useState(false)
    
    // Approval Modal State
    const [approvalModalOpen, setApprovalModalOpen] = useState(false)
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
    const [selectedTicketPlan, setSelectedTicketPlan] = useState('')

    // Rejection Modal State
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')

    // Update local state when initialTickets changes (after server revalidate)
    React.useEffect(() => {
        setTickets(initialTickets)
    }, [initialTickets])

    const handleApproveClick = (ticketId: string, subject: string) => {
        const prefix = "Platform Subscription Change Request: "
        if (subject.startsWith(prefix)) {
            const planName = subject.substring(prefix.length)
            setSelectedTicketId(ticketId)
            setSelectedTicketPlan(planName)
            setApprovalModalOpen(true)
        } else {
            // Fallback for non-subscription tickets if any (though currently filtered)
            toast.error("Not a subscription request")
        }
    }

    const handleApproveConfirm = async (data: any) => {
        setLoading(true)
        try {
            const result = await approveSubscriptionRequest(data)
            if (result.success) {
                toast.success('Subscription approved & updated successfully')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to approve request')
            }
        } catch (error) {
            console.error('Approve error:', error)
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleRejectClick = (ticketId: string) => {
        setSelectedTicketId(ticketId)
        setRejectModalOpen(true)
        setRejectionReason('')
    }

    const handleRejectConfirm = async () => {
        if (!selectedTicketId) return

        setLoading(true)
        try {
            const result = await rejectSubscriptionRequest(selectedTicketId, rejectionReason)
            if (result.success) {
                toast.success('Subscription request rejected')
                setRejectModalOpen(false)
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to reject request')
            }
        } catch (error) {
            console.error('Reject error:', error)
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage support requests and subscription approvals.</p>
                </div>
                <button 
                    onClick={() => router.refresh()}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="Refresh Tickets"
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <TicketList 
                tickets={tickets} 
                loading={loading} 
                onApprove={(id) => {
                    const ticket = tickets.find(t => t.id === id)
                    if (ticket) handleApproveClick(id, ticket.subject)
                }}
                onReject={handleRejectClick}
            />

            {/* Approval Modal */}
            <SubscriptionApprovalModal
                isOpen={approvalModalOpen}
                onClose={() => setApprovalModalOpen(false)}
                onApprove={handleApproveConfirm}
                ticketId={selectedTicketId || ''}
                planName={selectedTicketPlan}
            />

            {/* Rejection Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Subscription Request</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Reason for Rejection
                        </label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Payment not received, Invalid request..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 dark:bg-gray-800 dark:border-gray-700"
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <button
                            onClick={() => setRejectModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleRejectConfirm}
                            disabled={loading || !rejectionReason.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            Reject Request
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
