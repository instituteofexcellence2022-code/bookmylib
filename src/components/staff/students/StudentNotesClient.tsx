'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { Send, Trash2, StickyNote, User } from 'lucide-react'
import { addStudentNote, deleteStudentNote } from '@/actions/staff/students'
import { toast } from 'react-hot-toast'
import { AnimatedButton } from '@/components/ui/AnimatedButton'

interface Note {
    id: string
    content: string
    createdBy: string | null
    createdAt: Date
}

interface StudentNotesClientProps {
    studentId: string
    notes: Note[]
}

export function StudentNotesClient({ studentId, notes }: StudentNotesClientProps) {
    const [newNote, setNewNote] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newNote.trim()) return

        setIsSubmitting(true)
        try {
            const result = await addStudentNote(studentId, newNote)
            if (result.success) {
                toast.success('Note added successfully')
                setNewNote('')
            } else {
                toast.error(result.error || 'Failed to add note')
            }
        } catch {
            toast.error('Failed to add note')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteNote = async (noteId: string) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return

        setDeletingId(noteId)
        try {
            const result = await deleteStudentNote(noteId, studentId)
            if (result.success) {
                toast.success('Note deleted successfully')
            } else {
                toast.error(result.error || 'Failed to delete note')
            }
        } catch {
            toast.error('Failed to delete note')
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-yellow-500" />
                    Student Notes
                </h3>
                
                <form onSubmit={handleAddNote} className="mb-6">
                    <div className="relative">
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Write a note about this student..."
                            className="w-full min-h-[100px] p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                        />
                        <div className="absolute bottom-3 right-3">
                            <AnimatedButton
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={!newNote.trim()}
                                variant="primary"
                                size="sm"
                                className="!px-3 !py-1.5"
                            >
                                <Send className="w-4 h-4 mr-1" />
                                Add Note
                            </AnimatedButton>
                        </div>
                    </div>
                </form>

                <div className="space-y-4">
                    <AnimatePresence mode="popLayout">
                        {notes.length === 0 ? (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-8 text-gray-500 dark:text-gray-400"
                            >
                                No notes yet.
                            </motion.div>
                        ) : (
                            notes.map((note) => (
                                <motion.div
                                    key={note.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group relative bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                                {note.content}
                                            </p>
                                            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400">
                                                <span className="flex items-center gap-1 font-medium text-gray-700 dark:text-gray-300">
                                                    <User className="w-3 h-3" />
                                                    {note.createdBy || 'Staff'}
                                                </span>
                                                <span>•</span>
                                                <span>{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            disabled={deletingId === note.id}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                            title="Delete note"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
