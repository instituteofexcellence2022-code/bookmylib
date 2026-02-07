'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getUpcomingExpiries, getOverdueSubscriptions } from '@/actions/subscriptions'
import { checkAndSendExpiryReminders } from '@/actions/cron'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormSelect } from '@/components/ui/FormSelect'
import { AlertCircle, Clock, MessageCircle, RefreshCw, Send, Copy, Mail, MessageSquare, Search, User, Calendar, CheckCircle2, ExternalLink, MapPin, Armchair, CreditCard } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { formatSeatNumber, cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

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
    isPresentToday?: boolean
}

export function StaffDuesClient() {
    const router = useRouter()
    const [upcoming, setUpcoming] = useState<SubscriptionItem[]>([])
    const [overdue, setOverdue] = useState<SubscriptionItem[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming')
    const [selectedDays, setSelectedDays] = useState<string>('7')
    const [customDays, setCustomDays] = useState<string>('30')
    const [searchQuery, setSearchQuery] = useState('')
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
            message = `Hello ${item.student.name}, gentle reminder from ${item.branch.name}. Your library subscription expires ${dayText} (${format(endDate, 'dd MMM')}). Please renew to avoid interruption in your studies.`
        } else {
            const daysSinceExpiry = differenceInDays(today, endDate)
            
            if (item.isPresentToday) {
                 message = `Hello ${item.student.name}, we noticed you are currently at the library, but your subscription has expired. Please renew at the front desk before leaving to ensure seamless access next time. Thank you!`
            } else if (daysSinceExpiry <= 3) {
                message = `Hello ${item.student.name}, your subscription expired on ${format(endDate, 'dd MMM')}. We hope your studies are going well! Please renew your subscription to continue using the library facilities.`
            } else if (daysSinceExpiry <= 7) {
                message = `Hello ${item.student.name}, it's been a week since your subscription expired. We miss having you at the library! Renew now to reclaim your study spot.`
            } else {
                 message = `Hello ${item.student.name}, your subscription has been expired for a while. We have updated our facilities and would love to see you back. Visit us or reply to check out new plans!`
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

    const handleEmail = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        if (!item.student.email) {
            toast.error('Student has no email address')
            return
        }
        const message = getReminderMessage(item, type)
        const subject = type === 'upcoming' ? 'Subscription Expiry Reminder' : 'Subscription Expired'
        window.open(`mailto:${item.student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`, '_blank')
    }

    const handleSMS = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        if (!item.student.phone) {
            toast.error('Student has no phone number')
            return
        }
        const message = getReminderMessage(item, type)
        window.open(`sms:${item.student.phone.replace(/\D/g, '')}?body=${encodeURIComponent(message)}`, '_blank')
    }

    const handleCopyMessage = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        const message = getReminderMessage(item, type)
        navigator.clipboard.writeText(message)
        toast.success('Reminder message copied to clipboard')
    }

    const handleRenew = (studentId: string) => {
        router.push(`/staff/finance?tab=accept&studentId=${studentId}`)
    }

    const filteredUpcoming = upcoming.filter(item => 
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.phone?.includes(searchQuery)
    )

    const filteredOverdue = overdue.filter(item => 
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.phone?.includes(searchQuery)
    )

    const renderCard = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        const endDate = new Date(item.endDate)
        const daysDiff = differenceInDays(endDate, new Date())
        const daysSinceExpiry = differenceInDays(new Date(), endDate)
        
        return (
            <AnimatedCard key={item.id} className="group relative overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-primary/50 dark:hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-900">
                {/* Status Stripe */}
                <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    type === 'upcoming' 
                        ? daysDiff <= 3 ? "bg-amber-500" : "bg-blue-500"
                        : "bg-red-500"
                )} />

                <div className="p-5 pl-7">
                    {/* Header: Student Info & Status */}
                    <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex gap-3">
                            <Link href={`/staff/students/${item.student.id}`}>
                                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 ring-2 ring-gray-100 dark:ring-gray-800 flex-shrink-0 transition-transform group-hover:scale-105">
                                    {item.student.image ? (
                                        <Image 
                                            src={item.student.image} 
                                            alt={item.student.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
                                            <User size={24} />
                                        </div>
                                    )}
                                </div>
                            </Link>
                            <div>
                                <Link href={`/staff/students/${item.student.id}`} className="group-hover:text-primary transition-colors">
                                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">{item.student.name}</h4>
                                </Link>
                                <div className="flex items-center gap-2 mt-1">
                                    {item.isPresentToday && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1.5 shadow-sm">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                            </span>
                                            In Library
                                        </span>
                                    )}
                                    <span className={cn(
                                        "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm",
                                        type === 'upcoming' 
                                            ? daysDiff <= 3 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                            : "bg-red-100 text-red-700"
                                    )}>
                                        {type === 'upcoming' 
                                            ? `Expires in ${daysDiff} days` 
                                            : `Expired ${daysSinceExpiry} days ago`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-right">
                             <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Due Amount</div>
                             <div className={cn(
                                "text-xl font-bold font-mono",
                                type === 'upcoming' ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                             )}>
                                ₹{item.plan.price}
                             </div>
                        </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-4 border-t border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2 text-sm">
                            <CreditCard size={14} className="text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300 font-medium">{item.plan.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Armchair size={14} className="text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                                {item.seat ? formatSeatNumber(item.seat.number) : 'No Seat'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin size={14} className="text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300 truncate">{item.branch.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-gray-400" />
                            <span className={cn(
                                "font-medium",
                                type === 'overdue' ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-300"
                            )}>
                                {format(endDate, 'dd MMM yyyy')}
                            </span>
                        </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex gap-1">
                            <AnimatedButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleWhatsApp(item, type)}
                                className="h-9 w-9 p-0 rounded-full text-green-600 border-green-200 bg-green-50 hover:bg-green-600 hover:text-white hover:border-green-600 transition-all shadow-sm"
                                title="Send WhatsApp"
                            >
                                <MessageCircle size={16} />
                            </AnimatedButton>
                            <AnimatedButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleEmail(item, type)}
                                className="h-9 w-9 p-0 rounded-full text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                                title="Send Email"
                            >
                                <Mail size={16} />
                            </AnimatedButton>
                            <AnimatedButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleSMS(item, type)}
                                className="h-9 w-9 p-0 rounded-full text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm"
                                title="Send SMS"
                            >
                                <MessageSquare size={16} />
                            </AnimatedButton>
                            <AnimatedButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyMessage(item, type)}
                                className="h-9 w-9 p-0 rounded-full text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-600 hover:text-white hover:border-gray-600 transition-all shadow-sm"
                                title="Copy Reminder Message"
                            >
                                <Copy size={16} />
                            </AnimatedButton>
                        </div>

                        <AnimatedButton
                            size="sm"
                            variant="primary"
                            onClick={() => handleRenew(item.student.id)}
                            className="flex-1 max-w-[140px] h-9 text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                        >
                            <RefreshCw size={14} className="mr-2" />
                            Renew
                        </AnimatedButton>
                    </div>
                </div>
            </AnimatedCard>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all",
                            activeTab === 'upcoming' 
                                ? "bg-white dark:bg-gray-900 text-primary shadow-sm" 
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                        )}
                    >
                        Upcoming Expiries
                        {upcoming.length > 0 && (
                            <span className="ml-2 bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full">
                                {upcoming.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all",
                            activeTab === 'overdue' 
                                ? "bg-white dark:bg-gray-900 text-red-600 shadow-sm" 
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                        )}
                    >
                        Overdue
                        {overdue.length > 0 && (
                            <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                                {overdue.length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 h-10 text-sm border rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                    </div>
                    
                    <AnimatedButton
                        onClick={handleSendReminders}
                        isLoading={sendingReminders}
                        variant="outline"
                        className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20 whitespace-nowrap"
                        title="Send 3-Day Reminders"
                    >
                        <Send className="w-4 h-4" />
                        <span className="hidden lg:inline">Send Reminders</span>
                    </AnimatedButton>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 sm:pb-0">
                <div className="w-[140px]">
                    <FormSelect
                        name="days"
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(e.target.value)}
                        options={[
                            { label: 'Next 7 Days', value: '7' },
                            { label: 'Next 15 Days', value: '15' },
                            { label: 'Next 30 Days', value: '30' },
                            { label: 'Next 60 Days', value: '60' },
                            { label: 'Custom', value: 'custom' },
                        ]}
                        icon={Clock}
                        placeholder="Period"
                        className="text-sm py-1 h-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm focus:ring-0"
                        containerClassName="w-full"
                    />
                </div>

                {selectedDays === 'custom' && (
                    <div className="w-[100px]">
                        <input
                            type="number"
                            value={customDays}
                            onChange={(e) => setCustomDays(e.target.value)}
                            className="w-full h-10 px-3 py-1 text-sm border border-gray-200 dark:border-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white dark:bg-gray-900"
                            placeholder="Days"
                            min="1"
                        />
                    </div>
                )}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                    ))}
                </div>
            ) : (
                <>
                    {activeTab === 'upcoming' ? (
                        filteredUpcoming.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">All caught up!</h3>
                                <p className="text-sm">No upcoming expiries found for the selected period.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredUpcoming.map(item => renderCard(item, 'upcoming'))}
                            </div>
                        )
                    ) : (
                        filteredOverdue.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No overdue subscriptions!</h3>
                                <p className="text-sm">Great job keeping everything on track.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredOverdue.map(item => renderCard(item, 'overdue'))}
                            </div>
                        )
                    )}
                </>
            )}
        </div>
    )
}
