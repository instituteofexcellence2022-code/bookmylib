'use client'

import React, { useState } from 'react'
import { X, User, Phone, Mail, FileText, Tag } from 'lucide-react'
import { createLead, CreateLeadInput } from '@/actions/staff/leads'
import { toast } from 'react-hot-toast'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormTextarea } from '@/components/ui/FormTextarea'

interface StaffCreateLeadModalProps {
    onClose: () => void
    onSuccess: () => void
}

export function StaffCreateLeadModal({ onClose, onSuccess }: StaffCreateLeadModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<CreateLeadInput>({
        name: '',
        phone: '',
        email: '',
        source: 'walk_in',
        status: 'new',
        notes: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        if (formData.phone.length !== 10) {
            toast.error('Phone number must be exactly 10 digits')
            setLoading(false)
            return
        }

        try {
            const result = await createLead(formData)

            if (result.success) {
                toast.success('Lead created successfully')
                onSuccess()
                onClose()
            } else {
                toast.error('Failed to create lead')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Lead</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <FormInput
                        label="Full Name"
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter full name"
                        icon={User}
                        required
                    />

                    <FormInput
                        label="Phone Number"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter phone number"
                        icon={Phone}
                        required
                    />

                    <FormInput
                        label="Email (Optional)"
                        value={formData.email || ''}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter email address"
                        icon={Mail}
                        type="email"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect
                            label="Source"
                            value={formData.source || 'walk_in'}
                            onChange={e => setFormData(prev => ({ ...prev, source: e.target.value }))}
                            options={[
                                { value: 'walk_in', label: 'Walk In' },
                                { value: 'referral', label: 'Referral' },
                                { value: 'online', label: 'Online' },
                                { value: 'social', label: 'Social Media' },
                                { value: 'other', label: 'Other' }
                            ]}
                            icon={Tag}
                        />

                        <FormSelect
                            label="Status"
                            value={formData.status || 'new'}
                            onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                            options={[
                                { value: 'new', label: 'New' },
                                { value: 'contacted', label: 'Contacted' },
                                { value: 'interested', label: 'Interested' },
                                { value: 'hot', label: 'Hot' },
                                { value: 'cold', label: 'Cold' },
                                { value: 'warm', label: 'Warm' }
                            ]}
                            icon={Tag}
                        />
                    </div>

                    <FormTextarea
                        label="Initial Notes"
                        value={formData.notes || ''}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any initial notes about the lead..."
                        icon={FileText}
                        rows={3}
                    />

                    <div className="pt-2">
                        <AnimatedButton
                            type="submit"
                            isLoading={loading}
                            className="w-full"
                        >
                            Create Lead
                        </AnimatedButton>
                    </div>
                </form>
            </div>
        </div>
    )
}
