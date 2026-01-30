'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getStaffLedgerForOwner, verifyHandover, rejectHandover } from '@/actions/owner/khatabook'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { 
    Wallet, ArrowRight, History, ArrowDownLeft, ArrowUpRight, 
    ArrowLeft, Phone, Mail, User, FileText, CheckCircle, XCircle,
    Filter, Paperclip, Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

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

export default function StaffLedgerPage() {
    const params = useParams()
    const router = useRouter()
    const [data, setData] = useState<StaffLedgerData | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
    
    // Modal State
    const [selectedHandover, setSelectedHandover] = useState<any | null>(null)
    const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)

    useEffect(() => {
        if (params.id) {
            loadData(params.id as string)
        }
    }, [params.id])

    const loadData = async (staffId: string) => {
        try {
            const result = await getStaffLedgerForOwner(staffId)
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

    const openVerifyModal = (tx: any) => {
        setSelectedHandover({
            ...tx,
            staffName: data?.staff.name || 'Staff',
            staffImage: data?.staff.image
        })
        setIsVerifyModalOpen(true)
    }

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading ledger...</div>
    }

    if (!data) return <div className="p-12 text-center text-gray-500">Staff not found</div>

    const { staff, summary, transactions } = data

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-5xl mx-auto relative">
            {/* TOP SECTION: Header + Balance */}
            <div className="shrink-0 space-y-4 pb-4 bg-gray-50 dark:bg-gray-900 z-20"> 
                {/* Header */}
                <div className="flex items-center gap-4">
                    <AnimatedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </AnimatedButton>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xl font-bold text-gray-500">
                            {staff.image ? (
                                <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                            ) : (
                                staff.name.charAt(0)
                            )}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{staff.name}</h1>
                            <p className="text-gray-500 dark:text-gray-400 capitalize">{staff.role.replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>

                {/* Balance Card (Blue part only) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 font-medium mb-1">Total Cash to Collect</p>
                                <h2 className="text-4xl font-bold">{formatCurrency(summary.balance)}</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Wallet className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MIDDLE SECTION: Transactions (Scrollable) */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-wrap justify-between items-center gap-3 sticky top-0 z-10 backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <History className="w-4 h-4 text-gray-500" />
                                Transaction History
                            </h3>

                            <div className="flex bg-white dark:bg-gray-700 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                                <button 
                                    onClick={() => setFilter('ALL')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                        filter === 'ALL' 
                                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-600 dark:text-white shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    All
                                </button>
                                <button 
                                    onClick={() => setFilter('IN')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                        filter === 'IN' 
                                            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Collections
                                </button>
                                <button 
                                    onClick={() => setFilter('OUT')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                        filter === 'OUT' 
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Handovers
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No transactions found
                            </div>
                        ) : (
                            transactions
                                .filter(tx => filter === 'ALL' || tx.type === filter)
                                .map((tx) => (
                                <div 
                                    key={`${tx.type}-${tx.id}`} 
                                    className={`p-3 transition-colors flex items-center justify-between gap-3 group relative ${
                                        tx.type === 'OUT' && tx.status === 'pending'
                                            ? 'bg-yellow-50/50 dark:bg-yellow-900/10'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                    }`}
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {/* Icon Column */}
                                        <div className="flex flex-col items-center gap-2 shrink-0">
                                            <div className={`p-2 rounded-full flex items-center justify-center transition-all ${
                                                tx.type === 'IN' 
                                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30' 
                                                    : 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                            }`}>
                                                {tx.type === 'IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                            </div>
                                        </div>

                                        <div className="space-y-0.5 flex-1 min-w-0">
                                            {/* Description & Tag */}
                                            <div className="flex items-center gap-2 min-w-0">
                                                <p className="font-semibold text-lg truncate text-gray-900 dark:text-white">
                                                    {tx.description}
                                                </p>
                                                
                                                {tx.type === 'IN' && tx.details?.planName && (
                                                    <span className="text-base text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap shrink-0">
                                                        • {tx.details.planName}
                                                    </span>
                                                )}

                                                {tx.type === 'OUT' && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 ${
                                                        tx.status === 'verified' 
                                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : tx.status === 'rejected'
                                                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                        {tx.status === 'pending' ? 'Needs Action' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Date & Details */}
                                            <div className="flex items-center flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                <span>{format(new Date(tx.date), 'MMM d, h:mm a')}</span>
                                                
                                                {tx.type === 'OUT' && tx.details?.method && (
                                                    <span className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                                        <Wallet size={10} />
                                                        {tx.details.method}
                                                    </span>
                                                )}

                                                {tx.attachmentUrl && (
                                                    <a href={tx.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors ml-1" onClick={(e) => e.stopPropagation()}>
                                                        <Paperclip size={14} />
                                                        Attachment
                                                    </a>
                                                )}
                                            </div>

                                            {tx.notes && (
                                                <p className="text-sm text-gray-500 italic mt-1 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded border border-gray-100 dark:border-gray-700 inline-block">
                                                    "{tx.notes}"
                                                </p>
                                            )}

                                            {/* Actions for Pending Handovers */}
                                            {tx.type === 'OUT' && tx.status === 'pending' && (
                                                <div className="flex gap-3 mt-3">
                                                    <button
                                                        onClick={() => openVerifyModal(tx)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all shadow-sm"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                        Verify Handover
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className={`text-right font-bold text-xl whitespace-nowrap shrink-0 self-start ${
                                        tx.type === 'IN' 
                                            ? 'text-red-600 dark:text-red-400' 
                                            : 'text-green-600 dark:text-green-400'
                                    }`}>
                                        {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: Stats (Collected/Received) */}
            <div className="shrink-0 pt-2 bg-gray-50 dark:bg-gray-900 z-20">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
                        <div className="p-4 flex items-center justify-between bg-red-50/50 dark:bg-red-900/10">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Collected</p>
                                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                    {formatCurrency(summary.totalCollected)}
                                </p>
                            </div>
                            <ArrowDownLeft className="w-6 h-6 text-red-500" />
                        </div>
                        <div className="p-4 flex items-center justify-between bg-green-50/50 dark:bg-green-900/10">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Total Received</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                    {formatCurrency(summary.totalHandedOver)}
                                </p>
                            </div>
                            <ArrowUpRight className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                </div>
            </div>

            <VerifyHandoverModal
                isOpen={isVerifyModalOpen}
                onClose={() => {
                    setIsVerifyModalOpen(false)
                    setSelectedHandover(null)
                }}
                onVerify={() => handleVerify(selectedHandover?.referenceId)}
                onReject={() => handleReject(selectedHandover?.referenceId)}
                transaction={selectedHandover}
                loading={!!actionLoading}
            />
        </div>
    )
}
