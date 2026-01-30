'use client'

import React, { useRef, useState } from 'react'
import { ChevronLeft, Send, User, CheckCircle, Clock, AlertTriangle, MoreVertical, RefreshCw, XCircle } from 'lucide-react'
import Link from 'next/link'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { format } from 'date-fns'
import { addTicketComment, updateTicketStatus } from '@/actions/ticket'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface TicketResponseClientProps {
  ticket: any
  baseUrl?: string
  studentUrlPrefix?: string
}

export default function TicketResponseClient({ 
    ticket, 
    baseUrl = '/owner/issues',
    studentUrlPrefix = '/owner/students'
}: TicketResponseClientProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    formData.append('ticketId', ticket.id)
    
    try {
      const result = await addTicketComment(formData)
      if (result.success) {
        toast.success('Reply sent')
        formRef.current?.reset()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to send reply')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true)
    try {
        const result = await updateTicketStatus(ticket.id, newStatus)
        if (result.success) {
            toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to update status')
        }
    } catch (error) {
        toast.error('An unexpected error occurred')
    } finally {
        setIsUpdatingStatus(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-1">
        <div className="flex items-center space-x-2">
          <Link href={baseUrl} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate max-w-md">{ticket.subject}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                ticket.status === 'resolved' || ticket.status === 'closed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : ticket.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                {ticket.status.replace('_', ' ')}
                </span>
            </div>
            <p className="text-sm text-gray-500">Reported by {ticket.student?.name} • {format(new Date(ticket.createdAt), 'MMM d, yyyy h:mm a')}</p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
            <select 
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isUpdatingStatus}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm py-2 px-3 focus:ring-2 focus:ring-blue-500"
            >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="reopen_requested">Reopen Requested</option>
            </select>
        </div>
      </div>

      {ticket.status === 'reopen_requested' && (
        <div className="mb-4 mx-1 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                    <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-medium text-orange-900 dark:text-orange-200">Reopen Request</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300">Student requested to reopen this ticket.</p>
                </div>
            </div>
            <div className="flex gap-2">
                <AnimatedButton
                    onClick={() => handleStatusChange('closed')}
                    variant="outline"
                    isLoading={isUpdatingStatus}
                    className="border-orange-200 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
                >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                </AnimatedButton>
                <AnimatedButton
                    onClick={() => handleStatusChange('open')}
                    variant="primary"
                    isLoading={isUpdatingStatus}
                    className="bg-orange-600 hover:bg-orange-700 text-white border-none"
                >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Reopen
                </AnimatedButton>
            </div>
        </div>
      )}

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Description */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Issue Description</h3>
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{ticket.description}</p>
                {ticket.attachmentUrl && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <a 
                      href={ticket.attachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-sm font-medium">View Attachment</span>
                    </a>
                  </div>
                )}
            </div>

            {/* Comments */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {ticket.comments.length === 0 && (
                    <div className="text-center text-gray-400 italic py-10">No messages yet</div>
                )}
                
                {ticket.comments.map((comment: any) => {
                    const isStaff = comment.userType === 'owner' || comment.userType === 'staff'
                    return (
                    <div key={comment.id} className={`flex ${isStaff ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex max-w-[80%] ${isStaff ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                                isStaff ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                                {isStaff ? 'S' : 'U'}
                            </div>
                            <div className={`p-4 rounded-2xl ${
                                isStaff 
                                ? 'bg-purple-600 text-white rounded-br-none' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                            }`}>
                                <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                                <span>{isStaff ? 'Staff' : ticket.student?.name || 'Student'}</span>
                                <span>{format(new Date(comment.createdAt), 'h:mm a')}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                            </div>
                        </div>
                    </div>
                    )
                })}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <form 
                    ref={formRef}
                    action={handleSubmit}
                    className="flex gap-3"
                >
                    <textarea
                        name="content"
                        placeholder="Type a reply to the student..."
                        rows={2}
                        className="flex-1 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none p-3 text-sm"
                        required
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                e.currentTarget.form?.requestSubmit()
                            }
                        }}
                    />
                    <AnimatedButton
                        type="submit"
                        variant="primary"
                        className="self-end rounded-xl h-10 w-10 p-0 flex items-center justify-center bg-purple-600 hover:bg-purple-700"
                        isLoading={isSubmitting}
                    >
                        <Send className="w-5 h-5" />
                    </AnimatedButton>
                </form>
            </div>
        </div>

        {/* Sidebar Info */}
        <div className="w-80 hidden lg:block space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Student Details</h3>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        {ticket.student?.image ? (
                            <img src={ticket.student.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-gray-400 m-3" />
                        )}
                    </div>
                    <div>
                        <div className="font-medium text-gray-900 dark:text-white">{ticket.student?.name || 'Unknown'}</div>
                        <div className="text-sm text-gray-500">{ticket.student?.email}</div>
                    </div>
                </div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-medium">{ticket.student?.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-500">Member Since</span>
                        <span className="font-medium">Jan 2024</span>
                    </div>
                </div>
                {studentUrlPrefix && (
                    <Link href={`${studentUrlPrefix}/${ticket.student?.id}`} className="block mt-4 text-center text-sm text-blue-600 hover:underline">
                        View Full Profile
                    </Link>
                )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Ticket Info</h3>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">ID</span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{ticket.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Category</span>
                        <span>{ticket.category}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Priority</span>
                        <span className="capitalize">{ticket.priority}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Created</span>
                        <span>{format(new Date(ticket.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}
