'use client'

import React, { useState } from 'react'
import { createStudent } from '@/actions/owner/students'
import { getOwnerBranches } from '@/actions/branch'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { toast } from 'sonner'
import { User, Mail, Phone, Lock, Calendar, MapPin, Loader2, Shield, Upload, FileText } from 'lucide-react'
import { z } from 'zod'
import { generateId } from '@/lib/utils'

const baseStudentSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address').or(z.literal('')),
    phone: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters').or(z.literal('')),
    branchId: z.string().min(1, 'Please select a branch'),
    dob: z.string().optional(),
    gender: z.string().min(1, 'Please select a gender'),
    address: z.string().optional(),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be exactly 6 digits').or(z.literal('')),
    area: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    guardianName: z.string().min(2, 'Guardian name must be at least 2 characters').or(z.literal('')),
    guardianPhone: z.string().regex(/^\d{10}$/, 'Guardian phone must be exactly 10 digits').or(z.literal(''))
})

const studentSchema = baseStudentSchema.superRefine((data, ctx) => {
    if (!data.email && !data.phone) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either Email or Phone is required",
            path: ["email"]
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either Email or Phone is required",
            path: ["phone"]
        });
    }
    if (!data.password && !data.dob) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either Password or Date of Birth is required",
            path: ["password"]
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Either Password or Date of Birth is required",
            path: ["dob"]
        });
    }
})

interface AddStudentFormProps {
    onSuccess?: (studentId: string) => void
    onCancel?: () => void
    redirectOnSuccess?: boolean
}

export function AddStudentForm({ onSuccess, onCancel }: AddStudentFormProps) {
    const [loading, setLoading] = useState(false)
    const [loadingPincode, setLoadingPincode] = useState(false)
    const [areaOptions, setAreaOptions] = useState<string[]>([])
    const [branchOptions, setBranchOptions] = useState<{label: string, value: string}[]>([])
    const [errors, setErrors] = useState<Record<string, string>>({})
    
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        branchId: '',
        dob: '',
        gender: '',
        address: '',
        pincode: '',
        area: '',
        city: '',
        state: '',
        guardianName: '',
        guardianPhone: ''
    })

    React.useEffect(() => {
        if (!formData.password) {
            setFormData(prev => ({ ...prev, password: generateId(10) }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    React.useEffect(() => {
        async function loadBranches() {
            try {
                const result = await getOwnerBranches()
                if (result.success && result.data) {
                    const branches = result.data
                    setBranchOptions(branches.map(b => ({ label: b.name, value: b.id })))
                    if (branches.length === 1) {
                        setFormData(prev => ({ ...prev, branchId: branches[0].id }))
                    }
                }
            } catch (_) {
                console.error('Failed to load branches')
            }
        }
        loadBranches()
    }, [])

    const [files, setFiles] = useState<{
        image: File | null,
        govtId: File | null
    }>({
        image: null,
        govtId: null
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target

        // Enforce numeric input and length limit for phone numbers
        if (name === 'phone' || name === 'guardianPhone') {
            if (!/^\d*$/.test(value)) return
            if (value.length > 10) return
        }

        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[name]
                return newErrors
            })
        }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target
        
        // Check if field exists in schema
        const fieldName = name as keyof typeof baseStudentSchema.shape
        if (fieldName in baseStudentSchema.shape) {
            const result = baseStudentSchema.shape[fieldName].safeParse(value)
            
            if (result.success) {
                // If successful, clear error
                setErrors(prev => {
                    const newErrors = { ...prev }
                    delete newErrors[name]
                    return newErrors
                })
            } else {
                setErrors(prev => ({
                    ...prev,
                    [name]: result.error.issues[0]?.message || 'Invalid value'
                }))
            }
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'govtId') => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [field]: e.target.files![0] }))
        }
    }

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPincode = e.target.value
        // Only allow numbers
        if (!/^\d*$/.test(newPincode)) return

        setFormData(prev => ({ ...prev, pincode: newPincode }))
        if (errors.pincode) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors.pincode
                return newErrors
            })
        }

        if (newPincode.length === 6) {
            setLoadingPincode(true)
            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${newPincode}`)
                const data = await response.json()

                if (data[0].Status === 'Success') {
                    const postOffices = data[0].PostOffice
                    const city = postOffices[0].District
                    const state = postOffices[0].State
                    const areas = postOffices.map((po: { Name: string }) => po.Name)

                    setFormData(prev => ({
                        ...prev,
                        city,
                        state,
                        area: areas.length === 1 ? areas[0] : ''
                    }))
                    setAreaOptions(areas)
                    
                    if (areas.length > 1) {
                        toast.success('Select your area from the dropdown')
                    }
                } else {
                    toast.error('Invalid Pincode')
                    setAreaOptions([])
                    setFormData(prev => ({ ...prev, city: '', state: '', area: '' }))
                }
            } catch (error) {
                console.error('Error fetching pincode:', error)
                toast.error('Failed to fetch address details')
            } finally {
                setLoadingPincode(false)
            }
        } else if (newPincode.length < 6) {
            setAreaOptions([])
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        
        // Validate form
        const result = studentSchema.safeParse(formData)
        if (!result.success) {
            const newErrors: Record<string, string> = {}
            result.error.issues.forEach(issue => {
                newErrors[issue.path[0] as string] = issue.message
            })
            setErrors(newErrors)
            toast.error('Please fix the errors in the form')
            return
        }

        setLoading(true)
        
        const submitData = new FormData()
        Object.entries(formData).forEach(([key, value]) => {
            submitData.append(key, value)
        })

        if (files.image) {
            submitData.append('image', files.image)
        }
        if (files.govtId) {
            submitData.append('govtId', files.govtId)
        }
        
        try {
            const result = await createStudent(submitData)
            if (result.success && result.data) {
                toast.success('Student created successfully')
                if (onSuccess) {
                    onSuccess(result.data.id)
                }
            } else {
                toast.error(result.error || 'Failed to create student')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <User className="w-5 h-5 text-blue-500" />
                    Basic Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput 
                        name="name" 
                        label="Full Name" 
                        placeholder="John Doe" 
                        required 
                        icon={User}
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.name}
                    />
                    <FormInput 
                        name="email" 
                        type="email" 
                        label="Email Address" 
                        placeholder="john@example.com" 
                        icon={Mail}
                        helperText="Required if Phone is empty"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.email}
                    />
                    <FormInput 
                        name="phone" 
                        type="tel" 
                        label="Phone Number" 
                        placeholder="9876543210" 
                        icon={Phone}
                        helperText="Required if Email is empty"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.phone}
                        maxLength={10}
                    />
                    <FormInput 
                        name="password" 
                        type="password" 
                        label="Password" 
                        placeholder="********" 
                        icon={Lock}
                        helperText="Required if DOB is empty (Min 8 chars)"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.password}
                    />
                    <FormSelect 
                        name="branchId"
                        label="Branch"
                        options={branchOptions}
                        placeholder="Select Branch"
                        value={formData.branchId}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.branchId}
                    />
                    <FormInput 
                        name="dob" 
                        type="date" 
                        label="Date of Birth" 
                        icon={Calendar}
                        value={formData.dob}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.dob}
                    />
                    <FormSelect 
                        name="gender"
                        label="Gender"
                        options={[
                            { label: 'Male', value: 'male' },
                            { label: 'Female', value: 'female' },
                            { label: 'Other', value: 'other' }
                        ]}
                        placeholder="Select Gender"
                        value={formData.gender}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.gender}
                    />
                </div>
            </div>

            {/* Address Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <MapPin className="w-5 h-5 text-purple-500" />
                    Address Details
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                        <FormInput 
                            name="pincode" 
                            label="Pincode" 
                            placeholder="Enter 6-digit pincode" 
                            value={formData.pincode}
                            onChange={handlePincodeChange}
                            onBlur={handleBlur}
                            maxLength={6}
                            icon={MapPin}
                            error={errors.pincode}
                        />
                        {loadingPincode && (
                            <div className="absolute right-3 top-[38px]">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                            </div>
                        )}
                    </div>

                    {areaOptions.length > 0 ? (
                        <FormSelect 
                            name="area"
                            label="Area"
                            value={formData.area}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            options={areaOptions.map(area => ({ label: area, value: area }))}
                            placeholder="Select Area"
                            error={errors.area}
                        />
                    ) : (
                        <FormInput 
                            name="area" 
                            label="Area" 
                            placeholder="Locality/Area" 
                            value={formData.area}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.area}
                        />
                    )}

                    <FormInput 
                        name="city" 
                        label="City" 
                        placeholder="City" 
                        value={formData.city}
                        onChange={handleChange}
                        readOnly
                        className="bg-gray-50 dark:bg-gray-900/50"
                        error={errors.city}
                    />
                    <FormInput 
                        name="state" 
                        label="State" 
                        placeholder="State" 
                        value={formData.state}
                        onChange={handleChange}
                        readOnly
                        className="bg-gray-50 dark:bg-gray-900/50"
                        error={errors.state}
                    />
                    <div className="md:col-span-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Full Address
                            </label>
                            <textarea 
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder="House No, Building, Street..."
                                className={`flex w-full rounded-lg border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-500 transition-all min-h-[80px] resize-none ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                            />
                            {errors.address && (
                                <p className="text-xs text-red-500">{errors.address}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Guardian Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <Shield className="w-5 h-5 text-green-500" />
                    Guardian Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput 
                        name="guardianName" 
                        label="Guardian Name" 
                        placeholder="Parent/Guardian Name" 
                        icon={User}
                        value={formData.guardianName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.guardianName}
                    />
                    <FormInput 
                        name="guardianPhone" 
                        type="tel" 
                        autoComplete="tel"
                        label="Guardian Phone" 
                        placeholder="Guardian Contact Number" 
                        icon={Phone}
                        value={formData.guardianPhone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.guardianPhone}
                        maxLength={10}
                    />
                </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                    <FileText className="w-5 h-5 text-orange-500" />
                    Documents & Identity
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Profile Picture
                        </label>
                        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center cursor-pointer">
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, 'image')}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                <Upload className="w-6 h-6" />
                                <span className="text-sm">
                                    {files.image ? files.image.name : 'Click to upload profile picture'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Government ID
                        </label>
                        <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-center cursor-pointer">
                            <input 
                                type="file" 
                                accept="image/*,.pdf"
                                onChange={(e) => handleFileChange(e, 'govtId')}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                <FileText className="w-6 h-6" />
                                <span className="text-sm">
                                    {files.govtId ? files.govtId.name : 'Click to upload Government ID'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Actions */}
            <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
                {onCancel && (
                    <AnimatedButton type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </AnimatedButton>
                )}
                <AnimatedButton 
                    type="submit" 
                    variant="primary"
                    disabled={loading}
                    className="min-w-[140px] justify-center"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Student'}
                </AnimatedButton>
            </div>
        </form>
    )
}
