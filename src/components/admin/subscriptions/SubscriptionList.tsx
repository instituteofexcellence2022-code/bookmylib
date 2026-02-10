import React from 'react'
import { TicketCheck, Calendar, AlertTriangle, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

interface SubscriptionListProps {
    subscriptions: any[]
    loading?: boolean
    onManage: (libraryId: string) => void
}

export function SubscriptionList({ subscriptions, loading, onManage }: SubscriptionListProps) {
    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading subscriptions...</div>
    }

    if (subscriptions.length === 0) {
        return (
            <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                <TicketCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No platform subscriptions found</h3>
                <p className="text-gray-500 text-sm">No subscription records match your filters.</p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Library</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">SaaS Plan</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Status</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Price</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs">Current Period</th>
                            <th className="px-6 py-4 font-medium uppercase text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {subscriptions.map(sub => (
                            <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-gray-900 dark:text-white">{sub.library.name}</div>
                                    <div className="text-xs text-gray-500">{sub.library.subdomain}.lms-platform.com</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <TicketCheck size={14} />
                                        </div>
                                        <span className="font-medium">{sub.plan.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={sub.status} />
                                </td>
                                <td className="px-6 py-4 font-mono">
                                    ₹{sub.plan.priceMonthly}/mo
                                </td>
                                <td className="px-6 py-4 text-gray-500">
                                    <div className="flex flex-col gap-1 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="w-12 text-gray-400">Ends:</span>
                                            <span className="font-medium flex items-center gap-1">
                                                {format(new Date(sub.currentPeriodEnd), 'MMM d, yyyy')}
                                                {new Date(sub.currentPeriodEnd) < new Date() && (
                                                    <AlertTriangle size={12} className="text-red-500" />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => onManage(sub.library.id)}
                                        className="text-blue-600 hover:text-blue-700 text-xs font-medium flex items-center gap-1 justify-end ml-auto"
                                    >
                                        Manage <ExternalLink size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
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
