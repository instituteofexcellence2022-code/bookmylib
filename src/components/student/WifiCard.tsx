'use client'

import { useState } from 'react'
import { Wifi, Eye, EyeOff, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WifiDetails {
    ssid: string
    password: string
}

interface WifiCardProps {
    wifiDetails: WifiDetails[]
    hasActiveSubscription: boolean
}

export default function WifiCard({ wifiDetails, hasActiveSubscription }: WifiCardProps) {
    const [showPassword, setShowPassword] = useState<Record<number, boolean>>({})

    const togglePassword = (index: number) => {
        if (!hasActiveSubscription) {
            const confirm = window.confirm('Active members only. kindly Purchase subscription?')
            if (confirm) {
                // Determine where to redirect. Usually booking page is the current page.
                // We can scroll to the top or if there is a specific #plans section.
                // For now, reload the page might be enough if the user thinks they subscribed?
                // Or just do nothing as the user is already on the booking page (presumably).
                // Let's just alert for now.
                // Ideally we should scroll to the plans section.
                const plansSection = document.getElementById('plans-section')
                if (plansSection) {
                    plansSection.scrollIntoView({ behavior: 'smooth' })
                }
            }
            return
        }

        setShowPassword(prev => ({
            ...prev,
            [index]: !prev[index]
        }))
    }

    if (wifiDetails.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-sky-500" />
                    Wi-Fi Details
                </h2>
                <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 italic text-sm">Ask staff for Wi-Fi details</p>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wifi className="w-5 h-5 text-sky-500" />
                Wi-Fi Details
            </h2>
            <div className="space-y-3">
                {wifiDetails.map((wifi, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl space-y-2 border border-gray-100 dark:border-gray-600">
                        <div className="flex items-center justify-between gap-2 h-8">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Network</span>
                            <div className="flex items-center gap-2 min-w-0 justify-end flex-1">
                                <span className="font-semibold text-gray-900 dark:text-white truncate">{wifi.ssid}</span>
                                <div className="w-7 shrink-0" aria-hidden="true" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 h-8">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0">Password</span>
                            <div className="flex items-center gap-2 min-w-0 justify-end flex-1">
                                <code className="px-2 py-1 bg-white dark:bg-gray-800 rounded-md text-sm font-mono text-emerald-600 dark:text-emerald-400 border border-gray-200 dark:border-gray-600 select-all block truncate max-w-[200px]">
                                    {showPassword[i] ? wifi.password : '••••••••'}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={() => togglePassword(i)}
                                >
                                    {showPassword[i] ? (
                                        <EyeOff className="w-4 h-4 text-gray-500" />
                                    ) : (
                                        hasActiveSubscription ? (
                                            <Eye className="w-4 h-4 text-gray-500" />
                                        ) : (
                                            <Lock className="w-4 h-4 text-gray-400" />
                                        )
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
