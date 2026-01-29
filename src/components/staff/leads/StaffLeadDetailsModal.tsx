'use client'

import React, { useEffect, useState } from 'react'
import { X, Phone, Mail, Calendar, User, Clock, Tag, UserPlus } from 'lucide-react'
import { getLeadDetails, updateLeadStatus } from '@/actions/staff/leads'
import { StaffLeadInteractionForm } from './StaffLeadInteractionForm'
import { StaffConvertLeadModal } from './StaffConvertLeadModal'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'

interface StaffLeadDetailsModalProps {
    leadId: string
    onClose: () => void
    onUpdate: () => void
}

export function StaffLeadDetailsModal({ leadId, onClose, onUpdate }: StaffLeadDetailsModalProps) {
    const [lead, setLead] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)

    const fetchLead = async () => {
        try {
            const data = await getLeadDetails(leadId)
            setLead(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to load lead details')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLead()
    }, [leadId])

    const handleStatusChange = async (newStatus: string) => {
        try {
            const result = await updateLeadStatus(leadId, newStatus)
            if (result.success) {
                toast.success('Status updated')
                fetchLead()
                onUpdate()
            }
        } catch {
            toast.error('Failed to update status')
        }
    }

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl h-[600px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        )
    }

    if (!lead) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                            {lead.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{lead.name}</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    Added {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                                </span>
                                <span>•</span>
                                <span className="capitalize">{lead.source?.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-700 h-full">
                        {/* Sidebar Info */}
                        <div className="p-6 space-y-6 md:col-span-1 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                                    <select
                                        value={lead.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary sm:text-sm bg-white dark:bg-gray-700 p-2"
                                    >
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="interested">Interested</option>
                                        <option value="hot">Hot</option>
                                        <option value="warm">Warm</option>
                                        <option value="cold">Cold</option>
                                        <option value="converted">Converted</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                        <Phone size={16} className="text-gray-400" />
                                        <a href={`tel:${lead.phone}`} className="hover:text-primary transition-colors">{lead.phone}</a>
                                    </div>
                                    {lead.email && (
                                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                            <Mail size={16} className="text-gray-400" />
                                            <a href={`mailto:${lead.email}`} className="hover:text-primary transition-colors truncate">{lead.email}</a>
                                        </div>
                                    )}
                                </div>
                                
                                {lead.status !== 'converted' && (
                                    <button
                                        onClick={() => setIsConvertModalOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium mt-6"
                                    >
                                        <UserPlus size={16} />
                                        Convert to Student
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Timeline */}
                        <div className="md:col-span-2 flex flex-col h-full">
                            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
                                <StaffLeadInteractionForm 
                                    leadId={leadId} 
                                    onSuccess={() => {
                                        fetchLead()
                                        onUpdate()
                                    }} 
                                />
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {lead.interactions.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-sm">
                                        No interactions yet. Add a note to start tracking.
                                    </div>
                                ) : (
                                    lead.interactions.map((interaction: any) => (
                                        <div key={interaction.id} className="relative pl-6 pb-6 last:pb-0 border-l border-gray-200 dark:border-gray-700 last:border-0">
                                            <div className="absolute left-[-5px] top-0 h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600 ring-4 ring-white dark:ring-gray-800" />
                                            
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                        {interaction.type}
                                                        <span className="text-gray-300">•</span>
                                                        {interaction.staff?.name || 'Unknown Staff'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {format(new Date(interaction.createdAt), 'MMM d, h:mm a')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                                    {interaction.notes}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isConvertModalOpen && (
                <StaffConvertLeadModal
                    lead={lead}
                    onClose={() => setIsConvertModalOpen(false)}
                    onSuccess={() => {
                        fetchLead()
                        onUpdate()
                    }}
                />
            )}
        </div>
    )
}
