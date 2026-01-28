'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
    User, Mail, Phone, Lock, LogOut, 
    Calendar, Save, MapPin, Building2, 
    Briefcase, CreditCard, Clock, Shield,
    Camera
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { updateStaffProfile, changeStaffPassword } from '@/actions/staff'
import { logoutStaff } from '@/actions/auth'

interface ProfileClientProps {
    staff: any // using any to avoid strict type checks for now, but should be Staff & { branch: Branch, library: Library }
}

export default function ProfileClient({ staff }: ProfileClientProps) {
    const router = useRouter()
    
    const [loading, setLoading] = useState(false)
    
    // Profile Form State
    const [profileData, setProfileData] = useState({
        name: staff.name || '',
        phone: staff.phone || '',
        dob: staff.dob ? new Date(staff.dob).toISOString().split('T')[0] : '',
        gender: staff.gender || '',
        address: staff.address || '',
        image: staff.image || ''
    })

    // Password Form State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('Image size should be less than 5MB')
                return
            }

            const reader = new FileReader()
            reader.onloadend = () => {
                setProfileData(prev => ({ ...prev, image: reader.result as string }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const formData = new FormData()
            formData.append('id', staff.id)
            // Append all fields
            Object.entries(profileData).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    formData.append(key, value)
                }
            })

            const result = await updateStaffProfile(formData)

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

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('New passwords do not match')
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
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
            } else {
                toast.error(result.error || 'Failed to change password')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            setLoading(true)
            await logoutStaff()
            router.push('/staff/login')
            router.refresh()
        } catch (error) {
            toast.error('Logout failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden border-4 border-white dark:border-gray-800 relative">
                            {profileData.image ? (
                                <img src={profileData.image} alt={staff.name} className="w-full h-full object-cover" />
                            ) : (
                                <span>{staff.name?.charAt(0) || 'S'}</span>
                            )}
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <div className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 p-1.5 rounded-full shadow-md border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform duration-200">
                            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                                {staff.name}
                            </h1>
                            <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium rounded-full capitalize w-fit">
                                {staff.role}
                            </span>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5 text-sm">
                                <Mail className="w-4 h-4" />
                                {staff.email}
                            </span>
                            
                            <span className="flex items-center gap-1.5 text-sm">
                                <Building2 className="w-4 h-4" />
                                {staff.branch?.name || 'Main Branch'}
                            </span>
                        </div>
                    </div>
                </div>
                <AnimatedButton 
                    variant="outline" 
                    onClick={handleLogout}
                    className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400"
                    icon="logOut"
                >
                    Sign Out
                </AnimatedButton>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left Column - Forms */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Personal Details */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                                <User className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Details</h2>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Full Name"
                                    icon={User}
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                    placeholder="Enter your full name"
                                />
                                <FormInput
                                    label="Phone Number"
                                    icon={Phone}
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                    placeholder="Enter 10-digit number"
                                    maxLength={10}
                                />
                                <FormInput
                                    label="Date of Birth"
                                    type="date"
                                    icon={Calendar}
                                    value={profileData.dob}
                                    onChange={(e) => setProfileData({...profileData, dob: e.target.value})}
                                />
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground block">Gender</label>
                                    <select
                                        className="w-full bg-background border border-input rounded-lg px-4 py-2 text-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-colors"
                                        value={profileData.gender}
                                        onChange={(e) => setProfileData({...profileData, gender: e.target.value})}
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <FormInput
                                label="Address"
                                icon={MapPin}
                                value={profileData.address}
                                onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                                placeholder="Enter your full address"
                            />

                            <div className="flex justify-end pt-2">
                                <AnimatedButton 
                                    type="submit" 
                                    isLoading={loading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    icon="save"
                                >
                                    Save Changes
                                </AnimatedButton>
                            </div>
                        </form>
                    </motion.div>

                    {/* Security Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                <Shield className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Security</h2>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <FormInput
                                label="Current Password"
                                type="password"
                                icon={Lock}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                placeholder="Enter current password"
                            />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormInput
                                    label="New Password"
                                    type="password"
                                    icon={Lock}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                    placeholder="Enter new password"
                                />
                                <FormInput
                                    label="Confirm Password"
                                    type="password"
                                    icon={Lock}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                    placeholder="Confirm new password"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <AnimatedButton 
                                    type="submit" 
                                    isLoading={loading}
                                    className="bg-rose-600 hover:bg-rose-700 text-white"
                                    icon="lock"
                                >
                                    Update Password
                                </AnimatedButton>
                            </div>
                        </form>
                    </motion.div>
                </div>

                {/* Right Column - Read-only Info */}
                <div className="space-y-6">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <Briefcase className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Employment</h2>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Employee ID</p>
                                <p className="font-mono text-gray-900 dark:text-white truncate" title={staff.id}>
                                    {staff.id.split('-')[0]}...
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Briefcase className="w-3 h-3" /> Type
                                    </p>
                                    <p className="font-medium capitalize text-gray-900 dark:text-white">
                                        {staff.employmentType?.replace('_', ' ') || 'N/A'}
                                    </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <CreditCard className="w-3 h-3" /> Salary
                                    </p>
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        ₹{staff.salary?.toLocaleString() || '0'}
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl space-y-1">
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    <Clock className="w-3 h-3" /> Joining Date
                                </p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    }) : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
