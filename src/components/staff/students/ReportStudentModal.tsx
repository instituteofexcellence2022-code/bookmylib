'use client'

import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { reportStudent } from '@/actions/staff/students'
import { toast } from 'react-hot-toast'

interface ReportStudentModalProps {
    isOpen: boolean
    onClose: () => void
    studentId: string
    studentName: string
}

export function ReportStudentModal({ isOpen, onClose, studentId, studentName }: ReportStudentModalProps) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        const reason = formData.get('reason') as string
        if (!reason.trim()) {
            toast.error('Please provide a reason for the report')
            return
        }

        setLoading(true)
        const result = await reportStudent(studentId, reason)
        
        if (result.success) {
            toast.success('Student reported to owner successfully')
            onClose()
        } else {
            toast.error(result.error || 'Failed to report student')
        }
        setLoading(false)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md pointer-events-auto flex flex-col">
                            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                                    <AlertTriangle size={24} />
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Report Student</h2>
                                </div>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-6">
                                <p className="text-sm text-gray-500 mb-6">
                                    You are reporting <strong>{studentName}</strong> to the owner. Please describe the issue in detail.
                                </p>

                                <form action={handleSubmit} className="space-y-6">
                                    <FormTextarea
                                        name="reason"
                                        label="Reason for Report"
                                        placeholder="Describe the violation or issue..."
                                        required
                                        rows={4}
                                    />

                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <AnimatedButton
                                            type="submit"
                                            isLoading={loading}
                                            variant="destructive"
                                        >
                                            Submit Report
                                        </AnimatedButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
