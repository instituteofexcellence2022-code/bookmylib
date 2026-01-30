'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStaffBalances } from '@/actions/owner/khatabook'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { Wallet, ArrowRight, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface StaffBalance {
    id: string
    name: string
    branchName: string
    image: string | null
    totalCollected: number
    totalHandedOver: number
    balance: number
    lastHandoverAt: Date | null
    pendingHandoverCount: number
}

export default function OwnerKhatabookPage() {
    const router = useRouter()
    const [balances, setBalances] = useState<StaffBalance[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const data = await getStaffBalances()
            setBalances(data as unknown as StaffBalance[])
        } catch (error) {
            toast.error('Failed to load staff balances')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading Staff Khatabooks...</div>
    }

    const totalCashInHands = balances.reduce((sum, b) => sum + b.balance, 0)

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Khatabook Manager</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track cash held by staff members</p>
                </div>
                
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-blue-100 font-medium">Total Cash with Staff</p>
                        <p className="text-xl font-bold">{formatCurrency(totalCashInHands)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {balances.map((staff) => (
                    <AnimatedCard 
                        key={staff.id}
                        onClick={() => router.push(`/owner/khatabook/${staff.id}`)}
                        className="cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all group"
                    >
                        <div className="p-5">
                            <div className="flex items-center gap-4 mb-4 relative">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xl font-bold text-gray-500">
                                    {staff.image ? (
                                        <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                                    ) : (
                                        staff.name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                        {staff.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">{staff.branchName}</p>
                                </div>
                                
                                {staff.pendingHandoverCount > 0 && (
                                    <div className="absolute top-0 right-0 -mt-1 -mr-1">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-800 animate-pulse">
                                            {staff.pendingHandoverCount}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-end p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                    <div>
                                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Cash to Collect</p>
                                        <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                                            {formatCurrency(staff.balance)}
                                        </p>
                                    </div>
                                    <ArrowRight className="text-red-400 mb-1" size={20} />
                                </div>
                                
                                <div className="flex justify-between text-xs text-gray-500 px-1">
                                    <span>Last Handover:</span>
                                    <span className="font-medium">
                                        {staff.lastHandoverAt 
                                            ? format(new Date(staff.lastHandoverAt), 'MMM d, yyyy')
                                            : 'Never'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>
                ))}

                {balances.length === 0 && (
                    <div className="col-span-full p-12 text-center bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active staff found</h3>
                        <p className="text-gray-500">Add staff members to start tracking cash.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
