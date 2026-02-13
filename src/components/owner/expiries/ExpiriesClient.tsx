'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getUpcomingExpiries, getOverdueSubscriptions, getSubscriptionDues } from '@/actions/subscriptions'
import { getOwnerBranches } from '@/actions/branch'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormSelect } from '@/components/ui/FormSelect'
import { MessageCircle, RefreshCw, AlertCircle, Clock, Search, User, Calendar, CheckCircle2, Mail, MessageSquare, Copy, ExternalLink, MapPin, Armchair, CreditCard, IndianRupee } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { formatSeatNumber, cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'
import { recordDuePayment } from '@/actions/owner/finance'

interface SubscriptionItem {
    id: string
    endDate: Date
    status: string
    amount: number
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
    const [dues, setDues] = useState<Array<SubscriptionItem & { paidTotal: number, dueAmount: number }>>([])
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
    const [selectedDays, setSelectedDays] = useState<string>('0-3')
    const [customDays, setCustomDays] = useState<string>('90')
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue' | 'dues'>('upcoming')
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
            const [upcomingRes, overdueRes, duesRes] = await Promise.all([
                getUpcomingExpiries(days, selectedBranchId),
                getOverdueSubscriptions(days, selectedBranchId),
                getSubscriptionDues(selectedBranchId)
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
            
            if (duesRes.success && duesRes.data) {
                setDues(duesRes.data)
            } else if (!duesRes.success) {
                toast.error(duesRes.error || 'Failed to fetch dues')
            }
        } catch {
            toast.error('Failed to fetch dues and expiries')
        } finally {
            setLoading(false)
        }
    }, [selectedBranchId, selectedDays, customDays])

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

    const filteredUpcoming = upcoming.filter(item => 
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.phone?.includes(searchQuery)
    )

    const filteredOverdue = overdue.filter(item => 
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.phone?.includes(searchQuery)
    )
    
    const filteredDues = dues.filter(item => 
        item.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.student.phone?.includes(searchQuery)
    )

    const totalUpcomingAmount = filteredUpcoming.reduce((sum, item) => sum + item.plan.price, 0)
    const totalOverdueAmount = filteredOverdue.reduce((sum, item) => sum + item.plan.price, 0)
    const totalDueAmount = filteredDues.reduce((sum, item) => sum + item.dueAmount, 0)

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
                            <Link href={`/owner/students/${item.student.id}`}>
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
                                <Link href={`/owner/students/${item.student.id}`} className="group-hover:text-primary transition-colors">
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

                        <Link href={`/owner/students/${item.student.id}?tab=subscription`} className="flex-1 max-w-[140px]">
                            <AnimatedButton
                                size="sm"
                                variant="primary"
                                className="w-full h-9 text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                            >
                                <RefreshCw size={14} className="mr-2" />
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
                        Expiring Soon
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
                        Recently Expired
                        {overdue.length > 0 && (
                            <span className="ml-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full">
                                {overdue.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('dues')}
                        className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all",
                            activeTab === 'dues' 
                                ? "bg-white dark:bg-gray-900 text-amber-600 shadow-sm" 
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                        )}
                    >
                        Dues
                        {dues.length > 0 && (
                            <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">
                                {dues.length}
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
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 sm:pb-0">
                <div className="flex-1 min-w-[150px]">
                    <FormSelect
                        name="branch"
                        value={selectedBranchId}
                        onChange={(e) => setSelectedBranchId(e.target.value)}
                        options={[
                            { value: 'all', label: 'All Branches' },
                            ...branches.map(b => ({ value: b.id, label: b.name }))
                        ]}
                        className="h-10 text-sm"
                    />
                </div>
                <div className="min-w-[140px]">
                    <FormSelect
                        name="days"
                        value={selectedDays}
                        onChange={(e) => setSelectedDays(e.target.value)}
                        options={activeTab === 'upcoming' ? [
                            { value: 'today', label: 'Expiring Today' },
                            { value: 'tomorrow', label: 'Expiring Tomorrow' },
                            { value: '0-3', label: 'Next 3 Days' },
                            { value: '3-7', label: 'Next 7 Days' },
                            { value: '7-15', label: 'Next 15 Days' },
                            { value: '15-30', label: 'Next 30 Days' },
                            { value: 'custom', label: 'Custom Range' }
                        ] : activeTab === 'overdue' ? [
                            { value: 'today', label: 'Expired Today' },
                            { value: 'yesterday', label: 'Expired Yesterday' },
                            { value: '0-3', label: 'Last 3 Days' },
                            { value: '3-7', label: 'Last 7 Days' },
                            { value: '7-15', label: 'Last 15 Days' },
                            { value: '15-30', label: 'Last 30 Days' },
                            { value: 'custom', label: 'Custom Range' }
                        ] : [
                            { value: '0-3', label: 'Next 3 Days' }
                        ]}
                        className="h-10 text-sm"
                    />
                </div>
                {selectedDays === 'custom' && (
                    <input
                        type="number"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        className="h-10 w-20 px-3 border rounded-md shrink-0 text-sm"
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

            {/* Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Expiring Soon</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {filteredUpcoming.length} <span className="text-sm font-normal text-blue-500">students</span>
                    </div>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                    <div className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-1">Potential Revenue</div>
                    <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                        ₹{totalUpcomingAmount.toLocaleString()}
                    </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
                    <div className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Recently Expired</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {filteredOverdue.length} <span className="text-sm font-normal text-red-500">students</span>
                    </div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-100 dark:border-orange-800">
                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">Pending Amount</div>
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                        ₹{totalOverdueAmount.toLocaleString()}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <RefreshCw className="animate-spin text-gray-400" size={32} />
                </div>
            ) : (
                <>
                    {activeTab === 'upcoming' && (
                        <>
                            {filteredUpcoming.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Clock className="mx-auto text-gray-300 mb-3" size={48} />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No expiring soon</h3>
                                    <p className="text-gray-500">No subscriptions are expiring in the selected period.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredUpcoming.map(item => renderCard(item, 'upcoming'))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'overdue' && (
                        <>
                            {filteredOverdue.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <CheckCircle2 className="mx-auto text-gray-300 mb-3" size={48} />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No recently expired subscriptions</h3>
                                    <p className="text-gray-500">All subscriptions are up to date for the selected period.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredOverdue.map(item => renderCard(item, 'overdue'))}
                                </div>
                            )}
                        </>
                    )}
                    
                    {activeTab === 'dues' && (
                        <>
                            {filteredDues.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <CheckCircle2 className="mx-auto text-gray-300 mb-3" size={48} />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No outstanding dues</h3>
                                    <p className="text-gray-500">All subscriptions are fully paid.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredDues.map(item => (
                                        <AnimatedCard key={item.id} className="group relative overflow-hidden border border-gray-200 dark:border-gray-800 hover:border-amber-400/50 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-900">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                                            <div className="p-5 pl-7">
                                                <div className="flex justify-between items-start gap-4 mb-4">
                                                    <div className="flex gap-3">
                                                        <Link href={`/owner/students/${item.student.id}`}>
                                                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gray-100 ring-2 ring-gray-100 dark:ring-gray-800 flex-shrink-0 transition-transform group-hover:scale-105">
                                                                {item.student.image ? (
                                                                    <Image src={item.student.image} alt={item.student.name} fill className="object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
                                                                        <User size={24} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </Link>
                                                        <div>
                                                            <Link href={`/owner/students/${item.student.id}`} className="group-hover:text-amber-700 transition-colors">
                                                                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-base">{item.student.name}</h4>
                                                            </Link>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded-full shadow-sm flex items-center gap-1.5">
                                                                    <IndianRupee size={10} />
                                                                    Due ₹{item.dueAmount.toFixed(0)}
                                                                </span>
                                                                <span className="px-2 py-0.5 text-[10px] font-medium tracking-wider bg-blue-100 text-blue-700 rounded-full shadow-sm">
                                                                    Paid ₹{item.paidTotal.toFixed(0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Plan</div>
                                                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{item.plan.name}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 py-4 border-t border-b border-gray-100 dark:border-gray-800">
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
                                                        <span className="text-gray-600 dark:text-gray-300">
                                                            {format(new Date(item.endDate), 'dd MMM yyyy')}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <CreditCard size={14} className="text-gray-400" />
                                                        <span className="text-gray-600 dark:text-gray-300">Total ₹{item.amount.toFixed(0)}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <Link href={`/owner/bookings?view=create&studentId=${item.student.id}`} className="flex-1 max-w-[140px]">
                                                        <AnimatedButton size="sm" variant="outline" className="w-full h-9 text-xs font-semibold shadow-sm">
                                                            Collect Payment
                                                        </AnimatedButton>
                                                    </Link>
                                                    <AnimatedButton
                                                        size="sm"
                                                        variant="primary"
                                                        className="h-9 text-xs font-semibold shadow-md hover:shadow-lg transition-all bg-amber-600 hover:bg-amber-700"
                                                        onClick={async () => {
                                                            const res = await recordDuePayment({ subscriptionId: item.id, amount: item.dueAmount })
                                                            if (res.success) {
                                                                toast.success('Due payment recorded')
                                                                fetchData()
                                                            } else {
                                                                toast.error(res.error || 'Failed to record payment')
                                                            }
                                                        }}
                                                    >
                                                        Mark Paid ₹{item.dueAmount.toFixed(0)}
                                                    </AnimatedButton>
                                                </div>
                                            </div>
                                        </AnimatedCard>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    )
}
