'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Check, Calendar, CreditCard, Info, 
    User, Mail, Phone, Cake,
    Armchair, Lock,
    LayoutGrid, List, ChevronLeft, ChevronRight, Clock, Filter,
    Plus, Minus, ChevronUp, ChevronDown
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { cn, formatSeatNumber, formatLockerNumber } from '@/lib/utils'
import { checkPublicStudentByEmail } from '@/actions/student'
import { initiatePublicBookingVerification, confirmEmailVerification } from '@/actions/auth'
import { Branch, Seat, Plan, AdditionalFee, Locker } from '@prisma/client'
import PublicBranchHeader, { PublicOffer } from './PublicBranchHeader'
import PublicBookingPayment from './PublicBookingPayment'

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

interface PublicBookingClientProps {
    branch: BranchWithDetails
    images?: string[]
    amenities?: string[]
    offers?: PublicOffer[]
}

type BookingStep = 'selection' | 'details' | 'verification' | 'payment' | 'confirmation'

export function PublicBookingClient({ branch, images = [], amenities = [], offers = [] }: PublicBookingClientProps) {
    const router = useRouter()
    const [step, setStep] = useState<BookingStep>('selection')
    const [bookingResult, setBookingResult] = useState<{
        status: 'completed' | 'pending_verification'
        paymentId?: string
        studentId?: string
    } | null>(null)
    
    // Verification State
    const [verificationOtp, setVerificationOtp] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null)
    const [resendCooldown, setResendCooldown] = useState(0)

    // Cooldown timer
    React.useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    // Remove qr_code from URL to prevent auto-redirect loop after booking/login
    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            if (params.has('qr_code')) {
                params.delete('qr_code')
                const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '')
                window.history.replaceState({}, '', newUrl)
            }
        }
    }, [])

    // Selection State
    const [selectedPlan, setSelectedPlan] = useState<ExtendedPlan | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [selectedSeat, setSelectedSeat] = useState<SeatWithOccupancy | null>(null)
    const [selectedLocker, setSelectedLocker] = useState<LockerWithOccupancy | null>(null)
    const [seatFilter, setSeatFilter] = useState<'all' | 'available' | 'occupied' | 'selected'>('all')
    const [lockerFilter, setLockerFilter] = useState<'all' | 'available' | 'occupied' | 'selected'>('all')
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
    
    // Student Details State
    const [isCheckingEmail, setIsCheckingEmail] = useState(false)
    const [studentDetails, setStudentDetails] = useState({
        name: '',
        email: '',
        phone: '',
        dob: ''
    })

    // Pagination state
    const [pageBySection, setPageBySection] = useState<Record<string, number>>({})
    const [columns, setColumns] = useState(4)
    const [seatViewMode, setSeatViewMode] = useState<'pagination' | 'scroll'>('pagination')
    const [lockerViewMode, setLockerViewMode] = useState<'pagination' | 'scroll'>('pagination')

    // Filter State
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [filterDuration, setFilterDuration] = useState<string>('all')
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false)

    // Derived Filters
    const DURATION_FILTERS = [
        { id: 'all', label: 'All Plans' },
        { id: '1mo', label: '1 Mo' },
        { id: '3mo', label: '3 Mo' },
        { id: '6mo', label: '6 Mo' },
        { id: 'other', label: 'Other' }
    ]

    const filteredPlans = React.useMemo(() => {
        return branch.plans.filter(plan => {
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
    }, [branch.plans, filterCategory, filterDuration])


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

    // Helper to format 24h time to 12h
    const formatTime = (timeStr?: string) => {
        if (!timeStr) return '-'
        const [hours, minutes] = timeStr.split(':')
        const h = parseInt(hours)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${h12}:${minutes} ${ampm}`
    }

    // Sort seats naturally
    const sortedSeats = React.useMemo(() => {
        return [...(branch.seats || [])].sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [branch.seats])

    // Group seats by section
    const seatsBySection = React.useMemo(() => {
        return sortedSeats.reduce<Record<string, typeof sortedSeats>>((acc, seat) => {
            const section = seat.section || 'General'
            if (!acc[section]) acc[section] = []
            acc[section].push(seat)
            return acc
        }, {})
    }, [sortedSeats])

    // Sort lockers naturally
    const sortedLockers = React.useMemo(() => {
        return [...(branch.lockers || [])].sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [branch.lockers])

    // Group lockers by section
    const lockersBySection = React.useMemo(() => {
        return sortedLockers.reduce<Record<string, typeof sortedLockers>>((acc, locker) => {
            const section = 'General'
            if (!acc[section]) acc[section] = []
            acc[section].push(locker)
            return acc
        }, {})
    }, [sortedLockers])

    const isSeatSelectionEnabled = React.useMemo(() => {
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

    // Reset seat if selection becomes disabled
    React.useEffect(() => {
        if (!isSeatSelectionEnabled && selectedSeat) {
            setSelectedSeat(null)
        }
    }, [isSeatSelectionEnabled, selectedSeat])

    const isLockerSelectionEnabled = React.useMemo(() => {
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

    // Reset locker if selection becomes disabled
    React.useEffect(() => {
        if (!isLockerSelectionEnabled && selectedLocker) {
            setSelectedLocker(null)
        }
    }, [isLockerSelectionEnabled, selectedLocker])

    const handlePlanSelect = (plan: ExtendedPlan) => {
        if (selectedPlan?.id === plan.id) return // Don't reset if clicking same plan
        setSelectedPlan(plan)
        setQuantity(1)
        setSelectedSeat(null)
        setSelectedLocker(null)
        setSelectedFees([])
    }

    const toggleFee = (feeId: string) => {
        // Check if plan is selected before allowing seat reservation fee
        const fee = branch.fees.find(f => String(f.id) === feeId)
        if (fee && (fee.name.toLowerCase().includes('seat') || fee.name.toLowerCase().includes('reservation'))) {
            if (!selectedPlan) {
                toast.error('Please select a valid plan first')
                return
            }
        }

        setSelectedFees(prev => 
            prev.includes(feeId) 
                ? prev.filter(id => id !== feeId)
                : [...prev, feeId]
        )
    }

    // Check if seat is mandatory
    const isSeatMandatory = React.useMemo(() => {
        if (!selectedPlan) return false
        
        // If plan includes seat, it is mandatory
        if (selectedPlan.includesSeat) return true
        
        // If seat fee is selected, it is mandatory
        return selectedFees.some(id => {
            const fee = branch.fees.find(f => String(f.id) === id)
            return fee && (
                fee.name.toLowerCase().includes('seat') || 
                fee.name.toLowerCase().includes('reservation')
            )
        })
    }, [selectedPlan, selectedFees, branch.fees])
    
    // Check if locker is mandatory (if fee selected)
    const isLockerMandatory = React.useMemo(() => {
        if (!selectedPlan) return false
        if (!branch.hasLockers) return false
        
        // Only mandatory if user MUST select it (separate locker)
        if (!branch.isLockerSeparate) return false
        
        // If plan includes locker
        if (selectedPlan.includesLocker) return true
        
        return selectedFees.some(id => {
            const fee = branch.fees.find(f => String(f.id) === id)
            return fee && fee.name.toLowerCase().includes('locker')
        })
    }, [selectedPlan, selectedFees, branch.fees, branch.isLockerSeparate, branch.hasLockers])

    const handleEmailBlur = async () => {
        if (!studentDetails.email || !studentDetails.email.includes('@')) return
        
        setIsCheckingEmail(true)
        try {
            const result = await checkPublicStudentByEmail(studentDetails.email)
            if (result.success && result.exists && result.student) {
                setStudentDetails(prev => ({
                    ...prev,
                    name: result.student.name || '',
                    phone: result.student.phone || '',
                    dob: result.student.dob || ''
                }))
                toast.success('Welcome back! Details auto-filled.')
            } else {
                // Clear fields if they contain masked data from previous auto-fill
                setStudentDetails(prev => ({
                    ...prev,
                    phone: prev.phone.includes('*') ? '' : prev.phone,
                    dob: prev.dob.includes('*') ? '' : prev.dob
                }))
            }
        } catch {
            // error ignored
        } finally {
            setIsCheckingEmail(false)
        }
    }

    const handleDetailsSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!studentDetails.name || !studentDetails.email || !studentDetails.phone || !studentDetails.dob) {
            toast.error('Please fill in all details')
            return
        }
        
        if (isSeatMandatory && !selectedSeat) {
            toast.error('Please select a seat')
            return
        }

        if (isLockerMandatory && !selectedLocker) {
            toast.error('Please select a locker')
            return
        }

        // Skip verification if email is already verified
        if (verifiedEmail === studentDetails.email) {
            setStep('payment')
            return
        }
        
        setIsVerifying(true)
        try {
            const result = await initiatePublicBookingVerification(studentDetails.email, studentDetails.name)
            if (result.success) {
                toast.success('Verification code sent to your email')
                setStep('verification')
                setResendCooldown(30) // 30 seconds cooldown
            } else {
                toast.error(result.error || 'Failed to send verification code')
            }
        } catch {
            toast.error('Something went wrong')
        } finally {
            setIsVerifying(false)
        }
    }

    const handleResendOtp = async () => {
        if (resendCooldown > 0) return

        setIsVerifying(true)
        try {
            const result = await initiatePublicBookingVerification(studentDetails.email, studentDetails.name)
            if (result.success) {
                toast.success('Verification code resent')
                setResendCooldown(30)
            } else {
                toast.error(result.error || 'Failed to resend code')
            }
        } catch {
            toast.error('Failed to resend code')
        } finally {
            setIsVerifying(false)
        }
    }

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!verificationOtp || verificationOtp.length !== 6) {
            toast.error('Please enter a valid 6-digit code')
            return
        }

        setIsVerifying(true)
        try {
            const result = await confirmEmailVerification(studentDetails.email, verificationOtp)
            if (result.success) {
                toast.success('Email verified successfully')
                setVerifiedEmail(studentDetails.email)
                setStep('payment')
            } else {
                toast.error(result.error || 'Invalid verification code')
            }
        } catch {
            toast.error('Verification failed')
        } finally {
            setIsVerifying(false)
        }
    }

    const handlePaymentSuccess = (paymentId?: string, status: 'completed' | 'pending_verification' = 'completed', studentId?: string) => {
        setBookingResult({ status, paymentId, studentId })
        setStep('confirmation')
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

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

    const isSeatReservationFeeSelected = React.useMemo(() => {
        if (selectedPlan && selectedPlan.includesSeat) return true
        
        return selectedFees.some(feeId => {
            const fee = branch.fees.find(f => String(f.id) === feeId)
            return fee?.name.toLowerCase().includes('seat reservation')
        })
    }, [selectedFees, branch.fees, selectedPlan])

    // Calculate Total for display
    const calculateFeeTotal = (fee: AdditionalFee) => {
        let amount = Number(fee.amount)
        if (fee.billType === 'MONTHLY' && selectedPlan?.durationUnit === 'months') {
            amount *= (selectedPlan.duration || 1)
        }
        return amount * quantity
    }

    const feesTotal = branch.fees
        .filter(f => selectedFees.includes(String(f.id)))
        .reduce((sum, f) => sum + calculateFeeTotal(f), 0)

    const totalAmount = Math.round(((Number(selectedPlan?.price) || 0) * quantity) + feesTotal)

    return (
        <div className="max-w-4xl mx-auto pb-12">
            {step === 'selection' && (
                <div className="mb-2">
                    <PublicBranchHeader
                        branch={{ ...branch, operatingHours: branch.operatingHours as unknown as Record<string, string | null> }}
                        images={images}
                        amenities={amenities}
                        showDetailsLink={true}
                        offers={offers}
                    />
                </div>
            )}

            {/* Progress Steps */}
            {step !== 'confirmation' && (
                <div className="flex items-center justify-center mb-2">
                    <div className="flex items-center gap-2">
                        {[
                            { id: 'selection', label: '1. Select Plan' },
                            { id: 'details', label: '2. Your Details' },
                            { id: 'payment', label: '3. Payment' }
                        ].map((s, idx) => (
                            <React.Fragment key={s.id}>
                                <div className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                                    step === s.id || (step === 'verification' && s.id === 'details')
                                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-purple-500/20" 
                                        : idx < ['selection', 'details', 'verification', 'payment'].indexOf(step)
                                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
                                            : "text-gray-400 dark:text-gray-600"
                                )}>
                                    {idx < ['selection', 'details', 'verification', 'payment'].indexOf(step) && !(step === 'verification' && s.id === 'details') ? (
                                        <Check className="w-4 h-4" />
                                    ) : (
                                        <span>{s.label}</span>
                                    )}
                                </div>
                                {idx < 2 && (
                                    <div className="w-8 h-px bg-gray-200 dark:bg-gray-700" />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                {step === 'selection' && (
                    <motion.div
                        key="selection"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <div className="space-y-6">
                            {/* 1. Choose Plan */}
                            <section className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex flex-col gap-3 mb-4">
                                <div className="flex items-center justify-between gap-3">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 whitespace-nowrap">
                                        <CreditCard className="w-4 h-4 text-purple-500" />
                                        Choose a Plan
                                    </h2>

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

                                {/* Duration Filter - Row 2 */}
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

                            <div className="space-y-2 max-h-[400px] overflow-y-auto px-1 -mx-1 custom-scrollbar">
                                {filteredPlans.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
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
                                            onClick={() => handlePlanSelect(plan)}
                                            className={cn(
                                                "p-3 rounded-xl border cursor-pointer transition-all duration-200 relative flex flex-col h-full",
                                                selectedPlan?.id === plan.id
                                                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-sm ring-1 ring-purple-500/20"
                                                    : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm"
                                            )}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{plan.name}</h4>
                                                    {selectedPlan?.id === plan.id && (
                                                        <div className="w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                                            <Check className="w-2.5 h-2.5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">₹{plan.price}</span>
                                            </div>
                                            
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">{plan.description}</p>
                                            
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                    <Clock className="w-2.5 h-2.5 text-gray-400" />
                                                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{plan.duration} {plan.durationUnit}</span>
                                                </div>
                                                
                                                <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                                    <Info className="w-2.5 h-2.5 text-gray-400" />
                                                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                                                        {plan.category === 'fixed' 
                                                            ? `${formatTime(plan.shiftStart || undefined)} - ${formatTime(plan.shiftEnd || undefined)}`
                                                            : `${plan.hoursPerDay} Hrs/Day`
                                                        }
                                                    </span>
                                                </div>
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

                                            {selectedPlan?.id === plan.id && (
                                                <div className="py-2 mt-auto">
                                                    <div className="flex items-center justify-between bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-purple-800 dark:text-purple-200">Total Duration</span>
                                                            <div className="flex items-baseline gap-1">
                                                                <span className="text-sm font-bold text-purple-950 dark:text-purple-50">
                                                                    {quantity * plan.duration} {plan.durationUnit?.toLowerCase().startsWith('m') ? (quantity * plan.duration > 1 ? 'Months' : 'Month') : (quantity * plan.duration > 1 ? 'Days' : 'Day')}
                                                                </span>
                                                                <span className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                                                                    ({quantity} × {plan.duration} {plan.durationUnit?.toLowerCase().startsWith('m') ? (plan.duration > 1 ? 'Months' : 'Month') : (plan.duration > 1 ? 'Days' : 'Day')})
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-purple-200 dark:border-purple-700 shadow-sm">
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
                                                                className="w-7 h-7 flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-l-md transition-colors"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="w-6 text-center text-sm font-bold text-gray-900 dark:text-white">{quantity}</span>
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setQuantity(quantity + 1)
                                                                }}
                                                                className="w-7 h-7 flex items-center justify-center text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-r-md transition-colors"
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
                        </section>

                        {/* 2. Customize Plan */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 h-fit space-y-6">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-500" />
                                    Customize Plan
                                </h3>

                                <div className="grid grid-cols-[2fr_3fr] gap-6">
                                    {/* Locker Section */}
                                    {(selectedPlan?.includesLocker || branch.fees.some(f => f.name.toLowerCase().includes('locker'))) && (
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
                                                                onChange={() => toggleFee(String(fee.id))}
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
                                    {(selectedPlan?.includesSeat || branch.fees.some(f => f.name.toLowerCase().includes('seat') || f.name.toLowerCase().includes('reservation'))) && (
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
                                                                onChange={() => toggleFee(String(fee.id))}
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
                                {branch.fees.some(f => {
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
                                                            onChange={() => toggleFee(String(fee.id))}
                                                        />
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fee.name}</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {branch.fees.length === 0 && (
                                    <p className="text-sm text-gray-500">No additional fees available.</p>
                                )}
                            </div>

                        {/* 3. Start Date */}
                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm relative z-10">
                             <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-orange-500" />
                                Start Date
                            </h3>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={bookingDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                />
                            </div>
                        </section>
                    </div>




                        {/* 4. Select Seat (Optional) */}
                        {isSeatSelectionEnabled && (
                        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col relative z-10">
                            
                            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                    <div>
                                        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Armchair className="w-5 h-5 text-purple-500" />
                                            Select Your Preferred Seat
                                        </h2>
                                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            {selectedPlan?.includesSeat 
                                                ? "Seat included in your plan. Please select a seat."
                                                : "Optional - You can skip this step"
                                            }
                                        </p>
                                    </div>
                                    
                                    {/* View Toggle (Mobile Only) */}
                                    <div className="flex md:hidden bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => setSeatViewMode('pagination')}
                                            className={cn(
                                                "p-1.5 rounded-md transition-all",
                                                seatViewMode === 'pagination' 
                                                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
                                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setSeatViewMode('scroll')}
                                            className={cn(
                                                "p-1.5 rounded-md transition-all",
                                                seatViewMode === 'scroll' 
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
                                            onClick={() => setSeatViewMode('pagination')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                                seatViewMode === 'pagination' 
                                                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm" 
                                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            )}
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                            Paged
                                        </button>
                                        <button
                                            onClick={() => setSeatViewMode('scroll')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                                seatViewMode === 'scroll' 
                                                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm" 
                                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                            )}
                                        >
                                            <List className="w-4 h-4" />
                                            Scroll
                                        </button>
                                    </div>

                                    {/* Legend */}
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <button 
                                            onClick={() => setSeatFilter(seatFilter === 'available' ? 'all' : 'available')}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                                seatFilter === 'available' 
                                                    ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800" 
                                                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded" />
                                            <span className={cn("font-medium", seatFilter === 'available' ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300")}>Available</span>
                                        </button>

                                        <button 
                                            onClick={() => setSeatFilter(seatFilter === 'selected' ? 'all' : 'selected')}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                                seatFilter === 'selected' 
                                                    ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800" 
                                                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            <div className="w-3 h-3 bg-purple-500 rounded" />
                                            <span className={cn("font-medium", seatFilter === 'selected' ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300")}>Selected</span>
                                        </button>

                                        <button 
                                            onClick={() => setSeatFilter(seatFilter === 'occupied' ? 'all' : 'occupied')}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2 py-1 rounded-md transition-all border",
                                                seatFilter === 'occupied' 
                                                    ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800" 
                                                    : "border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                                            )}
                                        >
                                            <div className="w-3 h-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded" />
                                            <span className={cn("font-medium", seatFilter === 'occupied' ? "text-purple-700 dark:text-purple-300" : "text-gray-600 dark:text-gray-300")}>Occupied</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 md:p-6 bg-white dark:bg-gray-800 min-h-[300px]">
                                {seatViewMode === 'pagination' ? (
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

                                            return (
                                                <div key={section} className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
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
                                                        {currentSeats.map((seat) => (
                                                            <motion.button
                                                                key={seat.id}
                                                                whileHover={!seat.isOccupied ? { scale: 1.05 } : {}}
                                                                whileTap={!seat.isOccupied ? { scale: 0.95 } : {}}
                                                                onClick={() => {
                                                                if (!selectedPlan) {
                                                                    toast.error("Please select a plan first")
                                                                    return
                                                                }
                                                                !seat.isOccupied && setSelectedSeat(selectedSeat?.id === seat.id ? null : seat)
                                                            }}
                                                                disabled={seat.isOccupied}
                                                                className={cn(
                                                                    "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative group",
                                                                    seat.isOccupied
                                                                        ? "bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-70 text-gray-500 dark:text-gray-400"
                                                                        : selectedSeat?.id === seat.id
                                                                            ? "bg-purple-500 border-purple-600 text-white shadow-md shadow-purple-500/20"
                                                                            : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm text-gray-900 dark:text-gray-100"
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
                                        {branch.seats.length === 0 && (
                                            <div className="text-center text-gray-500 py-8">
                                                No seats configuration found.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    {section} Section
                                                    <span className="text-xs font-normal text-gray-400">({seats.filter(s => !s.isOccupied).length} available)</span>
                                                </h3>
                                                <div 
                                                    className="grid gap-2 md:gap-3"
                                                    style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                                >
                                                    {filteredSeats.map((seat) => (
                                                        <motion.button
                                                            key={seat.id}
                                                            whileHover={!seat.isOccupied ? { scale: 1.05 } : {}}
                                                            whileTap={!seat.isOccupied ? { scale: 0.95 } : {}}
                                                            onClick={() => {
                                                                if (!selectedPlan) {
                                                                    toast.error("Please select a plan first")
                                                                    return
                                                                }
                                                                !seat.isOccupied && setSelectedSeat(selectedSeat?.id === seat.id ? null : seat)
                                                            }}
                                                            disabled={seat.isOccupied}
                                                            className={cn(
                                                                "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative",
                                                                seat.isOccupied
                                                                    ? "bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-70 text-gray-500 dark:text-gray-400"
                                                                    : selectedSeat?.id === seat.id
                                                                        ? "bg-purple-500 border-purple-600 text-white shadow-md shadow-purple-500/20"
                                                                        : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm text-gray-900 dark:text-gray-100"
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
                                                                <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-sm">
                                                                    <Check className="w-2 h-2 md:w-2.5 md:h-2.5" />
                                                                </div>
                                                            )}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>

                            {selectedSeat && (
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-t border-purple-100 dark:border-purple-800/50 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                                        <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Selected Seat</p>
                                        <p className="text-xs text-purple-600 dark:text-purple-400 font-bold">{formatSeatNumber(selectedSeat.number)}</p>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedSeat(null)}
                                        className="ml-auto text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:underline"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}
                        </section>
                        )}


                        {/* 5. Select Locker (if applicable) */}
                        {isLockerSelectionEnabled && (
                        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col relative z-10">
                            <div className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                <div className="p-3 md:p-4 flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Lock className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                                            {selectedLocker ? (
                                                <span className="flex items-center gap-2">
                                                    Selected: <span className="text-purple-600 dark:text-purple-400">{formatLockerNumber(selectedLocker.number)}</span>
                                                    <button onClick={() => setSelectedLocker(null)} className="text-xs text-gray-400 hover:text-gray-600 underline ml-2">Change</button>
                                                </span>
                                            ) : (
                                                "Select Locker"
                                            )}
                                        </h2>
                                        {!selectedLocker && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                Select your preferred locker
                                            </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => setLockerViewMode('pagination')}
                                            className={cn(
                                                "p-2 rounded-md transition-all",
                                                lockerViewMode === 'pagination' 
                                                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
                                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            )}
                                            title="Pagination View"
                                        >
                                            <LayoutGrid className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setLockerViewMode('scroll')}
                                            className={cn(
                                                "p-2 rounded-md transition-all",
                                                lockerViewMode === 'scroll' 
                                                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
                                                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                            )}
                                            title="Scroll View"
                                        >
                                            <List className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Legend */}
                                <div className="px-3 md:px-4 pb-3 flex justify-end">
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
                                            <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded" />
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

                            <div className="p-4 md:p-6 bg-white dark:bg-gray-800 min-h-[300px]">
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
                                            const totalPages = Math.ceil(sectionLockers.length / (columns * 4)) // 4 rows per page
                                            const currentPage = pageBySection[section] || 0
                                            
                                            const currentLockers = sectionLockers.slice(
                                                currentPage * (columns * 4),
                                                (currentPage + 1) * (columns * 4)
                                            )

                                            if (lockers.length === 0) return null

                                            return (
                                                <div key={section} className="space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                            {section} Section
                                                            <span className="text-xs font-normal text-gray-400">({lockers.filter(l => !l.isOccupied).length} available)</span>
                                                        </h3>
                                                        
                                                        {totalPages > 1 && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => setPageBySection(prev => ({
                                                                        ...prev,
                                                                        [section]: Math.max(0, (prev[section] || 0) - 1)
                                                                    }))}
                                                                    disabled={currentPage === 0}
                                                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
                                                                >
                                                                    <ChevronLeft className="w-4 h-4" />
                                                                </button>
                                                                <span className="text-xs font-medium text-gray-500">
                                                                    {currentPage + 1} / {totalPages}
                                                                </span>
                                                                <button
                                                                    onClick={() => setPageBySection(prev => ({
                                                                        ...prev,
                                                                        [section]: Math.min(totalPages - 1, (prev[section] || 0) + 1)
                                                                    }))}
                                                                    disabled={currentPage === totalPages - 1}
                                                                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
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
                                                        {currentLockers.map((locker) => (
                                                        <motion.button
                                                            key={locker.id}
                                                            whileHover={!locker.isOccupied ? { scale: 1.05 } : {}}
                                                            whileTap={!locker.isOccupied ? { scale: 0.95 } : {}}
                                                            onClick={() => !locker.isOccupied && setSelectedLocker(selectedLocker?.id === locker.id ? null : locker)}
                                                            disabled={locker.isOccupied}
                                                            className={cn(
                                                                "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative group border-2",
                                                                locker.isOccupied
                                                                    ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-70 text-gray-500 dark:text-gray-400"
                                                                    : selectedLocker?.id === locker.id
                                                                        ? "bg-purple-500 border-purple-600 text-white shadow-md transform scale-[1.02] ring-2 ring-purple-200 dark:ring-purple-900"
                                                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm text-gray-900 dark:text-gray-100"
                                                            )}
                                                        >
                                                            {locker.isOccupied ? (
                                                                <Lock className="w-5 h-5 md:w-6 md:h-6 opacity-50" />
                                                            ) : selectedLocker?.id === locker.id ? (
                                                                <Lock className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                                                            ) : (
                                                                <Lock className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                                            )}
                                                            <span className="text-sm md:text-base font-semibold truncate w-full text-center px-1">
                                                                {formatLockerNumber(locker.number)}
                                                            </span>
                                                            {selectedLocker?.id === locker.id && (
                                                                <motion.div
                                                                    layoutId="check-locker"
                                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-sm border border-purple-100"
                                                                >
                                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                                </motion.div>
                                                            )}
                                                        </motion.button>
                                                    ))}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {branch.lockers.length === 0 && (
                                            <div className="text-center text-gray-500 py-8">
                                                No lockers configuration found.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
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
                                                    {filteredLockers.map((locker) => (
                                                        <motion.button
                                                            key={locker.id}
                                                            whileHover={!locker.isOccupied ? { scale: 1.05 } : {}}
                                                            whileTap={!locker.isOccupied ? { scale: 0.95 } : {}}
                                                            onClick={() => !locker.isOccupied && setSelectedLocker(selectedLocker?.id === locker.id ? null : locker)}
                                                            disabled={locker.isOccupied}
                                                            className={cn(
                                                                "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200 relative group border-2",
                                                                locker.isOccupied
                                                                    ? "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 cursor-not-allowed opacity-70 text-gray-500 dark:text-gray-400"
                                                                    : selectedLocker?.id === locker.id
                                                                        ? "bg-purple-500 border-purple-600 text-white shadow-md transform scale-[1.02] ring-2 ring-purple-200 dark:ring-purple-900"
                                                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-sm text-gray-900 dark:text-gray-100"
                                                            )}
                                                        >
                                                            {locker.isOccupied ? (
                                                                <Lock className="w-5 h-5 md:w-6 md:h-6 opacity-50" />
                                                            ) : selectedLocker?.id === locker.id ? (
                                                                <Lock className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                                                            ) : (
                                                                <Lock className="w-5 h-5 md:w-6 md:h-6 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                                            )}
                                                            <span className="text-sm md:text-base font-semibold truncate w-full text-center px-1">
                                                                {formatLockerNumber(locker.number)}
                                                            </span>
                                                            {selectedLocker?.id === locker.id && (
                                                                <motion.div
                                                                    layoutId="check-locker"
                                                                    className="absolute -top-2 -right-2 w-5 h-5 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-sm border border-purple-100"
                                                                >
                                                                    <Check className="w-3 h-3 stroke-[3]" />
                                                                </motion.div>
                                                            )}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>

                            {selectedLocker && (
                                <div className="hidden"></div>
                            )}
                        </section>
                        )}

                        {/* Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 z-40">
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
                                            <div className="max-w-4xl mx-auto p-6 space-y-4">
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
                                                            {selectedPlan?.name} <span className="text-xs text-gray-400">({quantity} × ₹{selectedPlan?.price})</span>
                                                        </span>
                                                        <span className="font-medium text-gray-900 dark:text-white">
                                                            ₹{(Number(selectedPlan?.price) || 0) * quantity}
                                                        </span>
                                                    </div>

                                                    {/* Fees */}
                                                    {branch.fees
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
                                <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
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
                                    <AnimatedButton
                                        onClick={() => setStep('details')}
                                        disabled={!selectedPlan}
                                        className="bg-purple-600 hover:bg-purple-700 text-white min-w-[150px]"
                                        icon="arrowRight"
                                    >
                                        Continue
                                    </AnimatedButton>
                                </div>
                            </div>
                        </div>
                        {/* Spacer for fixed bottom bar */}
                        <div className="h-20" />
                    </motion.div>
                )}

                {step === 'details' && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="max-w-2xl mx-auto"
                    >
                        {/* Summary Side Panel - Hidden as per requirement */}
                        {/* 
                        <div className="md:col-span-1 space-y-4 h-fit">
                             ...
                        </div>
                        */}

                        {/* Details Form */}
                        <div className="w-full">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enter Your Details</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        We need a few details to create your account and manage your booking.
                                    </p>
                                </div>
                                
                                <form onSubmit={handleDetailsSubmit} className="space-y-5">
                                    <div className="grid md:grid-cols-2 gap-5">
                                        <FormInput
                                            label="Full Name"
                                            icon={User}
                                            placeholder="John Doe"
                                            value={studentDetails.name}
                                            onChange={(e) => setStudentDetails(prev => ({ ...prev, name: e.target.value }))}
                                            required
                                            className="bg-gray-50 dark:bg-gray-900/50"
                                        />
                                        <FormInput
                                            label="Email Address"
                                            icon={Mail}
                                            type="email"
                                            placeholder="john@example.com"
                                            value={studentDetails.email}
                                            onChange={(e) => setStudentDetails(prev => ({ ...prev, email: e.target.value }))}
                                            onBlur={handleEmailBlur}
                                            helperText={isCheckingEmail ? 'Checking...' : undefined}
                                            required
                                            className="bg-gray-50 dark:bg-gray-900/50"
                                        />
                                    </div>

                                    <FormInput
                                        label="Phone Number"
                                        icon={Phone}
                                        type="tel"
                                        placeholder="9876543210"
                                        value={studentDetails.phone}
                                        onChange={(e) => setStudentDetails(prev => ({ ...prev, phone: e.target.value }))}
                                        onFocus={() => {
                                            if (studentDetails.phone.includes('*')) {
                                                setStudentDetails(prev => ({ ...prev, phone: '' }))
                                            }
                                        }}
                                        required
                                        className="bg-gray-50 dark:bg-gray-900/50"
                                    />
                                    
                                    <FormInput
                                        label="Date of Birth"
                                        icon={Cake}
                                        type={studentDetails.dob.includes('*') ? 'text' : 'date'}
                                        value={studentDetails.dob}
                                        onChange={(e) => setStudentDetails(prev => ({ ...prev, dob: e.target.value }))}
                                        onFocus={() => {
                                            if (studentDetails.dob.includes('*')) {
                                                setStudentDetails(prev => ({ ...prev, dob: '' }))
                                            }
                                        }}
                                        required
                                        className="bg-gray-50 dark:bg-gray-900/50"
                                    />

                                    <div className="flex gap-4 pt-6 mt-4 border-t border-gray-100 dark:border-gray-700">
                                        <AnimatedButton
                                            type="button"
                                            variant="outline"
                                            onClick={() => setStep('selection')}
                                            className="flex-1"
                                            icon="arrowLeft"
                                            iconPosition="left"
                                        >
                                            Back
                                        </AnimatedButton>
                                        <AnimatedButton
                                            type="submit"
                                            className="flex-[2] bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                                            icon="arrowRight"
                                        >
                                            Proceed to Pay
                                        </AnimatedButton>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 'verification' && (
                    <motion.div
                        key="verification"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="max-w-md mx-auto"
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 shadow-sm text-center">
                            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Mail className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                            </div>
                            
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify Email</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                                We&apos;ve sent a 6-digit verification code to <span className="font-medium text-gray-900 dark:text-white">{studentDetails.email}</span>
                            </p>

                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                <div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={verificationOtp}
                                        onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                        autoFocus
                                    />
                                    <p className="text-xs text-gray-400 mt-2">Enter the 6-digit code</p>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <AnimatedButton
                                        type="submit"
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                                        isLoading={isVerifying}
                                        loadingText="Verifying..."
                                    >
                                        Verify & Proceed
                                    </AnimatedButton>
                                    
                                    <div className="flex items-center justify-between text-sm">
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={resendCooldown > 0 || isVerifying}
                                            className={cn(
                                                "font-medium transition-colors",
                                                resendCooldown > 0 || isVerifying
                                                    ? "text-gray-400 cursor-not-allowed"
                                                    : "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                                            )}
                                        >
                                            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setStep('details')}
                                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                        >
                                            Change Email
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                )}

                {step === 'payment' && selectedPlan && (
                    <motion.div
                        key="payment"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <PublicBookingPayment 
                            plan={selectedPlan}
                        seat={selectedSeat}
                        locker={selectedLocker}
                        quantity={quantity}
                        fees={branch.fees.filter(f => selectedFees.includes(f.id))}
                        branchId={branch.id}
                            branchName={branch.name}
                            startDate={bookingDate}
                            upiId={branch.upiId || undefined}
                            payeeName={branch.payeeName || undefined}
                            studentDetails={studentDetails}
                            onSuccess={handlePaymentSuccess}
                            onBack={() => setStep('details')}
                        />
                    </motion.div>
                )}

                {step === 'confirmation' && bookingResult && (
                    <motion.div
                        key="confirmation"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md mx-auto text-center pt-8"
                    >
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-100 dark:border-gray-700 shadow-xl relative overflow-hidden">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[radial-gradient(#9333ea_1px,transparent_1px)] [background-size:16px_16px]" />
                            
                            <div className="relative">
                                <div className={cn(
                                    "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg",
                                    bookingResult.status === 'completed'
                                        ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                                )}>
                                    {bookingResult.status === 'completed' ? (
                                        <Check className="w-10 h-10" strokeWidth={3} />
                                    ) : (
                                        <Clock className="w-10 h-10" strokeWidth={3} />
                                    )}
                                </div>

                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                    {bookingResult.status === 'completed' 
                                        ? "Booking Confirmed!" 
                                        : "Booking Under Review"
                                    }
                                </h2>

                                <div className="space-y-4 mb-8">
                                    <p className="text-gray-600 dark:text-gray-300">
                                        {bookingResult.status === 'completed'
                                            ? "Your seat has been successfully booked. You can now access the library."
                                            : "Your payment is waiting for approval by the library front desk."
                                        }
                                    </p>
                                    
                                    {bookingResult.status === 'pending_verification' && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800/30">
                                            <p className="font-medium mb-1">Next Steps:</p>
                                            <p>Please contact the library staff/owner or wait for confirmation.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3">
                                    <AnimatedButton
                                        onClick={() => router.push(`/discover?branch=${branch.name}`)}
                                        className={cn(
                                            "w-full justify-center text-white shadow-lg",
                                            bookingResult.status === 'completed'
                                                ? "bg-green-600 hover:bg-green-700 shadow-green-500/20"
                                                : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20"
                                        )}
                                    >
                                        Back to Library
                                    </AnimatedButton>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

