'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
    User, Mail, Phone, 
    Calendar, Save, MapPin, Building2, 
    Briefcase, Camera, LogOut
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { updateStaffProfile } from '@/actions/staff'
import { logout } from '@/actions/auth'

interface ProfileClientProps {
    staff: any
}

export default function ProfileClient({ staff }: ProfileClientProps) {
    const router = useRouter()
    
    const [loading, setLoading] = useState(false)
    const [isLogoutLoading, setIsLogoutLoading] = useState(false)
    
    // Profile Form State
    const [profileData, setProfileData] = useState({
        name: staff.name || '',
        phone: staff.phone || '',
        dob: staff.dob ? new Date(staff.dob).toISOString().split('T')[0] : '',
        gender: staff.gender || '',
        address: staff.address || '',
        image: staff.image || ''
    })

    const [imageFile, setImageFile] = useState<File | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('Image size should be less than 5MB')
                return
            }

            setImageFile(file)

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
                if (key !== 'image' && value !== null && value !== undefined) {
                    formData.append(key, value)
                }
            })

            // Handle image
            if (imageFile) {
                formData.append('imageFile', imageFile)
            } else if (profileData.image && !profileData.image.startsWith('data:')) {
                // If existing image URL (not base64 preview), send it
                formData.append('image', profileData.image)
            }

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

    const handleLogout = async () => {
        setIsLogoutLoading(true)
        try {
            await logout()
            router.push('/staff/login')
        } catch (error) {
            toast.error('Failed to logout')
            setIsLogoutLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        View and manage your personal information
                    </p>
                </div>
                <AnimatedButton
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
                    onClick={handleLogout}
                    isLoading={isLogoutLoading}
                >
                    <LogOut size={18} />
                    Sign Out
                </AnimatedButton>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Profile Card */}
                <div className="md:col-span-1 space-y-6">
                    <AnimatedCard className="p-6 text-center" hoverEffect={false}>
                        <div className="relative inline-block mb-4">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg mx-auto bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                {profileData.image ? (
                                    <img 
                                        src={profileData.image} 
                                        alt={profileData.name} 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="w-16 h-16 text-gray-400" />
                                )}
                            </div>
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-colors"
                                type="button"
                            >
                                <Camera size={16} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>
                        
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                            {staff.name}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize flex items-center justify-center gap-1">
                            <Briefcase size={14} />
                            {staff.role}
                        </p>
                        
                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-left space-y-3">
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <Mail size={16} />
                                <span className="truncate">{staff.email}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                                <Building2 size={16} />
                                <span className="truncate">{staff.branch?.name}</span>
                            </div>
                        </div>
                    </AnimatedCard>

                    {/* Organization Info (Read-only) */}
                    <AnimatedCard className="p-6" hoverEffect={false}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            Organization
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Library</label>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {staff.library?.name}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</label>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {staff.branch?.name}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">{staff.branch?.address}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joining Date</label>
                                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                                    {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString() : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </AnimatedCard>
                </div>

                {/* Right Column: Edit Profile Form */}
                <div className="md:col-span-2">
                    <AnimatedCard className="p-6" hoverEffect={false}>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary-500" />
                            Edit Details
                        </h3>

                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Full Name"
                                    icon={User}
                                    value={profileData.name}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                                <FormInput
                                    label="Phone Number"
                                    icon={Phone}
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="Date of Birth"
                                    type="date"
                                    icon={Calendar}
                                    value={profileData.dob}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, dob: e.target.value }))}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                                        value={profileData.gender}
                                        onChange={(e) => setProfileData(prev => ({ ...prev, gender: e.target.value }))}
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
                                onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                                placeholder="Full address"
                            />

                            <div className="pt-4 flex justify-end">
                                <AnimatedButton
                                    type="submit"
                                    variant="primary"
                                    isLoading={loading}
                                >
                                    <Save size={18} />
                                    Save Changes
                                </AnimatedButton>
                            </div>
                        </form>
                    </AnimatedCard>
                </div>
            </div>
        </div>
    )
}
