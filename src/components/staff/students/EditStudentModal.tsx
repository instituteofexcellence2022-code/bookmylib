'use client'

import React, { useState } from 'react'
import { X, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { updateStudent } from '@/actions/staff/students'
import { toast } from 'react-hot-toast'

interface Student {
  id: string
  address?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  name: string
  email: string | null
  phone?: string | null
  dob?: string | Date | null
  gender?: string | null
  guardianName?: string | null
  guardianPhone?: string | null
}

interface EditStudentModalProps {
    isOpen: boolean
    onClose: () => void
    student: Student
}

export function EditStudentModal({ isOpen, onClose, student }: EditStudentModalProps) {
    const [loading, setLoading] = useState(false)
    const [loadingPincode, setLoadingPincode] = useState(false)
    const [areaOptions, setAreaOptions] = useState<string[]>([])
    const [guardianPhone, setGuardianPhone] = useState(student.guardianPhone || '')
    
    // Address State
    const [addressData, setAddressData] = useState({
        address: student.address || '',
        area: student.area || '',
        city: student.city || '',
        state: student.state || '',
        pincode: student.pincode || ''
    })

    const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPincode = e.target.value
        setAddressData(prev => ({ ...prev, pincode: newPincode }))

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

                    setAddressData(prev => ({
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

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        formData.append('id', student.id)
        
        const result = await updateStudent(formData)
        
        if (result.success) {
            toast.success('Student updated successfully')
            onClose()
        } else {
            toast.error(result.error || 'Failed to update student')
        }
        setLoading(false)
    }

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setAddressData(prev => ({ ...prev, [name]: value }))
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl pointer-events-auto flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Student Details</h2>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto">
                                <form id="edit-student-form" action={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Personal Details (Read Only)</h3>
                                    </div>
                                    
                                    <FormInput
                                        name="name"
                                        label="Full Name"
                                        defaultValue={student.name}
                                        required
                                        disabled
                                    />
                                    <FormInput
                                        name="gender"
                                        label="Gender"
                                        defaultValue={student.gender || 'Not Set'}
                                        disabled
                                    />
                                    
                                    {/* DOB Hidden for Staff Privacy */}
                                    
                                    <FormInput
                                        name="email"
                                        label="Email"
                                        type="email"
                                        defaultValue={student.email || ''}
                                        disabled
                                    />
                                    <div>
                                        <FormInput
                                            name="phone"
                                            label="Phone"
                                            defaultValue={student.phone || ''}
                                            disabled
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Personal details cannot be edited by staff.
                                        </p>
                                    </div>

                                    <div className="md:col-span-2 mt-2">
                                        <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Address Information</h3>
                                    </div>

                                    <div className="md:col-span-2">
                                        <FormTextarea
                                            name="address"
                                            label="Address Line"
                                            value={addressData.address}
                                            onChange={handleAddressChange}
                                            rows={2}
                                        />
                                    </div>
                                    
                                    <FormInput
                                        name="pincode"
                                        label="Pincode"
                                        value={addressData.pincode}
                                        onChange={handlePincodeChange}
                                        maxLength={6}
                                        helperText={loadingPincode ? 'Fetching details...' : 'Enter 6-digit pincode to auto-fill details'}
                                    />

                                    {areaOptions.length > 1 ? (
                                        <FormSelect
                                            name="area"
                                            label="Area/Locality"
                                            value={addressData.area}
                                            onChange={handleAddressChange}
                                            options={areaOptions.map(opt => ({ label: opt, value: opt }))}
                                            placeholder="Select Area"
                                        />
                                    ) : (
                                        <FormInput
                                            name="area"
                                            label="Area/Locality"
                                            value={addressData.area}
                                            onChange={handleAddressChange}
                                        />
                                    )}

                                    <FormInput
                                        name="city"
                                        label="City"
                                        value={addressData.city}
                                        onChange={handleAddressChange}
                                    />
                                    <FormInput
                                        name="state"
                                        label="State"
                                        value={addressData.state}
                                        onChange={handleAddressChange}
                                    />
                                    
                                    <div className="md:col-span-2 mt-2">
                                        <h3 className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wider">Guardian Info</h3>
                                    </div>
                                    
                                    <FormInput
                                        name="guardianName"
                                        label="Guardian Name"
                                        defaultValue={student.guardianName || ''}
                                        autoComplete="name"
                                    />
                                    <FormInput
                                        name="guardianPhone"
                                        label="Guardian Phone"
                                        value={guardianPhone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                                            setGuardianPhone(val)
                                        }}
                                        type="tel"
                                        autoComplete="tel"
                                        maxLength={10}
                                    />
                                </form>
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                                <AnimatedButton variant="outline" onClick={onClose}>
                                    Cancel
                                </AnimatedButton>
                                <AnimatedButton 
                                    variant="primary" 
                                    type="submit" 
                                    form="edit-student-form"
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                    {!loading && <Save size={18} className="ml-2" />}
                                </AnimatedButton>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
