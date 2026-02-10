'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { toast } from 'sonner'
import { getBranchDetails } from '@/actions/booking'

interface EditBookingModalProps {
    booking: any
    onClose: () => void
    updateAction: (id: string, data: any) => Promise<{ success: boolean; error?: string }>
}

export function EditBookingModal({ booking, onClose, updateAction }: EditBookingModalProps) {
    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    
    // Form State
    const [startDate, setStartDate] = useState(booking.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '')
    const [endDate, setEndDate] = useState(booking.endDate ? new Date(booking.endDate).toISOString().split('T')[0] : '')
    const [seatId, setSeatId] = useState<string>(booking.seatId || '')
    const [lockerId, setLockerId] = useState<string>(booking.lockerId || '')
    
    // Data State
    const [seats, setSeats] = useState<any[]>([])
    const [lockers, setLockers] = useState<any[]>([])
    
    useEffect(() => {
        const loadBranchDetails = async () => {
            setLoading(true)
            try {
                const res = await getBranchDetails(booking.branchId)
                if (res.success && res.branch) {
                    setSeats(res.branch.seats)
                    setLockers(res.branch.lockers || [])
                }
            } catch (error) {
                toast.error('Failed to load available seats/lockers')
            } finally {
                setLoading(false)
            }
        }
        loadBranchDetails()
    }, [booking.branchId])
    
    const handleSave = async () => {
        setSaving(true)
        try {
            // Only send what changed
            const data: any = {}
            if (seatId !== (booking.seatId || '')) data.seatId = seatId || null
            if (lockerId !== (booking.lockerId || '')) data.lockerId = lockerId || null
            
            // Check if dates changed
            if (startDate !== new Date(booking.startDate).toISOString().split('T')[0]) data.startDate = startDate
            if (endDate !== new Date(booking.endDate).toISOString().split('T')[0]) data.endDate = endDate
            
            if (Object.keys(data).length === 0) {
                onClose()
                return
            }

            const res = await updateAction(booking.id, data)
            if (res.success) {
                toast.success('Booking updated successfully')
                onClose()
            } else {
                toast.error(res.error || 'Failed to update booking')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setSaving(false)
        }
    }

    // Filter available seats + current seat
    const availableSeats = seats.filter(s => !s.isOccupied || s.id === booking.seatId)
    const availableLockers = lockers.filter(l => !l.isOccupied || l.id === booking.lockerId)

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Booking</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                        </div>
                    ) : (
                        <>
                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white"
                                    />
                                </div>
                            </div>
                            
                            {/* Seat */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Seat</label>
                                <select 
                                    value={seatId}
                                    onChange={(e) => setSeatId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white dark:bg-gray-800"
                                >
                                    <option value="">No Seat Assigned</option>
                                    {availableSeats.map(seat => (
                                        <option key={seat.id} value={seat.id}>
                                            {seat.number} {seat.section ? `(${seat.section})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Locker */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Locker</label>
                                <select 
                                    value={lockerId}
                                    onChange={(e) => setLockerId(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent dark:text-white dark:bg-gray-800"
                                >
                                    <option value="">No Locker Assigned</option>
                                    {availableLockers.map(locker => (
                                        <option key={locker.id} value={locker.id}>
                                            {locker.number}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
                    <AnimatedButton onClick={onClose} variant="outline" className="bg-white dark:bg-gray-800 dark:text-white">
                        Cancel
                    </AnimatedButton>
                    <AnimatedButton 
                        onClick={handleSave}
                        isLoading={saving}
                        className="bg-purple-600 text-white hover:bg-purple-700"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                    </AnimatedButton>
                </div>
            </div>
        </div>
    )
}
