'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { getStaffCashSummary, createHandoverRequest, getStaffKhatabook, getPendingCashTransactions } from '@/actions/staff/khatabook'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { Wallet, ArrowRight, History, AlertCircle, CheckCircle, Clock, ArrowDownLeft, ArrowUpRight, Plus, FileText, User, Mail, Calendar, CheckSquare, Square, Paperclip, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'

interface CashSummary {
    cashInHand: number
    totalCollected: number
    totalHandedOver: number
    currentMonthCollected: number
    currentMonthHandedOver: number
    carriedForward: number
    pendingHandoverAmount?: number
    recentHandovers: any[]
}

interface Transaction {
    id: string
    type: 'IN' | 'OUT'
    amount: number
    date: Date
    description: string
    status: string
    referenceId: string
    notes?: string | null
    details?: any
    attachmentUrl?: string | null
}

interface PendingTransaction {
    id: string
    amount: number
    date: Date
    studentName: string
    planName: string
}
import { HandoverModal } from './HandoverModal'

export function StaffKhatabookClient() {
    const [summary, setSummary] = useState<CashSummary | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    
    // Handover Form State
    const [showHandoverForm, setShowHandoverForm] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    
    // Filter State
    const [filter, setFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
    
    const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([])
    const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set())
    
    const [amount, setAmount] = useState('')
    const [notes, setNotes] = useState('')
    const [method, setMethod] = useState('CASH')
    const [attachmentUrl, setAttachmentUrl] = useState('')

    const fetchData = async () => {
        try {
            const [summaryData, transactionsData, pendingData] = await Promise.all([
                getStaffCashSummary(),
                getStaffKhatabook(),
                getPendingCashTransactions()
            ])
            setSummary(summaryData)
            setTransactions(transactionsData)
            setPendingTransactions(pendingData as any)
        } catch (error) {
            toast.error('Failed to load khatabook data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Auto-calculate amount when selection changes
    useEffect(() => {
        const totalSelected = pendingTransactions
            .filter(tx => selectedTxIds.has(tx.id))
            .reduce((sum, tx) => sum + tx.amount, 0)
        
        if (totalSelected > 0) {
            setAmount(totalSelected.toString())
        } else {
            setAmount('')
        }
    }, [selectedTxIds, pendingTransactions])

    const toggleTransaction = (id: string) => {
        const newSet = new Set(selectedTxIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedTxIds(newSet)
    }

    const isPending = (id: string) => {
        return pendingTransactions.some(pt => pt.id === id)
    }

    const handleHandover = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || isNaN(Number(amount))) {
            toast.error('Please enter a valid amount')
            return
        }

        const numAmount = Number(amount)
        if (numAmount <= 0) {
            toast.error('Amount must be greater than 0')
            return
        }

        const availableCash = summary ? ((summary.cashInHand || 0) - (summary.pendingHandoverAmount || 0)) : 0

        if (numAmount > availableCash) {
            toast.error('Insufficient cash in hand (some amount is pending approval)')
            return
        }

        setSubmitting(true)
        try {
            await createHandoverRequest({
                amount: numAmount,
                notes,
                method,
                attachmentUrl,
                paymentIds: Array.from(selectedTxIds)
            })
            toast.success('Handover request submitted successfully')
            
            // Reset form
            setAmount('')
            setNotes('')
            setMethod('CASH')
            setSelectedTxIds(new Set())
            setShowHandoverForm(false)
            
            fetchData() // Refresh data
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to submit handover request')
        } finally {
            setSubmitting(false)
        }
    }

    // Safe summary access
    const safeSummary = summary ? {
        ...summary,
        currentMonthCollected: summary.currentMonthCollected ?? 0,
        carriedForward: summary.carriedForward ?? 0,
        currentMonthHandedOver: summary.currentMonthHandedOver ?? 0,
        pendingHandoverAmount: summary.pendingHandoverAmount ?? 0,
        cashInHand: summary.cashInHand ?? 0
    } : null

    if (loading) {
        return <div className="p-12 text-center text-gray-500">Loading your Khatabook...</div>
    }

    if (!safeSummary) return null

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] max-w-4xl mx-auto relative">
            {/* TOP FIXED SECTION: Header + Wallet Card */}
            <div className="shrink-0 space-y-4 pb-4 bg-gray-50 dark:bg-gray-900 z-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Khatabook</h1>
                        <p className="text-gray-500 dark:text-gray-400">Manage cash handovers and track collections</p>
                    </div>
                </div>

                {/* Top Summary Card - Khatabook Style */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 font-medium mb-1">Net Balance (Cash in Hand)</p>
                                <h2 className="text-4xl font-bold">{formatCurrency(safeSummary.cashInHand)}</h2>
                            </div>
                            <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm">
                                <Wallet className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
                        <div className="p-4 flex flex-col justify-between bg-green-50/50 dark:bg-green-900/10">
                            <div className="flex items-center justify-between w-full">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total You Collected</p>
                                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(safeSummary.currentMonthCollected + safeSummary.carriedForward)}
                                    </p>
                                </div>
                                <ArrowDownLeft className="w-6 h-6 text-green-500" />
                            </div>
                            {safeSummary.carriedForward !== 0 && (
                                <p className="text-xs text-gray-400 mt-1">
                                    {safeSummary.carriedForward > 0 ? '+' : ''}{formatCurrency(safeSummary.carriedForward)} carried forward
                                </p>
                            )}
                        </div>
                        <div className="px-4 pt-4 pb-2 flex flex-col justify-between bg-red-50/50 dark:bg-red-900/10">
                            <div className="flex items-center justify-between w-full">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total You Gave</p>
                                    <p className="text-xl font-bold text-red-600 dark:text-red-400">
                                        {formatCurrency(safeSummary.currentMonthHandedOver)}
                                    </p>
                                </div>
                                <ArrowUpRight className="w-6 h-6 text-red-500" />
                            </div>
                            {/* Pending Amount Indicator */}
                            {safeSummary.pendingHandoverAmount > 0 ? (
                                <div className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-md inline-block w-fit">
                                    + {formatCurrency(safeSummary.pendingHandoverAmount)} Pending Verif.
                                </div>
                            ) : null}
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
                                Detailed Ledger
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
                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    In
                                </button>
                                <button 
                                    onClick={() => setFilter('OUT')}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                                        filter === 'OUT' 
                                            ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Out
                                </button>
                            </div>
                        </div>

                        {selectedTxIds.size > 0 && (
                            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {selectedTxIds.size} Selected
                            </span>
                        )}
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No transactions found
                            </div>
                        ) : (
                            transactions
                                .filter(tx => filter === 'ALL' || tx.type === filter)
                                .map((tx) => {
                                const selectable = tx.type === 'IN' && isPending(tx.id);
                                const selected = selectedTxIds.has(tx.id);
                                
                                return (
                                    <div 
                                        key={`${tx.type}-${tx.id}`} 
                                        onClick={() => selectable && toggleTransaction(tx.id)}
                                        className={`p-3 transition-colors flex items-center justify-between gap-3 group relative ${
                                            selectable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30' : ''
                                        } ${selected ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                                    >
                                        {/* Selection Indicator Bar */}
                                        {selected && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 rounded-l" />
                                        )}

                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            {/* Icon & Checkbox Column */}
                                            <div className="flex flex-col items-center gap-2 shrink-0">
                                                {/* Transaction Type Icon (Always visible) */}
                                                <div className={`p-2 rounded-full flex items-center justify-center transition-all ${
                                                    tx.type === 'IN' 
                                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30' 
                                                        : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                                }`}>
                                                    {tx.type === 'IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                </div>

                                                {/* Selection Checkbox (Little down) */}
                                                {selectable && (
                                                    <div className={`transition-all ${selected ? 'text-red-600' : 'text-gray-300'}`}>
                                                        {selected ? <CheckSquare size={16} /> : <Square size={16} />}
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="space-y-0.5 min-w-0 flex-1">
                                                {/* Main Description (Name), Plan & Tag */}
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <p className={`font-semibold text-lg truncate ${selected ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'}`}>
                                                        {tx.description}
                                                    </p>
                                                    {tx.type === 'OUT' && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 ${
                                                            tx.status === 'verified' 
                                                                ? 'bg-green-100 text-green-700'
                                                                : tx.status === 'rejected'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                                                        }`}>
                                                            {tx.status === 'pending' ? 'Pending' : tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                                                        </span>
                                                    )}
                                                    {tx.type === 'IN' && tx.details?.planName && (
                                                        <span className="text-base text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap shrink-0">
                                                            • {tx.details.planName}
                                                        </span>
                                                    )}
                                                    {tx.type === 'IN' && tx.details?.method && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                                                            {tx.details.method}
                                                        </span>
                                                    )}
                                                    {tx.type === 'IN' && tx.details?.handoverStatus && (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 ${
                                                            tx.details.handoverStatus === 'Handed Over'
                                                                ? 'bg-gray-100 text-gray-600'
                                                                : tx.details.handoverStatus === 'Pending'
                                                                    ? 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                                                                    : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                        }`}>
                                                            {tx.details.handoverStatus}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* Email - New Line */}
                                                {tx.type === 'IN' && tx.details?.studentEmail && (
                                                    <p className="text-base text-gray-500 dark:text-gray-400 truncate">
                                                        {tx.details.studentEmail}
                                                    </p>
                                                )}

                                                {/* Date - New Line */}
                                                {tx.type === 'IN' && (
                                                    <div className="flex items-center flex-wrap gap-2 text-sm text-gray-400 mt-1">
                                                        <span>{format(new Date(tx.date), 'MMM d, yyyy h:mm a')}</span>
                                                        
                                                        {tx.attachmentUrl && (
                                                            <a href={tx.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors ml-1" onClick={(e) => e.stopPropagation()}>
                                                                <Paperclip size={14} />
                                                            </a>
                                                        )}
                                                    </div>
                                                )}

                                                {/* OUT Transaction Details */}
                                                {tx.type === 'OUT' && (
                                                    <>
                                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                                                            {tx.details && (
                                                                <div className="flex items-center gap-1">
                                                                    <Wallet size={12} className="text-gray-400" />
                                                                    <span>{tx.details.method}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-0.5">
                                                            <span>{format(new Date(tx.date), 'MMM d, yyyy h:mm a')}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`text-right font-bold text-xl whitespace-nowrap shrink-0 mt-1 ${
                                            tx.type === 'IN' 
                                                ? 'text-green-600 dark:text-green-400' 
                                                : 'text-red-600 dark:text-red-400'
                                        }`}>
                                            {tx.type === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* BOTTOM FIXED SECTION: Handover Button */}
            <div className="shrink-0 pt-2 bg-gray-50 dark:bg-gray-900 z-20">
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        onClick={() => setShowHandoverForm(true)}
                        className="w-full py-4 rounded-xl font-semibold shadow-sm transition-all flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                    >
                        <Wallet className="w-5 h-5" />
                        Handover Cash
                    </button>
                </div>
            </div>

            <HandoverModal 
                isOpen={showHandoverForm}
                onClose={() => setShowHandoverForm(false)}
                onSubmit={handleHandover}
                amount={amount}
                setAmount={setAmount}
                notes={notes}
                setNotes={setNotes}
                method={method}
                setMethod={setMethod}
                attachmentUrl={attachmentUrl}
                setAttachmentUrl={setAttachmentUrl}
                submitting={submitting}
                selectedCount={selectedTxIds.size}
            />
        </div>
    )
}
