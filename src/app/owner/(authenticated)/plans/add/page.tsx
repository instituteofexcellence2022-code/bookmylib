'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { FormSelect } from '@/components/ui/FormSelect'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { createPlan } from '@/actions/plan'
import { getOwnerBranches } from '@/actions/branch'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Calendar, IndianRupee, Clock, Settings, MapPin } from 'lucide-react'

export default function CreateSubscriptionPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [branches, setBranches] = useState<{id: string, name: string}[]>([])
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '',
    durationUnit: 'months',
    category: 'fixed',
    billingCycle: 'one_time',
    branchId: 'all',
    hoursPerDay: '',
    shiftStart: '',
    shiftEnd: '',
    status: 'active',
    includesSeat: false,
    allowSeatReservation: true,
    includesLocker: false
  })

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const result = await getOwnerBranches()
        if (result.success && result.data) {
          setBranches(result.data as {id: string, name: string}[])
        }
      } catch (error) {
        console.error('Failed to load branches', error)
      }
    }
    fetchBranches()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      if (name === 'includesSeat' && checked) {
        setForm(prev => ({ ...prev, [name]: checked, allowSeatReservation: true }))
      } else {
        setForm(prev => ({ ...prev, [name]: checked }))
      }
    } else {
      setForm(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validation
    if (!form.name || !form.price || !form.duration) {
      toast.error('Please fill all required basic fields')
      return
    }
    
    // Conditional validation
    if (form.category === 'flexible' && !form.hoursPerDay) {
        toast.error('Please specify hours per day for flexible plan')
        return
    }
    
    if (form.category === 'fixed' && (!form.shiftStart || !form.shiftEnd)) {
        toast.error('Please specify shift timings for fixed plan')
        return
    }

    setIsSubmitting(true)
    try {
      const data = new FormData()
      data.append('name', form.name)
      data.append('description', form.description)
      data.append('price', form.price)
      data.append('duration', form.duration)
      data.append('durationUnit', form.durationUnit)
      data.append('category', form.category)
      data.append('billingCycle', form.billingCycle)
      data.append('branchId', form.branchId)
      data.append('status', form.status)
      data.append('includesSeat', String(form.includesSeat))
      data.append('allowSeatReservation', String(form.allowSeatReservation))
      data.append('includesLocker', String(form.includesLocker))
      
      if (form.category === 'flexible') {
        data.append('hoursPerDay', form.hoursPerDay)
      } else {
        data.append('shiftStart', form.shiftStart)
        data.append('shiftEnd', form.shiftEnd)
      }

      const result = await createPlan(data)
      if (result.success) {
        toast.success('Plan created successfully')
        router.push('/owner/plans')
      } else {
        toast.error(result.error || 'Failed to create plan')
      }
    } catch (error) {
      console.error('Error creating plan:', error)
      toast.error('Failed to create plan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10">
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Plan</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Define pricing, duration, and type for this plan.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <CompactCard className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-500" />
            Plan Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormSelect
              label="Branch Availability"
              name="branchId"
              icon={MapPin}
              value={form.branchId}
              onChange={handleChange}
              options={[
                { label: 'All Branches', value: 'all' },
                ...branches.map(b => ({ label: b.name, value: b.id }))
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    category: 'fixed',
                    name: '',
                    hoursPerDay: '',
                    shiftStart: '',
                    shiftEnd: ''
                  }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    form.category === 'fixed'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  Fixed Shift
                </button>
                <button
                  type="button"
                  onClick={() => setForm(prev => ({
                    ...prev,
                    category: 'flexible',
                    name: '',
                    hoursPerDay: '',
                    shiftStart: '',
                    shiftEnd: ''
                  }))}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    form.category === 'flexible'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 ring-1 ring-purple-200 dark:ring-purple-800'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  Flexible Hours
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Plan Option
              </label>
              <select
                className="w-full bg-background border border-input rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none cursor-pointer"
                onChange={(e) => {
                  const val = e.target.value
                  if (!val) return

                  if (form.category === 'fixed') {
                    if (val === 'fixed_shift') {
                      setForm(prev => ({
                        ...prev,
                        shiftStart: '09:00',
                        shiftEnd: '18:00',
                        name: 'Fixed Shift'
                      }))
                    } else if (val === 'morning') {
                      setForm(prev => ({
                        ...prev,
                        shiftStart: '08:00',
                        shiftEnd: '14:00',
                        name: 'Morning Shift'
                      }))
                    } else if (val === 'afternoon') {
                      setForm(prev => ({
                        ...prev,
                        shiftStart: '14:00',
                        shiftEnd: '20:00',
                        name: 'Afternoon Shift'
                      }))
                    } else if (val === 'evening') {
                      setForm(prev => ({
                        ...prev,
                        shiftStart: '17:00',
                        shiftEnd: '22:00',
                        name: 'Evening Shift'
                      }))
                    } else if (val === 'night') {
                      setForm(prev => ({
                        ...prev,
                        shiftStart: '20:00',
                        shiftEnd: '08:00',
                        name: 'Night Shift'
                      }))
                    } else if (val === 'custom') {
                      setForm(prev => ({
                        ...prev,
                        shiftStart: '',
                        shiftEnd: ''
                      }))
                    }
                  } else {
                    if (val === 'half_day') {
                      setForm(prev => ({
                        ...prev,
                        hoursPerDay: '4',
                        name: 'Half Day Plan'
                      }))
                    } else if (val === 'full_day') {
                      setForm(prev => ({
                        ...prev,
                        hoursPerDay: '8',
                        name: 'Full Day Plan'
                      }))
                    } else if (val === 'custom') {
                      setForm(prev => ({
                        ...prev,
                        hoursPerDay: ''
                      }))
                    }
                  }
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  {form.category === 'fixed' ? 'Select Fixed Shift Type...' : 'Select Flexible Hours...'}
                </option>
                {form.category === 'fixed' ? (
                  <>
                    <option value="fixed_shift">Fixed Shift (09:00 - 18:00)</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                    <option value="night">Night</option>
                    <option value="custom">Custom</option>
                  </>
                ) : (
                  <>
                    <option value="half_day">Half Day</option>
                    <option value="full_day">Full Day</option>
                    <option value="custom">Custom</option>
                  </>
                )}
              </select>
            </div>
            {/* End Plan Option */}
            
             {form.category === 'fixed' && (
              <div>
               <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 h-full">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Shift Timing
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormInput
                        label={
                          <>
                            <span className="sm:hidden">Start</span>
                            <span className="hidden sm:inline">Shift Start Time</span>
                          </>
                        }
                        name="shiftStart"
                        type="time"
                        value={form.shiftStart}
                        onChange={handleChange}
                        required
                      />
                      <FormInput
                        label={
                          <>
                            <span className="sm:hidden">End</span>
                            <span className="hidden sm:inline">Shift End Time</span>
                          </>
                        }
                        name="shiftEnd"
                        type="time"
                        value={form.shiftEnd}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {form.category === 'flexible' && (
                <div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700 h-full flex flex-col justify-center">
                    <FormInput
                      label="Hours Per Day"
                      name="hoursPerDay"
                      type="number"
                      icon={Clock}
                      placeholder="e.g. 6.5"
                      value={form.hoursPerDay}
                      onChange={handleChange}
                      min="0.5"
                      step="0.5"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex gap-2">
                <div className="flex-1">
                    <FormInput
                    label="Duration"
                    name="duration"
                    type="number"
                    icon={Calendar}
                    placeholder="e.g. 1"
                    value={form.duration}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    required
                    />
                </div>
                <div className="w-1/3">
                    <FormSelect
                    label="Unit"
                    name="durationUnit"
                    value={form.durationUnit}
                    onChange={handleChange}
                    options={[
                        { label: 'Days', value: 'days' },
                        { label: 'Weeks', value: 'weeks' },
                        { label: 'Months', value: 'months' }
                    ]}
                    required
                    />
                </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-6">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-1">
                <input
                  type="checkbox"
                  name="includesSeat"
                  checked={form.includesSeat}
                  onChange={handleChange}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300 dark:border-gray-600"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">Includes Seat</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Plan comes with a dedicated seat</span>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-colors flex-1 ${
                form.includesSeat ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
                <input
                  type="checkbox"
                  name="allowSeatReservation"
                  checked={form.allowSeatReservation}
                  onChange={handleChange}
                  disabled={form.includesSeat}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300 dark:border-gray-600"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">Allow Seat Selection</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">User can choose to reserve a seat</span>
                </div>
              </label>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-1">
                <input
                  type="checkbox"
                  name="includesLocker"
                  checked={form.includesLocker}
                  onChange={handleChange}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 border-gray-300 dark:border-gray-600"
                />
                <div>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">Include Locker</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">Access to locker facility</span>
                </div>
              </label>
              <div className="flex-1"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="Plan Name"
              name="name"
              placeholder={form.category === 'fixed' ? "e.g. Morning Shift" : "e.g. 5 Hours Flexi"}
              value={form.name}
              onChange={handleChange}
              required
            />
            <FormInput
              label="Price (₹)"
              name="price"
              type="number"
              icon={IndianRupee}
              placeholder="Enter amount"
              value={form.price}
              onChange={handleChange}
              min="0"
              step="1"
              required
            />
          </div>
          
          {/* Conditional Fields based on Category */}

          <FormTextarea
            label="Description"
            name="description"
            placeholder="Briefly describe what this plan includes and any important rules."
            value={form.description}
            onChange={handleChange}
            rows={3}
          />

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, status: 'active' }))}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  form.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, status: 'inactive' }))}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  form.status === 'inactive'
                    ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 ring-1 ring-gray-300 dark:ring-gray-600'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </CompactCard>

        <div className="flex justify-end gap-3">
          <AnimatedButton
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </AnimatedButton>
          <AnimatedButton
            type="submit"
            variant="purple"
            icon="check"
            isLoading={isSubmitting}
          >
            Create Plan
          </AnimatedButton>
        </div>
      </form>
    </div>
  )
}
