'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, Phone, MapPin, Calendar, 
  Briefcase, Lock, Upload, FileText, ArrowLeft,
  X
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { createStaff } from '@/actions/staff'
import { getOwnerBranches } from '@/actions/branch'
import toast from 'react-hot-toast'

export default function AddStaffPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [areaOptions, setAreaOptions] = useState<string[]>([])
  const [branches, setBranches] = useState<{ label: string, value: string }[]>([])
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dob: '',
    gender: '',
    address: '', // Street Address
    pincode: '',
    city: '',
    state: '',
    area: '',
    role: '',
    branchId: '',
    joiningDate: '',
    salary: '',
    employmentType: 'full_time',
    username: '',
    password: '',
    confirmPassword: '',
    status: 'active'
  })

  const [files, setFiles] = useState<{ idProof: File | null, resume: File | null }>({
    idProof: null,
    resume: null
  })
  
  const idProofInputRef = useRef<HTMLInputElement>(null)
  const resumeInputRef = useRef<HTMLInputElement>(null)

  // Fetch address details from pincode
  useEffect(() => {
    const fetchPincodeDetails = async () => {
      if (formData.pincode.length === 6 && /^\d+$/.test(formData.pincode)) {
        setPincodeLoading(true)
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${formData.pincode}`)
          const data = await response.json()
          
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffices = data[0].PostOffice
            const areas = postOffices.map((po: { Name: string }) => po.Name)
            const city = postOffices[0].District
            const state = postOffices[0].State
            
            setAreaOptions(areas)
            setFormData(prev => ({
              ...prev,
              city,
              state,
              area: areas.length === 1 ? areas[0] : ''
            }))
            
            if (areas.length > 1) {
              toast.success('Select your area')
            }
          } else {
            toast.error('Invalid Pincode')
            setAreaOptions([])
          }
        } catch (error) {
          console.error('Error fetching pincode details:', error)
        } finally {
          setPincodeLoading(false)
        }
      } else if (formData.pincode.length < 6) {
        setAreaOptions([])
      }
    }

    const timer = setTimeout(fetchPincodeDetails, 500)
    return () => clearTimeout(timer)
  }, [formData.pincode])

  useEffect(() => {
    const fetchBranches = async () => {
      const branchData = await getOwnerBranches()
      setBranches(branchData.map((b: { name: string, id: string }) => ({ label: b.name, value: b.id })))
      if (branchData.length === 1) {
        setFormData(prev => ({ ...prev, branchId: branchData[0].id }))
      }
    }
    fetchBranches()
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'idProof' | 'resume') => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [type]: e.target.files![0] }))
    }
  }

  const removeFile = (type: 'idProof' | 'resume') => {
    setFiles(prev => ({ ...prev, [type]: null }))
    if (type === 'idProof' && idProofInputRef.current) idProofInputRef.current.value = ''
    if (type === 'resume' && resumeInputRef.current) resumeInputRef.current.value = ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number')
      setIsLoading(false)
      return
    }

    if (!formData.branchId) {
      toast.error('Please select a branch')
      setIsLoading(false)
      return
    }

    // Construct full address
    const fullAddress = `${formData.address}, ${formData.area}, ${formData.city}, ${formData.state} - ${formData.pincode}`

    try {
      const data = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (key !== 'address' && key !== 'area' && key !== 'city' && key !== 'state' && key !== 'pincode') {
          data.append(key, value)
        }
      })
      
      data.append('address', fullAddress)
      if (formData.joiningDate) data.append('joiningDate', formData.joiningDate)
      
      if (files.idProof) data.append('idProof', files.idProof)
      if (files.resume) data.append('resume', files.resume)

      const result = await createStaff(data)

      if (result.success) {
        toast.success('Staff member created successfully')
        router.push('/owner/staff')
      } else {
        toast.error(result.error || 'Failed to create staff member')
      }
    } catch (error) {
      console.error('Error creating staff:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <AnimatedButton
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </AnimatedButton>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Staff Member</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Create a new staff account and assign roles</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Personal & Employment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <CompactCard className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="First Name"
                name="firstName"
                placeholder="e.g. Sarah"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
              <FormInput
                label="Last Name"
                name="lastName"
                placeholder="e.g. Johnson"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                icon={Mail}
                placeholder="sarah@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <FormInput
                label="Phone Number"
                name="phone"
                type="tel"
                icon={Phone}
                placeholder="10-digit phone number"
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                  setFormData(prev => ({ ...prev, phone: value }))
                }}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Date of Birth"
                name="dob"
                type="date"
                icon={Calendar}
                value={formData.dob}
                onChange={handleChange}
              />
              <FormSelect
                label="Gender"
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                placeholder="Select Gender"
                options={[
                  { label: 'Male', value: 'male' },
                  { label: 'Female', value: 'female' },
                  { label: 'Other', value: 'other' }
                ]}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <FormInput
                  label="Pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  required
                />
                {pincodeLoading && (
                  <div className="absolute right-3 top-[38px]">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <FormInput
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                readOnly
                className="bg-gray-50 dark:bg-gray-800"
              />
              <FormInput
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
                readOnly
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {areaOptions.length > 0 ? (
                <FormSelect
                  label="Area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  options={areaOptions.map(area => ({ label: area, value: area }))}
                  required
                  placeholder="Select Area"
                />
              ) : (
                <FormInput
                  label="Area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Area / Locality"
                  required
                />
              )}
              <FormInput
                label="Street Address"
                name="address"
                icon={MapPin}
                placeholder="House No, Building, Street"
                value={formData.address}
                onChange={handleChange}
                required
              />
            </div>
          </CompactCard>

          {/* Employment Details */}
          <CompactCard className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employment Details</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormSelect
                label="Role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="Select Role"
                options={[
                  { label: 'Branch Manager', value: 'manager' },
                  { label: 'Librarian', value: 'librarian' },
                  { label: 'Staff Member', value: 'staff' },
                  { label: 'Cleaner', value: 'cleaner' },
                  { label: 'Security', value: 'security' }
                ]}
                required
              />
              <FormSelect
                label="Assign Branch"
                name="branchId"
                value={formData.branchId}
                onChange={handleChange}
                placeholder="Select Branch"
                options={branches}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Joining Date"
                name="joiningDate"
                type="date"
                icon={Calendar}
                value={formData.joiningDate}
                onChange={handleChange}
                required
              />
              <FormSelect
                label="Employment Type"
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                placeholder="Select Employment Type"
                options={[
                  { label: 'Full Time', value: 'full_time' },
                  { label: 'Part Time', value: 'part_time' },
                  { label: 'Contract', value: 'contract' },
                  { label: 'Internship', value: 'internship' }
                ]}
              />
            </div>
            
            <FormInput
              label="Monthly Salary (₹)"
              name="salary"
              type="number"
              placeholder="e.g. 25000"
              value={formData.salary}
              onChange={handleChange}
            />


          </CompactCard>
        </div>

        {/* Right Column - Account & Settings */}
        <div className="space-y-6">
          {/* Account Credentials */}
          <CompactCard className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Lock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Setup</h2>
            </div>

            <FormInput
              label="Username"
              name="username"
              placeholder="j.doe"
              value={formData.username}
              onChange={handleChange}
              required
              autoComplete="new-username"
            />

            <FormInput
              label="Password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
            
            <FormInput
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Status
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    formData.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 ring-1 ring-green-200 dark:ring-green-800'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: 'inactive' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    formData.status === 'inactive'
                      ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 ring-1 ring-gray-300 dark:ring-gray-600'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </CompactCard>

          {/* Documents Upload */}
          <CompactCard className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h2>
            </div>

            <input 
              type="file" 
              ref={idProofInputRef}
              className="hidden" 
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'idProof')}
            />
            
            {files.idProof ? (
              <div className="p-4 border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                      {files.idProof.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(files.idProof.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => removeFile('idProof')}
                  className="p-1 hover:bg-green-200 dark:hover:bg-green-800 rounded-full text-green-700 dark:text-green-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => idProofInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors cursor-pointer group text-center"
              >
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Upload ID Proof</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF or JPG up to 5MB</p>
              </div>
            )}

            <input 
              type="file" 
              ref={resumeInputRef}
              className="hidden" 
              accept=".pdf"
              onChange={(e) => handleFileChange(e, 'resume')}
            />

            {files.resume ? (
              <div className="p-4 border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
                    <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[150px]">
                      {files.resume.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(files.resume.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => removeFile('resume')}
                  className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full text-purple-700 dark:text-purple-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => resumeInputRef.current?.click()}
                className="p-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg hover:border-purple-400 dark:hover:border-purple-500 transition-colors cursor-pointer group text-center"
              >
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Upload Resume</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF only</p>
              </div>
            )}
          </CompactCard>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            <AnimatedButton
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </AnimatedButton>
            <AnimatedButton
              type="submit"
              variant="purple"
              className="flex-1"
              isLoading={isLoading}
              icon="check"
            >
              Create Staff
            </AnimatedButton>
          </div>
        </div>
      </form>
    </div>
  )
}
