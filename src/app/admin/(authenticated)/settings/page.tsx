import React from 'react'
import { Settings, AlertCircle } from 'lucide-react'

export default function AdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Global Settings</h1>
                <p className="text-gray-500 dark:text-gray-400">System-wide configuration.</p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/50 p-6 rounded-xl flex items-center gap-4 text-yellow-800 dark:text-yellow-200">
                <AlertCircle />
                <div>
                    <h3 className="font-bold">Under Development</h3>
                    <p className="text-sm">This module will handle maintenance mode, broadcasts, and system variables.</p>
                </div>
            </div>
        </div>
    )
}
