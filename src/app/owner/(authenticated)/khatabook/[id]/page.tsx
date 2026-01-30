'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getStaffLedgerForOwner, verifyHandover, rejectHandover } from '@/actions/owner/khatabook'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { 
    Wallet, ArrowRight, History, ArrowDownLeft, ArrowUpRight, 
    ArrowLeft, Phone, Mail, User, FileText, CheckCircle, XCircle,
    Filter, Paperclip, Clock, Calendar, Search, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, subMonths, isSameDay, startOfDay, endOfDay } from 'date-fns'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormInput } from '@/components/ui/FormInput'

interface StaffLedgerData {
    staff: {
        name: string
        image: string | null
        role: string
    }
    summary: {
        totalCollected: number
        totalHandedOver: number
        balance: number
        periodCollected: number
        periodHandedOver: number
    }
    transactions: {
        id: string
        type: 'IN' | 'OUT'
        amount: number
        date: Date
        description: string
        status: string
        referenceId: string
        notes?: string
        details?: {
            studentName: string
            planName?: string
            method?: string
        }
        attachmentUrl?: string | null
    }[]
}

import { VerifyHandoverModal } from '@/components/owner/finance/VerifyHandoverModal'

type DateRangePreset = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'

export default function StaffLedgerPage() {
    const params = useParams()
    const router = useRouter()
    const [data, setData] = useState<StaffLedgerData | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
    const [searchQuery, setSearchQuery] = useState('')
    
    // Date Range State
    const [datePreset, setDatePreset] = useState<DateRangePreset>('ALL')
    const [customDateRange, setCustomDateRange] = useState<{ from: string; to: string }>({
        from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        to: format(new Date(), 'yyyy-MM-dd')
    })

    // Modal State
    const [selectedHandover, setSelectedHandover] = useState<any | null>(null)
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string)
        }
    }, [params.id, datePreset, customDateRange.from, customDateRange.to])

    const loadData = async (staffId: string) => {
        setLoading(true)
        try {
            let range: { from: Date; to: Date } | undefined

            if (datePreset === 'THIS_MONTH') {
                range = {
                    from: startOfMonth(new Date()),
                    to: endOfMonth(new Date())
                }
            } else if (datePreset === 'LAST_MONTH') {
                const lastMonth = subMonths(new Date(), 1)
                range = {
                    from: startOfMonth(lastMonth),
                    to: endOfMonth(lastMonth)
                }
            } else if (datePreset === 'CUSTOM') {
                range = {
                    from: startOfDay(new Date(customDateRange.from)),
                    to: endOfDay(new Date(customDateRange.to))
                }
            }

            const result = await getStaffLedgerForOwner(staffId, 100, range)
            setData(result as unknown as StaffLedgerData)
        } catch (error) {
            toast.error('Failed to load staff ledger')
        } finally {
            setLoading(false)
        }
    }

    const handleVerify = async (handoverId: string) => {
        setActionLoading(handoverId)
        try {
            await verifyHandover(handoverId)
            toast.success('Handover verified successfully')
            setIsVerifyModalOpen(false)
            setSelectedHandover(null)
            if (params.id) loadData(params.id as string)
        } catch (error) {
            toast.error('Failed to verify handover')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReject = async (handoverId: string) => {
        if (!confirm('Are you sure you want to reject this handover?')) return
        
        setActionLoading(handoverId)
        try {
            await rejectHandover(handoverId)
            toast.success('Handover rejected')
            setIsVerifyModalOpen(false)
            setSelectedHandover(null)
            if (params.id) loadData(params.id as string)
        } catch (error) {
            toast.error('Failed to reject handover')
        } finally {
            setActionLoading(null)
        }
    }

    const filteredTransactions = data?.transactions.filter(tx => {
        const matchesType = filter === 'ALL' || tx.type === filter
        const matchesSearch = searchQuery === '' || 
            tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.details?.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tx.amount.toString().includes(searchQuery)
        
        return matchesType && matchesSearch
    }) || []

    // Group transactions by date
    const groupedTransactions = filteredTransactions.reduce((groups, tx) => {
        const date = format(new Date(tx.date), 'yyyy-MM-dd')
        if (!groups[date]) groups[date] = []
        groups[date].push(tx)
        return groups
    }, {} as Record<string, typeof filteredTransactions>)

    if (loading && !data) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (!data) return <div>Staff not found</div>

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <AnimatedButton onClick={() => router.back()} variant="outline" className="p-2">
                    <ArrowLeft className="w-5 h-5" />
                </AnimatedButton>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xl font-bold text-gray-500 border-2 border-white dark:border-gray-800 shadow-sm">
                        {data.staff.image ? (
                            <img src={data.staff.image} alt={data.staff.name} className="w-full h-full object-cover" />
                        ) : (
                            data.staff.name.charAt(0)
                        )}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{data.staff.name}</h1>
                        <p className="text-sm text-gray-500">{data.staff.role}</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AnimatedCard className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none">
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-2 opacity-80">
                            <Wallet className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Current Cash In Hand</span>
                        </div>
                        <p className="text-3xl font-bold">{formatCurrency(data.summary.balance)}</p>
                        <p className="text-xs text-blue-100 mt-2 opacity-80">
                            Amount held by staff right now
                        </p>
                    </div>
                </AnimatedCard>

                <AnimatedCard>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                            <ArrowDownLeft className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">
                                {datePreset === 'ALL' ? 'Total Collected' : 'Period Collected'}
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(data.summary.periodCollected)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            Cash received from students
                        </p>
                    </div>
                </AnimatedCard>

                <AnimatedCard>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-2 text-orange-600 dark:text-orange-400">
                            <ArrowUpRight className="w-4 h-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">
                                {datePreset === 'ALL' ? 'Total Handed Over' : 'Period Handed Over'}
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(data.summary.periodHandedOver)}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            Verified cash given to owner
                        </p>
                    </div>
                </AnimatedCard>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
                    <select 
                        value={datePreset}
                        onChange={(e) => setDatePreset(e.target.value as DateRangePreset)}
                        className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                    >
                        <option value="ALL">All Time</option>
                        <option value="THIS_MONTH">This Month</option>
                        <option value="LAST_MONTH">Last Month</option>
                        <option value="CUSTOM">Custom</option>
                    </select>

                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
                    >
                        <option value="ALL">All Types</option>
                        <option value="IN">Collected (In)</option>
                        <option value="OUT">Handed Over (Out)</option>
                    </select>
                </div>
            </div>

            {datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <input 
                        type="date" 
                        value={customDateRange.from}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                        className="bg-transparent text-sm focus:outline-none"
                    />
                    <span className="text-gray-400">-</span>
                    <input 
                        type="date" 
                        value={customDateRange.to}
                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                        className="bg-transparent text-sm focus:outline-none"
                    />
                </div>
            )}

            {/* Transactions List */}
            <div className="space-y-6">
                {Object.keys(groupedTransactions).length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <History className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No transactions found</p>
                        <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                ) : (
                    Object.entries(groupedTransactions).map(([date, txs]) => (
                        <div key={date}>
                            <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-0 bg-gray-50 dark:bg-gray-900 py-2 z-10 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
                                    {txs.length}
                                </span>
                            </h3>
                            <div className="space-y-2">
                                {txs.map((tx) => (
                                    <AnimatedCard key={tx.id} className="group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                                        <div className="p-3 flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                                    tx.type === 'IN' 
                                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                                        : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                                                }`}>
                                                    {tx.type === 'IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {tx.description}
                                                        </p>
                                                        {tx.attachmentUrl && (
                                                            <Paperclip className="w-3 h-3 text-gray-400 shrink-0" />
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {format(new Date(tx.date), 'h:mm a')}
                                                        </span>
                                                        
                                                        {tx.details?.studentName && (
                                                            <span className="flex items-center gap-1 truncate max-w-[150px]">
                                                                <User className="w-3 h-3" />
                                                                {tx.details.studentName}
                                                            </span>
                                                        )}

                                                        {tx.details?.planName && (
                                                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">
                                                                {tx.details.planName}
                                                            </span>
                                                        )}

                                                        {tx.referenceId && (
                                                            <span className="text-gray-400 font-mono text-[10px]">
                                                                #{tx.referenceId.slice(-6)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                    {tx.notes && (
                                                        <p className="text-xs text-gray-400 mt-1 italic truncate">
                                                            "{tx.notes}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <p className={`font-bold text-sm ${
                                                    tx.type === 'IN' 
                                                        ? 'text-green-600 dark:text-green-400' 
                                                        : 'text-gray-900 dark:text-white'
                                                }`}>
                                                    {tx.type === 'IN' ? '+' : '-'} {formatCurrency(tx.amount)}
                                                </p>
                                                
                                                <div className="flex flex-col items-end gap-1 mt-1">
                                                    {tx.type === 'OUT' && tx.status === 'pending' && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedHandover(tx)
                                                                setIsVerifyModalOpen(true)
                                                            }}
                                                            className="px-2 py-0.5 text-[10px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-sm"
                                                        >
                                                            Verify
                                                        </button>
                                                    )}
                                                    
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium capitalize flex items-center gap-1 ${
                                                        tx.status === 'verified' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                        tx.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                    }`}>
                                                        {tx.status === 'verified' && <CheckCircle className="w-3 h-3" />}
                                                        {tx.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                                        {tx.status === 'pending' && <AlertCircle className="w-3 h-3" />}
                                                        {tx.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </AnimatedCard>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {selectedHandover && data && (
                <VerifyHandoverModal
                    isOpen={isVerifyModalOpen}
                    onClose={() => {
                        setIsVerifyModalOpen(false)
                        setSelectedHandover(null)
                    }}
                    onVerify={() => handleVerify(selectedHandover.id)}
                    onReject={() => handleReject(selectedHandover.id)}
                    transaction={{
                        ...selectedHandover,
                        staffName: data.staff.name,
                        staffImage: data.staff.image
                    }}
                    loading={!!actionLoading}
                />
            )}
        </div>
    )
}
