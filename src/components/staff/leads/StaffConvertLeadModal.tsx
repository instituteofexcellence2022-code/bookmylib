'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, UserPlus, Lock, Mail, AlertCircle } from 'lucide-react'
import { convertLeadToStudent } from '@/actions/staff/leads'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface StaffConvertLeadModalProps {
    lead: any
    onClose: () => void
    onSuccess: () => void
}

export function StaffConvertLeadModal({ lead, onClose, onSuccess }: StaffConvertLeadModalProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        email: lead.email || '',
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!formData.email) {
            setError('Email is required for student account')
            return
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setIsLoading(true)

        try {
            const result = await convertLeadToStudent(lead.id, {
                email: formData.email,
                password: formData.password
            })

            if (result.success) {
                toast.success('Lead converted to student successfully')
                onSuccess()
                onClose()
                // Optional: Redirect to student profile
                // router.push(`/staff/students/${result.studentId}`)
            }
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to convert lead')
        } finally {
            setIsLoading(false)
        }
    }

    if (!mounted) return null

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserPlus size={20} className="text-primary" />
                        Convert to Student
                    </h3>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                        This will create a new student account for <strong>{lead.name}</strong> and mark the lead as converted.
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <FormInput
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        icon={Mail}
                        placeholder="student@example.com"
                        required
                    />

                    <FormInput
                        label="Set Password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        icon={Lock}
                        placeholder="Minimum 6 characters"
                        required
                    />

                    <FormInput
                        label="Confirm Password"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        icon={Lock}
                        placeholder="Re-enter password"
                        required
                    />

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <AnimatedButton
                            type="submit"
                            isLoading={isLoading}
                            className="flex-1"
                        >
                            Convert & Create
                        </AnimatedButton>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
