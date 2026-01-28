'use client'

import React, { useState, useEffect } from 'react'
import { 
    Settings, Bell, Moon, Globe, 
    Save, Loader2, Smartphone, Mail, Shield, CheckCircle, XCircle
} from 'lucide-react'
import { Prisma } from '@prisma/client'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { 
    getOwnerProfile, updateOwnerPreferences, 
    generateTwoFactorSecret, enableTwoFactor, disableTwoFactor 
} from '@/actions/owner'
import { toast } from 'react-hot-toast'
import { useTheme } from 'next-themes'
import Image from 'next/image'

export default function SettingsPage() {
    const { setTheme, theme: currentTheme } = useTheme()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [owner, setOwner] = useState<Prisma.OwnerGetPayload<{include: { library: true }}> | null>(null)
    
    const [preferences, setPreferences] = useState({
        theme: 'system',
        language: 'en',
        notifications: {
            email: true,
            sms: false
        }
    })

    const [twoFactorSetup, setTwoFactorSetup] = useState({
        show: false,
        secret: '',
        qrCode: '',
        code: ''
    })

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const data = await getOwnerProfile()
            if (data) {
                setOwner(data)
                if (data.preferences) {
                    // Parse existing preferences
                    const prefs = typeof data.preferences === 'string' 
                        ? JSON.parse(data.preferences) 
                        : data.preferences

                    setPreferences({
                        theme: prefs.theme || 'system',
                        language: prefs.language || 'en',
                        notifications: {
                            email: prefs.notifications?.email ?? true,
                            sms: prefs.notifications?.sms ?? false
                        }
                    })
                }
            }
        } catch (error) {
            toast.error('Failed to load settings')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        if (!owner) {
            toast.error('Owner not loaded')
            setSaving(false)
            return
        }

        // Update local theme immediately if changed
        if (preferences.theme !== 'system') {
            setTheme(preferences.theme)
        }

        const formData = new FormData()
        formData.append('id', owner.id)
        formData.append('theme', preferences.theme)
        formData.append('language', preferences.language)
        formData.append('emailNotifications', String(preferences.notifications.email))
        formData.append('smsNotifications', String(preferences.notifications.sms))

        const result = await updateOwnerPreferences(formData)
        
        if (result.success) {
            toast.success('Settings saved successfully')
        } else {
            toast.error(result.error || 'Failed to save settings')
        }
        setSaving(false)
    }

    const handleSetupTwoFactor = async () => {
        if (!owner) {
            toast.error('Owner not loaded')
            return
        }
        const formData = new FormData()
        formData.append('id', owner.id)
        const result = await generateTwoFactorSecret(formData)

        if (result.success) {
            setTwoFactorSetup({
                show: true,
                secret: result.secret || '',
                qrCode: result.qrCodeUrl || '',
                code: ''
            })
        } else {
            toast.error(result.error || 'Failed to setup 2FA')
        }
    }

    const handleVerifyTwoFactor = async () => {
        if (!owner) {
            toast.error('Owner not loaded')
            return
        }
        const formData = new FormData()
        formData.append('id', owner.id)
        formData.append('token', twoFactorSetup.code)
        formData.append('secret', twoFactorSetup.secret)

        const result = await enableTwoFactor(formData)

        if (result.success) {
            toast.success('2FA Enabled successfully')
            setTwoFactorSetup({ show: false, secret: '', qrCode: '', code: '' })
            setOwner({ ...owner, twoFactorEnabled: true })
        } else {
            toast.error(result.error || 'Failed to verify 2FA')
        }
    }

    const handleDisableTwoFactor = async () => {
        if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) return

        if (!owner) {
            toast.error('Owner not loaded')
            return
        }
        const formData = new FormData()
        formData.append('id', owner.id)
        
        const result = await disableTwoFactor(formData)

        if (result.success) {
            toast.success('2FA Disabled successfully')
            setOwner({ ...owner, twoFactorEnabled: false })
        } else {
            toast.error(result.error || 'Failed to disable 2FA')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        )
    }

    if (!owner) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-500">
                <p className="text-lg">Owner profile not found.</p>
                <p className="text-sm">Please ensure an owner account exists.</p>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* General Preferences */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                            <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">General Preferences</h2>
                            <p className="text-sm text-gray-500">Customize your interface experience</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormSelect
                            label="Interface Theme"
                            icon={Moon}
                            value={preferences.theme}
                            onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                            options={[
                                { label: 'System Default', value: 'system' },
                                { label: 'Light Mode', value: 'light' },
                                { label: 'Dark Mode', value: 'dark' }
                            ]}
                        />

                        <FormSelect
                            label="Language"
                            icon={Globe}
                            value={preferences.language}
                            onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                            options={[
                                { label: 'English', value: 'en' },
                                { label: 'Hindi', value: 'hi' },
                                { label: 'Spanish', value: 'es' }
                            ]}
                        />
                    </div>
                </div>

                {/* Security Section (2FA) */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h2>
                            <p className="text-sm text-gray-500">Protect your account with additional security</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${owner.twoFactorEnabled ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                {owner.twoFactorEnabled ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <XCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                )}
                            </div>
                            <div>
                                <div className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                                <div className="text-sm text-gray-500">
                                    {owner.twoFactorEnabled 
                                        ? 'Your account is secured with 2FA' 
                                        : 'Add an extra layer of security to your account'}
                                </div>
                            </div>
                        </div>
                        
                        {!owner.twoFactorEnabled ? (
                            <AnimatedButton
                                type="button"
                                onClick={handleSetupTwoFactor}
                                variant="primary"
                                className="!py-2 !px-4 !text-sm"
                            >
                                Enable 2FA
                            </AnimatedButton>
                        ) : (
                            <AnimatedButton
                                type="button"
                                onClick={handleDisableTwoFactor}
                                variant="danger"
                                className="!py-2 !px-4 !text-sm"
                            >
                                Disable 2FA
                            </AnimatedButton>
                        )}
                    </div>

                    {twoFactorSetup.show && (
                        <div className="mt-6 p-6 bg-gray-50 dark:bg-gray-750/50 rounded-lg border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Set up Two-Factor Authentication</h3>
                            <div className="flex flex-col md:flex-row gap-8">
                                <div className="flex-shrink-0 bg-white p-4 rounded-lg shadow-sm">
                                    {twoFactorSetup.qrCode && (
                                        <Image 
                                            src={twoFactorSetup.qrCode} 
                                            alt="2FA QR Code" 
                                            width={150} 
                                            height={150}
                                            className="w-full h-auto"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        <ol className="list-decimal ml-4 space-y-2">
                                            <li>Install Google Authenticator or Authy on your phone.</li>
                                            <li>Scan the QR code to the left.</li>
                                            <li>Enter the 6-digit code from your app below.</li>
                                        </ol>
                                    </div>
                                    <div className="flex gap-4 items-end">
                                        <FormInput
                                            label="Verification Code"
                                            value={twoFactorSetup.code}
                                            onChange={(e) => setTwoFactorSetup({ ...twoFactorSetup, code: e.target.value })}
                                            placeholder="000000"
                                            maxLength={6}
                                        />
                                        <AnimatedButton
                                            type="button"
                                            onClick={handleVerifyTwoFactor}
                                            variant="primary"
                                            className="mb-[2px]"
                                            disabled={twoFactorSetup.code.length !== 6}
                                        >
                                            Verify & Enable
                                        </AnimatedButton>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setTwoFactorSetup({ show: false, secret: '', qrCode: '', code: '' })}
                                        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                            <p className="text-sm text-gray-500">Manage how you receive alerts</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                                    <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">Email Notifications</div>
                                    <div className="text-sm text-gray-500">Receive daily summaries and critical alerts via email</div>
                                </div>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={preferences.notifications.email}
                                    onChange={(e) => setPreferences({ 
                                        ...preferences, 
                                        notifications: { ...preferences.notifications, email: e.target.checked } 
                                    })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </div>
                        </label>

                        <label className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full">
                                    <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900 dark:text-white">SMS Notifications</div>
                                    <div className="text-sm text-gray-500">Receive instant alerts on your mobile device</div>
                                </div>
                            </div>
                            <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={preferences.notifications.sms}
                                    onChange={(e) => setPreferences({ 
                                        ...preferences, 
                                        notifications: { ...preferences.notifications, sms: e.target.checked } 
                                    })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end">
                    <AnimatedButton
                        type="submit"
                        isLoading={saving}
                        variant="primary"
                    >
                        Save Preferences
                        <Save className="w-4 h-4 ml-2" />
                    </AnimatedButton>
                </div>
            </form>
        </div>
    )
}
