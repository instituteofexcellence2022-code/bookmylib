'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getUpcomingExpiries, getOverdueSubscriptions } from '@/actions/subscriptions'
import { checkAndSendExpiryReminders } from '@/actions/cron'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormSelect } from '@/components/ui/FormSelect'
import { AlertCircle, Clock, MessageCircle, RefreshCw, Send, Copy, Mail, MessageSquare } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { formatSeatNumber, cn } from '@/lib/utils'
import Image from 'next/image'

interface SubscriptionItem {
    id: string
    endDate: Date
    status: string
    student: {
        id: string
        name: string
        email: string | null
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
    branch: {
        name: string
    }
}

export function StaffDuesClient() {
    const router = useRouter()
    const [upcoming, setUpcoming] = useState<SubscriptionItem[]>([])
    const [overdue, setOverdue] = useState<SubscriptionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming')
    const [selectedDays, setSelectedDays] = useState<string>('7')
    const [customDays, setCustomDays] = useState<string>('30')
    const [sendingReminders, setSendingReminders] = useState(false)

    const handleSendReminders = async () => {
        setSendingReminders(true)
        try {
            const result = await checkAndSendExpiryReminders()
            if (result.success) {
                toast.success(`Sent ${result.sent} reminders. (${result.errors} failed)`)
            } else {
                toast.error(result.error)
            }
        } catch {
            toast.error('Failed to send reminders')
        } finally {
            setSendingReminders(false)
        }
    }

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const days = selectedDays === 'custom' ? (parseInt(customDays) || 7) : parseInt(selectedDays)
            
            const [upcomingRes, overdueRes] = await Promise.all([
                getUpcomingExpiries(days),
                getOverdueSubscriptions(days)
            ])

            if (upcomingRes.success && upcomingRes.data) {
                setUpcoming(upcomingRes.data as unknown as SubscriptionItem[])
            }
            if (overdueRes.success && overdueRes.data) {
                setOverdue(overdueRes.data as unknown as SubscriptionItem[])
            }
        } catch {
            toast.error('Failed to fetch dues')
        } finally {
            setLoading(false)
        }
    }, [selectedDays, customDays])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timer)
    }, [fetchData])

    const getReminderMessage = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        const endDate = new Date(item.endDate)
        const today = new Date()
        let message = ''

        if (type === 'upcoming') {
            const daysLeft = differenceInDays(endDate, today)
            const dayText = daysLeft === 0 ? 'today' : daysLeft === 1 ? 'tomorrow' : `in ${daysLeft} days`
            message = `Hello ${item.student.name}, gentle reminder. Your subscription for ${item.plan.name} expires ${dayText} (${format(endDate, 'dd MMM')}). Please renew to avoid interruption.`
        } else {
            const daysSinceExpiry = differenceInDays(today, endDate)
            if (daysSinceExpiry <= 3) {
                message = `Hello ${item.student.name}, your subscription expired on ${format(endDate, 'dd MMM')}. Please renew to continue using the library facilities.`
            } else {
                message = `Hello ${item.student.name}, your subscription has been expired for ${daysSinceExpiry} days. Please renew to regain access.`
            }
        }
        return message
    }

    const handleWhatsApp = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        if (!item.student.phone) {
            toast.error('Student has no phone number')
            return
        }
        const message = getReminderMessage(item, type)
        const encodedMessage = encodeURIComponent(message)
        window.open(`https://wa.me/${item.student.phone.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank')
    }

    const handleCopyMessage = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        const message = getReminderMessage(item, type)
        navigator.clipboard.writeText(message)
        toast.success('Reminder message copied to clipboard')
    }

    const handleRenew = (studentId: string) => {
        router.push(`/staff/finance?tab=accept&studentId=${studentId}`)
    }

    const currentList = activeTab === 'upcoming' ? upcoming : overdue

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'upcoming'
                                    ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                            )}
                        >
                            Expiring Soon ({upcoming.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('overdue')}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                                activeTab === 'overdue'
                                    ? 'bg-white text-red-600 shadow-sm dark:bg-gray-950 dark:text-red-400'
                                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                            )}
                        >
                            Overdue ({overdue.length})
                        </button>
                        
                        <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                        <div className="w-[120px]">
                            <FormSelect
                                name="days"
                                value={selectedDays}
                                onChange={(e) => setSelectedDays(e.target.value)}
                                options={[
                                    { label: '7 Days', value: '7' },
                                    { label: '15 Days', value: '15' },
                                    { label: '30 Days', value: '30' },
                                    { label: '60 Days', value: '60' },
                                    { label: 'Custom', value: 'custom' },
                                ]}
                                icon={Clock}
                                placeholder="Period"
                                className="text-sm py-1 h-8 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-sm focus:ring-0"
                                containerClassName="w-full"
                            />
                        </div>
                    </div>
                        
                    {selectedDays === 'custom' && (
                        <div className="w-[80px]">
                            <input
                                type="number"
                                value={customDays}
                                onChange={(e) => setCustomDays(e.target.value)}
                                className="w-full h-9 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white dark:bg-gray-800"
                                placeholder="Days"
                                min="1"
                            />
                        </div>
                    )}
                </div>

                <AnimatedButton
                    onClick={handleSendReminders}
                    isLoading={sendingReminders}
                    variant="outline"
                    className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
                >
                    <Send className="w-4 h-4" />
                    Send 3-Day Reminders
                </AnimatedButton>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Student</th>
                                <th className="px-6 py-3">Plan & Seat</th>
                                <th className="px-6 py-3">Expiry Date</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                            Loading...
                                        </div>
                                    </td>
                                </tr>
                            ) : currentList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                                <AlertCircle className="w-6 h-6 text-gray-400" />
                                            </div>
                                            No {activeTab} subscriptions found for the selected period
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
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                                                        {item.student.image ? (
                                                            <Image 
                                                                src={item.student.image} 
                                                                alt={item.student.name}
                                                                width={40}
                                                                height={40}
                                                                className="object-cover w-full h-full"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold bg-blue-100 dark:bg-blue-900/30">
                                                                {item.student.name.charAt(0)}
                                                            </div>
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
                                                        {formatSeatNumber(item.seat.number)}
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
                                                <div className={cn(
                                                    "font-medium",
                                                    isOverdue ? "text-red-600" : "text-blue-600"
                                                )}>
                                                    ₹{item.plan.price}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                                    isOverdue 
                                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                )}>
                                                    {isOverdue ? `Expired ${Math.abs(daysDiff)} days ago` : `Expires in ${daysDiff} days`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <AnimatedButton
                                                        onClick={() => handleWhatsApp(item, activeTab)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-900/50 dark:hover:bg-green-900/20"
                                                        title="Send WhatsApp Reminder"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </AnimatedButton>
                                                    <AnimatedButton
                                                        onClick={() => handleCopyMessage(item, activeTab)}
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                                                        title="Copy Message"
                                                    >
                                                        <Copy size={16} />
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
