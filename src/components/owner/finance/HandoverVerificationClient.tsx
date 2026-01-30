'use client'

import React, { useState, useEffect } from 'react'
import { getPendingHandovers, verifyHandover } from '@/actions/owner/finance'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { Button } from '@/components/ui/button'
import { Check, X, Clock, AlertCircle, User } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface Handover {
    id: string
    amount: number
    status: string
    createdAt: Date
    notes?: string
    staff: {
        name: string
        email: string
        image?: string
    }
    branch: {
        name: string
    }
}

export function HandoverVerificationClient() {
    const [handovers, setHandovers] = useState<Handover[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const fetchHandovers = async () => {
        try {
            const data = await getPendingHandovers()
            setHandovers(data as any)
        } catch (error) {
            toast.error('Failed to load pending handovers')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHandovers()
    }, [])

    const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
        setProcessingId(id)
        try {
            await verifyHandover(id, status)
            toast.success(`Handover ${status === 'verified' ? 'verified' : 'rejected'} successfully`)
            fetchHandovers() // Refresh list
        } catch (error) {
            toast.error('Failed to update handover status')
        } finally {
            setProcessingId(null)
        }
    }

    if (loading) {
        return <div className="p-4 text-center">Loading...</div>
    }

    return (
        <AnimatedCard className="p-6">
            <div className="mb-6">
                <h3 className="text-xl font-bold">Pending Cash Handovers</h3>
                <p className="text-gray-500 dark:text-gray-400">Verify cash collected by staff</p>
            </div>
            
            {handovers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500">
                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-3">
                        <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="font-medium">All caught up!</p>
                    <p className="text-sm mt-1">No pending cash handovers to verify.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {handovers.map((handover) => (
                        <div key={handover.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-start gap-4 mb-4 sm:mb-0">
                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden shrink-0">
                                    {handover.staff.image ? (
                                        <img src={handover.staff.image} alt={handover.staff.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-medium">{handover.staff.name.charAt(0)}</span>
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">{handover.staff.name}</p>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                            {handover.branch.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(handover.amount)}
                                        </p>
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                            <Clock size={12} />
                                            {format(new Date(handover.createdAt), 'MMM d, h:mm a')}
                                        </span>
                                    </div>
                                    {handover.notes && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">
                                            "{handover.notes}"
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex-1 sm:flex-none border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/50 dark:hover:bg-red-900/20"
                                    onClick={() => handleVerify(handover.id, 'rejected')}
                                    disabled={processingId === handover.id}
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Reject
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleVerify(handover.id, 'verified')}
                                    disabled={processingId === handover.id}
                                >
                                    <Check className="h-4 w-4 mr-1" />
                                    Verify
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </AnimatedCard>
    )
}
