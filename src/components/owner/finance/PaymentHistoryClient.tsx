'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getTransactions, getFilterOptions } from '@/actions/owner/finance'
import { format } from 'date-fns'
import { Download, RefreshCw, FileText, Eye, Search, Filter, X, ChevronDown, ChevronUp, History } from 'lucide-react'
import { TransactionDetailsModal } from './TransactionDetailsModal'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { generateReceiptPDF } from '@/lib/pdf-generator'

interface Transaction {
  id: string
  date: string | Date
  amount: number
  type: string
  method: string
  status: string
  gatewayProvider?: string | null
  transactionId?: string | null
  invoiceNo?: string | null
  discountAmount?: number
  remarks?: string
  student?: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
  }
  branch?: {
    name?: string
    address?: string
    city?: string
    state?: string
  }
  subscription?: {
    plan: {
      name: string
      price: number
      category?: string
      shiftStart?: string
      shiftEnd?: string
      hoursPerDay?: number
      duration?: number
      durationUnit?: string
    }
    startDate?: string | Date
    endDate?: string | Date
    seat?: {
      number: string
      section?: string | null
    }
  }
  additionalFee?: {
    name: string
    amount: number
  }
  verifiedBy?: string | null
  verifierRole?: string | null
  verifierName?: string
}

const getSource = (tx: Transaction) => {
  if (tx.gatewayProvider) {
    if (tx.gatewayProvider.toLowerCase() === 'razorpay') return 'Razorpay'
    if (tx.gatewayProvider.toLowerCase() === 'cashfree') return 'Cashfree'
    return tx.gatewayProvider
  }
  
  // Map methods to sources if no gateway provider
  const method = tx.method?.toLowerCase()
  if (method === 'upi_app' || method === 'upi') return 'UPI Apps'
  if (method === 'qr_code' || method === 'qr') return 'QR'
  
  return 'Frontdesk'
}

const getPaymentType = (tx: Transaction) => {
  const method = tx.method?.toLowerCase()
  if (method === 'cash') return 'Cash'
  if (method === 'upi' || method === 'upi_app' || method === 'qr_code') return 'UPI'
  if (method === 'card' || method === 'debit_card') return 'Debit Card'
  if (method === 'credit_card') return 'Credit Card'
  if (method === 'bank_transfer' || method === 'net_banking') return 'Bank Transfer'
  
  return method ? method.replace('_', ' ') : 'Unknown'
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
}

function StudentTransactionHistory({ 
    studentId, 
    currentTxId,
    onViewClick,
    onDownloadReceipt
}: { 
    studentId: string, 
    currentTxId: string,
    onViewClick: (tx: Transaction) => void,
    onDownloadReceipt: (tx: Transaction) => void
}) {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!studentId) {
            setLoading(false)
            return
        }
        getTransactions({ studentId }).then(data => {
            setTransactions(data as unknown as Transaction[])
            setLoading(false)
        })
    }, [studentId])

    if (loading) return <div className="p-4 text-center text-sm text-gray-500">Loading history...</div>

    const history = transactions.filter(t => t.id !== currentTxId)

    if (history.length === 0) return (
        <div className="bg-gray-50/50 dark:bg-gray-900/20 p-8 text-center border-y border-gray-100 dark:border-gray-800">
            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
                <History className="w-4 h-4" />
                No prior transaction history found for this student.
            </p>
        </div>
    )

    return (
        <div className="bg-gray-50/80 dark:bg-gray-900/30 p-4 md:p-6 border-y border-gray-200/50 dark:border-gray-700 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                    <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Previous Transactions</h4>
                    <p className="text-xs text-gray-500">History of payments for this student</p>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 border-b border-gray-200 dark:border-gray-700 font-medium">
                            <tr>
                                <th className="px-6 py-3">DATE & ID</th>
                                <th className="px-6 py-3">Plan Details</th>
                                <th className="px-6 py-3">Amount</th>
                                <th className="px-6 py-3">Mode</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {history.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {format(new Date(tx.date), 'MMM dd, yyyy')}
                                            <span className="text-gray-400 dark:text-gray-500 font-normal ml-2 text-xs">
                                                {format(new Date(tx.date), 'hh:mm a')}
                                            </span>
                                        </div>
                                        <div className="font-mono text-[10px] text-gray-400 mt-0.5">
                                            {tx.invoiceNo || tx.transactionId || tx.id.slice(-6).toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                        <div className="font-medium text-gray-900 dark:text-white">{tx.branch?.name || '-'}</div>
                                        <div className="text-xs text-gray-500">{tx.subscription?.plan?.name || (tx.additionalFee?.name || '-')}</div>
                                    </td>
                                    <td className="px-6 py-3 font-semibold text-gray-900 dark:text-white">
                                        ₹{tx.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600 dark:text-gray-300">
                                        <div className="font-medium text-gray-900 dark:text-white">{getSource(tx)}</div>
                                        <div className="text-xs text-gray-500 capitalize">{getPaymentType(tx)}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col items-start gap-0.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(tx.status)}`}>
                                                {tx.status.replace('_', ' ')}
                                            </span>
                                            {tx.verifierName && (
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 pl-1 leading-none">
                                                    By {tx.verifierName}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onViewClick(tx); }}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={16} />
                                            </button>
                                            {tx.status === 'completed' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onDownloadReceipt(tx); }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                                    title="Download Receipt"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export function PaymentHistoryClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null)
  
  const toggleRow = (e: React.MouseEvent, txId: string) => {
    e.stopPropagation()
    setExpandedTxId(expandedTxId === txId ? null : txId)
  }
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all') // all, today, this_week, this_month, custom
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [branchFilter, setBranchFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState<{ 
      branches: {id: string, name: string}[], 
      plans: {id: string, name: string}[],
      staff: {id: string, name: string}[],
      owners: {id: string, name: string}[]
  }>({ branches: [], plans: [], staff: [], owners: [] })

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    getFilterOptions().then(setFilterOptions).catch(console.error)
  }, [])

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, string | Date> = {}
      if (statusFilter !== 'all') filters.status = statusFilter
      if (methodFilter !== 'all') filters.method = methodFilter
      if (sourceFilter !== 'all') filters.source = sourceFilter
      if (branchFilter !== 'all') filters.branchId = branchFilter
      if (planFilter !== 'all') filters.planId = planFilter
      if (staffFilter !== 'all') filters.staffId = staffFilter
      if (debouncedSearch) filters.search = debouncedSearch
      
      const now = new Date()
      if (dateFilter === 'today') {
          filters.startDate = now
          filters.endDate = now
      } else if (dateFilter === 'this_month') {
          filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      } else if (dateFilter === 'custom' && customStartDate && customEndDate) {
          filters.startDate = new Date(customStartDate)
          filters.endDate = new Date(customEndDate)
      }

      const data = await getTransactions(filters, 50)
      setTransactions(data as unknown as Transaction[])
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, methodFilter, sourceFilter, dateFilter, customStartDate, customEndDate, branchFilter, planFilter, staffFilter, debouncedSearch])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleRowClick = (tx: Transaction) => {
    setSelectedTransaction(tx)
    setIsModalOpen(true)
  }

  const handleViewClick = (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation()
    handleRowClick(tx)
  }

  const exportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4') // Landscape mode for better width
    doc.text('Transaction History', 14, 15)
    
    const tableData = transactions.map(tx => {
        return [
            format(new Date(tx.date), 'MMM dd, yyyy'),
            format(new Date(tx.date), 'hh:mm a'),
            tx.invoiceNo || tx.transactionId || tx.id.slice(-6).toUpperCase(),
            tx.student?.name || 'Unknown',
            tx.student?.email || '-',
            tx.branch?.name || '-',
            tx.subscription?.plan?.name || (tx.additionalFee?.name || '-'),
            `Rs. ${tx.amount}`,
            getSource(tx),
            getPaymentType(tx),
            tx.status,
            tx.verifierName ? `${tx.verifierName} (${tx.verifierRole || 'staff'})` : '-'
        ]
    })

    autoTable(doc, {
        head: [['Date', 'Time', 'Txn ID', 'Student', 'Email', 'Branch', 'Plan', 'Amount', 'Source', 'Type', 'Status', 'Accepted By']],
        body: tableData,
        startY: 20,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
    })

    doc.save('transactions.pdf')
  }

  const handleDownloadReceipt = (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation()
    
    try {
        const plan = tx.subscription?.plan
        const seat = tx.subscription?.seat
        const fee = tx.additionalFee
        
        // Construct items
        const items = []
        let calculatedSubTotal = 0

        if (plan) {
            items.push({ description: `Plan: ${plan.name}`, amount: plan.price })
            calculatedSubTotal += plan.price
        }
        if (fee) {
            items.push({ description: fee.name || 'Additional Fee', amount: fee.amount })
            calculatedSubTotal += fee.amount
        }
        
        // Fallback if no specific items found but there is an amount
        if (items.length === 0) {
            items.push({ description: tx.remarks || 'Payment', amount: tx.amount })
            calculatedSubTotal = tx.amount
        }

        const receiptData = {
            invoiceNo: `INV-${tx.id.slice(-6).toUpperCase()}`,
            date: new Date(tx.date),
            studentName: tx.student?.name || 'Unknown',
            studentEmail: tx.student?.email,
            studentPhone: tx.student?.phone,
            branchName: tx.branch?.name || 'Main Branch',
            branchAddress: tx.branch ? `${tx.branch.address}, ${tx.branch.city}` : undefined,
            
            // Plan Details
            planName: plan?.name || (fee ? fee.name : 'Payment'),
            planType: plan?.category,
            planDuration: plan ? `${plan.duration} ${plan.durationUnit}` : undefined,
            planHours: plan?.hoursPerDay ? `${plan.hoursPerDay} Hrs/Day` : undefined,
            seatNumber: seat ? `${seat.number} (${seat.section || 'General'})` : undefined,
            
            // Dates
            startDate: tx.subscription?.startDate ? new Date(tx.subscription.startDate) : undefined,
            endDate: tx.subscription?.endDate ? new Date(tx.subscription.endDate) : undefined,
            
            // Financials
            amount: tx.amount,
            paymentMethod: tx.method,
            subTotal: calculatedSubTotal,
            discount: Math.max(0, calculatedSubTotal - tx.amount),
            
            items: items
        }

        generateReceiptPDF(receiptData)
        toast.success('Receipt downloaded')
    } catch (err) {
        console.error(err)
        toast.error('Failed to generate receipt')
    }
  }



  return (
    <>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                    <p className="text-sm text-gray-500">Latest payments and collections</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <button 
                        onClick={loadTransactions}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button 
                        onClick={exportPDF}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm shrink-0"
                        title="Export PDF"
                    >
                        <Download size={16} />
                        <span className="hidden md:inline">Export PDF</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3">
                {/* Filter Row */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mr-2">
                        <Filter size={16} />
                        <span>Filters:</span>
                    </div>

                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3"
                    >
                        <option value="all">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                    </select>

                    <select 
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3"
                    >
                        <option value="all">All Methods</option>
                        <option value="upi_app">UPI</option>
                        <option value="cash">Cash</option>
                        <option value="credit_card">Credit Card</option>
                        <option value="debit_card">Debit Card</option>
                        <option value="bank_transfer">Bank Transfer</option>
                    </select>

                    <select 
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                        className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3"
                    >
                        <option value="all">All Sources</option>
                        <option value="frontdesk">Frontdesk</option>
                        <option value="razorpay">Razorpay</option>
                        <option value="cashfree">Cashfree</option>
                        <option value="upi_apps">UPI Apps</option>
                        <option value="qr_code">QR Code</option>
                    </select>

                    <select 
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="this_month">This Month</option>
                        <option value="custom">Custom Range</option>
                    </select>

                    {dateFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3"
                            />
                            <span className="text-gray-400">-</span>
                            <input 
                                type="date" 
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3"
                            />
                        </div>
                    )}

                    <select 
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3 max-w-[150px]"
                    >
                        <option value="all">All Branches</option>
                        {filterOptions.branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>

                    <select 
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3 max-w-[150px]"
                    >
                        <option value="all">All Plans</option>
                        {filterOptions.plans.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    <select 
                        value={staffFilter}
                        onChange={(e) => setStaffFilter(e.target.value)}
                        className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500 py-1.5 px-3 max-w-[150px]"
                    >
                        <option value="all">All Staff/Owners</option>
                        <option value="all_staff">All Staff Only</option>
                        <optgroup label="Staff">
                            {filterOptions.staff.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Owners">
                            {filterOptions.owners.map(o => (
                                <option key={o.id} value={o.id}>{o.name}</option>
                            ))}
                        </optgroup>
                    </select>
                    
                    {(statusFilter !== 'all' || methodFilter !== 'all' || dateFilter !== 'all' || branchFilter !== 'all' || planFilter !== 'all' || staffFilter !== 'all' || searchQuery) && (
                        <button 
                            onClick={() => {
                                setStatusFilter('all')
                                setMethodFilter('all')
                                setSourceFilter('all')
                                setDateFilter('all')
                                setCustomStartDate('')
                                setCustomEndDate('')
                                setBranchFilter('all')
                                setPlanFilter('all')
                                setStaffFilter('all')
                                setSearchQuery('')
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium ml-auto md:ml-0"
                        >
                            Clear All
                        </button>
                    )}
                </div>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                <tr>
                <th className="px-6 py-3">DATE & ID</th>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Plan Details</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Mode</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                    </td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    </tr>
                ))
                ) : transactions.length === 0 ? (
                <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No transactions found matching your filters
                    </td>
                </tr>
                ) : (
                transactions.map((tx) => (
                    <React.Fragment key={tx.id}>
                    <tr 
                        onClick={() => handleRowClick(tx)}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${expandedTxId === tx.id ? 'bg-gray-50 dark:bg-gray-700/50' : ''}`}
                    >
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">{format(new Date(tx.date), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-gray-500 mb-1">{format(new Date(tx.date), 'hh:mm a')}</div>
                        <div className="font-mono text-xs text-gray-400">
                            {tx.invoiceNo || tx.transactionId || tx.id.slice(-6).toUpperCase()}
                        </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <div className="group-hover:text-blue-600 transition-colors">{tx.student?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 font-normal">
                            {tx.student?.email || '-'}
                            {tx.student?.phone && <span className="ml-1 text-gray-400">• {tx.student?.phone}</span>}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        <div className="font-medium text-gray-900 dark:text-white">{tx.branch?.name || '-'}</div>
                        <div className="text-xs text-gray-500">{tx.subscription?.plan?.name || (tx.additionalFee?.name || '-')}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        ₹{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        <div className="font-medium text-gray-900 dark:text-white">{getSource(tx)}</div>
                        <div className="text-xs text-gray-500 capitalize">{getPaymentType(tx)}</div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(tx.status)}`}>
                                {tx.status.replace('_', ' ')}
                            </span>
                            {tx.verifierName && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 pl-1 leading-none">
                                    By {tx.verifierName}
                                </span>
                            )}
                        </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                onClick={(e) => toggleRow(e, tx.id)}
                                className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                title="View History"
                            >
                                {expandedTxId === tx.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            <button 
                                onClick={(e) => handleViewClick(e, tx)}
                                className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                title="View Details"
                            >
                                <Eye size={18} />
                            </button>
                            {tx.status === 'completed' && (
                                <button 
                                    onClick={(e) => handleDownloadReceipt(e, tx)}
                                    className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                    title="Download Receipt"
                                >
                                    <FileText size={18} />
                                </button>
                            )}
                        </div>
                    </td>
                    </tr>
                    {expandedTxId === tx.id && (
                        <tr>
                            <td colSpan={7} className="px-0 py-0 border-b border-gray-100 dark:border-gray-700">
                                <StudentTransactionHistory 
                                    studentId={tx.student?.id || ''} 
                                    currentTxId={tx.id} 
                                    onViewClick={(t) => handleRowClick(t)}
                                    onDownloadReceipt={(t) => handleDownloadReceipt({ stopPropagation: () => {} } as React.MouseEvent, t)}
                                />
                            </td>
                        </tr>
                    )}
                    </React.Fragment>
                ))
                )}
            </tbody>
            </table>
        </div>
        </div>

        <TransactionDetailsModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            transaction={selectedTransaction}
        />
    </>
  )
}
