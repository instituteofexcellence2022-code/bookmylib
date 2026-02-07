'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, User, CreditCard, Banknote, Check, Loader2, ChevronRight, ChevronLeft, Percent, Armchair, Calendar, Info, LayoutGrid, List, ShieldCheck, MapPin, CheckCircle2, Clock, Lock } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { getStaffStudents, getStudentDetails } from '@/actions/staff/students'
import { getStaffBranchDetails, createStaffPayment } from '@/actions/staff/finance'
import { toast } from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn, formatSeatNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import { validateCoupon } from '@/actions/payment'
import { generateReceiptPDF } from '@/lib/pdf-generator'

interface Student {
    id: string
    name: string
    email: string | null
    phone: string | null
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
    includesSeat?: boolean
    includesLocker?: boolean
}

interface Fee {
    id: string
    name: string
    amount: number
    type?: string
    description?: string | null
}

interface Seat {
    id: string
    number: string
    section: string | null
    row: string | null
    column: string | null
    isOccupied: boolean
}

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

export function StaffAcceptPaymentForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialStudentId = searchParams.get('studentId')

    const [submitting, setSubmitting] = useState(false)
    const [step, setStep] = useState<'student' | 'booking' | 'payment' | 'preview' | 'success'>('student')
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [students, setStudents] = useState<Student[]>([])
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
    const [searching, setSearching] = useState(false)

    // Data State
    const [plans, setPlans] = useState<Plan[]>([])
    const [fees, setFees] = useState<Fee[]>([])
    const [seats, setSeats] = useState<Seat[]>([])
    const [branchDetails, setBranchDetails] = useState<{
        id: string
        name: string
        address: string | null
        city: string
        phone: string | null
    } | null>(null)
    
    // Booking State
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    
    // Pre-fill Student from URL
    useEffect(() => {
        const fetchInitialStudent = async () => {
            if (initialStudentId && !selectedStudent) {
                try {
                    const result = await getStudentDetails(initialStudentId)
                    if (result.success && result.data && result.data.student) {
                        const s = result.data.student
                        setSelectedStudent({
                            id: s.id,
                            name: s.name,
                            email: s.email || '',
                            phone: s.phone
                        })
                        // Auto-advance to booking step
                        setStep('booking')
                    }
                } catch (error) {
                    console.error('Error fetching initial student:', error)
                }
            }
        }
        fetchInitialStudent()
    }, [initialStudentId, selectedStudent])

    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
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
    
    // Coupon State
    const [couponCode, setCouponCode] = useState('')
    const [isValidatingCoupon, setIsValidatingCoupon] = useState(false)
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)

    // Success Data
    const [successData, setSuccessData] = useState<Record<string, unknown> | null>(null)

    // Data Loading
    useEffect(() => {
        async function loadData() {
            try {
                const res = await getStaffBranchDetails()
                if (res.success && res.data) {
                    setPlans(res.data.plans || [])
                    setFees(res.data.fees || [])
                    setSeats(res.data.seats || [])
                    setBranchDetails(res.data.branch)
                }
            } catch (error) {
                console.error(error)
                toast.error('Failed to load branch details')
            }
        }
        loadData()
    }, [])

    // Responsive Columns for Seat Map
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

    // Search Students
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setSearching(true)
                try {
                    const result = await getStaffStudents({ search: searchQuery, limit: 5 })
                    if (result.success && result.data) {
                        setStudents(result.data.students)
                    }
                } catch (error) {
                    console.error('Search error:', error)
                } finally {
                    setSearching(false)
                }
            } else {
                setStudents([])
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleStudentSelect = (student: Student) => {
        setSelectedStudent(student)
        setSearchQuery(student.name)
        setStudents([])
    }

    // Calculated Values
    const feesTotal = fees
        .filter(f => selectedFees.includes(String(f.id)))
        .reduce((sum, f) => sum + f.amount, 0)
        
    const planPrice = selectedPlan?.price || 0
    const subTotal = planPrice + feesTotal



    // Sort seats naturally
    const sortedSeats = React.useMemo(() => {
        return [...(seats || [])].sort((a, b) => {
            const numA = String(a.number || '')
            const numB = String(b.number || '')
            return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' })
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
        
        if (selectedPlan.includesSeat) return true

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

    // Filter fees
    const lockerFees = useMemo(() => fees.filter(f => f.name.toLowerCase().includes('locker')), [fees])
    const seatFees = useMemo(() => fees.filter(f => f.name.toLowerCase().includes('seat') || f.name.toLowerCase().includes('reservation')), [fees])
    const otherFees = useMemo(() => fees.filter(f => !lockerFees.includes(f) && !seatFees.includes(f)), [fees, lockerFees, seatFees])

    // Handle Fee Toggles with conflict resolution
    const toggleFee = (feeId: string) => {
        const id = String(feeId)
        
        setSelectedFees(prev => {
            const isSelected = prev.includes(id)
            if (isSelected) {
                return prev.filter(f => f !== id)
            } else {
                return [...prev, id]
            }
        })
    }

    // Reset seat if selection becomes disabled
    useEffect(() => {
        if (!isSeatSelectionEnabled && selectedSeat) {
            setSelectedSeat(null)
        }
    }, [isSeatSelectionEnabled, selectedSeat])

    const validateCouponCode = async () => {
        if (!couponCode) return
        setIsValidatingCoupon(true)
        try {
            const result = await validateCoupon(
                couponCode, 
                subTotal, 
                selectedStudent?.id || '',
                selectedPlan?.id,
                branchDetails?.id
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
                toast.error(result.error || 'Invalid coupon')
                setAppliedCoupon(null)
            }
        } catch {
            toast.error('Failed to validate coupon')
        } finally {
            setIsValidatingCoupon(false)
        }
    }

    // Auto-fill amount when entering payment step or when totals change
    useEffect(() => {
        const total = (appliedCoupon ? appliedCoupon.finalAmount : subTotal) - (parseFloat(additionalDiscount) || 0)
        const calculatedAmount = Math.max(0, total)
        setAmount(calculatedAmount.toString())
    }, [subTotal, appliedCoupon, additionalDiscount])

    const handleNext = () => {
        if (step === 'student') {
            if (!selectedStudent) {
                toast.error('Please select a student')
                return
            }
            setStep('booking')
        } else if (step === 'booking') {
            if (!selectedPlan) {
                toast.error('Please select a plan')
                return
            }
            // Seat selection is now optional
            // if (isSeatSelectionEnabled && !selectedSeat) {
            //     toast.error('Please select a seat')
            //     return
            // }
            setStep('payment')
        } else if (step === 'payment') {
            if (!amount || parseFloat(amount) < 0) {
                toast.error('Please enter a valid amount')
                return
            }
            setStep('preview')
        }
    }

    const handleSubmit = async () => {
        if (!selectedStudent || !selectedPlan) return

        try {
            setSubmitting(true)
            const result = await createStaffPayment({
                studentId: selectedStudent.id,
                amount: parseFloat(amount),
                method,
                type: 'subscription',
                remarks,
                planId: selectedPlan.id,
                seatId: selectedSeat?.id,
                additionalFeeIds: selectedFees,
                promoCode: appliedCoupon?.code,
                discount: (appliedCoupon?.discount || 0) + (parseFloat(additionalDiscount) || 0)
            })
            
            if (result.success && result.data) {
                setSuccessData({
                    ...result.data,
                    studentName: selectedStudent.name,
                    planName: selectedPlan.name,
                    invoiceNo: result.data.invoiceNo || `INV-${Date.now()}`
                })
                setStep('success')
                toast.success('Payment collected successfully')
            } else {
                toast.error(result.error || 'Failed to process payment')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const resetForm = () => {
        setStep('student')
        setSelectedStudent(null)
        setSearchQuery('')
        setAmount('')
        setRemarks('')
        setSelectedPlan(null)
        setSelectedFees([])
        setSelectedSeat(null)
        setAppliedCoupon(null)
        setCouponCode('')
        setAdditionalDiscount('')
        setSuccessData(null)
    }

    const getReceiptData = () => {
        if (!selectedStudent || !branchDetails || !selectedPlan) return null
        
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
            end.setMonth(end.getMonth() + selectedPlan.duration)
        }

        return {
            invoiceNo: (successData?.invoiceNo as string) || `INV-${Date.now()}`,
            date: new Date(),
            studentName: selectedStudent.name,
            studentEmail: selectedStudent.email,
            studentPhone: selectedStudent.phone,
            branchName: branchDetails.name,
            branchAddress: `${branchDetails.address || ''}, ${branchDetails.city}`,
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
        const data = getReceiptData()
        if (!data) return
        const text = `Payment Receipt for ${data.studentName}\nAmount: ₹${data.amount}\nPlan: ${data.planName}\nDate: ${data.date.toLocaleDateString()}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    const handleShareEmail = () => {
        const data = getReceiptData()
        if (!data) return
        const subject = `Payment Receipt - ${data.studentName}`
        const body = `Payment Details:\nAmount: ₹${data.amount}\nPlan: ${data.planName}\nDate: ${data.date.toLocaleDateString()}`
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    }

    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '-'
        try {
            const [hours, minutes] = timeStr.split(':')
            if (!hours || !minutes) return timeStr
            const h = parseInt(hours)
            if (isNaN(h)) return timeStr
            const ampm = h >= 12 ? 'PM' : 'AM'
            const h12 = h % 12 || 12
            return `${h12}:${minutes} ${ampm}`
        } catch {
            return timeStr || '-'
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Steps Indicator */}
            <div className="flex items-center justify-between px-4">
                {['student', 'booking', 'payment', 'preview', 'success'].map((s, i) => {
                    const isActive = step === s
                    const isCompleted = ['student', 'booking', 'payment', 'preview', 'success'].indexOf(step) > i
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
                            {i < 3 && <div className="w-8 h-0.5 bg-gray-200 dark:bg-gray-700 hidden md:block" />}
                        </div>
                    )
                })}
            </div>

            <AnimatedCard className="p-6">
                {step === 'student' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-500" />
                            Select Student
                        </h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <FormInput
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value)
                                    if (selectedStudent) setSelectedStudent(null)
                                }}
                                placeholder="Search by name, email or phone..."
                                className="pl-10"
                                autoFocus
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 className="animate-spin text-blue-600" size={18} />
                                </div>
                            )}
                            
                            {students.length > 0 && !selectedStudent && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                    {students.map(student => (
                                        <div
                                            key={student.id}
                                            onClick={() => handleStudentSelect(student)}
                                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-0"
                                        >
                                            <div className="font-medium">{student.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {[student.phone, student.email].filter(Boolean).join(' • ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedStudent && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-4 border border-blue-100 dark:border-blue-800">
                                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full">
                                    <User size={20} className="text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <div className="font-medium text-blue-900 dark:text-blue-100">{selectedStudent.name}</div>
                                    <div className="text-sm text-blue-700 dark:text-blue-300">
                                        {[selectedStudent.phone, selectedStudent.email].filter(Boolean).join(' • ')}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setSelectedStudent(null)
                                            setSearchQuery('')
                                        }}
                                        className="text-xs text-red-500 hover:underline mt-2"
                                    >
                                        Change Student
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <AnimatedButton
                                onClick={handleNext}
                                disabled={!selectedStudent}
                                className="w-full sm:w-auto"
                            >
                                Next Step
                                <ChevronRight size={16} className="ml-2" />
                            </AnimatedButton>
                        </div>
                    </div>
                )}

                {step === 'booking' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Booking Details
                            </h2>
                            <button 
                                onClick={() => setStep('student')}
                                className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center"
                            >
                                <ChevronLeft size={14} className="mr-1" /> Back
                            </button>
                        </div>

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
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">₹{Number(plan.price || 0).toFixed(2)}</span>
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
                                                        : `${plan.hoursPerDay || 0} Hrs/Day`
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
                                                {plan.category || 'Standard'}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 capitalize">
                                                {(plan.billingCycle || '').replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. Fees & Customization */}
                        {(fees.length > 0 || selectedPlan?.includesLocker) && (
                            <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <Info className="w-4 h-4 text-purple-500" />
                                    2. Fees & Customization
                                </h3>
                                
                                {/* Locker Section */}
                                {(selectedPlan?.includesLocker || lockerFees.length > 0) && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400">
                                            <Lock className="w-3.5 h-3.5" />
                                            Locker Facility
                                        </h4>
                                        
                                        {selectedPlan?.includesLocker ? (
                                            <div className="flex items-center gap-3 p-3 rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800">
                                                <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                                    <Check className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm text-purple-900 dark:text-purple-100">Locker Included</p>
                                                    <p className="text-xs text-purple-700 dark:text-purple-300">Part of your plan</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {lockerFees.map(fee => (
                                                    <div
                                                        key={fee.id}
                                                        onClick={() => toggleFee(fee.id)}
                                                        className={cn(
                                                            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                                            selectedFees.includes(String(fee.id))
                                                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-1 ring-purple-500/20"
                                                                : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                                selectedFees.includes(String(fee.id))
                                                                    ? "bg-purple-500 border-purple-500 text-white"
                                                                    : "border-gray-300 dark:border-gray-600"
                                                            )}>
                                                                {selectedFees.includes(String(fee.id)) && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fee.name}</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Seat Fee Section (Only if not included and fees exist) */}
                                {(!selectedPlan?.includesSeat && seatFees.length > 0) && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                            <Armchair className="w-3.5 h-3.5" />
                                            Seat Reservation
                                        </h4>
                                        <div className="space-y-2">
                                            {seatFees.map(fee => (
                                                <div
                                                    key={fee.id}
                                                    onClick={() => toggleFee(fee.id)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                                        selectedFees.includes(String(fee.id))
                                                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500/20"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-emerald-300"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                            selectedFees.includes(String(fee.id))
                                                                ? "bg-emerald-500 border-emerald-500 text-white"
                                                                : "border-gray-300 dark:border-gray-600"
                                                        )}>
                                                            {selectedFees.includes(String(fee.id)) && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fee.name}</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Other Fees */}
                                {otherFees.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                            <Info className="w-3.5 h-3.5" />
                                            Other Fees
                                        </h4>
                                        <div className="space-y-2">
                                            {otherFees.map(fee => (
                                                <div
                                                    key={fee.id}
                                                    onClick={() => toggleFee(fee.id)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                                                        selectedFees.includes(String(fee.id))
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500/20"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                            selectedFees.includes(String(fee.id))
                                                                ? "bg-blue-500 border-blue-500 text-white"
                                                                : "border-gray-300 dark:border-gray-600"
                                                        )}>
                                                            {selectedFees.includes(String(fee.id)) && <Check className="w-3 h-3" />}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-900 dark:text-white">{fee.name}</p>
                                                            {fee.description && (
                                                                <p className="text-xs text-gray-500">{fee.description}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Seat Selection */}
                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                    <MapPin className="w-4 h-4 text-emerald-500" />
                                    3. Select Seat (Optional)
                                </h3>
                                {!isSeatSelectionEnabled && (
                                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-200">
                                        Select Plan & Seat Fee to unlock
                                    </span>
                                )}
                            </div>

                            {isSeatSelectionEnabled ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg">
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setViewMode('pagination')}
                                                className={cn(
                                                    "p-2 rounded-md transition-all",
                                                    viewMode === 'pagination' ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-500"
                                                )}
                                            >
                                                <LayoutGrid className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => setViewMode('scroll')}
                                                className={cn(
                                                    "p-2 rounded-md transition-all",
                                                    viewMode === 'scroll' ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-500"
                                                )}
                                            >
                                                <List className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={cn(
                                        "space-y-8",
                                        viewMode === 'scroll' ? "max-h-[500px] overflow-y-auto pr-2" : ""
                                    )}>
                                        {Object.entries(seatsBySection).map(([section, sectionSeats]) => {
                                            // Pagination logic
                                            const currentPage = pageBySection[section] || 0
                                            const totalPages = Math.ceil(sectionSeats.length / (columns * 4)) // 4 rows per page
                                            const displayedSeats = viewMode === 'pagination' 
                                                ? sectionSeats.slice(currentPage * (columns * 4), (currentPage + 1) * (columns * 4))
                                                : sectionSeats

                                            return (
                                                <div key={section} className="space-y-3">
                                                    <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10 py-2">
                                                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                            {section} Section
                                                            <span className="text-xs font-normal text-gray-400 ml-2">({sectionSeats.length} seats)</span>
                                                        </h4>
                                                        
                                                        {viewMode === 'pagination' && totalPages > 1 && (
                                                            <div className="flex items-center gap-1">
                                                                <button 
                                                                    onClick={() => setPageBySection(prev => ({ ...prev, [section]: Math.max(0, currentPage - 1) }))}
                                                                    disabled={currentPage === 0}
                                                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                                                >
                                                                    <ChevronLeft className="w-4 h-4" />
                                                                </button>
                                                                <span className="text-xs text-gray-500 font-mono">
                                                                    {currentPage + 1}/{totalPages}
                                                                </span>
                                                                <button 
                                                                    onClick={() => setPageBySection(prev => ({ ...prev, [section]: Math.min(totalPages - 1, currentPage + 1) }))}
                                                                    disabled={currentPage === totalPages - 1}
                                                                    className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                                                                >
                                                                    <ChevronRight className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div 
                                                        className="grid gap-3"
                                                        style={{ 
                                                            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` 
                                                        }}
                                                    >
                                                        {displayedSeats.map(seat => (
                                                            <motion.button
                                                                key={seat.id}
                                                                whileHover={{ scale: 1.05 }}
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => !seat.isOccupied && setSelectedSeat(prev => prev?.id === seat.id ? null : seat)}
                                                                disabled={seat.isOccupied}
                                                                className={cn(
                                                                    "aspect-square rounded-lg flex flex-col items-center justify-center transition-all",
                                                                    seat.isOccupied 
                                                                        ? "bg-gray-100 dark:bg-gray-800 text-gray-300 cursor-not-allowed border border-transparent" 
                                                                        : selectedSeat?.id === seat.id
                                                                            ? "bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200 dark:ring-emerald-900"
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
                            ) : (
                                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    <Armchair className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Seat selection not available</p>
                                    <p className="text-xs text-gray-400 mt-1">Select a plan and include seat fees to enable</p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                            <AnimatedButton
                                onClick={handleNext}
                                className="min-w-[120px]"
                            >
                                Next Step
                                <ChevronRight size={16} className="ml-2" />
                            </AnimatedButton>
                        </div>
                    </div>
                )}

                {step === 'payment' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-blue-500" />
                                Confirm Payment
                            </h2>
                            <button onClick={() => setStep('booking')} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">Change Details</button>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Student</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedStudent?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Branch</span>
                                <span className="font-medium text-gray-900 dark:text-white">{branchDetails?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Plan</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedPlan?.name} ({selectedPlan?.duration} {selectedPlan?.durationUnit})</span>
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
                                onClick={validateCouponCode}
                                disabled={!couponCode || !!appliedCoupon || isValidatingCoupon}
                                isLoading={isValidatingCoupon}
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

                {step === 'preview' && selectedStudent && selectedPlan && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                                Review & Confirm
                            </h2>
                            <button onClick={() => setStep('payment')} className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100">Back to Payment</button>
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
                                        <span className="font-medium">{branchDetails?.name}</span>
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
                                onClick={handleSubmit}
                                disabled={submitting}
                                isLoading={submitting}
                                className="min-w-[200px]"
                            >
                                Confirm Booking & Accept
                            </AnimatedButton>
                        </div>
                    </div>
                )}

                {step === 'success' && selectedStudent && selectedPlan && (
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
                            >
                                Email
                            </AnimatedButton>
                        </div>

                        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
                            <AnimatedButton
                                onClick={resetForm}
                                icon="add"
                                className="min-w-[200px] flex-1 sm:flex-none"
                            >
                                Collect Another Payment
                            </AnimatedButton>
                            
                            <AnimatedButton
                                onClick={() => router.push('/staff/dashboard')}
                                variant="outline"
                                icon="home"
                                className="min-w-[200px] flex-1 sm:flex-none"
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
