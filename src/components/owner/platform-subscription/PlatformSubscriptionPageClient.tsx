'use client'

import React, { useState } from 'react'
import { requestPlatformSubscriptionChange } from '@/actions/owner/platform-subscription'
import { Check, Loader2, AlertTriangle, CreditCard, TicketCheck, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface PlatformSubscriptionPageClientProps {
    currentSubscription: any
    availablePlans: any[]
    payments: any[]
}

export function PlatformSubscriptionPageClient({ currentSubscription, availablePlans, payments }: PlatformSubscriptionPageClientProps) {
    const [requesting, setRequesting] = useState<string | null>(null)

    const handleRequestChange = async (planId: string) => {
        setRequesting(planId)
        try {
            const result = await requestPlatformSubscriptionChange(planId)
            if (result.success) {
                toast.success('Subscription update request sent to admin')
            } else {
                toast.error(result.error || 'Failed to request subscription change')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setRequesting(null)
        }
    }

    return (
        <div className="space-y-8">
            {/* Current Subscription */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Current Subscription</h2>
                {currentSubscription ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{currentSubscription.plan.name}</h3>
                                <StatusBadge status={currentSubscription.status} />
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                    <CreditCard size={14} />
                                    ₹{currentSubscription.plan.priceMonthly}/mo
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={14} />
                                    Renews on {format(new Date(currentSubscription.currentPeriodEnd), 'MMM d, yyyy')}
                                </span>
                            </div>
                        </div>
                        {/* Maybe some usage stats here if available */}
                    </div>
                ) : (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-amber-800 dark:text-amber-400 flex items-center gap-3">
                        <AlertTriangle className="flex-shrink-0" />
                        <div>
                            <p className="font-medium">No active subscription</p>
                            <p className="text-sm opacity-80">Please select a subscription below to get started.</p>
                        </div>
                    </div>
                )}
            </section>

            {/* Available Plans */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Available Platform Subscriptions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {availablePlans.map(plan => {
                        const isCurrent = currentSubscription?.planId === plan.id
                        return (
                            <div key={plan.id} className={`bg-white dark:bg-gray-800 rounded-xl border ${isCurrent ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700'} p-6 flex flex-col`}>
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                                    <div className="mt-2 flex items-baseline gap-1">
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.priceMonthly}</span>
                                        <span className="text-gray-500 dark:text-gray-400">/mo</span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{plan.description}</p>
                                </div>
                                
                                <ul className="space-y-3 mb-8 flex-1">
                                    <FeatureItem label={`${plan.maxActiveStudents} Active Students`} />
                                    <FeatureItem label={`${plan.maxSeats} Seats`} />
                                    <FeatureItem label={`${plan.maxStaff} Staff Members`} />
                                    <FeatureItem label={`${plan.maxStorage} MB Storage`} />
                                </ul>

                                <button
                                    onClick={() => handleRequestChange(plan.id)}
                                    disabled={isCurrent || requesting === plan.id}
                                    className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                                        ${isCurrent 
                                            ? 'bg-gray-100 text-gray-500 cursor-default dark:bg-gray-800 dark:text-gray-500' 
                                            : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'}`}
                                >
                                    {requesting === plan.id ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : isCurrent ? (
                                        <>Current Subscription <Check size={16} /></>
                                    ) : (
                                        'Update Subscription'
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Payment History */}
            <section>
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Payment History</h2>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium">Amount</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {payments.length > 0 ? payments.map(payment => (
                                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                        {format(new Date(payment.paymentDate), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900 dark:text-white font-medium">{payment.description || 'Subscription Payment'}</div>
                                        {payment.plan && <div className="text-xs text-gray-500">Subscription: {payment.plan.name}</div>}
                                    </td>
                                    <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">
                                        ₹{payment.amount}
                                    </td>
                                    <td className="px-6 py-4">
                                        <PaymentStatusBadge status={payment.status} />
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {payment.invoiceUrl ? (
                                            <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 text-xs">
                                                Download
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No payment history found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}

function FeatureItem({ label }: { label: string }) {
    return (
        <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Check size={16} className="text-green-500 flex-shrink-0" />
            <span>{label}</span>
        </li>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        canceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        past_due: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        incomplete: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        trialing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    }

    const className = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${className}`}>
            {status.replace('_', ' ')}
        </span>
    )
}

function PaymentStatusBadge({ status }: { status: string }) {
     const styles = {
        succeeded: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        refunded: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }

    const className = styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${className}`}>
            {status}
        </span>
    )
}
