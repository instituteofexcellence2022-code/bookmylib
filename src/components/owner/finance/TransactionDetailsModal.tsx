'use client'

import React from 'react'
import { X, CheckCircle, Clock, AlertTriangle, FileText, User, Calendar, CreditCard, Download } from 'lucide-react'
import { format } from 'date-fns'
import { generateReceiptPDF } from '@/lib/pdf-generator'

interface Transaction {
  id: string
  status: string
  type: string
  amount: number
  date: string | Date
  method: string
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
  }
}

interface TransactionDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: Transaction | null
}

export function TransactionDetailsModal({ isOpen, onClose, transaction }: TransactionDetailsModalProps) {
  if (!isOpen || !transaction) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'failed': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={20} />
      case 'pending': return <Clock size={20} />
      case 'failed': return <AlertTriangle size={20} />
      default: return <FileText size={20} />
    }
  }

  const handleDownloadReceipt = () => {
    if (!transaction) return

    const addressParts = [
        transaction.branch?.address,
        transaction.branch?.city,
        transaction.branch?.state
    ].filter(Boolean)
    const fullAddress = addressParts.join(', ')

    const items = []
    let planName = 'N/A'
    let planType = undefined
    let planDuration = undefined
    let planHours = undefined
    let seatNumber = undefined
    let startDate = undefined
    let endDate = undefined

    if (transaction.type === 'subscription' && transaction.subscription) {
        const plan = transaction.subscription.plan
        planName = plan?.name || 'Subscription'
        
        if (plan?.category === 'fixed') {
            planType = 'Fixed Shift'
            if (plan.shiftStart && plan.shiftEnd) {
                planHours = `${plan.shiftStart} - ${plan.shiftEnd}`
            }
        } else if (plan?.category === 'flexible') {
            planType = 'Flexible Hours'
            if (plan.hoursPerDay) {
                planHours = `${plan.hoursPerDay} Hours/Day`
            }
        }

        if (plan?.duration && plan?.durationUnit) {
            planDuration = `${plan.duration} ${plan.durationUnit}`
        }

        if (transaction.subscription.seat) {
            seatNumber = transaction.subscription.seat.number
            if (transaction.subscription.seat.section) {
                seatNumber += ` (${transaction.subscription.seat.section})`
            }
        }

        startDate = transaction.subscription.startDate ? new Date(transaction.subscription.startDate) : undefined
        endDate = transaction.subscription.endDate ? new Date(transaction.subscription.endDate) : undefined
        
        items.push({
            description: `${planName} Subscription`,
            amount: transaction.amount + (transaction.discountAmount || 0)
        })
    } else if (transaction.type === 'fee' && transaction.additionalFee) {
            items.push({
            description: transaction.additionalFee.name || 'Additional Fee',
            amount: transaction.amount + (transaction.discountAmount || 0)
        })
    } else {
        items.push({
            description: transaction.remarks || transaction.type,
            amount: transaction.amount + (transaction.discountAmount || 0)
        })
    }

    generateReceiptPDF({
        invoiceNo: transaction.invoiceNo || `TXN-${transaction.id.substring(0, 8).toUpperCase()}`,
        date: new Date(transaction.date),
        studentName: transaction.student?.name || 'Unknown',
        studentEmail: transaction.student?.email,
        studentPhone: transaction.student?.phone,
        branchName: transaction.branch?.name || 'Library Branch',
        branchAddress: fullAddress,
        planName: planName,
        planType: planType,
        planDuration: planDuration,
        planHours: planHours,
        seatNumber: seatNumber,
        startDate: startDate,
        endDate: endDate,
        amount: transaction.amount,
        paymentMethod: transaction.method?.replace('_', ' ') || 'Cash',
        subTotal: transaction.amount + (transaction.discountAmount || 0),
        discount: transaction.discountAmount || 0,
        items: items
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Details</h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Amount & Status */}
          <div className="flex flex-col items-center justify-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
            <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Amount</span>
            <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{transaction.amount.toLocaleString()}</span>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mt-3 ${getStatusColor(transaction.status)}`}>
              {getStatusIcon(transaction.status)}
              <span className="capitalize">{transaction.status.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-4">
            
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <User size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Student</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.student?.name}</p>
                <p className="text-xs text-gray-500">{transaction.student?.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Type</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {transaction.type === 'subscription' && transaction.subscription?.plan?.name 
                      ? `${transaction.subscription.plan.name} Subscription` 
                      : transaction.type}
                </p>
                {transaction.invoiceNo && (
                    <p className="text-xs text-gray-500">Invoice: {transaction.invoiceNo}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400">
                <CreditCard size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Payment Method</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">{transaction.method.replace('_', ' ')}</p>
                {transaction.transactionId && (
                    <p className="text-xs text-gray-500 font-mono">ID: {transaction.transactionId}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-400">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Date</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {format(new Date(transaction.date), 'MMMM dd, yyyy')}
                </p>
                <p className="text-xs text-gray-500">
                    {format(new Date(transaction.date), 'hh:mm a')}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button 
                onClick={handleDownloadReceipt}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors mr-2"
            >
                <Download size={16} />
                Download Receipt
            </button>
            <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
                Close
            </button>
        </div>

      </div>
    </div>
  )
}
