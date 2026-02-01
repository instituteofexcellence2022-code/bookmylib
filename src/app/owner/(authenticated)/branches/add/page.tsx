'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Users, 
  Wifi,
  Coffee,
  Car,
  Wind,
  Zap,
  Printer,
  Shield,
  Armchair,
  Clock,
  User,
  Globe,
  Image as ImageIcon,
  FileText,
  Layout,
  Fan,
  Droplets,
  Thermometer,
  Utensils,
  Plug,
  Lamp,
  Bath,
  Loader2,
  Trash2,
  Lock,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Book
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { LibraryRulesInput } from '@/components/owner/LibraryRulesInput'

import { createBranch } from '@/actions/branch'
import toast from 'react-hot-toast'

interface PostOffice {
  Name: string
  Description: string | null
  BranchType: string
  DeliveryStatus: string
  Circle: string
  District: string
  Division: string
  Region: string
  Block: string
  State: string
  Country: string
  Pincode: string
}

export default function AddBranchPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingPincode, setIsFetchingPincode] = useState(false)
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  
  const initialFormData = {
    name: '',
    managerName: '',
    email: '',
    phone: '',
    street: '',
    area: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
    mapsLink: '',
    totalSeats: '',
    privateCabins: '',
    discussionRooms: '',
    description: '',
    status: 'coming_soon',
    amenities: [] as string[],
    openingTime: '09:00',
    closingTime: '21:00',
    is247: false,
    staffAvailableStart: '09:00',
    staffAvailableEnd: '21:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    images: [] as string[],
    imageFiles: [] as File[],
    wifiCredentials: [{ ssid: '', password: '' }],
    libraryRules: [] as string[]
  }

  const [formData, setFormData] = useState(initialFormData)

  const handleCancel = () => {
    const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData)
    if (isDirty) {
      if (confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        router.push('/owner/branches')
      }
    } else {
      router.push('/owner/branches')
    }
  }

  const amenities = [
    { id: 'wifi', label: 'Free WiFi', icon: Wifi },
    { id: 'ac', label: 'Fully AC', icon: Wind },
    { id: 'coffee', label: 'Coffee', icon: Coffee },
    { id: 'parking', label: 'Parking', icon: Car },
    { id: 'power', label: 'Power Backup', icon: Zap },
    { id: 'printer', label: 'Printer', icon: Printer },
    { id: 'cctv', label: 'CCTV', icon: Shield },
    { id: 'lounge', label: 'Lounge', icon: Armchair },
    { id: 'air_purifier', label: 'Air Purifier', icon: Fan },
    { id: 'water_purifier', label: 'RO Water', icon: Droplets },
    { id: 'hot_water', label: 'Hot/Cold Water', icon: Thermometer },
    { id: 'lunch', label: 'Lunch Area', icon: Utensils },
    { id: 'charging', label: 'Charging', icon: Plug },
    { id: 'desk_lights', label: 'Desk Light', icon: Lamp },
    { id: 'washrooms', label: 'Sep. Washroom', icon: Bath },
    { id: 'locker', label: 'Locker', icon: Lock },
    { id: 'newspaper', label: 'Newspaper', icon: BookOpen },
    { id: 'magazine', label: 'Magazine', icon: Book },
    { id: 'security', label: 'Security', icon: ShieldCheck }
  ]

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const toggleWorkingDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }))
  }

  const toggleAmenity = (id: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id)
        ? prev.amenities.filter(a => a !== id)
        : [...prev.amenities, id]
    }))
  }

  const handleWifiChange = (index: number, field: 'ssid' | 'password', value: string) => {
    setFormData(prev => {
      const newWifi = prev.wifiCredentials.map((item, i) => {
        if (i === index) {
          return { ...item, [field]: value }
        }
        return item
      })
      return { ...prev, wifiCredentials: newWifi }
    })
  }

  const addWifiCredential = () => {
    setFormData(prev => ({
      ...prev,
      wifiCredentials: [...prev.wifiCredentials, { ssid: '', password: '' }]
    }))
  }

  const removeWifiCredential = (index: number) => {
    if (formData.wifiCredentials.length === 1) {
      // If only one entry, just clear it instead of removing
      const newWifi = [...formData.wifiCredentials]
      newWifi[0] = { ssid: '', password: '' }
      setFormData(prev => ({ ...prev, wifiCredentials: newWifi }))
      return
    }
    const newWifi = formData.wifiCredentials.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, wifiCredentials: newWifi }))
  }

  const fetchPincodeDetails = async (pincode: string) => {
    if (pincode.length !== 6) return

    setIsFetchingPincode(true)
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()

      if (data && data[0] && data[0].Status === 'Success') {
        const postOffices = data[0].PostOffice
        const areas = postOffices.map((po: PostOffice) => po.Name)
        const details = postOffices[0]

        setAvailableAreas(areas)
        
        setFormData(prev => {
          // Smart cleanup: Remove City, State, and potential Area from existing Street Address
          // to prevent duplication and "break address into parts"
          let cleanStreet = prev.street;
          
          // Parts to remove (City, State, and all potential areas for this pincode)
          const partsToRemove = [
            details.District, 
            details.State, 
            ...areas
          ].filter(Boolean);

          // Remove each part case-insensitively
          partsToRemove.forEach(part => {
            if (!part) return;
            const regex = new RegExp(`\\b${part}\\b`, 'gi');
            cleanStreet = cleanStreet.replace(regex, '');
          });

          // Cleanup commas and spaces
          cleanStreet = cleanStreet
            .replace(/,\s*,/g, ',') // Remove double commas
            .replace(/^[\s,]+|[\s,]+$/g, '') // Trim leading/trailing commas/spaces
            .trim();

          return {
            ...prev,
            street: cleanStreet,
            district: details.District,
            city: details.District, // Often District corresponds well to City
            state: details.State,
            area: areas.length === 1 ? areas[0] : ''
          }
        })
      } else {
        setAvailableAreas([])
      }
    } catch (error) {
      console.error('Error fetching pincode details:', error)
      setAvailableAreas([])
    } finally {
      setIsFetchingPincode(false)
    }
  }

  const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setFormData(prev => ({ ...prev, zipCode: value }))
    
    if (value.length === 6) {
      fetchPincodeDetails(value)
    } else {
      setAvailableAreas([])
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  const MAX_FILES = 5

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    if (formData.images.length + files.length > MAX_FILES) {
      alert(`You can only upload up to ${MAX_FILES} images`)
      return
    }

    const newImageFiles: File[] = []
    const newImagePreviews: string[] = []

    Array.from(files).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large. Max size is 5MB`)
        return
      }

      newImageFiles.push(file)
      newImagePreviews.push(URL.createObjectURL(file))
    })

    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...newImagePreviews],
      imageFiles: [...prev.imageFiles, ...newImageFiles]
    }))
    
    // Reset input to allow selecting the same file again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index)
      const newImageFiles = prev.imageFiles.filter((_, i) => i !== index)
      return {
        ...prev,
        images: newImages,
        imageFiles: newImageFiles
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      
      // Send raw street address as 'address' since we have separate fields for area, city, etc.
      formDataToSend.append('address', formData.street)
      formDataToSend.append('city', formData.city)
      formDataToSend.append('district', formData.district)
      formDataToSend.append('state', formData.state)
      formDataToSend.append('pincode', formData.zipCode)
      formDataToSend.append('contactPhone', formData.phone)
      
      // New fields to save
      formDataToSend.append('contactEmail', formData.email)
      formDataToSend.append('managerName', formData.managerName)
      formDataToSend.append('seatCount', formData.totalSeats)
      formDataToSend.append('area', formData.area)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('mapsLink', formData.mapsLink)
      
      // Append image files
      formData.imageFiles.forEach(file => {
        formDataToSend.append('imageFiles', file)
      })

      formDataToSend.append('wifiDetails', JSON.stringify(formData.wifiCredentials))

      formDataToSend.append('amenities', JSON.stringify(formData.amenities))
      
      const operatingHours = {
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        is247: formData.is247,
        staffAvailableStart: formData.staffAvailableStart,
        staffAvailableEnd: formData.staffAvailableEnd,
        workingDays: formData.workingDays
      }
      formDataToSend.append('operatingHours', JSON.stringify(operatingHours))
      formDataToSend.append('status', formData.status === 'active' ? 'active' : 'inactive')
      formDataToSend.append('libraryRules', JSON.stringify(formData.libraryRules))
      
      const result = await createBranch(formDataToSend)
      
      if (result.success) {
        toast.success('Branch created successfully')
        router.push('/owner/branches')
      } else {
        toast.error(result.error || 'Failed to create branch')
      }
    } catch (error) {
      console.error('Error creating branch:', error)
      toast.error('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Branch</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Create a new library location</p>
        </div>
        <AnimatedButton 
          variant="ghost" 
          size="sm" 
          onClick={handleCancel}
          icon="arrowLeft"
        >
          Back
        </AnimatedButton>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompactCard>
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Basic Information
              </h2>
              
              <div className="space-y-4">
                <FormInput
                  label="Branch Name"
                  icon={Building2}
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. City Center Hub"
                />

                <FormInput
                  label="Manager Name"
                  icon={User}
                  required
                  value={formData.managerName}
                  onChange={e => setFormData({...formData, managerName: e.target.value})}
                  placeholder="e.g. Rahul Sharma"
                />

                <FormInput
                  label="Total Seats"
                  icon={Users}
                  type="number"
                  required
                  min="1"
                  value={formData.totalSeats}
                  onChange={e => setFormData({...formData, totalSeats: e.target.value})}
                  placeholder="e.g. 100"
                />
              </div>
            </div>
          </CompactCard>

          <CompactCard>
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Location Details
              </h2>
              
              <div className="space-y-4">
                <FormInput
                  label="Street Address"
                  required
                  value={formData.street}
                  onChange={e => setFormData({...formData, street: e.target.value})}
                  placeholder="Floor, Building, Street"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <FormInput
                      label="Zip Code"
                      required
                      value={formData.zipCode}
                      onChange={handlePincodeChange}
                      placeholder="Pincode"
                    />
                    {isFetchingPincode && (
                      <div className="absolute right-3 top-[34px] -translate-y-1/2">
                        <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  
                  {availableAreas.length > 0 ? (
                    <FormSelect
                      label="Area"
                      required
                      value={formData.area}
                      onChange={e => setFormData({...formData, area: e.target.value})}
                      options={availableAreas.map(area => ({ label: area, value: area }))}
                      placeholder="Select Area"
                    />
                  ) : (
                    <FormInput
                      label="Area"
                      required
                      value={formData.area}
                      onChange={e => setFormData({...formData, area: e.target.value})}
                      placeholder="Area"
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="District"
                    required
                    value={formData.district}
                    onChange={e => setFormData({...formData, district: e.target.value})}
                    placeholder="District"
                  />
                  <FormInput
                    label="City"
                    required
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="City"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormInput
                    label="State"
                    required
                    value={formData.state}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    placeholder="State"
                  />
                  <FormInput
                    label="Google Maps Link"
                    icon={Globe}
                    type="url"
                    value={formData.mapsLink}
                    onChange={e => setFormData({...formData, mapsLink: e.target.value})}
                    placeholder="https://maps.google..."
                  />
                </div>
              </div>
            </div>
          </CompactCard>
        </div>

        <CompactCard>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Contact Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Email Address"
                icon={Mail}
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="branch@library.com"
              />

              <FormInput
                label="Phone Number"
                icon={Phone}
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>
        </CompactCard>

        <CompactCard>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Additional Details
            </h2>
            
            <div className="space-y-4">
              <FormTextarea
                label="Branch Description"
                rows={3}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Describe the branch facilities, environment, etc..."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Private Cabins"
                  icon={Layout}
                  type="number"
                  min="0"
                  value={formData.privateCabins}
                  onChange={e => setFormData({...formData, privateCabins: e.target.value})}
                  placeholder="0"
                />
                <FormInput
                  label="Discussion Rooms"
                  icon={Users}
                  type="number"
                  min="0"
                  value={formData.discussionRooms}
                  onChange={e => setFormData({...formData, discussionRooms: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </CompactCard>

        <CompactCard>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Operating Hours
              </h2>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Open 24/7</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, is247: !prev.is247 }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                    formData.is247 ? 'bg-purple-600 shadow-inner' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${
                      formData.is247 ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className={`grid grid-cols-2 gap-4 transition-opacity duration-200 ${formData.is247 ? 'opacity-50 pointer-events-none' : ''}`}>
                  <FormInput
                    label="Opening Time"
                    type="time"
                    value={formData.openingTime}
                    onChange={e => setFormData({...formData, openingTime: e.target.value})}
                    disabled={formData.is247}
                  />
                  <FormInput
                    label="Closing Time"
                    type="time"
                    value={formData.closingTime}
                    onChange={e => setFormData({...formData, closingTime: e.target.value})}
                    disabled={formData.is247}
                  />
                </div>
                {formData.is247 && (
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Branch will be marked as Open 24 Hours
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <FormInput
                    label="Staff Available From"
                    type="time"
                    value={formData.staffAvailableStart}
                    onChange={e => setFormData({...formData, staffAvailableStart: e.target.value})}
                  />
                  <FormInput
                    label="Staff Available Until"
                    type="time"
                    value={formData.staffAvailableEnd}
                    onChange={e => setFormData({...formData, staffAvailableEnd: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Working Days</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({...prev, workingDays: weekDays}))}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      All
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({...prev, workingDays: []}))}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-3">
                  {weekDays.map((day) => {
                    const isSelected = formData.workingDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={`
                          w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all duration-300
                          ${isSelected 
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 dark:shadow-purple-900/20 scale-110' 
                            : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400'
                          }
                        `}
                      >
                        {day.slice(0, 1)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </CompactCard>

        <CompactCard>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Branch Images
            </h2>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-8 text-center hover:border-purple-500 dark:hover:border-purple-500 transition-colors cursor-pointer bg-gray-50/50 dark:bg-gray-800/50"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleImageUpload}
              />
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Click to upload images
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    SVG, PNG, JPG or GIF (max. 800x400px)
                  </p>
                </div>
              </div>
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {formData.images.map((img, index) => (
                <div key={index} className="relative aspect-video rounded-lg overflow-hidden group border border-gray-200 dark:border-gray-700">
                  <Image 
                    src={img} 
                    alt={`Branch ${index + 1}`} 
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-black/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm backdrop-blur-sm transform hover:scale-110"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CompactCard>

        <CompactCard>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Network Details
            </h2>
            
            <div className="space-y-4">
              {formData.wifiCredentials.map((wifi, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                    <FormInput
                      label="WiFi Name (SSID)"
                      icon={Wifi}
                      value={wifi.ssid}
                      onChange={e => handleWifiChange(index, 'ssid', e.target.value)}
                      placeholder="Network Name"
                    />

                    <FormInput
                      label="Password"
                      icon={Lock}
                      value={wifi.password}
                      onChange={e => handleWifiChange(index, 'password', e.target.value)}
                      placeholder="Network Password"
                    />
                  </div>
                <AnimatedButton
                  type="button"
                  onClick={() => removeWifiCredential(index)}
                  variant="ghost"
                  compact
                  className="mt-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </AnimatedButton>
              </div>
            ))}
            
            <AnimatedButton
              type="button"
              onClick={addWifiCredential}
              variant="ghost"
              compact
              className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              icon="add"
            >
              Add Another Network
            </AnimatedButton>
          </div>
        </div>
        </CompactCard>

        <CompactCard>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Amenities & Status
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {amenities.map((amenity) => {
                  const isSelected = formData.amenities.includes(amenity.id)
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => toggleAmenity(amenity.id)}
                      className={`
                        relative group flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200
                        ${isSelected 
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 shadow-sm scale-[1.02]' 
                          : 'border-transparent bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-[1.02]'
                        }
                      `}
                    >
                      <div className={`
                        p-2.5 rounded-full mb-2 transition-colors duration-200
                        ${isSelected ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'}
                      `}>
                        <amenity.icon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">
                        {amenity.label}
                      </span>
                      
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-600 animate-in fade-in zoom-in" />
                      )}
                    </button>
                  )
                })}
              </div>

              {formData.amenities.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 animate-in fade-in slide-in-from-top-2">
                  {amenities
                    .filter(a => formData.amenities.includes(a.id))
                    .map(amenity => (
                      <div 
                        key={amenity.id}
                        className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800 flex items-center gap-1.5"
                      >
                        <amenity.icon className="w-3.5 h-3.5" />
                        {amenity.label}
                      </div>
                    ))}
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">Initial Status</label>
                <div className="flex gap-4">
                  <label className={`
                    flex-1 flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                    ${formData.status === 'active' 
                      ? 'bg-purple-50 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' 
                      : 'bg-gray-50 border border-transparent hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                    }
                  `}>
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.status === 'active' ? 'border-purple-600 bg-purple-600' : 'border-gray-400'}`}>
                      {formData.status === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">Active</span>
                      <span className="block text-xs text-gray-500">Ready for students</span>
                    </div>
                  </label>
                  
                  <label className={`
                    flex-1 flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                    ${formData.status === 'coming_soon' 
                      ? 'bg-purple-50 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' 
                      : 'bg-gray-50 border border-transparent hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                    }
                  `}>
                    <input
                      type="radio"
                      name="status"
                      value="coming_soon"
                      checked={formData.status === 'coming_soon'}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData.status === 'coming_soon' ? 'border-purple-600 bg-purple-600' : 'border-gray-400'}`}>
                      {formData.status === 'coming_soon' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-gray-900 dark:text-white">Coming Soon</span>
                      <span className="block text-xs text-gray-500">Under construction</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CompactCard>

        <CompactCard>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Library Rules
            </h2>
            <div className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set the rules for students in this branch. You can choose from common rules or add your own.
              </p>
              <LibraryRulesInput
                value={formData.libraryRules}
                onChange={(rules) => setFormData({ ...formData, libraryRules: rules })}
              />
            </div>
          </div>
        </CompactCard>

        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <AnimatedButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleCancel}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            type="submit"
            variant="purple"
            size="lg"
            isLoading={isLoading}
            icon="save"
            className="min-w-[160px]"
          >
            Create Branch
          </AnimatedButton>
        </div>
      </form>
    </div>
  )
}
