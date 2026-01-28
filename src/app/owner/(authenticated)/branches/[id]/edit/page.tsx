'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  Sparkles
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormTextarea } from '@/components/ui/FormTextarea'

import { getBranchById, updateBranch, deleteBranch } from '@/actions/branch'
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

export default function EditBranchPage() {
  const router = useRouter()
  const params = useParams()
  const branchId = params?.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingPincode, setIsFetchingPincode] = useState(false)
  const [availableAreas, setAvailableAreas] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
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
    status: 'active',
    amenities: [] as string[],
    openingTime: '09:00',
    closingTime: '21:00',
    is247: false,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    images: [] as string[],
    wifiCredentials: [{ ssid: '', password: '' }]
  })

  useEffect(() => {
    // Helper to load areas AND details without resetting form data
    const loadPincodeDetails = async (pincode: string) => {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
        const data = await response.json()
        if (data && data[0] && data[0].Status === 'Success') {
          const postOffices = data[0].PostOffice
          const areas = postOffices.map((po: any) => po.Name)
          const details = postOffices[0]
          return { areas, details }
        }
      } catch (error) {
        console.error('Error loading areas:', error)
      }
      return null
    }

    const fetchBranch = async () => {
      if (!branchId) return
      
      try {
        const data = await getBranchById(branchId)
        if (data) {
          let fetchedDetails: any = null
          let fetchedAreas: string[] = []

          // Load available areas if pincode exists
          if (data.pincode && data.pincode.length === 6) {
            const result = await loadPincodeDetails(data.pincode)
            if (result) {
              fetchedAreas = result.areas
              fetchedDetails = result.details
              setAvailableAreas(fetchedAreas)
            }
          }

          const amenities = Array.isArray(data.amenities) ? data.amenities : []
          const operatingHours = data.operatingHours || {}
          
          setFormData(prev => {
            // Determine City and State: Use DB data if available, else fallback to Pincode data
            const effectiveCity = data.city || fetchedDetails?.District || ''
            const effectiveState = data.state || fetchedDetails?.State || ''
            
            // Populate street address with robust cleanup
            const cleanStreet = (() => {
               if (data.address.includes(',')) {
                 const parts = data.address.split(',').map(p => p.trim());
                 
                 // 1. Prepare exclusion list (Area, City, State, District)
                 const exclusions = [
                   data.area,
                   effectiveCity,
                   effectiveState,
                   fetchedDetails?.District,
                   // Also exclude all potential areas from this pincode to be safe
                   ...fetchedAreas
                 ].filter(Boolean).map(s => s!.toLowerCase());

                 // 2. Filter parts
                 let cleanParts = parts.filter(part => {
                   const p = part.toLowerCase();
                   // Exclude if it matches any known location field
                   if (exclusions.includes(p)) return false;
                   return p.length > 0;
                 });

                 // 3. Self-deduplicate remaining parts (crucial for "Palam, Palam" cases)
                 cleanParts = Array.from(new Set(cleanParts));

                 return cleanParts.join(', ');
               }
               return data.address;
            })();

            return {
              ...prev,
              name: data.name,
              phone: data.contactPhone || '',
              street: cleanStreet,
              city: effectiveCity,
              state: effectiveState,
              zipCode: data.pincode || '',
              status: data.isActive ? 'active' : 'maintenance',
              amenities: Array.isArray(amenities) ? amenities : [],
              openingTime: operatingHours.openingTime || '09:00',
              closingTime: operatingHours.closingTime || '21:00',
              is247: operatingHours.is247 || false,
              workingDays: operatingHours.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
              
              // Populate new fields
              email: data.contactEmail || '',
              managerName: data.managerName || '',
              totalSeats: data.seatCount ? data.seatCount.toString() : '',
              area: data.area || (fetchedAreas.length === 1 ? fetchedAreas[0] : ''),
              description: data.description || '',
              mapsLink: data.mapsLink || '',
              images: data.images ? JSON.parse(data.images) : [],
              wifiCredentials: data.wifiDetails ? JSON.parse(data.wifiDetails) : [{ ssid: '', password: '' }]
            }
          })
        } else {
          toast.error('Branch not found')
          router.push('/owner/branches')
        }
      } catch (error) {
        console.error('Failed to fetch branch', error)
        toast.error('Failed to load branch details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranch()
  }, [branchId, router])

  const handleCancel = () => {
    router.push('/owner/branches')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this branch? This action cannot be undone.')) return
    
    setIsDeleting(true)
    try {
      const result = await deleteBranch(branchId)
      if (result.success) {
        toast.success('Branch deleted successfully')
        router.push('/owner/branches')
      } else {
        toast.error(result.error || 'Failed to delete branch')
      }
    } catch (error) {
      console.error('Error deleting branch:', error)
      toast.error('Something went wrong')
    } finally {
      setIsDeleting(false)
    }
  }

  const amenities = [
    { id: 'wifi', label: 'High-speed WiFi', icon: Wifi },
    { id: 'ac', label: 'Air Conditioning', icon: Wind },
    { id: 'coffee', label: 'Coffee Station', icon: Coffee },
    { id: 'parking', label: 'Parking Space', icon: Car },
    { id: 'power', label: 'Power Backup', icon: Zap },
    { id: 'printer', label: 'Printing Stn', icon: Printer },
    { id: 'cctv', label: '24/7 CCTV', icon: Shield },
    { id: 'lounge', label: 'Discussion Area', icon: Armchair },
    { id: 'air_purifier', label: 'Air Purifier', icon: Fan },
    { id: 'water_purifier', label: 'Water Purifier', icon: Droplets },
    { id: 'hot_water', label: 'Hot & Cold Water', icon: Thermometer },
    { id: 'lunch', label: 'Lunch Area', icon: Utensils },
    { id: 'charging', label: 'Charging Points', icon: Plug },
    { id: 'desk_lights', label: 'Desk Lights', icon: Lamp },
    { id: 'washrooms', label: 'Sep. Washrooms', icon: Bath }
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

  const fetchPincodeDetails = async (pincode: string) => {
    if (pincode.length !== 6) return

    setIsFetchingPincode(true)
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
      const data = await response.json()

      if (data && data[0] && data[0].Status === 'Success') {
        const postOffices = data[0].PostOffice
        const areas = postOffices.map((po: any) => po.Name)
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
            city: details.District,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('id', branchId)
      formDataToSend.append('name', formData.name)
      
      // Send raw street address as 'address' since we have separate fields for area, city, etc.
      formDataToSend.append('address', formData.street)
      formDataToSend.append('city', formData.city)
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
      formDataToSend.append('images', JSON.stringify(formData.images))
      formDataToSend.append('wifiDetails', JSON.stringify(formData.wifiCredentials))

      formDataToSend.append('amenities', JSON.stringify(formData.amenities))
      
      const operatingHours = {
        openingTime: formData.openingTime,
        closingTime: formData.closingTime,
        is247: formData.is247,
        workingDays: formData.workingDays
      }
      formDataToSend.append('operatingHours', JSON.stringify(operatingHours))
      formDataToSend.append('status', formData.status === 'active' ? 'active' : 'inactive')

      const result = await updateBranch(formDataToSend)
      
      if (result.success) {
        toast.success('Branch updated successfully')
        router.push(`/owner/branches/${branchId}`)
      } else {
        toast.error(result.error || 'Failed to update branch')
      }
    } catch (error) {
      console.error('Error updating branch:', error)
      toast.error('Something went wrong')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Branch</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Update library location details</p>
        </div>
        <div className="flex gap-2">
          <AnimatedButton 
            variant="danger" 
            size="sm" 
            onClick={handleDelete}
            icon="delete"
            isLoading={isDeleting}
          >
            Delete
          </AnimatedButton>
          <AnimatedButton 
            variant="ghost" 
            size="sm" 
            onClick={handleCancel}
            icon="arrowLeft"
          >
            Back
          </AnimatedButton>
        </div>
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

                <FormSelect
                  label="Status"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  options={[
                    { label: 'Active', value: 'active' },
                    { label: 'Maintenance', value: 'maintenance' },
                    { label: 'Coming Soon', value: 'coming_soon' }
                  ]}
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
                  {weekDays.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWorkingDay(day)}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                        formData.workingDays.includes(day)
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-800'
                          : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {day.slice(0, 1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CompactCard>

        <CompactCard>
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wifi className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Amenities
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {amenities.map((amenity) => {
                const Icon = amenity.icon
                const isSelected = formData.amenities.includes(amenity.id)
                
                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => toggleAmenity(amenity.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800'
                        : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mb-2 ${
                      isSelected 
                        ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300' 
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`text-xs font-medium text-center ${
                      isSelected
                        ? 'text-purple-700 dark:text-purple-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {amenity.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </CompactCard>

        <div className="flex justify-end gap-4">
          <AnimatedButton 
            variant="secondary" 
            onClick={handleCancel}
            type="button"
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="primary" 
            type="submit"
            isLoading={isSaving}
          >
            Update Branch
          </AnimatedButton>
        </div>
      </form>
    </div>
  )
}
