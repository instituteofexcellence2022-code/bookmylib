import React from 'react'
import { getAuditLogs } from '@/actions/admin/platform-audit'
import { ShieldAlert, Terminal } from 'lucide-react'

export default async function AdminAuditLogsPage() {
    const logs = await getAuditLogs()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
                <p className="text-gray-500 dark:text-gray-400">Security trail of all admin actions.</p>
            </div>

            <div className="space-y-4">
                {logs.map(log => (
                    <div key={log.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex gap-4">
                        <div className="mt-1">
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <ShieldAlert size={14} className="text-gray-600 dark:text-gray-400" />
                            </div>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white mr-2">
                                        {log.performedBy.name}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        performed <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{log.action}</span>
                                    </span>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">
                                    {new Date(log.createdAt).toLocaleString()}
                                </span>
                            </div>
                            
                            {log.details && (
                                <div className="mt-2 bg-gray-50 dark:bg-gray-900 rounded p-2 text-xs font-mono text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-800 flex gap-2">
                                    <Terminal size={12} className="mt-0.5 text-gray-400" />
                                    {log.details}
                                </div>
                            )}

                            <div className="mt-2 flex gap-4 text-xs text-gray-400">
                                <span>IP: {log.ipAddress || 'Unknown'}</span>
                                {log.targetId && <span>Target: {log.targetId}</span>}
                            </div>
                        </div>
                    </div>
                ))}

                {logs.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No audit logs recorded yet.
                    </div>
                )}
            </div>
        </div>
    )
}
