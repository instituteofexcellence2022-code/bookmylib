'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
    Check, Armchair, Calendar, 
    Clock, MapPin, Info,
    ChevronRight, ChevronLeft, Plus, Minus, Filter,
    Lock, LayoutGrid, List, Library as LibraryIcon,
    ChevronUp, ChevronDown, Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { createBooking } from '@/actions/booking'
import { cn, formatSeatNumber, formatLockerNumber } from '@/lib/utils'

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
    activeSubscription?: {
        id: string
        plan: Plan
        startDate: Date | string
        endDate: Date | string
        hasLocker: boolean
        lockerId?: string | null
    }
    images?: string[]
    amenities?: string[]
}

export default function BookingClient({ branch, studentId, currentSubscription, activeSubscription, images = [], amenities = [] }: BookingClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const action = searchParams.get('action')
    const planIdParam = searchParams.get('planId')

    // Check for Locker Add-on Mode
    // State to toggle between "New Booking" and "Add Locker to Active Plan"
    const [isLockerAddOnMode, setIsLockerAddOnMode] = useState(false)
    const isLockerAddOn = isLockerAddOnMode

    const [step, setStep] = useState<'selection' | 'payment' | 'success'>('selection')
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
    const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<ExtendedPlan | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(false)
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [filterDuration, setFilterDuration] = useState<string>('all')

    const [successData, setSuccessData] = useState<{
        status: 'completed' | 'pending_verification',
        paymentId?: string
    } | null>(null)
    
    // Pagination state
    const [pageBySection, setPageBySection] = useState<Record<string, number>>({})
    const [columns, setColumns] = useState(4)
    const [viewMode, setViewMode] = useState<'pagination' | 'scroll'>('pagination')
    const [seatFilter, setSeatFilter] = useState<'all' | 'available' | 'occupied' | 'selected'>('all')
    const [lockerFilter, setLockerFilter] = useState<'all' | 'available' | 'occupied' | 'selected'>('all')
    const [lockerViewMode, setLockerViewMode] = useState<'pagination' | 'scroll'>('pagination')

    const DURATION_FILTERS = [
        { id: 'all', label: 'All Plans' },
        { id: '1mo', label: '1 Mo' },
        { id: '3mo', label: '3 Mo' },
        { id: '6mo', label: '6 Mo' },
        { id: 'other', label: 'Other' }
    ]

    // Filter plans based on action and filters
    const filteredPlans = React.useMemo(() => {
        let plans = branch.plans
        
        // Filter by action (upgrade)
        const currentPlan = currentSubscription?.plan
        if (action === 'upgrade' && currentPlan) {
            plans = plans.filter(p => p.price > currentPlan.price)
        }

        // Apply UI filters
        return plans.filter(plan => {
            const matchCategory = filterCategory === 'all' || plan.category === filterCategory
            
            let matchDuration = true
            if (filterDuration !== 'all') {
                if (filterDuration === '1mo') {
                    matchDuration = plan.duration === 1 && plan.durationUnit.toLowerCase().startsWith('month')
                } else if (filterDuration === '3mo') {
                    matchDuration = plan.duration === 3 && plan.durationUnit.toLowerCase().startsWith('month')
                } else if (filterDuration === '6mo') {
                    matchDuration = plan.duration === 6 && plan.durationUnit.toLowerCase().startsWith('month')
                } else if (filterDuration === 'other') {
                    const isStandard = (
                        (plan.duration === 1 && plan.durationUnit.toLowerCase().startsWith('month')) ||
                        (plan.duration === 3 && plan.durationUnit.toLowerCase().startsWith('month')) ||
                        (plan.duration === 6 && plan.durationUnit.toLowerCase().startsWith('month'))
                    )
                    matchDuration = !isStandard
                }
            }
            
            return matchCategory && matchDuration
        })
    }, [action, currentSubscription, branch.plans, filterCategory, filterDuration])

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

    // Auto-select for Locker Add-on
    React.useEffect(() => {
        if (isLockerAddOn && activeSubscription) {
            // Select the plan
            setSelectedPlan(activeSubscription.plan as ExtendedPlan)
            
            // Set Date to active plan's start date
            const start = new Date(activeSubscription.startDate)
            if (!isNaN(start.getTime())) {
                setBookingDate(start.toISOString().split('T')[0])
            }
        } else if (!isLockerAddOn && selectedPlan?.id === activeSubscription?.plan.id && activeSubscription) {
             // If exiting add-on mode, clear selection if it was the active plan
             setSelectedPlan(null)
             setBookingDate(new Date().toISOString().split('T')[0])
        }
    }, [isLockerAddOn, activeSubscription])

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

    const calculateFeeTotal = (fee: AdditionalFee) => {
        let amount = Number(fee.amount)
        if (fee.billType === 'MONTHLY' && selectedPlan?.durationUnit === 'months') {
            amount *= (selectedPlan.duration || 1)
        }
        return amount * quantity
    }

    // Calculate total
    const planPrice = isLockerAddOn ? 0 : (Number(selectedPlan?.price) || 0)
    const totalAmount = Math.round((planPrice * quantity) + 
        (branch.fees || []).filter(f => selectedFees.includes(String(f.id)))
            .reduce((sum: number, f) => sum + calculateFeeTotal(f), 0))

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
    const isLockerSelectionEnabled = React.useMemo(() => {
        // Always enable for locker add-on mode (unless already has locker, but that logic is upstream)
        if (isLockerAddOn) return true

        // Check for "Locker" fee
        const hasLockerFee = selectedFees.some(id => {
            const fee = branch.fees.find(f => String(f.id) === id)
            return fee && fee.name.toLowerCase().includes('locker')
        })

        // If user explicitly pays for a locker fee, allow selection
        if (hasLockerFee) return true

        if (!branch.hasLockers) return false

        // Check if plan includes locker
        if (selectedPlan?.includesLocker) {
            // If plan includes locker, only allow selection if lockers are separate
            // If they are part of seat (not separate), they are auto-assigned
            return branch.isLockerSeparate
        }

        return false
    }, [selectedPlan, selectedFees, branch.fees, branch.hasLockers, branch.isLockerSeparate])

    // Reset locker if hidden
    React.useEffect(() => {
        if (!isLockerSelectionEnabled && selectedLocker) {
            setSelectedLocker(null)
        }
    }, [isLockerSelectionEnabled, selectedLocker])

    // Check if seat selection is allowed
    const isSeatSelectionEnabled = React.useMemo(() => {
        if (isLockerAddOn) return false
        if (!selectedPlan) return false
        
        // Check if plan includes seat
        if (selectedPlan.includesSeat) return true

        // Check for "Seat Reservation" or similar fee
        const seatFeeExists = branch.fees?.some(f => 
            f.name.toLowerCase().includes('seat') || 
            f.name.toLowerCase().includes('reservation')
        )

        if (!seatFeeExists) return true // If no specific seat fee, allow selection

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
    const seatsBySection = React.useMemo(() => {
        return sortedSeats.reduce<Record<string, SeatWithOccupancy[]>>((acc, seat) => {
            const section = seat.section || 'General'
            if (!acc[section]) acc[section] = []
            acc[section].push(seat)
            return acc
        }, {})
    }, [sortedSeats])

    // Group lockers by section
    const lockersBySection = React.useMemo(() => {
        return sortedLockers.reduce<Record<string, LockerWithOccupancy[]>>((acc, locker) => {
            const section = 'General'
            if (!acc[section]) acc[section] = []
            acc[section].push(locker)
            return acc
        }, {})
    }, [sortedLockers])

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
        // detailed check: if it's a locker add-on, we skip seat validation as the student already has a seat/plan
        const isSeatMandatory = !isLockerAddOn && (selectedPlan.includesSeat || selectedFees.some(id => {
            const fee = branch.fees.find(f => String(f.id) === id)
            return fee && (
                fee.name.toLowerCase().includes('seat') || 
                fee.name.toLowerCase().includes('reservation')
            )
        }))
        
        if (isSeatMandatory && !selectedSeat) {
            toast.error('Please select a seat')
            return
        }

        if (isLockerSelectionEnabled && !selectedLocker) {
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
                } : undefined,
                isAddOn: isLockerAddOn,
                activeSubscriptionId: activeSubscription?.id
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
                    activeSubscriptionId={activeSubscription?.id}
                    lockerIdForAddOn={isLockerAddOn ? selectedLocker?.id : undefined}
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
                    {isLockerAddOn ? (
                        <div className="flex flex-col gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                1. Active Plan
                            </h3>
                            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white">{activeSubscription?.plan.name}</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Adding locker to this active plan</p>
                                </div>
                                <div className="text-right">
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => setIsLockerAddOnMode(false)}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                                    >
                                        Back to Plans
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                    <>
                    <div className="flex flex-col gap-3 mb-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-500" />
                                1. Select Plan
                            </h3>

                            {/* Category Filter */}
                            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-900 rounded-lg shrink-0">
                                {['all', 'fixed', 'flexible'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setFilterCategory(cat)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all capitalize",
                                            filterCategory === cat
                                                ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm"
                                                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                        )}
                                    >
                                        {cat === 'all' ? 'All' : cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Duration Filter */}
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                            {DURATION_FILTERS.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setFilterDuration(filter.id)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap",
                                        filterDuration === filter.id
                                            ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
                                            : "bg-white border-gray-200 text-gray-600 hover:border-purple-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                    )}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Active Plan Offer Card */}
                    {activeSubscription && !action && (
                        <div className="mb-4 p-4 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center shrink-0">
                                    <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">Need a locker for your active plan?</h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Add a locker to your <span className="font-semibold text-purple-700 dark:text-purple-300">{activeSubscription.plan.name}</span>
                                    </p>
                                </div>
                            </div>
                            <Button 
                                onClick={() => setIsLockerAddOnMode(true)}
                                size="sm"
                                className="whitespace-nowrap bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                Add Locker Only
                            </Button>
                        </div>
                    )}

                    <div className="space-y-2 max-h-[400px] overflow-y-auto px-1 -mx-1 custom-scrollbar">
                        {filteredPlans.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-sm font-medium">No plans match your filters.</p>
                                <button 
                                    onClick={() => { setFilterCategory('all'); setFilterDuration('all'); }}
                                    className="text-xs text-purple-600 dark:text-purple-400 mt-2 hover:underline"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        ) : (
                            filteredPlans.map(plan => (
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
                                                    ? `${formatTime(plan.shiftStart || undefined)} - ${formatTime(plan.shiftEnd || undefined)}`
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

                                    <div className="flex flex-wrap gap-1.5 mb-2">
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

                                    {selectedPlan && String(selectedPlan.id) === String(plan.id) && (
                                        <div className="py-2 mt-auto">
                                            <div className="flex items-center justify-between bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg p-2 border border-emerald-200 dark:border-emerald-800">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-800 dark:text-emerald-200">Total Duration</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-sm font-bold text-emerald-950 dark:text-emerald-50">
                                                            {quantity * plan.duration} {plan.durationUnit?.toLowerCase().startsWith('m') ? (quantity * plan.duration > 1 ? 'Months' : 'Month') : (quantity * plan.duration > 1 ? 'Days' : 'Day')}
                                                        </span>
                                                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                                                            ({quantity} × {plan.duration} {plan.durationUnit?.toLowerCase().startsWith('m') ? (plan.duration > 1 ? 'Months' : 'Month') : (plan.duration > 1 ? 'Days' : 'Day')})
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-emerald-200 dark:border-emerald-700 shadow-sm">
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (quantity > 1) {
                                                                setQuantity(quantity - 1)
                                                            } else {
                                                                setSelectedPlan(null)
                                                                setQuantity(1)
                                                                setSelectedSeat(null)
                                                                setSelectedLocker(null)
                                                                setSelectedFees([])
                                                            }
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-l-md transition-colors"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{quantity}</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setQuantity(quantity + 1)
                                                        }}
                                                        className="w-7 h-7 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-r-md transition-colors"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    </>
                    )}
                </div>


                {/* Additional Fees (Step 2) */}
                {(branch.fees?.length > 0) && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-fit space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Info className="w-5 h-5 text-purple-500" />
                            2. Customize Plan
                        </h3>

                        <div className="grid grid-cols-[2fr_3fr] gap-6">
                            {/* Locker Section */}
                            {(isLockerAddOn || selectedPlan?.includesLocker || branch.fees.some(f => f.name.toLowerCase().includes('locker'))) && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                        <Lock className="w-3.5 h-3.5" />
                                        Locker Facility
                                    </h4>
                                    
                                    {selectedPlan?.includesLocker ? (
                                        <div className="flex flex-col items-center justify-center px-1 py-3 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800 text-center gap-1">
                                            <p className="font-medium text-sm text-purple-900 dark:text-purple-100">Locker Included</p>
                                            <p className="text-[10px] text-purple-700 dark:text-purple-300 leading-tight">Part of your plan</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {branch.fees.filter(f => f.name.toLowerCase().includes('locker')).map(fee => (
                                                <label key={fee.id} className={cn(
                                                    "relative flex flex-col items-center justify-center px-1 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200 text-center gap-1 group",
                                                    selectedFees.includes(String(fee.id))
                                                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md transform scale-[1.02]"
                                                        : "border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 hover:border-purple-200"
                                                )}>
                                                    {selectedFees.includes(String(fee.id)) && (
                                                        <div className="absolute -top-2 -right-2 bg-purple-500 text-white p-1 rounded-full shadow-sm animate-in zoom-in duration-200">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden"
                                                        checked={selectedFees.includes(String(fee.id))}
                                                        onChange={() => {
                                                            const id = String(fee.id)
                                                            setSelectedFees(prev => 
                                                                prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
                                                            )
                                                        }}
                                                    />
                                                    <span className={cn(
                                                        "text-sm font-medium whitespace-nowrap transition-colors",
                                                        selectedFees.includes(String(fee.id)) ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400"
                                                    )}>{fee.name}</span>
                                                    <span className={cn(
                                                        "text-lg font-bold transition-colors",
                                                        selectedFees.includes(String(fee.id)) ? "text-purple-900 dark:text-white" : "text-gray-900 dark:text-white"
                                                    )}>₹{fee.amount}/m</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Seat Section */}
                            {!isLockerAddOn && (selectedPlan?.includesSeat || branch.fees.some(f => f.name.toLowerCase().includes('seat') || f.name.toLowerCase().includes('reservation'))) && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                        <Armchair className="w-3.5 h-3.5" />
                                        Seat Reservation
                                    </h4>
                                    
                                    {selectedPlan?.includesSeat ? (
                                        <div className="flex flex-col items-center justify-center px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800 text-center gap-1">
                                            <p className="font-medium text-sm text-emerald-900 dark:text-emerald-100">Seat Included</p>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-300">Select seat below</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {branch.fees.filter(f => f.name.toLowerCase().includes('seat') || f.name.toLowerCase().includes('reservation')).map(fee => (
                                                <label key={fee.id} className={cn(
                                                    "relative flex flex-col items-center justify-center px-4 py-4 rounded-xl border-2 cursor-pointer transition-all duration-200 text-center gap-1 group",
                                                    selectedFees.includes(String(fee.id))
                                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-md transform scale-[1.02]"
                                                        : "border-transparent bg-gray-50 dark:bg-gray-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:border-emerald-200"
                                                )}>
                                                    {selectedFees.includes(String(fee.id)) && (
                                                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full shadow-sm animate-in zoom-in duration-200">
                                                            <Check className="w-3 h-3" />
                                                        </div>
                                                    )}
                                                    <input 
                                                        type="checkbox" 
                                                        className="hidden"
                                                        checked={selectedFees.includes(String(fee.id))}
                                                        onChange={() => {
                                                            if (!selectedPlan) {
                                                                toast.error('Please select a plan first')
                                                                return
                                                            }
                                                            const id = String(fee.id)
                                                            setSelectedFees(prev => 
                                                                prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
                                                            )
                                                        }}
                                                    />
                                                    <span className={cn(
                                                        "text-sm font-medium whitespace-nowrap transition-colors",
                                                        selectedFees.includes(String(fee.id)) ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600 dark:text-gray-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400"
                                                    )}>{fee.name}</span>
                                                    <span className={cn(
                                                        "text-lg font-bold transition-colors",
                                                        selectedFees.includes(String(fee.id)) ? "text-emerald-900 dark:text-white" : "text-gray-900 dark:text-white"
                                                    )}>₹{fee.amount}/m</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Other Add-ons */}
                        {!isLockerAddOn && branch.fees.some(f => {
                            const name = f.name.toLowerCase()
                            return !name.includes('locker') && !name.includes('seat') && !name.includes('reservation')
                        }) && (
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                    Other Add-ons
                                </h4>
                                <div className="space-y-2">
                                    {branch.fees.filter(f => {
                                            const name = f.name.toLowerCase()
                                            return !name.includes('locker') && !name.includes('seat') && !name.includes('reservation')
                                    }).map(fee => (
                                        <label key={fee.id} className={cn(
                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                            selectedFees.includes(String(fee.id))
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/20"
                                                : "border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                        )}>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                    selectedFees.includes(String(fee.id))
                                                        ? "bg-blue-500 border-blue-500 text-white"
                                                        : "border-gray-300 dark:border-gray-600"
                                                )}>
                                                    {selectedFees.includes(String(fee.id)) && <Check className="w-3 h-3" />}
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={selectedFees.includes(String(fee.id))}
                                                    onChange={() => {
                                                        const id = String(fee.id)
                                                        setSelectedFees(prev => 
                                                            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
                                                        )
                                                    }}
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fee.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Date Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        Start Date
                    </h3>
                    <div className="space-y-1.5">
                        <input
                            type="date"
                            disabled={isLockerAddOn}
                            value={bookingDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setBookingDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        />
                        {isLockerAddOn && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-1">
                                * Aligned with your active plan start date
                            </p>
                        )}
                    </div>
                </div>

                {/* Seat Map (Step 3) */}
                {selectedPlan && isSeatSelectionEnabled && (
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

                            {/* Legend with Filters */}
                            <div className="flex flex-wrap gap-2 text-xs">
                                <button 
                                    onClick={() => setSeatFilter(seatFilter === 'available' ? 'all' : 'available')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                        seatFilter === 'available' 
                                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-800" 
                                            : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded" />
                                    <span className={cn("font-medium", seatFilter === 'available' ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600 dark:text-gray-300")}>Available</span>
                                </button>

                                <button 
                                    onClick={() => setSeatFilter(seatFilter === 'selected' ? 'all' : 'selected')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                        seatFilter === 'selected' 
                                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-800" 
                                            : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <div className="w-3 h-3 bg-emerald-500 rounded" />
                                    <span className={cn("font-medium", seatFilter === 'selected' ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600 dark:text-gray-300")}>Selected</span>
                                </button>

                                <button 
                                    onClick={() => setSeatFilter(seatFilter === 'occupied' ? 'all' : 'occupied')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                        seatFilter === 'occupied' 
                                            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800 ring-1 ring-emerald-200 dark:ring-emerald-800" 
                                            : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded" />
                                    <span className={cn("font-medium", seatFilter === 'occupied' ? "text-emerald-700 dark:text-emerald-300" : "text-gray-600 dark:text-gray-300")}>Occupied</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 bg-white dark:bg-gray-800 min-h-[300px]">
                        {viewMode === 'pagination' ? (
                            <div className="space-y-8">
                                {Object.entries(seatsBySection).map(([section, seats]) => {
                                    const filteredSeats = seats.filter(seat => {
                                        if (seatFilter === 'all') return true
                                        if (seatFilter === 'available') return !seat.isOccupied
                                        if (seatFilter === 'occupied') return seat.isOccupied
                                        if (seatFilter === 'selected') return selectedSeat?.id === seat.id
                                        return true
                                    })
                                    
                                    const sectionSeats = filteredSeats
                                    const currentPage = pageBySection[section] || 0
                                    const totalPages = Math.ceil(sectionSeats.length / (columns * 4)) // 4 rows
                                    
                                    const currentSeats = sectionSeats.slice(
                                        currentPage * (columns * 4),
                                        (currentPage + 1) * (columns * 4)
                                    )

                                    if (filteredSeats.length === 0 && seatFilter !== 'all') return null

                                    return (
                                        <div key={section} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {section} Section
                                                    <span className="text-xs font-normal text-gray-400">({seats.filter(s => !s.isOccupied).length} available)</span>
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
                                {Object.entries(seatsBySection).map(([section, seats]) => {
                                    const filteredSeats = seats.filter(seat => {
                                        if (seatFilter === 'all') return true
                                        if (seatFilter === 'available') return !seat.isOccupied
                                        if (seatFilter === 'occupied') return seat.isOccupied
                                        if (seatFilter === 'selected') return selectedSeat?.id === seat.id
                                        return true
                                    })
                                    
                                    if (filteredSeats.length === 0 && seatFilter !== 'all') return null

                                    return (
                                        <div key={section} className="space-y-3">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                {section} Section
                                                <span className="text-xs font-normal text-gray-400">({seats.filter(s => !s.isOccupied).length} available)</span>
                                            </h3>
                                            <div 
                                                className="grid gap-2 md:gap-3"
                                                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                            >
                                                {filteredSeats.map(seat => (
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
                        )}
                    </div>
                </div>
                )}

                {/* Locker Selection */}
                {isLockerSelectionEnabled && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col relative z-10">
                    <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center justify-between w-full md:w-auto gap-4">
                            <div>
                                <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Lock className="w-4 h-4 md:w-5 md:h-5 text-purple-500 shrink-0" />
                                    <span className="line-clamp-1">{branch.name} Lockers</span>
                                </h2>
                                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Select your preferred locker.
                                </p>
                            </div>

                            {/* View Toggle (Mobile Only) */}
                            <div className="flex md:hidden bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                <button
                                    onClick={() => setLockerViewMode('pagination')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        lockerViewMode === 'pagination' 
                                            ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
                                            : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setLockerViewMode('scroll')}
                                    className={cn(
                                        "p-1.5 rounded-md transition-all",
                                        lockerViewMode === 'scroll' 
                                            ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
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
                                    onClick={() => setLockerViewMode('pagination')}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        lockerViewMode === 'pagination' 
                                            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm" 
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    )}
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                    Paged
                                </button>
                                <button
                                    onClick={() => setLockerViewMode('scroll')}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                        lockerViewMode === 'scroll' 
                                            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm" 
                                            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                    Scroll
                                </button>
                            </div>

                            {/* Legend with Filters */}
                            <div className="flex flex-wrap gap-2 text-xs">
                                <button 
                                    onClick={() => setLockerFilter(lockerFilter === 'available' ? 'all' : 'available')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                        lockerFilter === 'available' 
                                            ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800" 
                                            : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded" />
                                    <span className={cn("font-medium", lockerFilter === 'available' ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300")}>Available</span>
                                </button>

                                <button 
                                    onClick={() => setLockerFilter(lockerFilter === 'selected' ? 'all' : 'selected')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                        lockerFilter === 'selected' 
                                            ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800" 
                                            : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <div className="w-3 h-3 bg-purple-500 rounded" />
                                    <span className={cn("font-medium", lockerFilter === 'selected' ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300")}>Selected</span>
                                </button>

                                <button 
                                    onClick={() => setLockerFilter(lockerFilter === 'occupied' ? 'all' : 'occupied')}
                                    className={cn(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                        lockerFilter === 'occupied' 
                                            ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800" 
                                            : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                    )}
                                >
                                    <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded" />
                                    <span className={cn("font-medium", lockerFilter === 'occupied' ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300")}>Occupied</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 md:p-6 bg-white dark:bg-gray-800 min-h-[200px]">
                        {lockerViewMode === 'pagination' ? (
                            <div className="space-y-8">
                                {Object.entries(lockersBySection).map(([section, lockers]) => {
                                    const filteredLockers = lockers.filter(locker => {
                                        if (lockerFilter === 'all') return true
                                        if (lockerFilter === 'available') return !locker.isOccupied
                                        if (lockerFilter === 'occupied') return locker.isOccupied
                                        if (lockerFilter === 'selected') return selectedLocker?.id === locker.id
                                        return true
                                    })
                                    
                                    const sectionLockers = filteredLockers
                                    const currentPage = pageBySection['locker-' + section] || 0
                                    const totalPages = Math.ceil(sectionLockers.length / (columns * 4))
                                    
                                    const currentLockers = sectionLockers.slice(
                                        currentPage * (columns * 4),
                                        (currentPage + 1) * (columns * 4)
                                    )

                                    if (filteredLockers.length === 0 && lockerFilter !== 'all') return null

                                    return (
                                        <div key={section} className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    {section} Section
                                                    <span className="text-xs font-normal text-gray-400">({lockers.filter(l => !l.isOccupied).length} available)</span>
                                                </h3>
                                                
                                                {totalPages > 1 && (
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setPageBySection(prev => ({
                                                                ...prev,
                                                                ['locker-' + section]: Math.max(0, (prev['locker-' + section] || 0) - 1)
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
                                                                ['locker-' + section]: Math.min(totalPages - 1, (prev['locker-' + section] || 0) + 1)
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
                                                {currentLockers.map(locker => (
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
                                                            {formatLockerNumber(locker.number)}
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
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {Object.entries(lockersBySection).map(([section, lockers]) => {
                                    const filteredLockers = lockers.filter(locker => {
                                        if (lockerFilter === 'all') return true
                                        if (lockerFilter === 'available') return !locker.isOccupied
                                        if (lockerFilter === 'occupied') return locker.isOccupied
                                        if (lockerFilter === 'selected') return selectedLocker?.id === locker.id
                                        return true
                                    })
                                    
                                    if (filteredLockers.length === 0 && lockerFilter !== 'all') return null

                                    return (
                                        <div key={section} className="space-y-3">
                                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                {section} Section
                                                <span className="text-xs font-normal text-gray-400">({lockers.filter(l => !l.isOccupied).length} available)</span>
                                            </h3>
                                            <div 
                                                className="grid gap-2 md:gap-3"
                                                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                            >
                                                {filteredLockers.map(locker => (
                                                    <motion.button
                                                        key={locker.id}
                                                        whileHover={!locker.isOccupied ? { scale: 1.05 } : {}}
                                                        whileTap={!locker.isOccupied ? { scale: 0.95 } : {}}
                                                        onClick={() => handleLockerSelect(locker)}
                                                        disabled={locker.isOccupied}
                                                        className={cn(
                                                            "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative",
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
                                                            {formatLockerNumber(locker.number)}
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
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
                )}

                {/* Spacer for fixed bottom bar */}
                <div className="h-44 md:h-24" />
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-[72px] md:bottom-0 left-0 right-0 z-50">
                <AnimatePresence>
                    {isBreakdownOpen && (
                        <>
                            {/* Backdrop to close */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsBreakdownOpen(false)}
                                className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-30"
                            />
                            
                            {/* Breakdown Panel */}
                            <motion.div
                                initial={{ opacity: 0, y: 100 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 100 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="absolute bottom-full left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-xl z-40"
                            >
                                <div className="max-w-3xl mx-auto p-6 space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-gray-900 dark:text-white">Payment Breakdown</h3>
                                        <button 
                                            onClick={() => setIsBreakdownOpen(false)}
                                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                                        >
                                            <ChevronDown className="w-5 h-5 text-gray-500" />
                                        </button>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {/* Plan */}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600 dark:text-gray-400">
                                                {selectedPlan?.name} 
                                                {isLockerAddOn ? (
                                                    <span className="text-xs text-emerald-600 ml-1">(Active)</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">({quantity} × ₹{selectedPlan?.price})</span>
                                                )}
                                            </span>
                                            <span className="font-medium text-gray-900 dark:text-white">
                                                ₹{isLockerAddOn ? 0 : (Number(selectedPlan?.price) || 0) * quantity}
                                            </span>
                                        </div>

                                        {/* Fees */}
                                        {(branch.fees || [])
                                            .filter(f => selectedFees.includes(String(f.id)))
                                            .map(fee => (
                                                <div key={fee.id} className="flex justify-between text-sm">
                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        {fee.name}
                                                        {fee.billType === 'MONTHLY' && selectedPlan?.durationUnit === 'months' && (
                                                            <span className="text-xs text-gray-400"> ({quantity} × {selectedPlan.duration}mo × ₹{fee.amount})</span>
                                                        )}
                                                        {(fee.billType !== 'MONTHLY' || selectedPlan?.durationUnit !== 'months') && quantity > 1 && (
                                                             <span className="text-xs text-gray-400"> ({quantity} × ₹{fee.amount})</span>
                                                        )}
                                                    </span>
                                                    <span className="font-medium text-gray-900 dark:text-white">₹{calculateFeeTotal(fee)}</span>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                    
                                    <div className="flex justify-between text-base font-bold">
                                        <span className="text-gray-900 dark:text-white">Total Amount</span>
                                        <span className="text-purple-600 dark:text-purple-400">₹{totalAmount}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 relative z-50">
                    <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                        <button 
                            onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
                            className="text-left group outline-none"
                        >
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                Total Payable
                                {isBreakdownOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">₹{totalAmount}</p>
                        </button>
                        <Button
                            size="lg"
                            onClick={handleProceedToPayment}
                            disabled={isLoading || !selectedPlan}
                            className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 min-w-[150px]"
                        >
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Continue
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
