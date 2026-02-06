'use client'

import React, { useRef, useState, useEffect } from 'react'
import { ChevronLeft, Send, User, CheckCircle, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { addTicketComment, reopenTicket } from '@/actions/ticket'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface TicketDetailClientProps {
  ticket: any // Using any for simplicity with Prisma include types, but ideal to define proper type
  student: any
}

export default function TicketDetailClient({ ticket, student }: TicketDetailClientProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReopening, setIsReopening] = useState(false)
  const [comments, setComments] = useState(ticket.comments || [])

  useEffect(() => {
    setComments(ticket.comments || [])
  }, [ticket.comments])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState('')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [comments])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleReopen = async () => {
    setIsReopening(true)
    try {
        const result = await reopenTicket(ticket.id)
        if (result.success) {
            toast.success('Ticket reopened successfully')
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to reopen ticket')
        }
    } catch (error) {
        toast.error('An unexpected error occurred')
    } finally {
        setIsReopening(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting || !content.trim()) return

    const formData = new FormData()
    formData.append('content', content)
    formData.append('ticketId', ticket.id)

    setIsSubmitting(true)

    // Optimistic Update
    const optimisticComment = {
        id: `temp-${Date.now()}`,
        content: content,
        createdAt: new Date().toISOString(),
        userType: 'student',
        ticketId: ticket.id,
        userId: 'current-user',
        isOptimistic: true
    }

    setComments((prev: any[]) => [...prev, optimisticComment])
    setContent('') // Clear input immediately
    if (textareaRef.current) textareaRef.current.style.height = 'auto' // Reset height
    
    try {
      const result = await addTicketComment(formData)
      if (result.success && result.comment) {
        setComments((prev: any[]) => prev.map((c: any) => c.id === optimisticComment.id ? result.comment : c))
        toast.success('Comment added')
        router.refresh()
      } else {
        setComments((prev: any[]) => prev.filter((c: any) => c.id !== optimisticComment.id))
        toast.error(result.error || 'Failed to add comment')
        setContent(content) // Restore content on error
      }
    } catch (error) {
      setComments((prev: any[]) => prev.filter((c: any) => c.id !== optimisticComment.id))
      toast.error('An unexpected error occurred')
      setContent(content) // Restore content on error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 -mx-4 px-4 pt-2 pb-4 md:-mx-6 md:px-6 mb-2 border-b border-transparent transition-colors duration-200">
        <div className="flex items-center space-x-2">
            <Link href="/student/issues" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Link>
            <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{ticket.subject}</h1>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 shrink-0 ${
                ticket.status === 'resolved' || ticket.status === 'closed'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : ticket.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                    : ticket.status === 'reopen_requested'
                    ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                {ticket.status === 'reopen_requested' ? 'Reopen Requested' : ticket.status}
                </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-mono">#{ticket.id.slice(0, 8)}</span>
                <span>•</span>
                <span>{ticket.category}</span>
                <span>•</span>
                <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
            </div>
            </div>
        </div>
      </div>

      {/* Content Area - Scrollable */}
      <div className="flex-1 space-y-6 pb-4">
        {/* Ticket Description */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Description</h2>
          <p className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </p>
          
          {ticket.attachmentUrl && (
             <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-xs font-medium text-gray-500 mb-2">Attachment</h3>
                <a 
                   href={ticket.attachmentUrl} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                   <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                   </div>
                   <span className="text-sm font-medium">View Attachment</span>
                </a>
             </div>
          )}
        </div>

        {/* Timeline/Comments */}
        <div className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            <span className="px-3 text-xs text-gray-400 font-medium">Activity</span>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
          </div>

          {comments.map((comment: any) => {
            const isStudent = comment.userType === 'student'
            return (
              <div key={comment.id} className={`flex ${isStudent ? 'justify-end' : 'justify-start'} ${comment.isOptimistic ? 'opacity-70 transition-opacity duration-300' : ''}`}>
                <div className={`flex max-w-[85%] ${isStudent ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isStudent ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div className={`p-3 rounded-2xl ${
                    isStudent 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                  }`}>
                    <div className="text-xs opacity-70 mb-1 flex justify-between gap-4">
                      <span>{isStudent ? 'You' : 'Support Team'}</span>
                      <span>{format(new Date(comment.createdAt), 'h:mm a')}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area or Reopen Action */}
      {ticket.status === 'closed' ? (
        <div className="sticky bottom-[4.5rem] md:bottom-0 bg-gray-50 dark:bg-gray-900 -mx-4 px-4 pb-4 pt-2 md:-mx-6 md:px-6 z-20">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-t-2xl border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        This ticket is marked as <span className="font-medium text-gray-900 dark:text-white">{ticket.status}</span>. 
                        If you still have issues, you can request to reopen it.
                    </p>
                    <Button
                        onClick={handleReopen}
                        variant="outline"
                        disabled={isReopening}
                        className="w-full max-w-xs flex items-center justify-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    >
                        {isReopening ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Request to Reopen
                    </Button>
                </div>
            </div>
        </div>
      ) : ticket.status === 'reopen_requested' ? (
        <div className="sticky bottom-[4.5rem] md:bottom-0 bg-gray-50 dark:bg-gray-900 -mx-4 px-4 pb-4 pt-2 md:-mx-6 md:px-6 z-20">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-t-2xl border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="flex flex-col items-center gap-3 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Reopen request submitted. Awaiting admin approval.
                    </p>
                    <div className="w-full max-w-xs flex items-center justify-center gap-2 py-2 px-4 bg-orange-50 text-orange-700 border border-orange-200 rounded-md dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Request Pending</span>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="sticky bottom-[4.5rem] md:bottom-0 bg-gray-50 dark:bg-gray-900 -mx-4 px-4 pb-4 pt-2 md:-mx-6 md:px-6 z-20">
          <form 
            ref={formRef}
            onSubmit={handleSubmit}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="ticketId" value={ticket.id} />
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent shadow-sm">
              <textarea
                ref={textareaRef}
                name="content"
                value={content}
                onChange={handleInput}
                placeholder="Type your reply..."
                rows={1}
                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[40px] py-2 px-2 text-gray-900 dark:text-white placeholder-gray-400 overflow-y-auto"
                required
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        e.currentTarget.form?.requestSubmit()
                    }
                }}
              />
            </div>
            <Button
              type="submit"
              className="rounded-full w-12 h-12 p-0 flex items-center justify-center shrink-0 self-end mb-0.5"
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
