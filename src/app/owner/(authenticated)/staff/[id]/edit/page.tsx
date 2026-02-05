'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, Phone, Calendar, 
  Lock, ArrowLeft, MapPin, Briefcase,
  FileText, X, Upload
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Prisma } from '@prisma/client'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { getStaffDetails, updateStaff, deleteStaff, getStaffAttendance } from '@/actions/staff'
import { getOwnerBranches } from '@/actions/branch'

export default function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const idProofInputRef = React.useRef<HTMLInputElement>(null)
  const resumeInputRef = React.useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [branches, setBranches] = useState<{ label: string, value: string }[]>([])
  const [attendance, setAttendance] = useState<{ id: string; date: string; status: string }[]>([])
  
  const [pincodeLoading, setPincodeLoading] = useState(false)
  const [areaOptions, setAreaOptions] = useState<string[]>([])

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
            
            // Only update if not already set (to avoid overwriting when loading)
            setFormData(prev => ({
              ...prev,
              city,
              state,
              // If current area is not in the list, or if we are typing pincode fresh, verify area
              // But here we might overwrite user's area if they just loaded the page.
              // So only auto-select if areas has 1 item, or if current area is invalid?
              // Let's just update city/state and let area be selected if single, or keep as is if valid.
               area: areas.length === 1 ? areas[0] : (areas.includes(prev.area) ? prev.area : '')
            }))
            
            if (areas.length > 1 && !areas.includes(formData.area)) {
              toast.success('Select your area')
            }
          } else {
             // Only clear if user is typing
             if (document.activeElement?.getAttribute('name') === 'pincode') {
                 toast.error('Invalid Pincode')
                 setAreaOptions([])
             }
          }
        } catch (error) {
          console.error('Error fetching pincode details:', error)
        } finally {
          setPincodeLoading(false)
        }
      } else if (formData.pincode.length < 6) {
        // Don't clear options immediately to prevent UI flicker
      }
    }

    const timer = setTimeout(fetchPincodeDetails, 500)
    return () => clearTimeout(timer)
  }, [formData.pincode, formData.area])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [staff, branchesResult, attendanceData] = await Promise.all([
          getStaffDetails(id),
          getOwnerBranches(),
          getStaffAttendance(id)
        ])

        if (branchesResult.success && branchesResult.data) {
          setBranches(branchesResult.data.map((b: { name: string, id: string }) => ({ label: b.name, value: b.id })))
        }
        setAttendance(attendanceData.map((a: Prisma.StaffAttendanceGetPayload<object>) => ({ ...a, date: new Date(a.date).toISOString() })))

        if (staff) {
          const [firstName, ...lastNameParts] = staff.name.split(' ')
          const lastName = lastNameParts.join(' ')
          
          // Try to parse address: "Street, Area, City, State - Pincode"
          let address = staff.address || ''
          let pincode = ''
          let area = ''
          let city = ''
          let state = ''

          const pincodeMatch = address.match(/-\s*(\d{6})$/)
          if (pincodeMatch) {
            pincode = pincodeMatch[1]
            // Remove pincode part
            const addressWithoutPincode = address.substring(0, pincodeMatch.index).trim()
            // Try to split by comma
            const parts = addressWithoutPincode.split(',').map(p => p.trim())
            if (parts.length >= 4) {
               state = parts[parts.length - 1]
               city = parts[parts.length - 2]
               area = parts[parts.length - 3]
               address = parts.slice(0, parts.length - 3).join(', ')
            } else {
               address = addressWithoutPincode
            }
          }

          setFormData({
            firstName: firstName || '',
            lastName: lastName || '',
            email: staff.email,
            phone: staff.phone || '',
            dob: staff.dob ? new Date(staff.dob).toISOString().split('T')[0] : '',
            gender: staff.gender || '',
            address,
            pincode,
            city,
            state,
            area,
            role: staff.role,
            branchId: staff.branchId,
            joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().split('T')[0] : '',
            salary: staff.salary ? staff.salary.toString() : '',
            employmentType: staff.employmentType || 'full_time',
            username: staff.username || '',
            password: '',
            confirmPassword: '',
            status: staff.status || 'active'
          })
        } else {
            toast.error('Staff not found')
            router.push('/owner/staff')
        }
      } catch (error) {
        console.error(error)
        toast.error('Failed to load data')
      }
    }
    fetchData()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.phone && formData.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number')
      setIsLoading(false)
      return
    }

    // Construct full address
    const fullAddress = formData.pincode 
      ? `${formData.address}, ${formData.area}, ${formData.city}, ${formData.state} - ${formData.pincode}`
      : formData.address

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

      const result = await updateStaff(id, data)

      if (result.success) {
        toast.success('Staff updated successfully')
        router.push('/owner/staff')
      } else {
        toast.error(result.error || 'Failed to update staff')
      }
    } catch (error) {
      console.error(error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      setIsLoading(true)
      const result = await deleteStaff(id)
      if (result.success) {
        toast.success('Staff deleted successfully')
        router.push('/owner/staff')
      } else {
        toast.error(result.error || 'Failed to delete staff')
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Staff Member</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Update staff details and permissions</p>
          </div>
        </div>
        <AnimatedButton
          variant="ghost"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={handleDelete}
          icon="delete"
        >
          Delete Staff
        </AnimatedButton>
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
                  placeholder="Select Area"
                />
              ) : (
                <FormInput
                  label="Area"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Area / Locality"
                />
              )}
              <FormInput
                label="Street Address"
                name="address"
                icon={MapPin}
                placeholder="House No, Building, Street"
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </CompactCard>

          {/* Employment Details */}
          <CompactCard className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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

          {/* Recent Attendance */}
          <CompactCard className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Attendance</h2>
            </div>
            
            <div className="space-y-3">
              {attendance.length > 0 ? (
                attendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        record.status === 'present' ? 'bg-green-500' :
                        record.status === 'absent' ? 'bg-red-500' :
                        record.status === 'late' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(record.date).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      record.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      record.status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      record.status === 'late' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {record.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No attendance records found</p>
              )}
            </div>
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
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Settings</h2>
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

            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Change Password</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Leave blank to keep current password</p>
              
              <div className="space-y-3">
                <FormInput
                  label="New Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
                
                <FormInput
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>
            </div>

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
                  onClick={() => setFormData(prev => ({ ...prev, status: 'on_leave' }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    formData.status === 'on_leave'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 ring-1 ring-orange-200 dark:ring-orange-800'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  On Leave
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PDF only up to 5MB</p>
              </div>
            )}
          </CompactCard>

          <div className="flex gap-4 pt-4">
            <AnimatedButton
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              isLoading={isLoading}
            >
              Save Changes
            </AnimatedButton>
          </div>
        </div>
      </form>
    </div>
  )
}
