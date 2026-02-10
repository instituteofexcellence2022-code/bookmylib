'use client'

import React, { useState } from 'react'
import { User, Lock, Activity, Loader2, Mail, Phone, FileText, Camera } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { FormInput } from '@/components/ui/FormInput'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { updateAdminProfile, updateAdminPassword } from '@/actions/admin/profile'

interface AdminProfileClientProps {
    admin: any
    logs: any[]
}

export function AdminProfileClient({ admin, logs }: AdminProfileClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'details' | 'security' | 'activity'>('details')
    const [loading, setLoading] = useState(false)
    
    // Profile Form
    const [formData, setFormData] = useState({
        name: admin.name || '',
        email: admin.email || '',
        phone: admin.phone || '',
        bio: admin.bio || '',
        image: admin.image || ''
    })

    // Password Form
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const result = await updateAdminProfile(formData)
            if (result.success) {
                toast.success('Profile updated successfully')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to update profile')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match')
            return
        }
        
        setLoading(true)
        try {
            const result = await updateAdminPassword(passwordData.currentPassword, passwordData.newPassword)
            if (result.success) {
                toast.success('Password updated successfully')
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            } else {
                toast.error(result.error || 'Failed to update password')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your account settings and preferences.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full lg:w-64 space-y-1">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'details' 
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                    >
                        <User size={18} />
                        Personal Details
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'security' 
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Lock size={18} />
                        Security & Password
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                            activeTab === 'activity' 
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' 
                                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Activity size={18} />
                        Activity Log
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                        
                        {/* Details Tab */}
                        {activeTab === 'details' && (
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative group">
                                        <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-3xl font-bold text-gray-400 overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
                                            {formData.image ? (
                                                <img src={formData.image} alt="Profile" className="w-full h-full object-cover" />
                                            ) : (
                                                admin.name?.charAt(0) || 'A'
                                            )}
                                        </div>
                                        {/* Placeholder for image upload if we implement file upload later */}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{admin.name}</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{admin.role}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormInput
                                        label="Full Name"
                                        icon={User}
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                <Mail size={18} />
                                            </div>
                                            <input 
                                                type="email" 
                                                value={formData.email} 
                                                disabled 
                                                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500">Email cannot be changed.</p>
                                    </div>
                                    <FormInput
                                        label="Phone Number"
                                        icon={Phone}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        placeholder="+91 98765 43210"
                                    />
                                    <FormInput
                                        label="Profile Image URL"
                                        icon={Camera}
                                        value={formData.image}
                                        onChange={(e) => setFormData({...formData, image: e.target.value})}
                                        placeholder="https://..."
                                    />
                                </div>

                                <FormTextarea
                                    label="Bio"
                                    value={formData.bio}
                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                    placeholder="Tell us a little about yourself..."
                                    rows={4}
                                />

                                <div className="flex justify-end pt-4">
                                    <AnimatedButton
                                        type="submit"
                                        isLoading={loading}
                                        icon="save"
                                    >
                                        Save Changes
                                    </AnimatedButton>
                                </div>
                            </form>
                        )}

                        {/* Security Tab */}
                        {activeTab === 'security' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Change Password</h3>
                                    <p className="text-sm text-gray-500">Ensure your account is using a long, random password to stay secure.</p>
                                </div>

                                <div className="space-y-4">
                                    <FormInput
                                        label="Current Password"
                                        type="password"
                                        icon={Lock}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                        required
                                    />
                                    <div className="border-t border-gray-100 dark:border-gray-700 my-4 pt-4 space-y-4">
                                        <FormInput
                                            label="New Password"
                                            type="password"
                                            icon={Lock}
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                            required
                                        />
                                        <FormInput
                                            label="Confirm New Password"
                                            type="password"
                                            icon={Lock}
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <AnimatedButton
                                        type="submit"
                                        isLoading={loading}
                                        icon="shield"
                                        variant="danger"
                                    >
                                        Update Password
                                    </AnimatedButton>
                                </div>
                            </form>
                        )}

                        {/* Activity Tab */}
                        {activeTab === 'activity' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Recent Activity</h3>
                                    <p className="text-sm text-gray-500">Your recent actions on the platform.</p>
                                </div>

                                <div className="space-y-4">
                                    {logs.length > 0 ? (
                                        logs.map((log) => (
                                            <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                                                <div className="mt-1">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                        <Activity size={14} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {log.action}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {log.details || 'No details recorded'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-2">
                                                        {new Date(log.createdAt).toLocaleString()} • IP: {log.ipAddress || 'Unknown'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            No activity recorded yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    )
}
