'use client'

import React, { useState, useEffect } from 'react'
import { 
  User, Mail, Phone, MapPin, 
  Shield, Key, Camera, Loader2, Save,
  Building2, Globe, Linkedin, Twitter
} from 'lucide-react'
import { FormInput } from '@/components/ui/FormInput'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { 
    getOwnerProfile, 
    updateOwnerProfile, 
    updateOwnerImage, 
    changeOwnerPassword,
    updateLibraryDetails,
    updateLibraryLogo
} from '@/actions/owner'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

// Helper to parse address string into components
const parseAddress = (fullAddress: string) => {
  let address = fullAddress || ''
  let pincode = ''
  let area = ''
  let city = ''
  let state = ''
  let streetAddress = ''

  const pincodeMatch = address.match(/-\s*(\d{6})$/)
  if (pincodeMatch) {
    pincode = pincodeMatch[1]
    const addressWithoutPincode = address.substring(0, pincodeMatch.index).trim()
    const parts = addressWithoutPincode.split(',').map(p => p.trim())
    if (parts.length >= 3) {
       state = parts[parts.length - 1]
       city = parts[parts.length - 2]
       area = parts[parts.length - 3]
       streetAddress = parts.slice(0, parts.length - 3).join(', ')
    } else {
       streetAddress = addressWithoutPincode
    }
  } else {
    streetAddress = address
  }
  return { streetAddress, pincode, area, city, state }
}

export default function OwnerProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [owner, setOwner] = useState<any | null>(null)
  
  // Forms state
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    streetAddress: '',
    pincode: '',
    city: '',
    state: '',
    area: '',
    bio: '',
    socialLinks: {
        linkedin: '',
        twitter: '',
        website: ''
    }
  })

  const [ownerAreaOptions, setOwnerAreaOptions] = useState<string[]>([])
  const [ownerPincodeLoading, setOwnerPincodeLoading] = useState(false)

  const [libraryForm, setLibraryForm] = useState({
    name: '',
    website: '',
    contactEmail: '',
    contactPhone: '',
    streetAddress: '',
    pincode: '',
    city: '',
    state: '',
    area: ''
  })

  const [libraryAreaOptions, setLibraryAreaOptions] = useState<string[]>([])
  const [libraryPincodeLoading, setLibraryPincodeLoading] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  // Owner Pincode Effect
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      if (profileForm.pincode.length === 6 && /^\d+$/.test(profileForm.pincode)) {
        setOwnerPincodeLoading(true)
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${profileForm.pincode}`)
          const data = await response.json()
          
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffices = data[0].PostOffice
            const areas = postOffices.map((po: any) => po.Name)
            const city = postOffices[0].District
            const state = postOffices[0].State
            
            setOwnerAreaOptions(areas)
            setProfileForm(prev => ({
              ...prev,
              city,
              state,
              area: areas.length === 1 ? areas[0] : (areas.includes(prev.area) ? prev.area : '')
            }))
            
            if (areas.length > 1 && !areas.includes(profileForm.area)) {
                toast.success('Please select your area')
            }
          } else {
            if (document.activeElement?.getAttribute('name') === 'owner_pincode') {
                toast.error('Invalid Pincode')
                setOwnerAreaOptions([])
            }
          }
        } catch (error) {
          console.error('Error fetching pincode details:', error)
        } finally {
            setOwnerPincodeLoading(false)
        }
      }
    }

    const timer = setTimeout(fetchPincodeDetails, 500)
    return () => clearTimeout(timer)
  }, [profileForm.pincode])

  // Library Pincode Effect
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      if (libraryForm.pincode.length === 6 && /^\d+$/.test(libraryForm.pincode)) {
        setLibraryPincodeLoading(true)
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${libraryForm.pincode}`)
          const data = await response.json()
          
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffices = data[0].PostOffice
            const areas = postOffices.map((po: any) => po.Name)
            const city = postOffices[0].District
            const state = postOffices[0].State
            
            setLibraryAreaOptions(areas)
            setLibraryForm(prev => ({
              ...prev,
              city,
              state,
              area: areas.length === 1 ? areas[0] : (areas.includes(prev.area) ? prev.area : '')
            }))

            if (areas.length > 1 && !areas.includes(libraryForm.area)) {
                toast.success('Please select your area')
            }
          } else {
             if (document.activeElement?.getAttribute('name') === 'library_pincode') {
                toast.error('Invalid Pincode')
                setLibraryAreaOptions([])
             }
          }
        } catch (error) {
          console.error('Error fetching pincode details:', error)
        } finally {
            setLibraryPincodeLoading(false)
        }
      }
    }

    const timer = setTimeout(fetchPincodeDetails, 500)
    return () => clearTimeout(timer)
  }, [libraryForm.pincode])


  const loadProfile = async () => {
    try {
      const data = await getOwnerProfile()
      if (data) {
        setOwner(data)
        const socialLinks = (data.socialLinks as any) || {}
        
        const ownerAddressParts = parseAddress(data.address || '')

        setProfileForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          username: data.username || '',
          streetAddress: ownerAddressParts.streetAddress,
          pincode: ownerAddressParts.pincode,
          city: ownerAddressParts.city,
          state: ownerAddressParts.state,
          area: ownerAddressParts.area,
          bio: data.bio || '',
          socialLinks: {
              linkedin: socialLinks.linkedin || '',
              twitter: socialLinks.twitter || '',
              website: socialLinks.website || ''
          }
        })
        
        if (ownerAddressParts.pincode) {
            // Optimistically populate options if pincode exists? 
            // The useEffect will trigger and fetch it.
        }

        if (data.library) {
            const libAddressParts = parseAddress(data.library.address || '')
            setLibraryForm({
                name: data.library.name || '',
                website: data.library.website || '',
                contactEmail: data.library.contactEmail || '',
                contactPhone: data.library.contactPhone || '',
                streetAddress: libAddressParts.streetAddress,
                pincode: libAddressParts.pincode,
                city: libAddressParts.city,
                state: libAddressParts.state,
                area: libAddressParts.area
            })
        }
      }
    } catch (error) {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    // Construct full address
    const fullAddress = `${profileForm.streetAddress}, ${profileForm.area}, ${profileForm.city}, ${profileForm.state} - ${profileForm.pincode}`

    if (profileForm.phone && profileForm.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number')
      setSaving(false)
      return
    }

    const formData = new FormData()
    formData.append('id', owner.id)
    formData.append('name', profileForm.name)
    formData.append('email', profileForm.email)
    formData.append('phone', profileForm.phone)
    formData.append('username', profileForm.username)
    formData.append('address', fullAddress)
    formData.append('bio', profileForm.bio)
    formData.append('socialLinks', JSON.stringify(profileForm.socialLinks))

    const result = await updateOwnerProfile(formData)
    if (result.success) {
      toast.success('Profile updated successfully')
      loadProfile()
    } else {
      toast.error(result.error || 'Failed to update profile')
    }
    setSaving(false)
  }

  const handleLibraryUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Construct full address
    const fullAddress = `${libraryForm.streetAddress}, ${libraryForm.area}, ${libraryForm.city}, ${libraryForm.state} - ${libraryForm.pincode}`

    const formData = new FormData()
    formData.append('id', owner.library.id)
    formData.append('name', libraryForm.name)
    formData.append('website', libraryForm.website)
    formData.append('contactEmail', libraryForm.contactEmail)
    formData.append('contactPhone', libraryForm.contactPhone)
    formData.append('address', fullAddress)

    const result = await updateLibraryDetails(formData)
    if (result.success) {
        toast.success('Library details updated')
        loadProfile()
    } else {
        toast.error(result.error || 'Failed to update library')
    }
    setSaving(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    setSaving(true)
    const formData = new FormData()
    formData.append('id', owner.id)
    formData.append('currentPassword', passwordForm.currentPassword)
    formData.append('newPassword', passwordForm.newPassword)

    const result = await changeOwnerPassword(formData)
    if (result.success) {
      toast.success('Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } else {
      toast.error(result.error || 'Failed to change password')
    }
    setSaving(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('id', owner.id)
    formData.append('image', file)

    const loadingToast = toast.loading('Uploading image...')
    const result = await updateOwnerImage(formData)
    
    toast.dismiss(loadingToast)
    if (result.success) {
      toast.success('Profile picture updated')
      loadProfile()
    } else {
      toast.error(result.error || 'Failed to upload image')
    }
  }

  const handleLibraryLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('id', owner.library.id)
    formData.append('logo', file)

    const loadingToast = toast.loading('Uploading logo...')
    const result = await updateLibraryLogo(formData)

    toast.dismiss(loadingToast)
    if (result.success) {
        toast.success('Library logo updated')
        loadProfile()
    } else {
        toast.error(result.error || 'Failed to upload logo')
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
      <div className="text-center py-10">
        <p className="text-gray-500">Owner profile not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile & Settings</h1>
      </div>

      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-purple-100 dark:bg-purple-900/20 border-4 border-white dark:border-gray-800 shadow-lg relative">
              {owner.image ? (
                <Image 
                  src={owner.image} 
                  alt={owner.name} 
                  fill 
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-600 dark:text-purple-400 text-2xl font-bold">
                  {owner.name.charAt(0)}
                </div>
              )}
            </div>
            <label className="absolute bottom-0 right-0 p-1.5 bg-purple-600 text-white rounded-full cursor-pointer shadow-lg hover:bg-purple-700 transition-colors">
              <Camera className="w-4 h-4" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{owner.name}</h2>
            <p className="text-gray-500 dark:text-gray-400">{owner.library?.name || 'Library Owner'}</p>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" /> {owner.email}
              </span>
              {owner.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {owner.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('personal')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'personal' 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal Details
          </div>
          {activeTab === 'personal' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'library' 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Library Details
          </div>
          {activeTab === 'library' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
            activeTab === 'security' 
              ? 'text-purple-600 dark:text-purple-400' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </div>
          {activeTab === 'security' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 dark:bg-purple-400 rounded-t-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
        {activeTab === 'personal' && (
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="Full Name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                icon={User}
                placeholder="Enter your full name"
                required
              />
              <FormInput
                label="Email Address"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                icon={Mail}
                type="email"
                placeholder="Enter your email"
                required
              />
              <FormInput
                label="Phone Number"
                value={profileForm.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setProfileForm({ ...profileForm, phone: value })
                }}
                icon={Phone}
                type="tel"
                placeholder="10-digit phone number"
              />
              <FormInput
                label="Username"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                icon={User}
                placeholder="Choose a username"
              />
              
              {/* Owner Address Auto-fill */}
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-purple-600" />
                        Address Details
                    </h3>
                </div>

                <div className="md:col-span-2">
                    <FormInput
                        label="Street Address"
                        value={profileForm.streetAddress}
                        onChange={(e) => setProfileForm({ ...profileForm, streetAddress: e.target.value })}
                        placeholder="House/Flat No., Building Name, Street"
                    />
                </div>

                <div>
                    <FormInput
                        name="owner_pincode"
                        label="Pincode"
                        value={profileForm.pincode}
                        onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                            setProfileForm({ ...profileForm, pincode: val })
                        }}
                        placeholder="Enter 6-digit Pincode"
                        maxLength={6}
                    />
                    {ownerPincodeLoading && <p className="text-xs text-purple-600 mt-1">Fetching details...</p>}
                </div>

                <div>
                    {ownerAreaOptions.length > 1 ? (
                        <FormSelect
                            label="Area"
                            value={profileForm.area}
                            onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                            options={ownerAreaOptions.map(opt => ({ label: opt, value: opt }))}
                            placeholder="Select Area"
                        />
                    ) : (
                        <FormInput
                            label="Area"
                            value={profileForm.area}
                            onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                            placeholder="Area"
                        />
                    )}
                </div>

                <div>
                    <FormInput
                        label="City"
                        value={profileForm.city}
                        readOnly
                        className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    />
                </div>

                <div>
                    <FormInput
                        label="State"
                        value={profileForm.state}
                        readOnly
                        className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                    />
                </div>
              </div>

              <div className="md:col-span-2">
                <FormTextarea
                  label="Bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  rows={4}
                />
              </div>
              
              <div className="md:col-span-2 border-t border-gray-100 dark:border-gray-700 pt-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput
                        label="LinkedIn"
                        value={profileForm.socialLinks.linkedin}
                        onChange={(e) => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, linkedin: e.target.value } })}
                        icon={Linkedin}
                        placeholder="LinkedIn Profile URL"
                    />
                    <FormInput
                        label="Twitter"
                        value={profileForm.socialLinks.twitter}
                        onChange={(e) => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, twitter: e.target.value } })}
                        icon={Twitter}
                        placeholder="Twitter Profile URL"
                    />
                    <FormInput
                        label="Website"
                        value={profileForm.socialLinks.website}
                        onChange={(e) => setProfileForm({ ...profileForm, socialLinks: { ...profileForm.socialLinks, website: e.target.value } })}
                        icon={Globe}
                        placeholder="Personal Website URL"
                    />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <AnimatedButton
                type="submit"
                isLoading={saving}
                variant="primary"
              >
                Save Changes
                <Save className="w-4 h-4 ml-2" />
              </AnimatedButton>
            </div>
          </form>
        )}

        {activeTab === 'library' && (
            <form onSubmit={handleLibraryUpdate} className="space-y-6">
                <div className="flex items-center gap-6 mb-8">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm relative">
                            {owner.library?.logo ? (
                                <Image 
                                    src={owner.library.logo} 
                                    alt={owner.library.name} 
                                    fill 
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Building2 className="w-8 h-8" />
                                </div>
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 rounded-full cursor-pointer shadow-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                            <Camera className="w-4 h-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={handleLibraryLogoUpload} />
                        </label>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Library Logo</h3>
                        <p className="text-sm text-gray-500">Upload your library's official logo</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                        label="Library Name"
                        value={libraryForm.name}
                        onChange={(e) => setLibraryForm({ ...libraryForm, name: e.target.value })}
                        icon={Building2}
                        placeholder="Enter library name"
                        required
                    />
                    <FormInput
                        label="Website"
                        value={libraryForm.website}
                        onChange={(e) => setLibraryForm({ ...libraryForm, website: e.target.value })}
                        icon={Globe}
                        placeholder="Library website URL"
                    />
                    <FormInput
                        label="Contact Email"
                        value={libraryForm.contactEmail}
                        onChange={(e) => setLibraryForm({ ...libraryForm, contactEmail: e.target.value })}
                        icon={Mail}
                        type="email"
                        placeholder="Public contact email"
                    />
                    <FormInput
                        label="Contact Phone"
                        value={libraryForm.contactPhone}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                            setLibraryForm({ ...libraryForm, contactPhone: value })
                        }}
                        icon={Phone}
                        type="tel"
                        placeholder="10-digit public contact phone"
                    />
                    
                    {/* Library Address Auto-fill */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                        <div className="md:col-span-2">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-purple-600" />
                                Library Address
                            </h3>
                        </div>

                        <div className="md:col-span-2">
                            <FormInput
                                label="Street Address"
                                value={libraryForm.streetAddress}
                                onChange={(e) => setLibraryForm({ ...libraryForm, streetAddress: e.target.value })}
                                placeholder="House/Flat No., Building Name, Street"
                            />
                        </div>

                        <div>
                            <FormInput
                                name="library_pincode"
                                label="Pincode"
                                value={libraryForm.pincode}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                                    setLibraryForm({ ...libraryForm, pincode: val })
                                }}
                                placeholder="Enter 6-digit Pincode"
                                maxLength={6}
                            />
                            {libraryPincodeLoading && <p className="text-xs text-purple-600 mt-1">Fetching details...</p>}
                        </div>

                        <div>
                            {libraryAreaOptions.length > 1 ? (
                                <FormSelect
                                    label="Area"
                                    value={libraryForm.area}
                                    onChange={(e) => setLibraryForm({ ...libraryForm, area: e.target.value })}
                                    options={libraryAreaOptions.map(opt => ({ label: opt, value: opt }))}
                                    placeholder="Select Area"
                                />
                            ) : (
                                <FormInput
                                    label="Area"
                                    value={libraryForm.area}
                                    onChange={(e) => setLibraryForm({ ...libraryForm, area: e.target.value })}
                                    placeholder="Area"
                                />
                            )}
                        </div>

                        <div>
                            <FormInput
                                label="City"
                                value={libraryForm.city}
                                readOnly
                                className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <FormInput
                                label="State"
                                value={libraryForm.state}
                                readOnly
                                className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end">
                    <AnimatedButton
                        type="submit"
                        isLoading={saving}
                        variant="primary"
                    >
                        Save Library Details
                        <Save className="w-4 h-4 ml-2" />
                    </AnimatedButton>
                </div>
            </form>
        )}

        {activeTab === 'security' && (
          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-lg">
            <FormInput
              label="Current Password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              icon={Key}
              type="password"
              placeholder="Enter current password"
              required
            />
            <FormInput
              label="New Password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              icon={Key}
              type="password"
              placeholder="Enter new password"
              required
            />
            <FormInput
              label="Confirm New Password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              icon={Key}
              type="password"
              placeholder="Confirm new password"
              required
            />

            <div className="flex justify-end">
              <AnimatedButton
                type="submit"
                isLoading={saving}
                variant="primary"
              >
                Update Password
                <Save className="w-4 h-4 ml-2" />
              </AnimatedButton>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
