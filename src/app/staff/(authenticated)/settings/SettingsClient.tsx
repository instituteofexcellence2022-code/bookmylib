'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Lock, 
    Save, 
    Shield,
    Bell,
    Moon,
    Sun,
    Monitor
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useTheme } from 'next-themes'

import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { changeStaffPassword } from '@/actions/staff'

interface SettingsClientProps {
    staff: any
}

export default function SettingsClient({ staff }: SettingsClientProps) {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    
    const [loading, setLoading] = useState(false)
    
    // Password Form State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (passwordData.newPassword.length < 8) {
            toast.error('Password must be at least 8 characters')
            return
        }

        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('id', staff.id)
            formData.append('currentPassword', passwordData.currentPassword)
            formData.append('newPassword', passwordData.newPassword)
            formData.append('confirmPassword', passwordData.confirmPassword)

            const result = await changeStaffPassword(formData)

            if (result.success) {
                toast.success('Password changed successfully')
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                })
            } else {
                toast.error(result.error || 'Failed to change password')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Manage your account settings and preferences
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Security Settings */}
                <AnimatedCard
                    className="p-6"
                    hoverEffect={false}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                            <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Update your password and security settings
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                        <FormInput
                            label="Current Password"
                            type="password"
                            icon={Lock}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                            required
                        />
                        <FormInput
                            label="New Password"
                            type="password"
                            icon={Lock}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                            required
                        />
                        <FormInput
                            label="Confirm New Password"
                            type="password"
                            icon={Lock}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                        />

                        <div className="pt-2">
                            <AnimatedButton
                                type="submit"
                                variant="primary"
                                isLoading={loading}
                            >
                                <Save size={18} />
                                Update Password
                            </AnimatedButton>
                        </div>
                    </form>
                </AnimatedCard>

                {/* Appearance Settings */}
                <AnimatedCard
                    className="p-6"
                    hoverEffect={false}
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Customize the interface theme
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setTheme('light')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                theme === 'light' 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }`}
                        >
                            <Sun className="w-6 h-6 text-orange-500" />
                            <span className="text-sm font-medium">Light</span>
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                theme === 'dark' 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }`}
                        >
                            <Moon className="w-6 h-6 text-purple-500" />
                            <span className="text-sm font-medium">Dark</span>
                        </button>
                        <button
                            onClick={() => setTheme('system')}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                theme === 'system' 
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                            }`}
                        >
                            <Monitor className="w-6 h-6 text-gray-500" />
                            <span className="text-sm font-medium">System</span>
                        </button>
                    </div>
                </AnimatedCard>
            </div>
        </div>
    )
}
