'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
    Check, Armchair, Calendar, 
    CreditCard, Clock, MapPin, Info,
    ChevronRight, ChevronLeft,
    LayoutGrid, List, Loader2, Library as LibraryIcon,
    Lock, Plus, Minus
} from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { createBooking } from '@/actions/booking'
import { cn, formatSeatNumber } from '@/lib/utils'

import { Branch, Seat, Plan, AdditionalFee, Locker } from '@prisma/client'
import BookingPayment from '@/components/student/BookingPayment'
import BranchHeader from './BranchHeader'

type ExtendedPlan = Plan & {
    includesSeat: boolean
    includesLocker: boolean
}

type SeatWithOccupancy = Seat & {
    isOccupied: boolean
}

type LockerWithOccupancy = Locker & {
    isOccupied: boolean
}

type BranchWithDetails = Branch & {
    library: { name: string }
    seats: SeatWithOccupancy[]
    lockers: LockerWithOccupancy[]
    plans: ExtendedPlan[]
    fees: AdditionalFee[]
}

interface BookingClientProps {
    branch: BranchWithDetails
    studentId: string
    currentSubscription?: {
        plan?: Plan
        seatId?: string | null
    }
    images?: string[]
    amenities?: string[]
}

export default function BookingClient({ branch, studentId, currentSubscription, images = [], amenities = [] }: BookingClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const action = searchParams.get('action')
    const planIdParam = searchParams.get('planId')

    const [step, setStep] = useState<'selection' | 'payment' | 'success'>('selection')
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
    const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<ExtendedPlan | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(false)
    const [successData, setSuccessData] = useState<{
        status: 'completed' | 'pending_verification',
        paymentId?: string
    } | null>(null)
    
    // Pagination state
    const [pageBySection, setPageBySection] = useState<Record<string, number>>({})
    const [columns, setColumns] = useState(4)
    const [viewMode, setViewMode] = useState<'pagination' | 'scroll'>('pagination')

    // Filter plans based on action
    const visiblePlans = React.useMemo(() => {
        const currentPlan = currentSubscription?.plan
        if (action === 'upgrade' && currentPlan) {
             return branch.plans.filter(p => p.price > currentPlan.price)
        }
        return branch.plans
    }, [action, currentSubscription, branch.plans])

    // Auto-select plan for renew
    React.useEffect(() => {
        if (action === 'renew' && planIdParam && !selectedPlan) {
             const plan = branch.plans.find(p => p.id === planIdParam)
             if (plan) setSelectedPlan(plan)

             // Auto-select seat if available
             if (currentSubscription?.seatId) {
                 const seat = branch.seats.find(s => s.id === currentSubscription.seatId)
                 if (seat && !seat.isOccupied) {
                     setSelectedSeat(seat)
                 }
             }
        }
    }, [action, planIdParam, branch.plans, selectedPlan, currentSubscription, branch.seats])

    // Handle responsive columns
    React.useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            if (width >= 1280) setColumns(10)      // xl
            else if (width >= 768) setColumns(8)   // md
            else if (width >= 640) setColumns(6)   // sm
            else setColumns(4)                     // default
        }
        
        handleResize() // Initial check
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Calculate total
    const totalAmount = Math.round(((Number(selectedPlan?.price) || 0) + 
        (branch.fees || []).filter(f => selectedFees.includes(String(f.id)))
            .reduce((sum: number, f) => sum + Number(f.amount), 0)) * quantity)

    // Sort seats naturally
    const sortedSeats = React.useMemo(() => {
        return [...(branch.seats || [])].sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [branch.seats])

    // Sort lockers naturally
    const sortedLockers = React.useMemo(() => {
        return [...(branch.lockers || [])].sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [branch.lockers])

    // Check if locker selection is visible
    const shouldShowLockerSelection = React.useMemo(() => {
        if (!branch.hasLockers) return false
        
        const hasLockerFee = selectedFees.some(id => {
            const fee = branch.fees.find(f => String(f.id) === id)
            return fee && fee.name.toLowerCase().includes('locker')
        })

        if (hasLockerFee) return true

        if (selectedPlan?.includesLocker) {
            return branch.isLockerSeparate
        }

        return false
    }, [selectedPlan, branch.isLockerSeparate, selectedFees, branch.fees, branch.hasLockers])

    // Reset locker if hidden
    React.useEffect(() => {
        if (!shouldShowLockerSelection && selectedLocker) {
            setSelectedLocker(null)
        }
    }, [shouldShowLockerSelection, selectedLocker])

    // Check if seat selection is allowed
    const isSeatSelectionEnabled = React.useMemo(() => {
        if (!selectedPlan) return false
        
        // Check if plan includes seat
        if (selectedPlan.includesSeat) return true

        // Check for "Seat Reservation" or similar fee
        const seatFeeExists = branch.fees?.some(f => 
            f.name.toLowerCase().includes('seat') || 
            f.name.toLowerCase().includes('reservation')
        )

        if (!seatFeeExists) return true // If no specific seat fee, allow selection (or maybe disable? assuming allow)

        // If seat fee exists, user must have selected it
        return selectedFees.some(id => {
            const fee = branch.fees.find(f => String(f.id) === id)
            return fee && (
                fee.name.toLowerCase().includes('seat') || 
                fee.name.toLowerCase().includes('reservation')
            )
        })
    }, [selectedPlan, selectedFees, branch.fees])

    // Reset seat if selection becomes disabled (e.g. fee deselected)
    React.useEffect(() => {
        if (!isSeatSelectionEnabled && selectedSeat) {
            setSelectedSeat(null)
        }
    }, [isSeatSelectionEnabled, selectedSeat])

    // Remove conflicting fees when plan includes them
    React.useEffect(() => {
        if (!selectedPlan) return

        const feesToRemove: string[] = []
        branch.fees?.forEach(f => {
            const name = f.name.toLowerCase()
            const isSeatFee = name.includes('seat') || name.includes('reservation')
            const isLockerFee = name.includes('locker')

            if (selectedPlan.includesSeat && isSeatFee) {
                if (selectedFees.includes(String(f.id))) feesToRemove.push(String(f.id))
            }
            if (selectedPlan.includesLocker && isLockerFee) {
                if (selectedFees.includes(String(f.id))) feesToRemove.push(String(f.id))
            }
        })

        if (feesToRemove.length > 0) {
            setSelectedFees(prev => prev.filter(id => !feesToRemove.includes(id)))
        }
    }, [selectedPlan, branch.fees, selectedFees])

    // Group seats by section
    const seatsBySection = sortedSeats.reduce((acc: Record<string, SeatWithOccupancy[]>, seat) => {
        const section = seat.section || 'General'
        if (!acc[section]) acc[section] = []
        acc[section].push(seat)
        return acc
    }, {})

    const handleSeatSelect = (seat: SeatWithOccupancy) => {
        if (seat.isOccupied) return
        setSelectedSeat(seat)
    }

    const handleLockerSelect = (locker: LockerWithOccupancy) => {
        if (locker.isOccupied) return
        setSelectedLocker(locker)
    }

    const handleProceedToPayment = () => {
        if (!selectedPlan) {
            toast.error('Please select a plan')
            return
        }
        
        // Check if seat is mandatory (if plan includes seat OR if user selected a seat reservation fee)
        const isSeatMandatory = selectedPlan.includesSeat || selectedFees.some(id => {
            const fee = branch.fees.find(f => String(f.id) === id)
            return fee && (
                fee.name.toLowerCase().includes('seat') || 
                fee.name.toLowerCase().includes('reservation')
            )
        })
        
        if (isSeatMandatory && !selectedSeat) {
            toast.error('Please select a seat')
            return
        }

        if (shouldShowLockerSelection && !selectedLocker) {
            toast.error('Please select a locker')
            return
        }

        setStep('payment')
    }

    const handlePaymentSuccess = async (paymentId?: string, status?: 'completed' | 'pending_verification', proofUrl?: string) => {
        if (!selectedPlan) {
            toast.error('No plan selected')
            return
        }
        setIsLoading(true)
        try {
            const result = await createBooking({
                studentId,
                branchId: branch.id,
                planId: selectedPlan.id,
                seatId: selectedSeat?.id,
                lockerId: selectedLocker?.id,
                startDate: bookingDate,
                quantity,
                additionalFeeIds: selectedFees,
                paymentId,
                paymentDetails: proofUrl ? {
                    amount: totalAmount,
                    method: 'manual', 
                    proofUrl
                } : undefined
            })

            if (result.success) {
                setSuccessData({
                    status: status || 'completed',
                    paymentId: result.paymentId
                })
                setStep('success')
            } else {
                toast.error(result.error || 'Booking failed')
            }
        } catch (error) {
            console.error('Booking error:', error)
            toast.error('Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    // Helper to format 24h time to 12h
    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '-'
        const [hours, minutes] = timeStr.split(':')
        const h = parseInt(hours)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${h12}:${minutes} ${ampm}`
    }

    if (step === 'success' && successData) {
        return (
            <div className="max-w-xl mx-auto min-h-[60vh] flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm text-center space-y-6 w-full animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
                    
                    {/* Branding Header */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 opacity-50" />
                    <div className="flex items-center justify-center gap-2 mb-2 opacity-90">
                        <LibraryIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">BookMyLib</span>
                    </div>

                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-10 h-10 text-green-600 dark:text-green-400" strokeWidth={3} />
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {successData.status === 'pending_verification' ? 'Payment Submitted!' : 'Booking Confirmed!'}
                        </h2>
                        
                        <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-full border border-gray-100 dark:border-gray-600">
                            <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                {branch.name}
                            </span>
                        </div>

                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            {successData.status === 'pending_verification' 
                                ? 'Thank you for your payment. Your booking is currently under verification.' 
                                : 'Thank you! Your subscription is now active.'}
                        </p>
                    </div>

                    {successData.status === 'pending_verification' && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-left flex gap-3">
                            <Info className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm">Next Steps</h4>
                                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 list-disc pl-4">
                                    <li>Visit the front desk to get your booking approved immediately.</li>
                                    <li>Or wait for the library staff to verify your payment online.</li>
                                    <li>You will receive a notification once verified.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 space-y-3">
                        <Button
                            onClick={() => router.push('/student/home')}
                            className="w-full"
                        >
                            Go to Dashboard
                        </Button>
                        <button
                            onClick={() => router.push('/student/payments?tab=history')}
                            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
                        >
                            View Payment History
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (step === 'payment' && selectedPlan) {
        const upgradeCredit = (action === 'upgrade' && currentSubscription?.plan) ? currentSubscription.plan.price : 0
        
        return (
            <div className="max-w-3xl mx-auto pb-8 pt-0">
                <BookingPayment 
                    plan={selectedPlan}
                    seat={selectedSeat}
                    locker={selectedLocker}
                    fees={branch.fees?.filter(f => selectedFees.includes(String(f.id))) || []}
                    branchId={branch.id}
                    branchName={branch.name}
                    adjustmentAmount={upgradeCredit}
                    adjustmentLabel="Upgrade Credit"
                    upiId={(branch as unknown as { upiId?: string }).upiId || undefined}
                    payeeName={(branch as unknown as { payeeName?: string }).payeeName || undefined}
                    startDate={bookingDate}
                    quantity={quantity}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setStep('selection')}
                />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto min-h-[calc(100vh-8rem)]">
            <div className="mb-6 space-y-1 -mx-4 md:-mx-0">
                <BranchHeader branch={branch} images={images} amenities={amenities} />
            </div>

            {/* Main Booking Flow */}
            <div className="space-y-6 flex flex-col h-full relative z-20">
                 {/* Plan Selection (Step 1) */}
                 <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        1. Select Plan
                    </h3>
                    
                    <div className="space-y-2 max-h-[400px] overflow-y-auto px-1 -mx-1 custom-scrollbar">
                        {visiblePlans.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-sm">
                                    {action === 'upgrade' ? 'No higher plans available for upgrade.' : 'No subscription plans available.'}
                                </p>
                            </div>
                        ) : (
                            visiblePlans.map(plan => (
                                <div 
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    className={cn(
                                        "p-3 rounded-xl border cursor-pointer transition-all duration-200 relative",
                                        selectedPlan && String(selectedPlan.id) === String(plan.id)
                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm ring-1 ring-emerald-500/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{plan.name}</h4>
                                            {selectedPlan && String(selectedPlan.id) === String(plan.id) && (
                                                <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                                    <Check className="w-2.5 h-2.5 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{plan.price}</span>
                                    </div>
                                    
                                    {selectedPlan && String(selectedPlan.id) === String(plan.id) ? (
                                        <div className="py-2">
                                            <div className="flex items-center justify-between bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800">
                                                <span className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Quantity:</span>
                                                <div className="flex items-center gap-3">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setQuantity(Math.max(1, quantity - 1))
                                                        }}
                                                        className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-colors text-emerald-700 dark:text-emerald-300 disabled:opacity-50"
                                                        disabled={quantity <= 1}
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-100 w-4 text-center">{quantity}</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setQuantity(quantity + 1)
                                                        }}
                                                        className="p-1 hover:bg-white dark:hover:bg-gray-800 rounded-md transition-colors text-emerald-700 dark:text-emerald-300"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{plan.description}</p>
                                            
                                            <div className="flex items-center gap-2 mb-2 text-[11px] text-gray-600 dark:text-gray-300">
                                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                    <Clock className="w-2.5 h-2.5 text-gray-400" />
                                                    <span className="font-medium">{plan.duration} {plan.durationUnit}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                    <Info className="w-2.5 h-2.5 text-gray-400" />
                                                    <span className="font-medium">
                                                        {plan.category === 'fixed' 
                                                            ? `${formatTime(plan.shiftStart)} - ${formatTime(plan.shiftEnd)}`
                                                            : `${plan.hoursPerDay} Hrs/Day`
                                                        }
                                                    </span>
                                                </div>
                                                
                                                {plan.includesSeat && (
                                                    <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded border border-purple-100 dark:border-purple-800">
                                                        <Armchair className="w-2.5 h-2.5 text-purple-500" />
                                                        <span className="font-medium text-purple-700 dark:text-purple-300">Seat</span>
                                                    </div>
                                                )}
                                                {plan.includesLocker && (
                                                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800">
                                                        <Lock className="w-2.5 h-2.5 text-amber-500" />
                                                        <span className="font-medium text-amber-700 dark:text-amber-300">Locker</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-1.5">
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize",
                                                    plan.category === 'fixed'
                                                        ? "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30"
                                                        : "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-900/30"
                                                )}>
                                                    {plan.category}
                                                </span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 capitalize">
                                                    {plan.billingCycle.replace(/_/g, ' ')}
                                                </span>
                                                {plan.includesSeat && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30 flex items-center gap-1">
                                                        <Armchair className="w-3 h-3" />
                                                        Seat
                                                    </span>
                                                )}
                                                {plan.includesLocker && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30 flex items-center gap-1">
                                                        <Lock className="w-3 h-3" />
                                                        Locker
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Additional Fees (Step 2) */}
                {(branch.fees?.length > 0) && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-purple-500" />
                            2. Additional Fees
                        </h3>
                        <div className="space-y-3">
                            {branch.fees.map(fee => {
                                // Check if fee should be hidden because it's included in plan
                                const name = fee.name.toLowerCase()
                                const isSeatFee = name.includes('seat') || name.includes('reservation')
                                const isLockerFee = name.includes('locker')
                                
                                const isIncluded = selectedPlan && (
                                    (selectedPlan.includesSeat && isSeatFee) ||
                                    (selectedPlan.includesLocker && isLockerFee)
                                )

                                if (isIncluded) return null

                                return (
                                <div 
                                    key={fee.id}
                                    onClick={() => {
                                        const id = String(fee.id)
                                        setSelectedFees(prev => 
                                            prev.includes(id)
                                                ? prev.filter(f => f !== id)
                                                : [...prev, id]
                                        )
                                    }}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                        selectedFees.includes(String(fee.id))
                                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                            : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            selectedFees.includes(String(fee.id))
                                                ? "bg-purple-500 border-purple-500"
                                                : "border-gray-300 dark:border-gray-600"
                                        )}>
                                            {selectedFees.includes(String(fee.id)) && <Check className="w-3 h-3 text-white" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">{fee.name}</p>
                                            {fee.description && (
                                                <p className="text-xs text-gray-500 capitalize">{fee.description}</p>
                                            )}
                                        </div>
                                    </div>
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                        ₹{fee.amount}
                                    </span>
                                </div>
                            )})}
                            
                            {/* Show included benefits if any */}
                            {selectedPlan && selectedPlan.includesSeat && (
                                <div className="flex items-center justify-between p-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800 opacity-80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-emerald-900 dark:text-emerald-100">Seat Reservation</p>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-300">Included in Plan</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {selectedPlan && selectedPlan.includesLocker && (
                                <div className="flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800 opacity-80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-purple-900 dark:text-purple-100">Locker Facility</p>
                                            <p className="text-xs text-purple-700 dark:text-purple-300">Included in Plan</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Seat Map (Step 3) */}
                {isSeatSelectionEnabled && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col relative z-10">
                    
                    <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between w-full md:w-auto gap-4">
                            <div>
                                <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 shrink-0" />
                                    <span className="line-clamp-1">{branch.name} Seat Map</span>
                                </h2>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {selectedPlan?.includesSeat 
                                        ? "Seat included in your plan. Please select a seat."
                                        : "Choose your preferred seat (Optional)."
                                    }
                                </p>
                            </div>
                            
                            {/* View Toggle (Mobile Only) */}
                            <div className="flex md:hidden bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setViewMode('pagination')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        viewMode === 'pagination' 
                                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('scroll')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        viewMode === 'scroll' 
                                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
                                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* View Toggle (Desktop) */}
                            <div className="hidden md:flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setViewMode('pagination')}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        viewMode === 'pagination' 
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    )}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    Paged
                                </button>
                                <button
                                    onClick={() => setViewMode('scroll')}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        viewMode === 'scroll' 
                                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                    Scroll
                                </button>
                            </div>

                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-emerald-500 rounded" />
                                <span className="text-gray-600 dark:text-gray-300">Available</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-emerald-500 rounded" />
                                <span className="text-gray-600 dark:text-gray-300">Selected</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded" />
                                <span className="text-gray-600 dark:text-gray-300">Occupied</span>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="p-4 md:p-6 bg-white dark:bg-gray-800 min-h-[300px]">
                        {viewMode === 'pagination' ? (
                            <div className="space-y-8">
                                {Object.entries(seatsBySection).map(([section, seats]) => {
                                    const sectionSeats = seats as SeatWithOccupancy[]
                                    const currentPage = pageBySection[section] || 0
                                    const totalPages = Math.ceil(sectionSeats.length / (columns * 4)) // 4 rows
                                    
                                    const currentSeats = sectionSeats.slice(
                                        currentPage * (columns * 4),
                                        (currentPage + 1) * (columns * 4)
                                    )

                                    return (
                                        <div key={section} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {section} Section
                                                </h3>
                                                
                                                {totalPages > 1 && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setPageBySection(prev => ({
                                                                ...prev,
                                                                [section]: Math.max(0, (prev[section] || 0) - 1)
                                                            }))}
                                                            disabled={currentPage === 0}
                                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                        >
                                                            <ChevronLeft className="w-4 h-4" />
                                                        </button>
                                                        <span className="text-xs font-medium text-gray-500 min-w-[3rem] text-center">
                                                            {currentPage + 1} / {totalPages}
                                                        </span>
                                                        <button
                                                            onClick={() => setPageBySection(prev => ({
                                                                ...prev,
                                                                [section]: Math.min(totalPages - 1, (prev[section] || 0) + 1)
                                                            }))}
                                                            disabled={currentPage === totalPages - 1}
                                                            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div 
                                                className="grid gap-2 md:gap-3"
                                                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                            >
                                                {currentSeats.map(seat => (
                                                    <motion.button
                                                        key={seat.id}
                                                        whileHover={!seat.isOccupied ? { scale: 1.05 } : {}}
                                                        whileTap={!seat.isOccupied ? { scale: 0.95 } : {}}
                                                        onClick={() => handleSeatSelect(seat)}
                                                        disabled={seat.isOccupied}
                                                        className={cn(
                                                            "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative group",
                                                            seat.isOccupied
                                                                ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60 text-gray-400 dark:text-gray-500"
                                                                : selectedSeat?.id === seat.id
                                                                    ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                                                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-sm text-gray-900 dark:text-gray-100"
                                                        )}
                                                    >
                                                        <Armchair className={cn(
                                                            "w-6 h-6 md:w-7 md:h-7",
                                                            seat.isOccupied ? "opacity-50" : ""
                                                        )} />
                                                        <span className="text-sm md:text-base font-semibold truncate w-full text-center px-1">
                                                            {formatSeatNumber(seat.number)}
                                                        </span>
                                                        {selectedSeat?.id === seat.id && (
                                                            <motion.div
                                                                layoutId="check"
                                                                className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-sm"
                                                            >
                                                                <Check className="w-2 h-2 md:w-2.5 md:h-2.5" />
                                                            </motion.div>
                                                        )}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(seatsBySection).map(([section, seats]) => (
                                    <div key={section} className="space-y-3">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            {section} Section
                                        </h3>
                                        <div 
                                            className="grid gap-2 md:gap-3"
                                            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                        >
                                            {(seats as SeatWithOccupancy[]).map(seat => (
                                                <motion.button
                                                    key={seat.id}
                                                    whileHover={!seat.isOccupied ? { scale: 1.05 } : {}}
                                                    whileTap={!seat.isOccupied ? { scale: 0.95 } : {}}
                                                    onClick={() => handleSeatSelect(seat)}
                                                    disabled={seat.isOccupied}
                                                    className={cn(
                                                        "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative",
                                                        seat.isOccupied
                                                            ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60 text-gray-400 dark:text-gray-500"
                                                            : selectedSeat?.id === seat.id
                                                                ? "bg-emerald-500 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                                                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-sm text-gray-900 dark:text-gray-100"
                                                    )}
                                                >
                                                    <Armchair className={cn(
                                                        "w-6 h-6 md:w-7 md:h-7",
                                                        seat.isOccupied ? "opacity-50" : ""
                                                    )} />
                                                    <span className="text-sm md:text-base font-semibold truncate w-full text-center px-1">
                                                        {formatSeatNumber(seat.number)}
                                                    </span>
                                                    {selectedSeat?.id === seat.id && (
                                                        <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                                                            <Check className="w-2 h-2 md:w-2.5 md:h-2.5" />
                                                        </div>
                                                    )}
                                                </motion.button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Locker Selection */}
                {shouldShowLockerSelection && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col relative z-10">
                    <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                        <div>
                            <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Lock className="w-4 h-4 md:w-5 md:h-5 text-purple-500 shrink-0" />
                                <span className="line-clamp-1">{branch.name} Lockers</span>
                            </h2>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Select your preferred locker.
                            </p>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 bg-white dark:bg-gray-800 min-h-[200px]">
                        <div 
                            className="grid gap-2 md:gap-3"
                            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                        >
                            {sortedLockers.map(locker => (
                                <motion.button
                                    key={locker.id}
                                    whileHover={!locker.isOccupied ? { scale: 1.05 } : {}}
                                    whileTap={!locker.isOccupied ? { scale: 0.95 } : {}}
                                    onClick={() => handleLockerSelect(locker)}
                                    disabled={locker.isOccupied}
                                    className={cn(
                                        "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative group",
                                        locker.isOccupied
                                            ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60 text-gray-400 dark:text-gray-500"
                                            : selectedLocker?.id === locker.id
                                                ? "bg-purple-500 border-purple-600 text-white shadow-md shadow-purple-500/20"
                                                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm text-gray-900 dark:text-gray-100"
                                    )}
                                >
                                    <Lock className={cn(
                                        "w-5 h-5 md:w-6 md:h-6",
                                        locker.isOccupied ? "opacity-50" : ""
                                    )} />
                                    <span className="text-sm md:text-base font-semibold truncate w-full text-center px-1">
                                        {locker.number}
                                    </span>
                                    {selectedLocker?.id === locker.id && (
                                        <motion.div
                                            layoutId="check-locker"
                                            className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-sm"
                                        >
                                            <Check className="w-2 h-2 md:w-2.5 md:h-2.5" />
                                        </motion.div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>
                )}

                {/* Date Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        Start Date
                    </h3>
                    <div className="flex gap-4">
                    <div className="w-1/3 space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                            Quantity
                        </label>
                        <select
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none cursor-pointer"
                        >
                            {[1, 2, 3, 4, 5, 6, 12].map(num => (
                                <option key={num} value={num}>
                                    {num} {selectedPlan?.durationUnit === 'months' && num > 1 ? 'Months' : 'Cycle'}{num > 1 ? 's' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 space-y-1.5">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={bookingDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>
                </div>
                </div>

                {/* Action Button */}
                <Button
                    size="lg"
                    onClick={handleProceedToPayment}
                    disabled={isLoading || !selectedPlan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 w-full"
                >
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CreditCard className="w-4 h-4 mr-2" />
                    {selectedPlan ? `Pay ₹${totalAmount} & Book` : 'Select a Plan First'}
                </Button>
            </div>
        </div>
    )
}
