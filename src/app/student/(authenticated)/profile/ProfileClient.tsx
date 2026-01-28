'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
    User, Mail, Phone, Lock, LogOut, 
    Shield, CreditCard, Calendar, 
    CheckCircle2, AlertCircle, Save,
    MapPin, Users, Camera, Upload, Home, Heart,
    FileText, Clock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'

import { FormInput } from '@/components/ui/FormInput'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { QuoteCard } from '@/components/student/QuoteCard'
import { Quote } from '@/lib/quotes'
import { updateStudentProfile, changeStudentPassword, uploadGovtId } from '@/actions/student'
import { logoutStudent } from '@/actions/auth'

interface ProfileClientProps {
    initialData: {
        student: any
        stats: any
    }
    likedQuotes?: Quote[]
}

export default function ProfileClient({ initialData, likedQuotes = [] }: ProfileClientProps) {
    const router = useRouter()
    const { student, stats } = initialData
    
    const [loading, setLoading] = useState(false)
    const [govtIdLoading, setGovtIdLoading] = useState(false)
    const [addressLoading, setAddressLoading] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])
    
    // Profile Form State
    const [profileData, setProfileData] = useState({
        name: student.name || '',
        email: student.email || '', // Readonly
        phone: student.phone || '',
        dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
        gender: student.gender || '',
        address: student.address || '',
        area: student.area || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || '',
        guardianName: student.guardianName || '',
        guardianPhone: student.guardianPhone || '',
        image: student.image || ''
    })

    const [availableAreas, setAvailableAreas] = useState<string[]>([])
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)

    // Password Form State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    // Sync state with initialData updates (e.g. from server revalidation)
    useEffect(() => {
        setProfileData({
            name: student.name || '',
            email: student.email || '',
            phone: student.phone || '',
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : '',
            gender: student.gender || '',
            address: student.address || '',
            area: student.area || '',
            city: student.city || '',
            state: student.state || '',
            pincode: student.pincode || '',
            guardianName: student.guardianName || '',
            guardianPhone: student.guardianPhone || '',
            image: student.image || ''
        })
    }, [student])

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error('Image size should be less than 5MB')
                return
            }

            setSelectedImageFile(file)

            const reader = new FileReader()
            reader.onloadend = () => {
                setProfileData(prev => ({ ...prev, image: reader.result as string }))
            }
            reader.readAsDataURL(file)
        }
    }

    const handleGovtIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size should be less than 5MB')
            return
        }

        setGovtIdLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            
            const result = await uploadGovtId(formData)
            
            if (result.success) {
                toast.success('ID uploaded successfully')
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to upload ID')
            }
        } catch (error) {
            toast.error('An error occurred during upload')
        } finally {
            setGovtIdLoading(false)
        }
    }

    const fetchAddressFromPincode = async (pincode: string) => {
        if (pincode.length !== 6) return

        setAddressLoading(true)
        setAvailableAreas([])
        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
            const data = await response.json()

            if (data[0].Status === 'Success') {
                const postOffices = data[0].PostOffice
                const areas = postOffices.map((po: any) => po.Name)
                setAvailableAreas(areas)
                
                const postOffice = postOffices[0]
                setProfileData(prev => ({
                    ...prev,
                    city: postOffice.District,
                    state: postOffice.State,
                    pincode: pincode,
                    // If only one area, select it automatically
                    area: areas.length === 1 ? areas[0] : prev.area
                }))
                toast.success('Address details fetched!')
            } else {
                toast.error('Invalid Pincode')
                setAvailableAreas([])
            }
        } catch (error) {
            console.error('Error fetching address:', error)
            // toast.error('Failed to fetch address details')
            setAvailableAreas([])
        } finally {
            setAddressLoading(false)
        }
    }

    // Auto-fetch address when pincode changes (debounced)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (profileData.pincode && profileData.pincode.length === 6) {
                // Only fetch if city/state are empty or user explicitly changed pincode
                if (!profileData.city || !profileData.state) {
                    fetchAddressFromPincode(profileData.pincode)
                }
            }
        }, 1000)

        return () => clearTimeout(timer)
    }, [profileData.pincode])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const formData = new FormData()
            // Append all fields
            Object.entries(profileData).forEach(([key, value]) => {
                if (key === 'image') return // Handle image separately
                if (value !== null && value !== undefined) {
                    formData.append(key, value)
                }
            })

            if (selectedImageFile) {
                formData.append('imageFile', selectedImageFile)
            } else if (profileData.image) {
                formData.append('image', profileData.image)
            }

            const result = await updateStudentProfile(formData)

            if (result.success) {
                toast.success('Profile updated successfully')
                setSelectedImageFile(null)
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
            formData.append('currentPassword', passwordData.currentPassword)
            formData.append('newPassword', passwordData.newPassword)
            formData.append('confirmPassword', passwordData.confirmPassword)

            const result = await changeStudentPassword(formData)

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
        await logoutStudent()
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden border-4 border-white dark:border-gray-800">
                            {profileData.image ? (
                                <img src={profileData.image} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                                student.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            type="button"
                        >
                            <Camera size={16} className="text-gray-600 dark:text-gray-300" />
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{student.name}</h1>
                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <Mail size={14} /> {student.email}
                        </p>
                        <div className="mt-2 flex gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                                Student
                            </span>
                            {stats.monthAttendance > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-medium">
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <AnimatedButton 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20"
                    onClick={handleLogout}
                    icon="logOut"
                >
                    Sign Out
                </AnimatedButton>
            </div>

            {/* Liked Quotes Section */}
            {likedQuotes.length > 0 && (
                <AnimatedCard className="overflow-hidden">
                    <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                            Liked Quotes
                        </h2>
                    </div>
                    <QuoteCard quotes={likedQuotes} initialLikedIds={likedQuotes.map(q => q.id)} />
                </AnimatedCard>
            )}

            <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Forms */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* Personal Info Card */}
                    <AnimatedCard className="overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-500" />
                                Personal Information
                            </h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    icon={User}
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                                    className="focus:ring-blue-500"
                                    placeholder="Full Name"
                                />
                                <FormInput
                                    icon={Phone}
                                    value={profileData.phone}
                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                    className="focus:ring-blue-500"
                                    placeholder="Phone Number"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    type="date"
                                    icon={Calendar}
                                    value={profileData.dob}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setProfileData({ ...profileData, dob: e.target.value })}
                                    className="focus:ring-blue-500"
                                />
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <select
                                        value={profileData.gender}
                                        onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                                        className="w-full bg-background border border-input rounded-lg text-lg transition-colors pl-11 pr-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <FormInput
                                icon={Mail}
                                value={profileData.email}
                                disabled
                                className="bg-gray-50 dark:bg-gray-900/50 text-gray-500"
                                placeholder="Email Address"
                            />
                        </div>
                    </AnimatedCard>

                    {/* Address Card */}
                    <AnimatedCard className="overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-orange-500" />
                                Address Details
                            </h2>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {/* Address Line - Full Width */}
                            <div className="col-span-2">
                                <FormInput
                                    icon={Home}
                                    value={profileData.address}
                                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                    className="focus:ring-orange-500"
                                    placeholder="Address Line (House No, Street, Building)"
                                />
                            </div>

                            {/* Pincode */}
                            <div className="relative">
                                <FormInput
                                    icon={MapPin}
                                    value={profileData.pincode}
                                    onChange={(e) => setProfileData({ ...profileData, pincode: e.target.value })}
                                    className="focus:ring-orange-500"
                                    maxLength={6}
                                    placeholder="Pincode"
                                />
                                {addressLoading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-orange-500 animate-pulse">
                                        Fetching...
                                    </div>
                                )}
                            </div>

                            {/* Area */}
                            {availableAreas.length > 0 ? (
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <select
                                        value={profileData.area}
                                        onChange={(e) => setProfileData({ ...profileData, area: e.target.value })}
                                        className="w-full bg-background border border-input rounded-lg text-lg transition-colors pl-11 pr-4 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none appearance-none"
                                    >
                                        <option value="">Select Area</option>
                                        {availableAreas.map((area) => (
                                            <option key={area} value={area}>
                                                {area}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <FormInput
                                    icon={MapPin}
                                    value={profileData.area}
                                    onChange={(e) => setProfileData({ ...profileData, area: e.target.value })}
                                    className="focus:ring-orange-500"
                                    placeholder="Area / Locality"
                                />
                            )}

                            {/* City */}
                            <FormInput
                                icon={Home}
                                value={profileData.city}
                                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                                className="focus:ring-orange-500"
                                placeholder="City"
                            />
                            
                            {/* State */}
                            <FormInput
                                icon={MapPin}
                                value={profileData.state}
                                onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                                className="focus:ring-orange-500"
                                placeholder="State"
                            />
                        </div>
                    </AnimatedCard>

                    {/* Guardian Info Card */}
                    <AnimatedCard className="overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Shield className="w-5 h-5 text-green-500" />
                                Guardian Information
                            </h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    icon={User}
                                    value={profileData.guardianName}
                                    onChange={(e) => setProfileData({ ...profileData, guardianName: e.target.value })}
                                    className="focus:ring-green-500"
                                    placeholder="Guardian Name"
                                />
                                <FormInput
                                    icon={Phone}
                                    value={profileData.guardianPhone}
                                    onChange={(e) => setProfileData({ ...profileData, guardianPhone: e.target.value })}
                                    className="focus:ring-green-500"
                                    placeholder="Guardian Phone"
                                />
                            </div>
                        </div>
                    </AnimatedCard>

                    {/* Govt ID Verification Card */}
                    <AnimatedCard className="overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-500" />
                                Government ID Verification
                            </h2>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                <div className={`p-3 rounded-full ${
                                    student.govtIdStatus === 'verified' ? 'bg-green-100 text-green-600' :
                                    student.govtIdStatus === 'rejected' ? 'bg-red-100 text-red-600' :
                                    student.govtIdStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-gray-200 text-gray-500'
                                }`}>
                                    {student.govtIdStatus === 'verified' ? <CheckCircle2 size={24} /> :
                                     student.govtIdStatus === 'rejected' ? <AlertCircle size={24} /> :
                                     student.govtIdStatus === 'pending' ? <Clock size={24} /> :
                                     <Upload size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-medium">
                                        {student.govtIdStatus === 'verified' ? 'Verified ID' :
                                         student.govtIdStatus === 'rejected' ? 'ID Rejected' :
                                         student.govtIdStatus === 'pending' ? 'Verification Pending' :
                                         'Upload Government ID'}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {student.govtIdStatus === 'verified' ? 'Your government ID has been verified.' :
                                         student.govtIdStatus === 'rejected' ? 'Please upload a valid ID again.' :
                                         student.govtIdStatus === 'pending' ? 'Waiting for admin approval.' :
                                         'Upload Aadhar, PAN, or Driving License.'}
                                    </p>
                                </div>
                            </div>

                            {student.govtIdUrl && (
                                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100">
                                    <img 
                                        src={student.govtIdUrl} 
                                        alt="Government ID" 
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            )}

                            {student.govtIdStatus !== 'verified' && student.govtIdStatus !== 'pending' && (
                                <div>
                                    <input
                                        type="file"
                                        id="govt-id-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleGovtIdUpload}
                                        disabled={govtIdLoading}
                                    />
                                    <label
                                        htmlFor="govt-id-upload"
                                        className={`flex items-center justify-center gap-2 w-full p-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                                            govtIdLoading 
                                                ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                                : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50 dark:border-purple-900/30 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                                        }`}
                                    >
                                        {govtIdLoading ? (
                                            <>Processing...</>
                                        ) : (
                                            <>
                                                <Upload size={18} />
                                                <span>Select Image to Upload</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            )}
                        </div>
                    </AnimatedCard>
                    
                    {/* Submit Button Area */}
                    <div className="flex justify-end pt-4">
                        <AnimatedButton 
                            type="submit" 
                            isLoading={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
                            icon="save"
                        >
                            Save All Changes
                        </AnimatedButton>
                    </div>

                </div>

                {/* Right Column - Stats, Password & Subscriptions */}
                <div className="space-y-6">
                    {/* Subscription Status */}
                    <AnimatedCard variant="gradient" className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-none">
                        <h3 className="text-indigo-100 text-sm font-medium mb-1">Current Plan</h3>
                        
                        {student.subscriptions && student.subscriptions.length > 0 ? (
                            <div>
                                <div className="text-2xl font-bold mb-1">
                                    {student.subscriptions[0].plan.name}
                                </div>
                                <div className="text-indigo-100 text-sm mb-4">
                                    Ends {mounted ? new Date(student.subscriptions[0].endDate).toLocaleDateString() : ''}
                                </div>
                                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span>Status</span>
                                        <span className="font-bold text-green-300 uppercase text-xs tracking-wider">Active</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Branch</span>
                                        <span className="font-medium">{student.subscriptions[0].branch.name}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-lg font-medium mb-2">No Active Plan</p>
                                <AnimatedButton 
                                    variant="secondary" 
                                    size="sm" 
                                    className="bg-white text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => router.push('/student/my-plan')}
                                >
                                    Browse Plans
                                </AnimatedButton>
                            </div>
                        )}
                    </AnimatedCard>

                    {/* Attendance Stats */}
                    <AnimatedCard>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-500" />
                            Attendance Overview
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.monthAttendance}
                                </div>
                                <div className="text-xs text-gray-500">This Month</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl text-center">
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stats.totalAttendance || 0}
                                </div>
                                <div className="text-xs text-gray-500">Total Visits</div>
                            </div>
                        </div>
                    </AnimatedCard>

                    {/* Security Card (Password Only) */}
                    <AnimatedCard className="overflow-hidden">
                        <div className="border-b border-gray-100 dark:border-gray-800 pb-4 mb-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Lock className="w-5 h-5 text-purple-500" />
                                Change Password
                            </h2>
                        </div>
                        
                        {/* We use a separate form here to avoid submitting the main form */}
                        <div className="space-y-4">
                            <FormInput
                                type="password"
                                icon={Lock}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="focus:ring-purple-500"
                                placeholder="Current Password"
                            />
                            <div className="space-y-4">
                                <FormInput
                                    type="password"
                                    icon={Lock}
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    className="focus:ring-purple-500"
                                    placeholder="New Password"
                                />
                                <FormInput
                                    type="password"
                                    icon={Lock}
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    className="focus:ring-purple-500"
                                    placeholder="Confirm New Password"
                                />
                            </div>
                            
                            <div className="flex justify-end pt-2">
                                <AnimatedButton 
                                    onClick={handleChangePassword}
                                    isLoading={loading}
                                    variant="outline"
                                    className="border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 w-full"
                                >
                                    Update Password
                                </AnimatedButton>
                            </div>
                        </div>
                    </AnimatedCard>
                </div>
            </form>
        </div>
    )
}