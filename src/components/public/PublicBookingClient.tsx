'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Check, Calendar, CreditCard, Info, 
    User, Mail, Phone, Cake, MapPin,
    Armchair, ArrowRight, ArrowLeft, BookOpen,
    LayoutGrid, List, ChevronLeft, ChevronRight, Clock, Filter
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { cn, formatSeatNumber } from '@/lib/utils'
import { checkPublicStudentByEmail } from '@/actions/student'
import { Branch, Seat, Plan, AdditionalFee } from '@prisma/client'
import PublicBranchHeader, { PublicOffer } from './PublicBranchHeader'
import PublicBookingPayment from './PublicBookingPayment'

type BranchWithDetails = Branch & {
    library: { name: string }
    seats: (Seat & { isOccupied: boolean })[]
    plans: Plan[]
    fees: AdditionalFee[]
}

interface PublicBookingClientProps {
    branch: BranchWithDetails
    images?: string[]
    amenities?: string[]
    offers?: PublicOffer[]
}

type BookingStep = 'selection' | 'details' | 'payment'

export function PublicBookingClient({ branch, images = [], amenities = [], offers = [] }: PublicBookingClientProps) {
    const router = useRouter()
    const [step, setStep] = useState<BookingStep>('selection')
    const [showDetails, setShowDetails] = useState(false)
    
    // Selection State
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
    
    // Student Details State
    const [isCheckingEmail, setIsCheckingEmail] = useState(false)
    const [isExistingUser, setIsExistingUser] = useState(false)
    const [studentDetails, setStudentDetails] = useState({
        name: '',
        email: '',
        phone: '',
        dob: ''
    })

    // Pagination state
    const [pageBySection, setPageBySection] = useState<Record<string, number>>({})
    const [columns, setColumns] = useState(4)
    const [viewMode, setViewMode] = useState<'pagination' | 'scroll'>('pagination')

    // Filter State
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [filterDuration, setFilterDuration] = useState<string>('all')

    // Derived Filters
    const uniqueDurations = React.useMemo(() => {
        const set = new Set(branch.plans.map(p => `${p.duration} ${p.durationUnit}`))
        return ['all', ...Array.from(set)]
    }, [branch.plans])

    const filteredPlans = React.useMemo(() => {
        return branch.plans.filter(plan => {
            const matchCategory = filterCategory === 'all' || plan.category === filterCategory
            const matchDuration = filterDuration === 'all' || `${plan.duration} ${plan.durationUnit}` === filterDuration
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
        return [...(branch.seats || [])].sort((a: any, b: any) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [branch.seats])

    // Group seats by section
    const seatsBySection = React.useMemo(() => {
        return sortedSeats.reduce((acc: any, seat: any) => {
            const section = seat.section || 'General'
            if (!acc[section]) acc[section] = []
            acc[section].push(seat)
            return acc
        }, {})
    }, [sortedSeats])

    const handlePlanSelect = (plan: Plan) => {
        setSelectedPlan(plan)
    }

    const toggleFee = (feeId: string) => {
        setSelectedFees(prev => 
            prev.includes(feeId) 
                ? prev.filter(id => id !== feeId)
                : [...prev, feeId]
        )
    }

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
                setIsExistingUser(true)
                toast.success('Welcome back! Details auto-filled.')
            } else {
                setIsExistingUser(false)
                // Clear fields if they contain masked data from previous auto-fill
                setStudentDetails(prev => ({
                    ...prev,
                    phone: prev.phone.includes('*') ? '' : prev.phone,
                    dob: prev.dob.includes('*') ? '' : prev.dob
                }))
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsCheckingEmail(false)
        }
    }

    const handleDetailsSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!studentDetails.name || !studentDetails.email || !studentDetails.phone || !studentDetails.dob) {
            toast.error('Please fill in all details')
            return
        }
        setStep('payment')
    }

    const handlePaymentSuccess = (paymentId?: string, status?: 'completed' | 'pending_verification', studentId?: string) => {
        toast.success('Booking Successful!')
        // Redirect to a success page or show success state
        // For now, redirect to discover page with success query
        router.push(`/discover?booking=success&branch=${branch.name}`)
    }

    // Calculate Total for display
    const feesTotal = branch.fees
        .filter(f => selectedFees.includes(f.id))
        .reduce((sum, f) => sum + Number(f.amount), 0)
    const totalAmount = Math.round((Number(selectedPlan?.price) || 0) + feesTotal)

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-2">
                <PublicBranchHeader 
                    branch={branch} 
                    images={images} 
                    amenities={amenities} 
                    showDetailsLink={true}
                    offers={offers}
                />
            </div>

            {/* Progress Steps */}
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
                                step === s.id 
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 ring-1 ring-purple-500/20" 
                                    : idx < ['selection', 'details', 'payment'].indexOf(step)
                                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
                                        : "text-gray-400 dark:text-gray-600"
                            )}>
                                {idx < ['selection', 'details', 'payment'].indexOf(step) ? (
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

            <AnimatePresence mode="wait">
                {step === 'selection' && (
                    <motion.div
                        key="selection"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-8"
                    >
                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* 1. Choose Plan */}
                            <section className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
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
                                {uniqueDurations.length > 2 && (
                                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {uniqueDurations.map(dur => (
                                            <button
                                                key={dur}
                                                onClick={() => setFilterDuration(dur)}
                                                className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap",
                                                    filterDuration === dur
                                                        ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
                                                        : "bg-white border-gray-200 text-gray-600 hover:border-purple-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                                                )}
                                            >
                                                {dur === 'all' ? 'Any Duration' : dur.toLowerCase().replace(/ months?/, ' Mo').replace(/ days?/, ' Days')}
                                            </button>
                                        ))}
                                    </div>
                                )}
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
                                                "p-3 rounded-xl border cursor-pointer transition-all duration-200 relative",
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
                        </section>

                        <div className="space-y-6 lg:col-span-1">
                            {/* Fees */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 h-fit">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Info className="w-5 h-5 text-blue-500" />
                                    Add-ons
                                </h3>
                                <div className="space-y-3">
                                    {branch.fees.map(fee => (
                                        <label key={fee.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                    selectedFees.includes(fee.id)
                                                        ? "bg-blue-500 border-blue-500 text-white"
                                                        : "border-gray-300 dark:border-gray-600"
                                                )}>
                                                    {selectedFees.includes(fee.id) && <Check className="w-3 h-3" />}
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={selectedFees.includes(fee.id)}
                                                    onChange={() => toggleFee(fee.id)}
                                                />
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fee.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}</span>
                                        </label>
                                    ))}
                                    {branch.fees.length === 0 && (
                                        <p className="text-sm text-gray-500">No additional fees.</p>
                                    )}
                                </div>
                            </div>

                            {/* Start Date */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 h-fit">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-orange-500" />
                                    Start Date
                                </h3>
                                <input
                                    type="date"
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                />
                            </div>
                        </div>
                    </div>




                        {/* 2. Select Seat (Optional) */}
                        <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col relative z-10">
                            
                            <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                                    <div>
                                        <h2 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Armchair className="w-5 h-5 text-purple-500" />
                                            Select Your Preferred Seat
                                        </h2>
                                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                                            Optional - You can skip this step
                                        </p>
                                    </div>
                                    
                                    {/* View Toggle (Mobile Only) */}
                                    <div className="flex md:hidden bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                                        <button
                                            onClick={() => setViewMode('pagination')}
                                            className={cn(
                                                "p-1.5 rounded-md transition-all",
                                                viewMode === 'pagination' 
                                                    ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" 
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
                                            onClick={() => setViewMode('pagination')}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                                viewMode === 'pagination' 
                                                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm" 
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
                                                    ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 shadow-sm" 
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
                                            <div className="w-3 h-3 bg-white dark:bg-gray-800 border border-purple-500 rounded" />
                                            <span className="text-gray-600 dark:text-gray-300">Available</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-3 h-3 bg-purple-500 rounded" />
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
                                                        {currentSeats.map((seat: any) => (
                                                            <motion.button
                                                                key={seat.id}
                                                                whileHover={!seat.isOccupied ? { scale: 1.05 } : {}}
                                                                whileTap={!seat.isOccupied ? { scale: 0.95 } : {}}
                                                                onClick={() => !seat.isOccupied && setSelectedSeat(selectedSeat?.id === seat.id ? null : seat)}
                                                                disabled={seat.isOccupied}
                                                                className={cn(
                                                                    "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative group",
                                                                    seat.isOccupied
                                                                        ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60 text-gray-400 dark:text-gray-500"
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
                                    <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                        {Object.entries(seatsBySection).map(([section, seats]: [string, any]) => (
                                            <div key={section} className="space-y-3">
                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                    {section} Section
                                                    <span className="text-xs font-normal text-gray-400">({seats.filter((s: any) => !s.isOccupied).length} available)</span>
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
                                                            onClick={() => !seat.isOccupied && setSelectedSeat(selectedSeat?.id === seat.id ? null : seat)}
                                                            disabled={seat.isOccupied}
                                                            className={cn(
                                                                "aspect-square rounded-lg md:rounded-xl flex flex-col items-center justify-center gap-1 transition-all relative",
                                                                seat.isOccupied
                                                                    ? "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60 text-gray-400 dark:text-gray-500"
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
                                        ))}
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

                        {/* Moved to top */}

                        {/* Action Bar */}
                        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 z-40">
                            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Payable</p>
                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">₹{totalAmount}</p>
                                </div>
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
                        className="grid md:grid-cols-3 gap-8"
                    >
                        {/* Summary Side Panel */}
                        <div className="md:col-span-1 space-y-4 h-fit">
                            <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl p-6 border border-purple-100 dark:border-purple-800/30 sticky top-24">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-purple-500" />
                                    Booking Summary
                                </h3>
                                
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Selected Plan</p>
                                        <div className="font-semibold text-gray-900 dark:text-white flex justify-between items-center">
                                            <span>{selectedPlan?.name}</span>
                                            <span>₹{selectedPlan?.price}</span>
                                        </div>
                                        <p className="text-xs text-gray-500">{selectedPlan?.duration} days</p>
                                    </div>

                                    {selectedSeat && (
                                        <div className="pt-3 border-t border-purple-100 dark:border-purple-800/30">
                                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Seat</p>
                                            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                {formatSeatNumber(selectedSeat.number)}
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-purple-100 dark:border-purple-800/30">
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Start Date</p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {new Date(bookingDate).toLocaleDateString('en-IN', { 
                                                day: 'numeric', month: 'short', year: 'numeric' 
                                            })}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-purple-100 dark:border-purple-800/30 flex justify-between items-center">
                                        <span className="font-bold text-gray-900 dark:text-white">Total</span>
                                        <span className="font-bold text-xl text-purple-600 dark:text-purple-400">₹{totalAmount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Details Form */}
                        <div className="md:col-span-2">
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
                            fees={branch.fees.filter(f => selectedFees.includes(f.id))}
                            branchId={branch.id}
                            upiId={branch.upiId || undefined}
                            payeeName={branch.payeeName || undefined}
                            studentDetails={studentDetails}
                            onSuccess={handlePaymentSuccess}
                            onBack={() => setStep('details')}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
