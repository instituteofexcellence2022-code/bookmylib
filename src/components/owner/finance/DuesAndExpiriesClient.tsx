'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getUpcomingExpiries, getOverdueSubscriptions } from '@/actions/owner/finance'
import { getOwnerBranches } from '@/actions/branch'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormSelect } from '@/components/ui/FormSelect'
import { MessageCircle, RefreshCw, AlertCircle, Clock, Filter, Search, User, CreditCard } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { formatSeatNumber } from '@/lib/utils'
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
    branch: {
        name: string
    }
}

export function DuesAndExpiriesClient() {
    const [upcoming, setUpcoming] = useState<SubscriptionItem[]>([])
    const [overdue, setOverdue] = useState<SubscriptionItem[]>([])
    const [branches, setBranches] = useState<{ id: string, name: string }[]>([])
    const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
    const [selectedDays, setSelectedDays] = useState<string>('7')
    const [customDays, setCustomDays] = useState<string>('90')
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue'>('upcoming')
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        const loadBranches = async () => {
            try {
                const data = await getOwnerBranches()
                setBranches(data)
            } catch (error) {
                console.error('Failed to load branches', error)
            }
        }
        loadBranches()
    }, [])

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const days = selectedDays === 'custom' ? (parseInt(customDays) || 7) : parseInt(selectedDays)
            const [upcomingData, overdueData] = await Promise.all([
                getUpcomingExpiries(days, selectedBranchId),
                getOverdueSubscriptions(days, selectedBranchId)
            ])
            setUpcoming(upcomingData)
            setOverdue(overdueData)
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

    const sendReminder = (item: SubscriptionItem, type: 'upcoming' | 'overdue') => {
        if (!item.student.phone) {
            toast.error('Student has no phone number')
            return
        }

        const days = differenceInDays(new Date(item.endDate), new Date())
        let message = ''

        if (type === 'upcoming') {
            message = `Hello ${item.student.name}, this is a gentle reminder from ${item.branch.name}. Your subscription for ${item.plan.name} is expiring in ${days} days (on ${format(new Date(item.endDate), 'dd MMM yyyy')}). Please renew to continue your access.`
        } else {
            message = `Hello ${item.student.name}, this is a reminder from ${item.branch.name}. Your subscription for ${item.plan.name} has expired on ${format(new Date(item.endDate), 'dd MMM yyyy')}. Please renew your subscription to reactivate your access.`
        }

        const encodedMessage = encodeURIComponent(message)
        window.open(`https://wa.me/${item.student.phone.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank')
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

    if (loading && branches.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading data...</div>
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <AnimatedCard className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Projected Renewal</p>
                            <h4 className="text-lg font-bold text-blue-900 dark:text-blue-100 mt-0.5">
                                ₹{totalUpcomingAmount.toLocaleString()}
                            </h4>
                            <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                                {filteredUpcoming.length} upcoming
                            </p>
                        </div>
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-800 rounded-lg">
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                        </div>
                    </div>
                </AnimatedCard>

                <AnimatedCard className="p-3 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-100 dark:border-red-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">Overdue Risk</p>
                            <h4 className="text-lg font-bold text-red-900 dark:text-red-100 mt-0.5">
                                ₹{totalOverdueAmount.toLocaleString()}
                            </h4>
                            <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">
                                {filteredOverdue.length} overdue
                            </p>
                        </div>
                        <div className="p-1.5 bg-red-100 dark:bg-red-800 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-300" />
                        </div>
                    </div>
                </AnimatedCard>
            </div>

            <AnimatedCard className="w-full">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Dues & Expiries Management</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Track and manage student subscriptions</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <div className="flex-1 sm:flex-none min-w-[110px] sm:w-[130px]">
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
                                    className="text-sm py-1.5 h-9"
                                    containerClassName="w-full"
                                />
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

                            {selectedDays === 'custom' ? (
                                <div className="relative w-10 h-9 flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shrink-0" title={`Filter Branch: ${branches.find(b => b.id === selectedBranchId)?.name || 'All'}`}>
                                    <Filter className={`w-4 h-4 ${selectedBranchId !== 'all' ? 'text-primary' : 'text-gray-500'}`} />
                                    <select
                                        value={selectedBranchId}
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    >
                                        <option value="all">All Branches</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="flex-1 sm:flex-none min-w-[140px] sm:w-[200px]">
                                    <FormSelect
                                        name="branch"
                                        value={selectedBranchId}
                                        onChange={(e) => setSelectedBranchId(e.target.value)}
                                        options={[
                                            { label: 'All Branches', value: 'all' },
                                            ...branches.map(b => ({ label: b.name, value: b.id }))
                                        ]}
                                        icon={Filter}
                                        placeholder="Filter Branch"
                                        className="text-sm py-1.5 h-9"
                                        containerClassName="w-full"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search students by name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            />
                        </div>
                        <AnimatedButton variant="outline" size="sm" onClick={fetchData} className="h-9 px-3 whitespace-nowrap">
                            <RefreshCw className="w-4 h-4 sm:mr-2" />
                            <span className="hidden sm:inline">Refresh</span>
                        </AnimatedButton>
                    </div>
                </div>

                <div className="flex space-x-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 mb-6">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={`flex items-center justify-center gap-2 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                            activeTab === 'upcoming'
                                ? 'bg-white text-gray-900 shadow dark:bg-gray-950 dark:text-gray-50'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50'
                        }`}
                    >
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline truncate">Upcoming Expiries</span>
                        <span className="sm:hidden truncate">Upcoming</span>
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-900 dark:bg-gray-700 dark:text-gray-100 shrink-0">
                            {filteredUpcoming.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('overdue')}
                        className={`flex items-center justify-center gap-2 flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                            activeTab === 'overdue'
                                ? 'bg-white text-gray-900 shadow dark:bg-gray-950 dark:text-gray-50'
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50'
                        }`}
                    >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="hidden sm:inline truncate">Overdue / Expired</span>
                        <span className="sm:hidden truncate">Overdue</span>
                        <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900 dark:bg-red-900/30 dark:text-red-200 shrink-0">
                            {filteredOverdue.length}
                        </span>
                    </button>
                </div>

                <div className="min-h-[300px]">
                    {activeTab === 'upcoming' && (
                        <>
                            {filteredUpcoming.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-700">
                                    No upcoming expiries found.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredUpcoming.map((item) => (
                                        <SubscriptionCard key={item.id} item={item} type="upcoming" onRemind={() => sendReminder(item, 'upcoming')} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'overdue' && (
                        <>
                            {filteredOverdue.length === 0 ? (
                                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg border-gray-200 dark:border-gray-700">
                                    No overdue subscriptions found.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredOverdue.map((item) => (
                                        <SubscriptionCard key={item.id} item={item} type="overdue" onRemind={() => sendReminder(item, 'overdue')} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </AnimatedCard>
        </div>
    )
}

function SubscriptionCard({ item, type, onRemind }: { item: SubscriptionItem, type: 'upcoming' | 'overdue', onRemind: () => void }) {
    const isOverdue = type === 'overdue'
    const days = differenceInDays(new Date(item.endDate), new Date())
    
    return (
        <div className={`p-4 rounded-xl border transition-all hover:shadow-md ${
            isOverdue 
                ? 'bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900/30' 
                : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
        }`}>
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex gap-4">
                    <div className="flex-shrink-0">
                        {item.student.image ? (
                            <Image 
                                src={item.student.image} 
                                alt={item.student.name} 
                                width={48} 
                                height={48} 
                                className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm" 
                            />
                        ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${
                                isOverdue 
                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' 
                                    : 'bg-primary/10 text-primary dark:bg-primary/20'
                            }`}>
                                {item.student.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.student.name}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                                isOverdue
                                    ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                                    : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'
                            }`}>
                                {isOverdue ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                            </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>{item.plan.name} (₹{item.plan.price})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 flex items-center justify-center rounded-sm bg-gray-200 dark:bg-gray-700 text-[10px] font-bold">
                                    {item.seat ? formatSeatNumber(item.seat.number).replace('S-', '') : 'NA'}
                                </div>
                                <span>{item.seat ? formatSeatNumber(item.seat.number) : 'No Seat'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Ends: {format(new Date(item.endDate), 'dd MMM yyyy')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 justify-center sm:min-w-[140px]">
                    <AnimatedButton 
                        size="sm" 
                        onClick={onRemind}
                        className={`w-full justify-start ${
                            isOverdue 
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200 dark:shadow-none' 
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none'
                        }`}
                    >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Remind
                    </AnimatedButton>
                    
                    <Link href={`/owner/students/${item.student.id}`} className="w-full">
                        <AnimatedButton 
                            variant="outline" 
                            size="sm"
                            className="w-full justify-start bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                            <User className="w-4 h-4 mr-2" />
                            Profile
                        </AnimatedButton>
                    </Link>
                </div>
            </div>
        </div>
    )
}


