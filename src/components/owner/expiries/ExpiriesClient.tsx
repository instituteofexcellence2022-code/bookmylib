'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getUpcomingExpiries, getOverdueSubscriptions } from '@/actions/subscriptions'
import { getOwnerBranches } from '@/actions/branch'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormSelect } from '@/components/ui/FormSelect'
import { MessageCircle, RefreshCw, AlertCircle, Clock, Search, User, Calendar, CheckCircle2, Mail, MessageSquare } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { formatSeatNumber, cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
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
    isPresentToday?: boolean
}

export function ExpiriesClient() {
    const [upcoming, setUpcoming] = useState<SubscriptionItem[]>([])
    const [overdue, setOverdue] = useState<SubscriptionItem[]>([])
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
    const [selectedDays, setSelectedDays] = useState<string>('0-3')
    const [customDays, setCustomDays] = useState<string>('90')
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const result = await getOwnerBranches()
                if (result.success && result.data) {
                    setBranches(result.data)
                }
            } catch (error) {
                console.error('Failed to load branches', error)
            }
        }
        loadBranches()
    }, [])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const days = selectedDays === 'custom' ? (parseInt(customDays) || 7) : selectedDays
            const [upcomingRes, overdueRes] = await Promise.all([
                getUpcomingExpiries(days, selectedBranchId),
                getOverdueSubscriptions(days, selectedBranchId)
            ])
            
            if (upcomingRes.success && upcomingRes.data) {
                setUpcoming(upcomingRes.data)
            } else {
                toast.error(upcomingRes.error || 'Failed to fetch upcoming expiries')
            }

            if (overdueRes.success && overdueRes.data) {
                setOverdue(overdueRes.data)
            } else {
                toast.error(overdueRes.error || 'Failed to fetch overdue subscriptions')
            }
        } catch {
            toast.error('Failed to fetch dues and expiries')
        } finally {
            setLoading(false)
        }
    }, [selectedBranchId, selectedDays, customDays])

    useEffect(() => {
        // Reset to default if switching tabs and current selection might be invalid (though we use same keys now)
        // Keeping it safe or just removing if not needed. 
        // Since both tabs share same keys '0-3', '3-7' etc, we don't strictly need to reset, 
        // but '0-3' is a good default.
        // Actually, let's keep the selection if possible, or default to 0-3.
    }, [activeTab])

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
            message = `Hello ${item.student.name}, gentle reminder from ${item.branch.name}. Your subscription expires in ${daysLeft} days (${format(endDate, 'dd MMM')}). Please renew to avoid interruption.`
        } else {
            // Overdue logic
            const daysSinceExpiry = differenceInDays(today, endDate)
            
            if (item.isPresentToday) {
                 message = `Hello ${item.student.name}, we noticed you are currently at the library, but your subscription has expired. Please renew at the front desk before leaving to ensure seamless access next time. Thank you!`
            } else if (daysSinceExpiry <= 3) {
                message = `Hello ${item.student.name}, your subscription expired recently on ${format(endDate, 'dd MMM')}. Please renew to continue accessing the library.`
            } else if (daysSinceExpiry <= 7) {
                message = `Hello ${item.student.name}, it's been a week since your subscription expired. We miss you at the library! Renew now to keep your spot.`
            } else if (daysSinceExpiry <= 30) {
                message = `Hello ${item.student.name}, your subscription has been expired for a while now. We hope to see you back soon! Let us know if you'd like to renew.`
            } else {
                 message = `Hello ${item.student.name}, it's been over a month since we last saw you. We have new plans available that might suit you. Visit us or reply to know more!`
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

    const filteredUpcoming = upcoming.filter(item => 
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.phone?.includes(searchQuery)
    )

    const filteredOverdue = overdue.filter(item => 
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.phone?.includes(searchQuery)
    )

    const totalUpcomingAmount = filteredUpcoming.reduce((sum, item) => sum + item.plan.price, 0)
    const totalOverdueAmount = filteredOverdue.reduce((sum, item) => sum + item.plan.price, 0)

    const renderCard = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        const endDate = new Date(item.endDate)
        const daysDiff = differenceInDays(endDate, new Date())
        const daysSinceExpiry = differenceInDays(new Date(), endDate)
        
        return (
            <AnimatedCard key={item.id} className="p-4 hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary">
                <div className="flex justify-between items-start gap-3">
                    <div className="flex gap-3">
                        <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                            {item.student.image ? (
                                <Image 
                                    src={item.student.image} 
                                    alt={item.student.name}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <User size={20} />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center flex-wrap gap-2">
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.student.name}</h4>
                                <span className="text-xs text-gray-500 font-medium">({item.plan.name})</span>
                                {item.isPresentToday && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        In Library
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                <span>{item.branch.name}</span>
                                {item.seat && (
                                    <>
                                        <span>•</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                            {formatSeatNumber(item.seat.number)}
                                        </span>
                                    </>
                                )}
                            </div>

                            {(item.student.phone || item.student.email) && (
                                <div className="text-xs text-gray-500 mt-1">
                                    {item.student.phone || item.student.email}
                                </div>
                            )}

                        </div>
                    </div>
                    <div className="text-right">
                        <div className={cn(
                            "font-bold text-lg",
                            type === 'upcoming' ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                        )}>
                            ₹{item.plan.price}
                        </div>
                        <div className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block mt-1",
                            type === 'upcoming' 
                                ? daysDiff <= 3 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                : "bg-red-100 text-red-700"
                        )}>
                            {type === 'upcoming' 
                                ? `In ${daysDiff} days` 
                                : `${daysSinceExpiry} days ago`
                            }
                        </div>
                    </div>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {format(endDate, 'dd MMM yyyy')}
                    </div>
                    <div className="flex gap-2">
                        <div className="flex gap-1">
                            <AnimatedButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleWhatsApp(item, type)}
                                className="h-8 w-8 p-0 text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300"
                                title="WhatsApp"
                            >
                                <MessageCircle size={14} />
                            </AnimatedButton>
                            <AnimatedButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleEmail(item, type)}
                                className="h-8 w-8 p-0 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300"
                                title="Email"
                            >
                                <Mail size={14} />
                            </AnimatedButton>
                            <AnimatedButton
                                size="sm"
                                variant="outline"
                                onClick={() => handleSMS(item, type)}
                                className="h-8 w-8 p-0 text-gray-600 border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300"
                                title="SMS"
                            >
                                <MessageSquare size={14} />
                            </AnimatedButton>
                        </div>
                        <Link href={`/owner/students/${item.student.id}?tab=subscription`}>
                            <AnimatedButton
                                size="sm"
                                variant="primary"
                                className="h-8 text-xs gap-1.5"
                            >
                                <RefreshCw size={14} />
                                Renew
                            </AnimatedButton>
                        </Link>
                    </div>
                </div>
            </AnimatedCard>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dues & Expiries</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage subscription renewals and overdue payments
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <AnimatedCard className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                <span className="sm:hidden">Projected Renewal</span>
                                <span className="hidden sm:inline">Projected Renewal Revenue</span>
                            </p>
                            <h4 className="text-xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                                ₹{totalUpcomingAmount.toLocaleString()}
                            </h4>
                            <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">
                                <span className="sm:hidden">{filteredUpcoming.length} expiring</span>
                                <span className="hidden sm:inline">{filteredUpcoming.length} subscriptions expiring soon</span>
                            </p>
                        </div>
                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-xl">
                            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="p-3 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-100 dark:border-red-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">
                                <span className="sm:hidden">Overdue Risk</span>
                                <span className="hidden sm:inline">Overdue Revenue Risk</span>
                            </p>
                            <h4 className="text-xl font-bold text-red-900 dark:text-red-100 mt-1">
                                ₹{totalOverdueAmount.toLocaleString()}
                            </h4>
                            <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">
                                <span className="sm:hidden">{filteredOverdue.length} expired</span>
                                <span className="hidden sm:inline">{filteredOverdue.length} subscriptions expired</span>
                            </p>
                        </div>
                        <div className="p-2 bg-red-100 dark:bg-red-800 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-300" />
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('upcoming')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === 'upcoming'
                            ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                >
                    Expiring Soon
                </button>
                <button
                    onClick={() => setActiveTab('overdue')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === 'overdue'
                            ? "bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm"
                            : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                >
                    Recent Expired
                </button>
            </div>

            <AnimatedCard className="p-4 md:p-6">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search students by name or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                        <div className="flex-1 min-w-[120px]">
                            <FormSelect
                                name="branch"
                                value={selectedBranchId}
                                onChange={(e) => setSelectedBranchId(e.target.value)}
                                options={[
                                    { value: 'all', label: 'All' },
                                    ...branches.map(b => ({ value: b.id, label: b.name }))
                                ]}
                                className="h-10 text-sm"
                            />
                        </div>
                        <div className="w-[110px] sm:w-[130px] shrink-0">
                            <FormSelect
                                name="days"
                                value={selectedDays}
                                onChange={(e) => setSelectedDays(e.target.value)}
                                options={activeTab === 'upcoming' ? [
                                    { value: 'today', label: 'Today' },
                                    { value: 'tomorrow', label: 'Tomorrow' },
                                    { value: '0-3', label: '0-3 Days' },
                                    { value: '3-7', label: '3-7 Days' },
                                    { value: '7-15', label: '7-15 Days' },
                                    { value: '15-30', label: '15-30 Days' },
                                    { value: 'custom', label: 'Custom' }
                                ] : [
                                    { value: 'today', label: 'Today' },
                                    { value: 'yesterday', label: 'Yesterday' },
                                    { value: '0-3', label: '0-3 Days' },
                                    { value: '3-7', label: '3-7 Days' },
                                    { value: '7-15', label: '7-15 Days' },
                                    { value: '15-30', label: '15-30 Days' },
                                    { value: 'custom', label: 'Custom' }
                                ]}
                                className="h-10 text-sm"
                            />
                        </div>
                        {selectedDays === 'custom' && (
                            <input
                                type="number"
                                value={customDays}
                                onChange={(e) => setCustomDays(e.target.value)}
                                className="h-10 w-20 px-3 border rounded-md shrink-0"
                                placeholder="Days"
                            />
                        )}
                        <AnimatedButton
                            variant="outline"
                            onClick={fetchData}
                            disabled={loading}
                            className="h-10 w-10 p-0 flex items-center justify-center shrink-0"
                        >
                            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                        </AnimatedButton>
                    </div>
                </div>
            </AnimatedCard>

            <AnimatedCard className="p-4 md:p-6">
                <div className="space-y-4">
                    {activeTab === 'upcoming' ? (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="text-blue-600" size={20} />
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Expiring Soon</h3>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    {filteredUpcoming.length}
                                </span>
                            </div>
                            
                            {loading ? (
                                <div className="text-center py-12 text-gray-500">Loading...</div>
                            ) : filteredUpcoming.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />
                                    <p className="font-medium">No upcoming expirations</p>
                                    <p className="text-sm mt-1">You&apos;re all caught up for the selected period</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {filteredUpcoming.map(item => renderCard(item, 'upcoming'))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="text-red-600" size={20} />
                                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Recent Expired</h3>
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                    {filteredOverdue.length}
                                </span>
                            </div>

                            {loading ? (
                                <div className="text-center py-12 text-gray-500">Loading...</div>
                            ) : filteredOverdue.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-500 mb-3" />
                                    <p className="font-medium">No expired subscriptions</p>
                                    <p className="text-sm mt-1">Great job! All subscriptions are active</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                    {filteredOverdue.map(item => renderCard(item, 'overdue'))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </AnimatedCard>
        </div>
    )
}
