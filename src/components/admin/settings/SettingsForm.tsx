'use client'

import React, { useState } from 'react'
import { Save, Settings, ShieldAlert, Zap, Mail, Phone, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { FormInput } from '@/components/ui/FormInput'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { updatePlatformSettings } from '@/actions/admin/settings'

interface SettingsFormProps {
    initialSettings: any
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        platformName: initialSettings.platformName || '',
        supportEmail: initialSettings.supportEmail || '',
        supportPhone: initialSettings.supportPhone || '',
        maintenanceMode: initialSettings.maintenanceMode || false,
        maintenanceMsg: initialSettings.maintenanceMsg || '',
        enableRegistrations: initialSettings.enableRegistrations ?? true,
        enableEmailNotifs: initialSettings.enableEmailNotifs ?? true
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await updatePlatformSettings(formData)
            if (res.success) {
                toast.success('Settings updated successfully')
            } else {
                toast.error(res.error || 'Failed to update settings')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 pb-20">
            {/* General Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Globe size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">General Information</h3>
                        <p className="text-sm text-gray-500">Basic platform details and contact info.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label="Platform Name"
                        value={formData.platformName}
                        onChange={(e) => setFormData({...formData, platformName: e.target.value})}
                        icon={Settings}
                    />
                    <FormInput
                        label="Support Email"
                        type="email"
                        value={formData.supportEmail}
                        onChange={(e) => setFormData({...formData, supportEmail: e.target.value})}
                        icon={Mail}
                    />
                    <FormInput
                        label="Support Phone"
                        type="tel"
                        value={formData.supportPhone}
                        onChange={(e) => setFormData({...formData, supportPhone: e.target.value})}
                        icon={Phone}
                    />
                </div>
            </div>

            {/* Feature Flags */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Zap size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Feature Flags</h3>
                        <p className="text-sm text-gray-500">Enable or disable global platform features.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">New Registrations</p>
                            <p className="text-sm text-gray-500">Allow new libraries to register on the platform.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.enableRegistrations}
                                onChange={(e) => setFormData({...formData, enableRegistrations: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                            <p className="text-sm text-gray-500">Send system emails (welcome, invoices, etc).</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.enableEmailNotifs}
                                onChange={(e) => setFormData({...formData, enableEmailNotifs: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Maintenance Mode */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/50 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                        <ShieldAlert size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Danger Zone</h3>
                        <p className="text-sm text-gray-500">Maintenance mode and critical controls.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-300">Maintenance Mode</p>
                            <p className="text-sm text-red-600/80 dark:text-red-400/80">Disables access for all non-admin users.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={formData.maintenanceMode}
                                onChange={(e) => setFormData({...formData, maintenanceMode: e.target.checked})}
                                className="sr-only peer" 
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
                        </label>
                    </div>

                    {formData.maintenanceMode && (
                        <FormTextarea
                            label="Maintenance Message"
                            value={formData.maintenanceMsg}
                            onChange={(e) => setFormData({...formData, maintenanceMsg: e.target.value})}
                            placeholder="We are currently undergoing scheduled maintenance. Please check back later."
                        />
                    )}
                </div>
            </div>

            <div className="fixed bottom-6 right-6 z-10">
                <AnimatedButton
                    type="submit"
                    isLoading={loading}
                    icon="save"
                    className="shadow-xl"
                >
                    Save Configuration
                </AnimatedButton>
            </div>
        </form>
    )
}