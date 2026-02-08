'use client'

import React, { useState } from 'react'
import { Send, Phone, User, MessageSquare, StickyNote } from 'lucide-react'
import { addLeadInteraction } from '@/actions/staff/leads'
import { toast } from 'react-hot-toast'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormTextarea } from '@/components/ui/FormTextarea'

interface StaffLeadInteractionFormProps {
    leadId: string
    onSuccess: () => void
}

export function StaffLeadInteractionForm({ leadId, onSuccess }: StaffLeadInteractionFormProps) {
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState('note')
    const [notes, setNotes] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!notes.trim()) return

        setLoading(true)

        try {
            const result = await addLeadInteraction(leadId, type, notes)

            if (result.success) {
                toast.success('Interaction added')
                setNotes('')
                onSuccess()
            } else {
                toast.error('Failed to add interaction')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const interactionTypes = [
        { id: 'note', icon: StickyNote, label: 'Note' },
        { id: 'call', icon: Phone, label: 'Call' },
        { id: 'visit', icon: User, label: 'Visit' },
        { id: 'message', icon: MessageSquare, label: 'Message' },
    ]

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="flex gap-2 overflow-x-auto pb-2">
                {interactionTypes.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setType(t.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                            type === t.id
                                ? 'bg-primary text-white'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="relative">
                <FormTextarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={`Add a ${type} note...`}
                    className="min-h-[80px] pr-12"
                />
                <div className="absolute bottom-3 right-3">
                    <AnimatedButton
                        type="submit"
                        isLoading={loading}
                        disabled={!notes.trim()}
                        size="sm"
                        className="h-8 w-8 p-0 rounded-full"
                    >
                        <Send size={14} />
                    </AnimatedButton>
                </div>
            </div>
        </form>
    )
}
