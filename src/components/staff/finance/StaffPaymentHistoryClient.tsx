'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getStaffTransactions } from '@/actions/staff/finance'
import { format } from 'date-fns'
import { Download, RefreshCw, FileText, Filter, Search, User } from 'lucide-react'
import { TransactionDetailsModal } from '@/components/owner/finance/TransactionDetailsModal'
import { toast } from 'sonner'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Badge } from '@/components/ui/badge'

interface Transaction {
  id: string
  date: string | Date
  amount: number
  type: string
  method: string
  status: string
  transactionId?: string | null
  invoiceNo?: string | null
  discountAmount?: number
  remarks?: string
  student?: {
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
}

export function StaffPaymentHistoryClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const filters: any = {
          scope: 'branch' // Strictly show branch transactions
      }
      if (statusFilter !== 'all') filters.status = statusFilter
      if (methodFilter !== 'all') filters.method = methodFilter
      
      const now = new Date()
      if (dateFilter === 'today') {
          filters.startDate = now
          filters.endDate = now
      } else if (dateFilter === 'this_month') {
          filters.startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      }

      const data = await getStaffTransactions(filters, 50)
      setTransactions(data as unknown as Transaction[])
    } catch {
      toast.error('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, methodFilter, dateFilter])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleRowClick = (tx: Transaction) => {
    setSelectedTransaction(tx)
    setIsModalOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const maskPhone = (phone?: string | null) => {
    if (!phone) return null
    if (phone.length < 4) return phone
    return `******${phone.slice(-4)}`
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Transaction History</h3>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="w-32">
                <FormSelect
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Time' },
                        { value: 'today', label: 'Today' },
                        { value: 'this_month', label: 'This Month' }
                    ]}
                    className="h-9 text-sm"
                />
            </div>
            <div className="w-32">
                <FormSelect
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    options={[
                        { value: 'all', label: 'All Methods' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'upi', label: 'UPI' },
                        { value: 'card', label: 'Card' }
                    ]}
                    className="h-9 text-sm"
                />
            </div>
            <AnimatedButton
                onClick={loadTransactions}
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
            >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </AnimatedButton>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 dark:text-gray-400">
                    <tr>
                        <th className="px-6 py-3">Date & ID</th>
                        <th className="px-6 py-3">Student</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Method</th>
                        <th className="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        [...Array(5)].map((_, i) => (
                            <tr key={i} className="border-b dark:border-gray-700 animate-pulse">
                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div></td>
                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>
                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                                <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                            </tr>
                        ))
                    ) : transactions.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                No transactions found
                            </td>
                        </tr>
                    ) : (
                        transactions.map((tx) => (
                            <tr 
                                key={tx.id} 
                                onClick={() => handleRowClick(tx)}
                                className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {format(new Date(tx.date), 'dd MMM yyyy')}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">
                                        {tx.invoiceNo || tx.id.slice(0, 8)}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900 dark:text-white">
                                        {tx.student?.name || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {maskPhone(tx.student?.phone) || tx.student?.email || '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="capitalize text-gray-700 dark:text-gray-300">
                                        {tx.type === 'subscription' && tx.subscription?.plan?.name
                                            ? tx.subscription.plan.name
                                            : tx.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    ₹{tx.amount}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="uppercase text-xs font-semibold text-gray-600 dark:text-gray-400">
                                        {tx.method}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                                        {tx.status}
                                    </span>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
      </div>

      <TransactionDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        transaction={selectedTransaction as any}
      />
    </div>
  )
}
