'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, User, CreditCard, Banknote, Calendar, Check, Loader2, MapPin, Armchair, ChevronRight, Clock, Info, ChevronLeft, LayoutGrid, List, ShieldCheck, Percent } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { getOwnerStudents } from '@/actions/owner/students'
import { getOwnerBranches } from '@/actions/branch'
import { getBranchDetails, createBooking } from '@/actions/booking'
import { validateCoupon } from '@/actions/payment'
import { generateReceiptPDF } from '@/lib/pdf-generator'
import { CheckCircle2 } from 'lucide-react'

import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { cn, formatSeatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import { sendReceiptEmail } from '@/actions/email'
import { ReceiptData } from '@/lib/pdf-generator'

interface Student {
    id: string
    name: string
    email: string | null
    phone: string | null
}

interface Branch {
    id: string
    name: string
    address: string
    city: string
    seats: {
        total: number
        occupied: number
    }
}

interface Plan {
    id: string
    name: string
    description: string | null
    price: number
    duration: number
    durationUnit: string
    category: string
    hoursPerDay?: number | null
    shiftStart?: string | null
    shiftEnd?: string | null
    billingCycle: string
}

interface Fee {
    id: string
    name: string
    amount: number
    type: string
}

interface Seat {
    id: string
    number: string
    section: string | null
    row: string | null
    column: string | null
    isOccupied: boolean
}

export function AcceptPaymentForm() {
    const router = useRouter()
    const [submitting, setSubmitting] = useState(false)
    const [step, setStep] = useState<'student' | 'branch' | 'booking' | 'payment' | 'preview' | 'success'>('branch')
    
    // Success State
    const [successData, setSuccessData] = useState<{
        paymentId: string
        subscriptionId: string
        invoiceNo: string
    } | null>(null)

    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [students, setStudents] = useState<Student[]>([])
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
    const [searching, setSearching] = useState(false)

    // Branch State
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)

    // Booking State
    const [plans, setPlans] = useState<Plan[]>([])
    const [fees, setFees] = useState<Fee[]>([])
    const [seats, setSeats] = useState<Seat[]>([])
    
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
    
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
    
    // Seat View State
    const [pageBySection, setPageBySection] = useState<Record<string, number>>({})
    const [columns, setColumns] = useState(4)
    const [viewMode, setViewMode] = useState<'pagination' | 'scroll'>('pagination')

    // Payment State
    const [amount, setAmount] = useState('')
    const [additionalDiscount, setAdditionalDiscount] = useState('')
    const [method, setMethod] = useState('cash')
    const [remarks, setRemarks] = useState('')
    const [isSendingEmail, setIsSendingEmail] = useState(false)
    const [couponCode, setCouponCode] = useState('')
    
    interface Promotion {
        id: string
        code: string
        description: string | null
        type: string
        value: number | null
        minOrderValue: number | null
        maxDiscount: number | null
        startDate: Date | string | null
        endDate: Date | string | null
        isActive: boolean
        usageLimit: number | null
        perUserLimit: number | null
    }

    interface AppliedCoupon {
        code: string
        discount: number
        finalAmount: number
        details: Promotion
    }

    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
    const [validatingCoupon, setValidatingCoupon] = useState(false)

    // Debounced Student Search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length > 2) {
                setSearching(true)
                try {
                    const result = await getOwnerStudents({ search: searchQuery, limit: 5 })
                    setStudents(result.students)
                } catch {
                    // ignore
                } finally {
                    setSearching(false)
                }
            } else {
                setStudents([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Load Branches
    useEffect(() => {
        const loadBranches = async () => {
            try {
                const res = await getOwnerBranches()
                setBranches(res)
                if (res.length === 1) {
                    setSelectedBranch(res[0])
                    setStep('student')
                }
            } catch {
                toast.error('Failed to load branches')
            }
        }
        loadBranches()
    }, [])

    // Load Branch Details
    useEffect(() => {
        if (selectedBranch) {
            const loadDetails = async () => {
                setLoadingDetails(true)
                try {
                    const res = await getBranchDetails(selectedBranch.id)
                    if (res.success && res.branch) {
                        setPlans(res.branch.plans)
                        setSeats(res.branch.seats)
                        setFees(res.branch.fees || [])
                    }
                } catch {
                    toast.error('Failed to load branch details')
                } finally {
                    setLoadingDetails(false)
                }
            }
            loadDetails()
        }
    }, [selectedBranch])

    // Responsive Columns
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            if (width >= 1280) setColumns(10)
            else if (width >= 768) setColumns(8)
            else if (width >= 640) setColumns(6)
            else setColumns(4)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Calculated Values
    const feesTotal = fees
        .filter(f => selectedFees.includes(String(f.id)))
        .reduce((sum, f) => sum + f.amount, 0)
        
    const planPrice = selectedPlan?.price || 0
    const subTotal = planPrice + feesTotal
    
    // Update Amount when selection changes
    useEffect(() => {
        const calculatedTotal = appliedCoupon ? appliedCoupon.finalAmount : subTotal
        const finalAmount = Math.max(0, calculatedTotal - (parseFloat(additionalDiscount) || 0))
        setAmount(finalAmount.toString())
    }, [subTotal, appliedCoupon, additionalDiscount])

    // Sort seats naturally
    const sortedSeats = React.useMemo(() => {
        return [...(seats || [])].sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [seats])

    // Seat Grouping
    const seatsBySection = React.useMemo(() => {
        return sortedSeats.reduce((acc: Record<string, Seat[]>, seat) => {
            const section = seat.section || 'General'
            if (!acc[section]) acc[section] = []
            acc[section].push(seat)
            return acc
        }, {})
    }, [sortedSeats])

    // Check if seat selection is allowed
    const isSeatSelectionEnabled = useMemo(() => {
        if (!selectedPlan) return false
        
        // Check for "Seat Reservation" or similar fee
        const seatFeeExists = fees.some(f => 
            f.name.toLowerCase().includes('seat') || 
            f.name.toLowerCase().includes('reservation')
        )

        if (!seatFeeExists) return true // If no specific seat fee, allow selection

        // If seat fee exists, user must have selected it
        return selectedFees.some(id => {
            const fee = fees.find(f => String(f.id) === id)
            return fee && (
                fee.name.toLowerCase().includes('seat') || 
                fee.name.toLowerCase().includes('reservation')
            )
        })
    }, [selectedPlan, selectedFees, fees])

    // Reset seat if selection becomes disabled
    useEffect(() => {
        if (!isSeatSelectionEnabled && selectedSeat) {
            setSelectedSeat(null)
        }
    }, [isSeatSelectionEnabled, selectedSeat])

    const handleApplyCoupon = async () => {
        if (!couponCode) return
        setValidatingCoupon(true)
        try {
            const result = await validateCoupon(
                couponCode, 
                subTotal, 
                selectedStudent?.id,
                selectedPlan?.id,
                selectedBranch?.id
            )
            if (result.success && result.discount !== undefined && result.finalAmount !== undefined) {
                setAppliedCoupon({
                    code: couponCode,
                    discount: result.discount,
                    finalAmount: result.finalAmount,
                    details: result.promo!
                })
                toast.success(`Coupon applied! Saved ₹${result.discount}`)
            } else {
                setAppliedCoupon(null)
                toast.error(result.error || 'Invalid coupon')
            }
        } catch {
            toast.error('Failed to apply coupon')
        } finally {
            setValidatingCoupon(false)
        }
    }

    const handleCreateBooking = async () => {
        if (!selectedStudent || !selectedBranch || !selectedPlan) return

        setSubmitting(true)
        try {
            const result = await createBooking({
                studentId: selectedStudent.id,
                branchId: selectedBranch.id,
                planId: selectedPlan.id,
                seatId: selectedSeat?.id,
                startDate,
                additionalFeeIds: selectedFees,
                paymentDetails: {
                    amount: parseFloat(amount) || 0,
                    method,
                    remarks,
                    type: 'subscription',
                    discount: (appliedCoupon?.discount || 0) + (parseFloat(additionalDiscount) || 0)
                }
            })

            if (result.success) {
                toast.success('Booking & Payment recorded successfully')
                setSuccessData({
                    paymentId: result.paymentId || '',
                    subscriptionId: result.subscriptionId || '',
                    invoiceNo: `INV-${Date.now()}` // Fallback, real one is in DB
                })
                setStep('success')
            } else {
                console.error('Booking failed:', result.error)
                toast.error(result.error || 'Failed to create booking')
            }
        } catch (error) {
            console.error('Handle Create Booking Error:', error)
            toast.error((error as Error)?.message || 'An error occurred while processing the request')
        } finally {
            setSubmitting(false)
        }
    }

    const getReceiptData = () => {
        if (!selectedStudent || !selectedBranch || !selectedPlan) return null
        
        const feeItems = selectedFees.map(id => {
            const fee = fees.find((f) => String(f.id) === id)
            return {
                description: fee?.name || 'Additional Fee',
                amount: fee?.amount || 0
            }
        })

        // Calculate End Date
        const end = new Date(startDate)
        if (selectedPlan.durationUnit === 'days') {
            end.setDate(end.getDate() + selectedPlan.duration)
        } else {
            // Assume months for any other unit (including 'month', 'months')
            end.setMonth(end.getMonth() + selectedPlan.duration)
        }

        return {
            invoiceNo: successData?.invoiceNo || `INV-${Date.now()}`,
            date: new Date(),
            studentName: selectedStudent.name,
            studentEmail: selectedStudent.email,
            studentPhone: selectedStudent.phone,
            branchName: selectedBranch.name,
            branchAddress: `${selectedBranch.address}, ${selectedBranch.city}`,
            planName: selectedPlan.name,
            planType: selectedPlan.category,
            planDuration: `${selectedPlan.duration} ${selectedPlan.durationUnit}`,
            planHours: selectedPlan.hoursPerDay ? `${selectedPlan.hoursPerDay} Hrs/Day` : 
                      (selectedPlan.shiftStart && selectedPlan.shiftEnd) ? `${formatTime(selectedPlan.shiftStart)} - ${formatTime(selectedPlan.shiftEnd)}` : undefined,
            seatNumber: selectedSeat ? `${formatSeatNumber(selectedSeat.number)} (${selectedSeat.section || 'General'})` : undefined,
            startDate: new Date(startDate),
            endDate: end,
            amount: parseFloat(amount),
            paymentMethod: method,
            subTotal: subTotal,
            discount: (appliedCoupon?.discount || 0) + (parseFloat(additionalDiscount) || 0),
            items: [
                {
                    description: `Plan: ${selectedPlan.name}`,
                    amount: selectedPlan.price
                },
                ...feeItems
            ]
        }
    }

    const handleDownloadReceipt = () => {
        const data = getReceiptData()
        if (data) generateReceiptPDF(data)
    }

    const handleShareReceipt = async () => {
        const data = getReceiptData()
        if (!data) return
        
        try {
            const blob = generateReceiptPDF(data, 'blob') as Blob
            if (!blob) return

            const file = new File([blob], `Receipt-${data.invoiceNo}.pdf`, { type: 'application/pdf' })
            
            if (navigator.share) {
                await navigator.share({
                    files: [file],
                    title: 'Payment Receipt',
                    text: `Payment Receipt for ${data.studentName}`
                })
            } else {
                 toast.error('Sharing is not supported on this device')
            }
        } catch (e) {
            console.error('Share failed', e)
        }
    }

    const handleShareWhatsapp = () => {
        if (!selectedStudent || !selectedBranch) return
        
        const message = `Hi ${selectedStudent.name}, 
        
Your payment of ₹${amount} for ${selectedBranch.name} has been received successfully.
Plan: ${selectedPlan?.name}
Invoice: ${successData?.invoiceNo}

You can view your subscription details in the Student Portal:
${window.location.origin}/student

Thank you!`
        
        window.open(`https://wa.me/${selectedStudent.phone}?text=${encodeURIComponent(message)}`, '_blank')
    }

    const handleShareEmail = async () => {
        const data = getReceiptData()
        if (!data) return
        
        setIsSendingEmail(true)
        try {
            const result = await sendReceiptEmail(data)
            if (result.success) {
                toast.success('Receipt sent successfully to ' + data.studentEmail)
            } else {
                toast.error(result.error || 'Failed to send receipt email')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
            console.error(error)
        } finally {
            setIsSendingEmail(false)
        }
    }

    const handleReset = () => {
        setStep('branch')
        setSelectedStudent(null)
        setSelectedBranch(null)
        setSelectedPlan(null)
        setSelectedSeat(null)
        setSelectedFees([])
        setAppliedCoupon(null)
        setCouponCode('')
        setSearchQuery('')
        setSuccessData(null)
        setAmount('')
        setAdditionalDiscount('')
        setMethod('cash')
        setRemarks('')
        router.refresh()
    }

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '-'
        const [hours, minutes] = timeStr.split(':')
        const h = parseInt(hours)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${h12}:${minutes} ${ampm}`
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between px-4">
                {['branch', 'student', 'booking', 'payment', 'preview'].map((s, i) => {
                    const isActive = step === s
                    const isCompleted = ['branch', 'student', 'booking', 'payment', 'preview'].indexOf(step) > i
                    return (
                        <div key={s} className="flex items-center gap-2">
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                                isActive ? "bg-blue-600 text-white" : 
                                isCompleted ? "bg-green-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                            )}>
                                {isCompleted ? <Check className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={cn(
                                "text-sm font-medium capitalize hidden md:block",
                                isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500"
                            )}>{s}</span>
                            {i < 4 && <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700 hidden md:block" />}
                        </div>
                    )
                })}
            </div>

            <AnimatedCard className="p-6">
                {step === 'student' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-500" />
                                Select Student
                            </h2>
                            <button onClick={() => setStep('branch')} className="text-sm text-gray-500 hover:text-gray-900">Change Branch</button>
                        </div>
                        
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, email or phone..."
                                className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {students.map(student => (
                                <div
                                    key={student.id}
                                    onClick={() => {
                                        setSelectedStudent(student)
                                        setStep('booking')
                                    }}
                                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all hover:bg-blue-50 dark:hover:bg-blue-900/10 flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{student.name}</div>
                                            <div className="text-sm text-gray-500">{student.email} • {student.phone}</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                </div>
                            ))}
                            {students.length === 0 && searchQuery.length > 2 && !searching && (
                                <div className="text-center py-8 text-gray-500">No students found</div>
                            )}
                        </div>
                    </div>
                )}

                {step === 'branch' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-blue-500" />
                            Select Branch
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {branches.map(branch => (
                                <div
                                    key={branch.id}
                                    onClick={() => {
                                        setSelectedBranch(branch)
                                        setStep('student')
                                    }}
                                    className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 cursor-pointer transition-all hover:shadow-md"
                                >
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">{branch.name}</h3>
                                    <p className="text-sm text-gray-500 mb-3">{branch.city}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                        <Armchair className="w-3 h-3" />
                                        <span>{branch.seats.total} Seats</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'booking' && (
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Select Plan & Seat
                            </h2>
                            <button onClick={() => setStep('student')} className="text-sm text-gray-500 hover:text-gray-900">Change Student</button>
                        </div>

                        {loadingDetails ? (
                             <div className="flex justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <>
                                {/* Date Selection */}
                                <div className="space-y-4">
                                     <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <Calendar className="w-4 h-4 text-blue-500" />
                                        Start Date
                                    </h3>
                                    <div className="relative max-w-sm">
                                        <input 
                                            type="date" 
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full pl-4 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                {/* 1. Plan Selection */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        1. Select Plan
                                    </h3>
                                    <div className="space-y-2 max-h-[400px] overflow-y-auto px-1 -mx-1 custom-scrollbar">
                                        {plans.map(plan => (
                                            <div
                                                key={plan.id}
                                                onClick={() => setSelectedPlan(plan)}
                                                className={cn(
                                                    "p-3 rounded-xl border cursor-pointer transition-all duration-200 relative",
                                                    selectedPlan?.id === plan.id 
                                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm ring-1 ring-emerald-500/20" 
                                                        : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm"
                                                )}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{plan.name}</h4>
                                                        {selectedPlan?.id === plan.id && (
                                                            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm shrink-0">
                                                                <Check className="w-2.5 h-2.5 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{plan.price.toFixed(2)}</span>
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
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Additional Fees */}
                                {fees.length > 0 && (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                            <Info className="w-4 h-4 text-purple-500" />
                                            2. Additional Fees
                                        </h3>
                                        <div className="space-y-3">
                                            {fees.map(fee => (
                                                <div
                                                    key={fee.id}
                                                    onClick={() => {
                                                        const id = String(fee.id)
                                                        setSelectedFees(prev => 
                                                            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
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
                                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">₹{fee.amount}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 3. Seat Selection */}
                                {isSeatSelectionEnabled && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <MapPin className="w-4 h-4 text-emerald-500" />
                                                3. Select Seat (Optional)
                                            </h3>
                                            {/* View Toggle */}
                                            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
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
                                        
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 md:p-6 shadow-sm">
                                            {Object.entries(seatsBySection).map(([section, sectionSeats]) => {
                                                const totalPages = Math.ceil((sectionSeats as Seat[]).length / (columns * 4))
                                                const currentPage = pageBySection[section] || 0
                                                
                                                const currentSeats = viewMode === 'pagination' 
                                                    ? (sectionSeats as Seat[]).slice(currentPage * (columns * 4), (currentPage + 1) * (columns * 4))
                                                    : (sectionSeats as Seat[])

                                                return (
                                                    <div key={section} className="space-y-3 mb-6 last:mb-0">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                {section} Section
                                                            </h4>
                                                            {viewMode === 'pagination' && totalPages > 1 && (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => setPageBySection(prev => ({ ...prev, [section]: Math.max(0, (prev[section] || 0) - 1) }))}
                                                                        disabled={currentPage === 0}
                                                                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                                                                    >
                                                                        <ChevronLeft className="w-4 h-4" />
                                                                    </button>
                                                                    <span className="text-xs font-medium text-gray-500 min-w-[3rem] text-center">
                                                                        {currentPage + 1} / {totalPages}
                                                                    </span>
                                                                    <button
                                                                        onClick={() => setPageBySection(prev => ({ ...prev, [section]: Math.min(totalPages - 1, (prev[section] || 0) + 1) }))}
                                                                        disabled={currentPage === totalPages - 1}
                                                                        className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                                                                    >
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div 
                                                            className="grid gap-2"
                                                            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                                        >
                                                            {currentSeats.map((seat: Seat) => (
                                                                <motion.button
                                                                    key={seat.id}
                                                                    onClick={() => !seat.isOccupied && setSelectedSeat((prev: Seat | null) => prev?.id === seat.id ? null : seat)}
                                                                    className={cn(
                                                                        "aspect-square rounded-lg flex flex-col items-center justify-center transition-all relative",
                                                                        seat.isOccupied
                                                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                            : selectedSeat?.id === seat.id
                                                                                ? "bg-emerald-500 text-white shadow-sm"
                                                                                : "bg-white border border-gray-200 hover:border-emerald-500 hover:shadow-sm cursor-pointer text-gray-700 dark:bg-gray-800 dark:border-gray-700"
                                                                    )}
                                                                >
                                                                    <Armchair className="w-4 h-4 mb-0.5" />
                                                                    <span className="text-[10px] font-bold">
                                                                        {formatSeatNumber(seat.number)}
                                                                    </span>
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-4 justify-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-white border border-gray-200"></div>
                                                <span>Available</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-emerald-500"></div>
                                                <span>Selected</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded bg-gray-100"></div>
                                                <span>Occupied</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <AnimatedButton
                                        onClick={() => {
                                            if (!selectedPlan) {
                                                toast.error('Please select a plan')
                                                return
                                            }
                                            // Seat selection is optional
                                            setStep('payment')
                                        }}
                                        className="w-full md:w-auto min-w-[200px]"
                                    >
                                        Proceed to Payment
                                    </AnimatedButton>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {step === 'payment' && selectedStudent && selectedBranch && selectedPlan && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-blue-500" />
                                Confirm Payment
                            </h2>
                            <button onClick={() => setStep('booking')} className="text-sm text-gray-500 hover:text-gray-900">Change Details</button>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Student</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedStudent.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Branch</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedBranch.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Plan</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedPlan.name} ({selectedPlan.duration} {selectedPlan.durationUnit})</span>
                            </div>
                            {feesTotal > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Additional Fees ({selectedFees.length})</span>
                                    <span className="font-medium text-gray-900 dark:text-white">+ ₹{feesTotal.toFixed(2)}</span>
                                </div>
                            )}
                            {selectedSeat && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Seat</span>
                                    <span className="font-medium text-emerald-600">{formatSeatNumber(selectedSeat.number)}</span>
                                </div>
                            )}
                            
                            {appliedCoupon && (
                                <div className="flex justify-between text-sm text-green-600 font-medium">
                                    <span>Coupon Discount ({appliedCoupon.code})</span>
                                    <span>- ₹{appliedCoupon.discount.toFixed(2)}</span>
                                </div>
                            )}

                            {parseFloat(additionalDiscount) > 0 && (
                                <div className="flex justify-between text-sm text-orange-600 font-medium">
                                    <span>Additional Discount</span>
                                    <span>- ₹{parseFloat(additionalDiscount).toFixed(2)}</span>
                                </div>
                            )}

                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                <span className="font-medium text-gray-900 dark:text-white">Total Amount</span>
                                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                                    ₹{Math.max(0, (appliedCoupon ? appliedCoupon.finalAmount : subTotal) - (parseFloat(additionalDiscount) || 0)).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        {/* Coupon Section */}
                        <div className="flex gap-2">
                            <FormInput
                                placeholder="Enter coupon code"
                                value={couponCode}
                                onChange={(e) => setCouponCode(e.target.value)}
                                className="flex-1"
                            />
                            <AnimatedButton 
                                variant="secondary" 
                                onClick={handleApplyCoupon}
                                disabled={!couponCode || !!appliedCoupon || validatingCoupon}
                                isLoading={validatingCoupon}
                            >
                                Apply
                            </AnimatedButton>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Received Amount (₹)"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    icon={CreditCard}
                                    required
                                />
                                <FormInput
                                    label="Additional Discount (₹)"
                                    type="number"
                                    value={additionalDiscount}
                                    onChange={(e) => setAdditionalDiscount(e.target.value)}
                                    placeholder="Optional"
                                    icon={Percent}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6">
                                <FormSelect
                                    label="Payment Method"
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    options={[
                                        { label: 'Cash', value: 'cash' },
                                        { label: 'UPI / Online', value: 'upi' }
                                    ]}
                                    icon={Banknote}
                                />

                                <FormInput
                                    label="Due Amount (₹)"
                                    value={Math.max(0, (appliedCoupon ? appliedCoupon.finalAmount : subTotal) - (parseFloat(amount) || 0) - (parseFloat(additionalDiscount) || 0))}
                                    readOnly
                                    className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed text-gray-500"
                                    icon={Banknote}
                                />
                            </div>
                        </div>

                        <FormInput
                            label="Remarks (Optional)"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="e.g. Paid in cash"
                            icon={Check}
                        />

                        <div className="flex justify-end pt-4">
                            <AnimatedButton
                                onClick={() => setStep('preview')}
                                disabled={amount === ''}
                                className="w-full md:w-auto min-w-[200px]"
                            >
                                Review Details
                            </AnimatedButton>
                        </div>
                    </div>
                )}

                {step === 'preview' && selectedStudent && selectedBranch && selectedPlan && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                                Review & Confirm
                            </h2>
                            <button onClick={() => setStep('payment')} className="text-sm text-gray-500 hover:text-gray-900">Back to Payment</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Student Details */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
                                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" />
                                    Student Details
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Name</span>
                                        <span className="font-medium">{selectedStudent.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Email</span>
                                        <span className="font-medium">{selectedStudent.email || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Phone</span>
                                        <span className="font-medium">{selectedStudent.phone || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Booking Details */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
                                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    Booking Details
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Branch</span>
                                        <span className="font-medium">{selectedBranch.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Plan</span>
                                        <span className="font-medium">{selectedPlan.name} ({selectedPlan.duration} {selectedPlan.durationUnit})</span>
                                    </div>
                                    {selectedSeat && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Seat</span>
                                            <span className="font-medium text-emerald-600">{formatSeatNumber(selectedSeat.number)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Start Date</span>
                                        <span className="font-medium">{new Date(startDate).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Summary */}
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
                            <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                <Banknote className="w-4 h-4 text-gray-500" />
                                Payment Summary
                            </h3>
                            
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Plan Price</span>
                                    <span>₹{selectedPlan.price.toFixed(2)}</span>
                                </div>
                                
                                {feesTotal > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Additional Fees</span>
                                        <span>+ ₹{feesTotal.toFixed(2)}</span>
                                    </div>
                                )}
                                
                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between font-medium">
                                    <span>Subtotal</span>
                                    <span>₹{subTotal.toFixed(2)}</span>
                                </div>

                                {appliedCoupon && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Coupon Discount ({appliedCoupon.code})</span>
                                        <span>- ₹{appliedCoupon.discount.toFixed(2)}</span>
                                    </div>
                                )}

                                {parseFloat(additionalDiscount) > 0 && (
                                    <div className="flex justify-between text-orange-600">
                                        <span>Additional Discount</span>
                                        <span>- ₹{parseFloat(additionalDiscount).toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-between text-lg font-bold">
                                    <span>Total Payable</span>
                                    <span className="text-blue-600">₹{Math.max(0, (appliedCoupon ? appliedCoupon.finalAmount : subTotal) - (parseFloat(additionalDiscount) || 0)).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-500 mb-1">Payment Method</span>
                                    <span className="font-medium capitalize">{method}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 mb-1">Amount Received</span>
                                    <span className="font-medium text-green-600">₹{parseFloat(amount || '0').toFixed(2)}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 mb-1">Due Amount</span>
                                    <span className="font-medium text-red-500">
                                        ₹{Math.max(0, (Math.max(0, (appliedCoupon ? appliedCoupon.finalAmount : subTotal) - (parseFloat(additionalDiscount) || 0))) - (parseFloat(amount) || 0)).toFixed(2)}
                                    </span>
                                </div>
                                {remarks && (
                                    <div className="col-span-2">
                                        <span className="block text-gray-500 mb-1">Remarks</span>
                                        <span className="font-medium">{remarks}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <AnimatedButton
                                variant="outline"
                                onClick={() => setStep('payment')}
                                disabled={submitting}
                            >
                                Back
                            </AnimatedButton>
                            <AnimatedButton
                                onClick={handleCreateBooking}
                                disabled={submitting}
                                isLoading={submitting}
                                className="min-w-[200px]"
                            >
                                Confirm Booking & Accept
                            </AnimatedButton>
                        </div>
                    </div>
                )}
                {step === 'success' && selectedStudent && selectedBranch && selectedPlan && (
                    <div className="flex flex-col items-center justify-center py-8 space-y-6">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400"
                        >
                            <CheckCircle2 className="w-10 h-10" />
                        </motion.div>
                        
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Successful!</h2>
                            <p className="text-gray-500 max-w-sm">
                                The booking has been confirmed and the subscription is now active.
                                The student can view this in their portal immediately.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 justify-center w-full max-w-md">
                            <AnimatedButton
                                variant="outline"
                                onClick={handleDownloadReceipt}
                                icon="download"
                                className="flex-1"
                            >
                                Download Receipt
                            </AnimatedButton>
                            
                            <AnimatedButton
                                variant="outline"
                                onClick={handleShareReceipt}
                                icon="share"
                                className="flex-1"
                            >
                                Share Receipt
                            </AnimatedButton>

                            <AnimatedButton
                                variant="outline"
                                onClick={handleShareWhatsapp}
                                icon="message"
                                className="flex-1"
                            >
                                WhatsApp
                            </AnimatedButton>

                            <AnimatedButton
                                variant="outline"
                                onClick={handleShareEmail}
                                icon="mail"
                                className="flex-1"
                                isLoading={isSendingEmail}
                            >
                                Email
                            </AnimatedButton>
                        </div>

                        <div className="pt-8">
                            <AnimatedButton
                                onClick={handleReset}
                                icon="home"
                                className="min-w-[200px]"
                            >
                                Back to Dashboard
                            </AnimatedButton>
                        </div>
                    </div>
                )}
            </AnimatedCard>
        </div>
    )
}
