'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
    Check, X, Armchair, Calendar, 
    CreditCard, Clock, MapPin, Info,
    ChevronRight, ChevronLeft, ShieldCheck,
    LayoutGrid, List
} from 'lucide-react'
import { motion } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { createBooking } from '@/actions/booking'
import { cn, formatSeatNumber } from '@/lib/utils'

import { Branch, Seat, Plan, AdditionalFee, Library } from '@prisma/client'
import BookingPayment from '@/components/student/BookingPayment'
import BranchHeader from './BranchHeader'

type BranchWithDetails = Branch & {
    library: { name: string }
    seats: (Seat & { isOccupied: boolean })[]
    plans: Plan[]
    fees: AdditionalFee[]
}

interface BookingClientProps {
    branch: BranchWithDetails
    studentId: string
    currentSubscription?: any
    images?: string[]
    amenities?: string[]
}

export default function BookingClient({ branch, studentId, currentSubscription, images = [], amenities = [] }: BookingClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const action = searchParams.get('action')
    const planIdParam = searchParams.get('planId')

    const [step, setStep] = useState<'selection' | 'payment'>('selection')
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(false)
    
    // Pagination state
    const [pageBySection, setPageBySection] = useState<Record<string, number>>({})
    const [columns, setColumns] = useState(4)
    const [viewMode, setViewMode] = useState<'pagination' | 'scroll'>('pagination')

    // Filter plans based on action
    const visiblePlans = React.useMemo(() => {
        if (action === 'upgrade' && currentSubscription?.plan) {
             return branch.plans.filter(p => p.price > currentSubscription.plan.price)
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
                 const seat = branch.seats.find((s: any) => s.id === currentSubscription.seatId)
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
    const totalAmount = (selectedPlan?.price || 0) + 
        (branch.fees || []).filter((f: any) => selectedFees.includes(String(f.id)))
            .reduce((sum: number, f: any) => sum + f.amount, 0)

    // Sort seats naturally
    const sortedSeats = React.useMemo(() => {
        return [...(branch.seats || [])].sort((a: any, b: any) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [branch.seats])

    // Check if seat selection is allowed
    const isSeatSelectionEnabled = React.useMemo(() => {
        if (!selectedPlan) return false
        
        // Check for "Seat Reservation" or similar fee
        const seatFeeExists = branch.fees?.some((f: any) => 
            f.name.toLowerCase().includes('seat') || 
            f.name.toLowerCase().includes('reservation')
        )

        if (!seatFeeExists) return true // If no specific seat fee, allow selection (or maybe disable? assuming allow)

        // If seat fee exists, user must have selected it
        return selectedFees.some(id => {
            const fee = branch.fees.find((f: any) => String(f.id) === id)
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

    // Group seats by section
    const seatsBySection = sortedSeats.reduce((acc: any, seat: any) => {
        const section = seat.section || 'General'
        if (!acc[section]) acc[section] = []
        acc[section].push(seat)
        return acc
    }, {})

    const handleSeatSelect = (seat: any) => {
        if (seat.isOccupied) return
        setSelectedSeat(seat)
    }

    const handleProceedToPayment = () => {
        if (!selectedPlan) {
            toast.error('Please select a plan')
            return
        }
        
        // Check if seat is mandatory (only if user selected a seat reservation fee)
        const isSeatMandatory = selectedFees.some(id => {
            const fee = branch.fees.find((f: any) => String(f.id) === id)
            return fee && (
                fee.name.toLowerCase().includes('seat') || 
                fee.name.toLowerCase().includes('reservation')
            )
        })
        
        if (isSeatMandatory && !selectedSeat) {
            toast.error('Please select a seat')
            return
        }

        setStep('payment')
    }

    const handlePaymentSuccess = async (paymentId?: string, status?: 'completed' | 'pending_verification') => {
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
                startDate: bookingDate,
                additionalFeeIds: selectedFees,
                paymentId
            })

            if (result.success) {
                if (status === 'pending_verification') {
                    toast.success('Your transaction has been sent for verification')
                } else {
                    toast.success('Booking successful!')
                }
                router.push('/student/payments?tab=history')
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
    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '-'
        const [hours, minutes] = timeStr.split(':')
        const h = parseInt(hours)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${h12}:${minutes} ${ampm}`
    }

    if (step === 'payment' && selectedPlan) {
        const upgradeCredit = (action === 'upgrade' && currentSubscription?.plan) ? currentSubscription.plan.price : 0
        
        return (
            <div className="max-w-3xl mx-auto pb-8 pt-0">
                <BookingPayment 
                    plan={selectedPlan}
                    seat={selectedSeat}
                    fees={branch.fees?.filter((f: any) => selectedFees.includes(String(f.id))) || []}
                    branchId={branch.id}
                    adjustmentAmount={upgradeCredit}
                    adjustmentLabel="Upgrade Credit"
                    upiId={(branch as any).upiId || undefined}
                    payeeName={(branch as any).payeeName || undefined}
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
                            visiblePlans.map((plan: any) => (
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
                                                    ? `${formatTime(plan.shiftStart)} - ${formatTime(plan.shiftEnd)}`
                                                    : `${plan.hoursPerDay} Hrs/Day`
                                                }
                                            </span>
                                        </div>
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
                                    </div>
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
                            {branch.fees.map((fee: any) => (
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
                                            <p className="text-xs text-gray-500 capitalize">{fee.type.replace(/_/g, ' ')}</p>
                                        </div>
                                    </div>
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                        ₹{fee.amount}
                                    </span>
                                </div>
                            ))}
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
                                    Choose your preferred seat (Optional).
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
                                {Object.entries(seatsBySection).map(([section, seats]: [string, any]) => {
                                    const sectionSeats = seats as any[]
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
                                                {currentSeats.map((seat: any) => (
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
                                {Object.entries(seatsBySection).map(([section, seats]: [string, any]) => (
                                    <div key={section} className="space-y-3">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            {section} Section
                                        </h3>
                                        <div 
                                            className="grid gap-2 md:gap-3"
                                            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                        >
                                            {(seats as any[]).map((seat: any) => (
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

                {/* Date Selection */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        Start Date
                    </h3>
                    <input
                        type="date"
                        value={bookingDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>

                {/* Action Button */}
                <AnimatedButton
                    fullWidth
                    size="lg"
                    onClick={handleProceedToPayment}
                    isLoading={isLoading}
                    disabled={!selectedPlan}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                    icon="creditCard"
                >
                    {selectedPlan ? `Pay ₹${totalAmount} & Book` : 'Select a Plan First'}
                </AnimatedButton>
            </div>
        </div>
    )
}
