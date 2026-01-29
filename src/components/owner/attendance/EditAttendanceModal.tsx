'use client'

import React, { useState } from 'react'
import { X, Clock, Calendar } from 'lucide-react'
import { updateAttendanceRecord } from '@/actions/owner/attendance'
import { toast } from 'react-hot-toast'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { format } from 'date-fns'

interface AttendanceRecord {
    id: string
    checkIn: string | Date
    checkOut?: string | Date | null
}

interface EditAttendanceModalProps {
    record: AttendanceRecord
    onClose: () => void
    onSuccess: () => void
}

export function EditAttendanceModal({ record, onClose, onSuccess }: EditAttendanceModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        checkInDate: format(new Date(record.checkIn), 'yyyy-MM-dd'),
        checkInTime: format(new Date(record.checkIn), 'HH:mm'),
        checkOutDate: record.checkOut ? format(new Date(record.checkOut), 'yyyy-MM-dd') : format(new Date(record.checkIn), 'yyyy-MM-dd'),
        checkOutTime: record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const checkIn = new Date(`${formData.checkInDate}T${formData.checkInTime}`)
            let checkOut = undefined

            if (formData.checkOutTime) {
                checkOut = new Date(`${formData.checkOutDate}T${formData.checkOutTime}`)
                
                if (checkOut < checkIn) {
                    toast.error('Check-out cannot be before check-in')
                    setLoading(false)
                    return
                }
            }

            const result = await updateAttendanceRecord(record.id, {
                checkIn,
                checkOut
            })

            if (result.success) {
                toast.success('Attendance updated')
                onSuccess()
                onClose()
            } else {
                toast.error(result.error || 'Failed to update')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Edit Attendance</h2>
                    <button 
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Check In</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        required
                                        value={formData.checkInDate}
                                        onChange={e => setFormData(prev => ({ ...prev, checkInDate: e.target.value }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="relative w-32">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="time"
                                        required
                                        value={formData.checkInTime}
                                        onChange={e => setFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Check Out</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="date"
                                        value={formData.checkOutDate}
                                        onChange={e => setFormData(prev => ({ ...prev, checkOutDate: e.target.value }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                                    />
                                </div>
                                <div className="relative w-32">
                                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="time"
                                        value={formData.checkOutTime}
                                        onChange={e => setFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-gray-500">Leave time empty if currently active.</p>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <AnimatedButton
                            type="submit"
                            isLoading={loading}
                            className="flex-1 bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                        >
                            Save Changes
                        </AnimatedButton>
                    </div>
                </form>
            </div>
        </div>
    )
}
