'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getBranchDues } from '@/actions/staff/finance'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AlertCircle, Clock, Search, Phone, Mail } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

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

    const copyReminder = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
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

        navigator.clipboard.writeText(message)
        toast.success('Reminder message copied to clipboard')
    }

    const currentList = activeTab === 'upcoming' ? upcoming : overdue

    return (
        <div className="space-y-6">
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Plan & Seat</th>
                                <th className="px-6 py-3">Expiry Date</th>
                                <th className="px-6 py-3">Days</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : currentList.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No {activeTab} subscriptions found
                                    </td>
                                </tr>
                            ) : (
                                currentList.map((item) => {
                                    const daysDiff = differenceInDays(new Date(item.endDate), new Date())
                                    const isOverdue = daysDiff < 0
                                    
                                    return (
                                        <tr key={item.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 dark:text-white">{item.student.name}</div>
                                                <div className="text-xs text-gray-500">{item.student.phone || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900 dark:text-white">{item.plan.name}</div>
                                                {item.seat && (
                                                    <Badge variant="outline" className="mt-1">
                                                        Seat {item.seat.number}
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {format(new Date(item.endDate), 'dd MMM yyyy')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-yellow-600'}`}>
                                                    {isOverdue ? `${Math.abs(daysDiff)} days ago` : `In ${daysDiff} days`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <AnimatedButton
                                                    onClick={() => copyReminder(item, activeTab)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2"
                                                >
                                                    <Phone size={14} />
                                                    Copy Msg
                                                </AnimatedButton>
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
