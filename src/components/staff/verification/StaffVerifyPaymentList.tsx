'use client'

import React, { useEffect, useState } from 'react'
import { getPendingPayments } from '@/actions/staff/verification'
import { verifyPayment } from '@/actions/payment'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Check, X, ExternalLink, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

// Define types locally or import if available
interface PaymentRequest {
    id: string
    amount: number
    date: Date
    method: string
    status: string
    transactionId: string | null
    proofUrl: string | null
    student: {
        id: string
        name: string
        phone: string | null
        email: string | null
        image: string | null
    }
    subscription?: {
        plan?: {
            name: string
            category: string
            price: number
        }
        branch?: {
            name: string
        }
    } | null
    additionalFee?: {
        name: string
        amount: number
    } | null
}

export function StaffVerifyPaymentList() {
    const [payments, setPayments] = useState<PaymentRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const fetchPayments = async () => {
        try {
            const data = await getPendingPayments()
            setPayments(data)
        } catch (error) {
            console.error(error)
            toast.error('Failed to fetch pending payments')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPayments()
    }, [])

    const handleVerify = async (id: string, action: 'approve' | 'reject') => {
        setProcessingId(id)
        try {
            const status = action === 'approve' ? 'completed' : 'failed'
            const result = await verifyPayment(id, status)
            
            if (result.success) {
                toast.success(action === 'approve' ? 'Payment verified successfully' : 'Payment rejected')
                fetchPayments() // Refresh list
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            console.error(error)
            toast.error('Operation failed')
        } finally {
            setProcessingId(null)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
    }

    if (payments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Check className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No pending payments</h3>
                <p className="text-gray-500 mt-1">All payments have been verified.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {payments.map((payment, index) => (
                <AnimatedCard key={payment.id} delay={index * 0.1} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                        {/* Proof Image / Icon */}
                        <div className="shrink-0 flex justify-center md:justify-start">
                            {payment.proofUrl ? (
                                <div className="relative w-full md:w-32 h-48 md:h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                                    <Image 
                                        src={payment.proofUrl} 
                                        alt="Payment Proof" 
                                        fill 
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-200">
                                            <ExternalLink size={20} />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full md:w-32 h-24 md:h-32 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                    <ImageIcon className="w-8 h-8 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white text-lg">
                                        {payment.student.name}
                                    </h4>
                                    <p className="text-sm text-gray-500">{payment.student.phone}</p>
                                </div>
                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        ₹{payment.amount.toFixed(2)}
                                    </p>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                        Pending
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="flex justify-between sm:block border-b sm:border-0 border-gray-100 dark:border-gray-800 pb-1 sm:pb-0">
                                    <span className="text-gray-500 sm:block">Payment For</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {payment.subscription?.plan?.name || payment.additionalFee?.name || 'Manual Payment'}
                                    </span>
                                </div>
                                <div className="flex justify-between sm:block border-b sm:border-0 border-gray-100 dark:border-gray-800 pb-1 sm:pb-0">
                                    <span className="text-gray-500 sm:block">Method</span>
                                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                                        {payment.method.replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex justify-between sm:block border-b sm:border-0 border-gray-100 dark:border-gray-800 pb-1 sm:pb-0">
                                    <span className="text-gray-500 sm:block">Transaction ID</span>
                                    <span className="font-mono text-gray-900 dark:text-white text-xs">
                                        {payment.transactionId || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between sm:block">
                                    <span className="text-gray-500 sm:block">Date</span>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {new Date(payment.date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-row md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
                            <AnimatedButton
                                onClick={() => handleVerify(payment.id, 'approve')}
                                disabled={!!processingId}
                                isLoading={processingId === payment.id}
                                className="bg-green-600 hover:bg-green-700 text-white w-full"
                            >
                                <Check size={16} className="mr-2" />
                                Approve
                            </AnimatedButton>
                            <AnimatedButton
                                onClick={() => handleVerify(payment.id, 'reject')}
                                disabled={!!processingId}
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20 w-full"
                            >
                                <X size={16} className="mr-2" />
                                Reject
                            </AnimatedButton>
                        </div>
                    </div>
                </AnimatedCard>
            ))}
        </div>
    )
}
