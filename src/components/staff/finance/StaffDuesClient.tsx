'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getBranchDues } from '@/actions/staff/finance'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AlertCircle, Clock, Search, Phone, Mail, MessageCircle, CreditCard, RefreshCw } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface SubscriptionItem {
    id: string
    endDate: Date
    status: string
    student: {
        id: string
        name: string
        email: string
        phone: string | null
        image: string | null
    }
    plan: {
        name: string
        price: number
    }
    seat: {
        number: string
        section: string | null
    } | null
}

export function StaffDuesClient() {
    const router = useRouter()
    const [upcoming, setUpcoming] = useState<SubscriptionItem[]>([])
    const [overdue, setOverdue] = useState<SubscriptionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming')

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const { expiries, overdue: overdueData } = await getBranchDues(7)
            setUpcoming(expiries)
            setOverdue(overdueData)
        } catch {
            toast.error('Failed to fetch dues')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const sendWhatsApp = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        if (!item.student.phone) {
            toast.error('Student has no phone number')
            return
        }

        const days = differenceInDays(new Date(item.endDate), new Date())
        let message = ''

        if (type === 'upcoming') {
            message = `Hello ${item.student.name}, gentle reminder. Your subscription for ${item.plan.name} is expiring in ${days} days (on ${format(new Date(item.endDate), 'dd MMM yyyy')}). Please renew to continue access.`
        } else {
            message = `Hello ${item.student.name}, reminder. Your subscription for ${item.plan.name} has expired on ${format(new Date(item.endDate), 'dd MMM yyyy')}. Please renew to reactivate access.`
        }

        // Open WhatsApp Web - Assuming India (+91) for now or use raw phone if it has country code
        // Simple heuristic: if len is 10, prepend 91
        let phone = item.student.phone.replace(/\D/g, '')
        if (phone.length === 10) phone = '91' + phone

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        window.open(url, '_blank')
    }

    const handleRenew = (studentId: string) => {
        router.push(`/staff/finance?tab=accept&studentId=${studentId}`)
    }

    const currentList = activeTab === 'upcoming' ? upcoming : overdue

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'upcoming'
                                ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                        }`}
                    >
                        Expiring Soon ({upcoming.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                            activeTab === 'overdue'
                                ? 'bg-white text-red-600 shadow-sm dark:bg-gray-950 dark:text-red-400'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                        }`}
                    >
                        Overdue ({overdue.length})
                    </button>
                </div>
                
                {/* Stats Summary (Optional) */}
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Total {activeTab === 'upcoming' ? 'Expiries' : 'Overdue'}: <span className="font-semibold text-gray-900 dark:text-white">{currentList.length}</span>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Plan & Seat</th>
                                <th className="px-6 py-3">Expiry Date</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                            Loading...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                                <AlertCircle className="w-6 h-6 text-gray-400" />
                                            </div>
                                            No {activeTab} subscriptions found
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                currentList.map((item) => {
                                    const daysDiff = differenceInDays(new Date(item.endDate), new Date())
                                    const isOverdue = daysDiff < 0
                                    
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                                                        {item.student.image ? (
                                                            <img src={item.student.image} alt={item.student.name} className="w-full h-full object-cover rounded-full" />
                                                        ) : (
                                                            item.student.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{item.student.name}</div>
                                                        <div className="text-xs text-gray-500">{item.student.phone || 'No phone'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 dark:text-white font-medium">{item.plan.name}</div>
                                                {item.seat ? (
                                                    <Badge variant="secondary" className="mt-1 text-xs font-normal">
                                                        Seat {item.seat.number}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-gray-400 mt-1 block">No Seat</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {format(new Date(item.endDate), 'dd MMM yyyy')}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {format(new Date(item.endDate), 'EEEE')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    isOverdue 
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                }`}>
                                                    {isOverdue ? `Expired ${Math.abs(daysDiff)} days ago` : `Expires in ${daysDiff} days`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <AnimatedButton
                                                        onClick={() => sendWhatsApp(item, activeTab)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-900/50 dark:hover:bg-green-900/20"
                                                        title="Send WhatsApp Reminder"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </AnimatedButton>
                                                    <AnimatedButton
                                                        onClick={() => handleRenew(item.student.id)}
                                                        size="sm"
                                                        className="h-8 px-3 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                                    >
                                                        <RefreshCw size={14} />
                                                        <span className="hidden sm:inline">Renew</span>
                                                    </AnimatedButton>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
