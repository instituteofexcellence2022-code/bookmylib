'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { getTransactions } from '@/actions/owner/finance'
import { format } from 'date-fns'
import { Download, RefreshCw, FileText, Eye } from 'lucide-react'
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

export function PaymentHistoryClient() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all') // all, today, this_week, this_month

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const filters: Record<string, string | Date> = {}
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

      const data = await getTransactions(filters, 50)
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

  const handleViewClick = (e: React.MouseEvent, tx: Transaction) => {
    e.stopPropagation()
    handleRowClick(tx)
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

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text('Transaction History', 14, 15)
    
    const tableData = transactions.map(tx => [
        format(new Date(tx.date), 'MMM dd, yyyy'),
        tx.student?.name || 'Unknown',
        tx.branch?.name || '-',
        tx.subscription?.plan?.name || (tx.additionalFee?.name || '-'),
        `Rs. ${tx.amount}`,
        getSource(tx),
        getPaymentType(tx),
        tx.status
    ])

    autoTable(doc, {
        head: [['Date', 'Student', 'Branch', 'Plan', 'Amount', 'Source', 'Type', 'Status']],
        body: tableData,
        startY: 20
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
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
                <div className="flex gap-2">
                <button 
                    onClick={loadTransactions}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Refresh"
                >
                    <RefreshCw size={18} />
                </button>
                <button 
                    onClick={exportPDF}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Download size={16} />
                    Export PDF
                </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500"
                >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                </select>

                <select 
                    value={methodFilter}
                    onChange={(e) => setMethodFilter(e.target.value)}
                    className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500"
                >
                    <option value="all">All Methods</option>
                    <option value="upi_app">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="qr_code">QR Code</option>
                </select>

                <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="text-sm border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700/50 focus:ring-blue-500"
                >
                    <option value="all">All Dates</option>
                    <option value="today">Today</option>
                    <option value="this_month">This Month</option>
                </select>
            </div>
        </div>

        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700/50">
                <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-6 py-3">Branch</th>
                <th className="px-6 py-3">Plan</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
                    </tr>
                ))
                ) : transactions.length === 0 ? (
                <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No transactions found matching your filters
                    </td>
                </tr>
                ) : (
                transactions.map((tx) => (
                    <tr 
                        key={tx.id} 
                        onClick={() => handleRowClick(tx)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                    >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <div className="group-hover:text-blue-600 transition-colors">{tx.student?.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 font-normal">{format(new Date(tx.date), 'MMM dd, hh:mm a')}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {tx.branch?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {tx.subscription?.plan?.name || (tx.additionalFee?.name || '-')}
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        ₹{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {getSource(tx)}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300 capitalize">
                        {getPaymentType(tx)}
                    </td>
                    <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tx.status)} capitalize`}>
                        {tx.status.replace('_', ' ')}
                        </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                            <button 
                                onClick={(e) => handleViewClick(e, tx)}
                                className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                title="View Details"
                            >
                                <Eye size={18} />
                            </button>
                            <button 
                                onClick={(e) => handleDownloadReceipt(e, tx)}
                                className="p-2 text-gray-400 hover:text-blue-600 dark:text-gray-500 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                                title="Download Receipt"
                            >
                                <FileText size={18} />
                            </button>
                        </div>
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
            transaction={selectedTransaction}
        />
    </>
  )
}
