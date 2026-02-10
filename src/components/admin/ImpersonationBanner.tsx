'use client'

import { stopImpersonation } from '@/actions/admin/impersonate'
import { LogOut, ShieldAlert } from 'lucide-react'
import { toast } from 'react-hot-toast'

export function ImpersonationBanner() {
    const handleStop = async () => {
        const toastId = toast.loading('Returning to Admin Dashboard...')
        try {
            const result = await stopImpersonation()
            if (result && !result.success) {
                toast.error(result.error, { id: toastId })
            }
        } catch (error) {
            console.error('Stop impersonation error:', error)
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
            <div className="bg-red-900 text-white px-4 py-3 rounded-lg shadow-xl border border-red-700 flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="animate-pulse text-red-300" size={20} />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold">Admin Impersonation Mode</span>
                        <span className="text-xs text-red-200">You are logged in as an owner</span>
                    </div>
                </div>
                <button 
                    onClick={handleStop}
                    className="bg-white text-red-900 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                    <LogOut size={14} />
                    Exit & Return
                </button>
            </div>
        </div>
    )
}

export function ImpersonationHeader() {
    const handleStop = async () => {
        const toastId = toast.loading('Returning to Admin Dashboard...')
        try {
            const result = await stopImpersonation()
            if (result && !result.success) {
                toast.error(result.error, { id: toastId })
            }
        } catch (error) {
            console.error('Stop impersonation error:', error)
        }
    }

    return (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800">
             <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <ShieldAlert size={16} className="animate-pulse" />
                <span className="text-sm font-bold">Admin View</span>
             </div>
             <div className="h-4 w-px bg-red-200 dark:bg-red-800"></div>
             <button 
                onClick={handleStop} 
                className="text-xs font-bold text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 hover:underline flex items-center gap-1 transition-colors"
             >
                <LogOut size={12} />
                Exit
             </button>
        </div>
    )
}
