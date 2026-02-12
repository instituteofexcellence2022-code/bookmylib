'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Search, User, CreditCard, Banknote, Calendar, Check, Loader2, MapPin, Armchair, ChevronRight, Clock, Info, ChevronLeft, LayoutGrid, List, ShieldCheck, Percent, Lock, Plus, Minus, ChevronUp, ChevronDown, Filter, CheckCircle2 } from 'lucide-react'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { Button } from '@/components/ui/button'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { getOwnerStudents } from '@/actions/owner/students'
import { getStudentDetails } from '@/actions/owner/students'
import { getOwnerBranches } from '@/actions/branch'
import { getBranchDetails, createBooking } from '@/actions/booking'
import { validateCoupon } from '@/actions/payment'
import { generateReceiptPDF } from '@/lib/pdf-generator'

import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { cn, formatSeatNumber, formatLockerNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import { sendReceiptEmail } from '@/actions/email'
import { ReceiptData } from '@/lib/pdf-generator'

interface Student {
    id: string
    name: string
    email: string | null
    phone: string | null
    subscriptions?: any[]
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
    includesSeat: boolean
    includesLocker: boolean
}

interface Fee {
    id: string
    name: string
    amount: number
    type: string
    billType?: string
}

interface Seat {
    id: string
    number: string
    section: string | null
    row: string | null
    column: string | null
    isOccupied: boolean
}

interface Locker {
    id: string
    number: string
    isOccupied: boolean
}

export function AcceptPaymentForm({ initialStudentId }: { initialStudentId?: string }) {
    const router = useRouter()
    const searchParams = useSearchParams()
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
    const [lockers, setLockers] = useState<Locker[]>([])
    const [branchConfig, setBranchConfig] = useState<{
        hasLockers: boolean
        isLockerSeparate: boolean
    } | null>(null)
    
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [quantity, setQuantity] = useState(1)
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
    const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null)
    
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [startDate, setStartDate] = useState('')
    
    // Seat View State
    const [pageBySection, setPageBySection] = useState<Record<string, number>>({})
    const [columns, setColumns] = useState(4)
    const [viewMode, setViewMode] = useState<'pagination' | 'scroll'>('pagination')
    const [seatFilter, setSeatFilter] = useState<'all' | 'available' | 'occupied' | 'selected'>('all')
    const [lockerFilter, setLockerFilter] = useState<'all' | 'available' | 'occupied' | 'selected'>('all')
    const [lockerViewMode, setLockerViewMode] = useState<'pagination' | 'scroll'>('pagination')
    const [lockerPage, setLockerPage] = useState(0)

    // Column resize handler
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 640) setColumns(3)
            else if (window.innerWidth < 768) setColumns(4)
            else if (window.innerWidth < 1024) setColumns(6)
            else setColumns(8)
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])



    // Helper to format 24h time to 12h
    const formatTime = (timeStr?: string | null) => {
        if (!timeStr) return '-'
        const [hours, minutes] = timeStr.split(':')
        const h = parseInt(hours)
        const ampm = h >= 12 ? 'PM' : 'AM'
        const h12 = h % 12 || 12
        return `${h12}:${minutes} ${ampm}`
    }

    // Filters & Add-on Mode
    const [filterCategory, setFilterCategory] = useState<string>('all')
    const [filterDuration, setFilterDuration] = useState<number | 'all' | 'other'>('all')
    const [isLockerAddOnMode, setIsLockerAddOnMode] = useState(false)
    const activeSubscription = useMemo(() => 
        selectedStudent?.subscriptions?.find((s: any) => s.status === 'active'), 
    [selectedStudent])

    const DURATION_FILTERS = [
        { id: 'all', label: 'All Plans' },
        { id: 1, label: '1 Mo' },
        { id: 3, label: '3 Mo' },
        { id: 6, label: '6 Mo' },
        { id: 'other', label: 'Other' }
    ]

    // Filter plans based on filters
    const filteredPlans = useMemo(() => {
        return plans.filter(plan => {
            const matchCategory = filterCategory === 'all' || plan.category === filterCategory
            
            let matchDuration = true
            if (filterDuration !== 'all') {
                if (filterDuration === 1) {
                    matchDuration = plan.duration === 1 && plan.durationUnit.toLowerCase().startsWith('month')
                } else if (filterDuration === 3) {
                    matchDuration = plan.duration === 3 && plan.durationUnit.toLowerCase().startsWith('month')
                } else if (filterDuration === 6) {
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
    }, [plans, filterCategory, filterDuration])

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
                    if (result.success && result.data) {
                        setStudents(result.data.students)
                    } else {
                        setStudents([])
                    }
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
                const result = await getOwnerBranches()
                if (result.success && result.data) {
                    const res = result.data
                    setBranches(res)
                    // Prefill from query if provided
                    const branchId = searchParams.get('branchId')
                    if (branchId) {
                        const found = res.find(b => b.id === branchId)
                        if (found) {
                            setSelectedBranch(found)
                            setStep('student')
                        }
                    } else if (res.length === 1) {
                        setSelectedBranch(res[0])
                        setStep('student')
                    }
                }
            } catch {
                toast.error('Failed to load branches')
            }
        }
        loadBranches()
    }, [searchParams])

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
                        setLockers(res.branch.lockers || [])
                        setFees(res.branch.fees || [])
                        setBranchConfig({
                            hasLockers: res.branch.hasLockers,
                            isLockerSeparate: res.branch.isLockerSeparate
                        })
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
    
    // Prefill student from query
    useEffect(() => {
        const studentId = initialStudentId || searchParams.get('studentId')
        if (studentId) {
            ;(async () => {
                try {
                    const res = await getStudentDetails(studentId)
                    if (res.success && res.data && res.data.student) {
                        const s = res.data.student
                        setSelectedStudent({
                            id: s.id,
                            name: s.name,
                            email: s.email,
                            phone: s.phone,
                            subscriptions: s.subscriptions
                        })
                        // If branch already selected, move forward
                        if (selectedBranch) {
                            setStep('booking')
                        }
                    }
                } catch {
                    // ignore
                }
            })()
        }
    }, [searchParams, selectedBranch, initialStudentId])

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
        
    const planPrice = isLockerAddOnMode ? 0 : (selectedPlan?.price || 0)
    const subTotal = (planPrice * quantity) + (feesTotal * quantity)
    
    useEffect(() => {
        if (isLockerAddOnMode) return
        const subs = selectedStudent?.subscriptions || []
        if (subs.length > 0) {
            const last = subs
                .filter((s: any) => s.endDate || s.startDate)
                .sort((a: any, b: any) => new Date(b.endDate || b.startDate).getTime() - new Date(a.endDate || a.startDate).getTime())[0]
            const d = last?.endDate ? new Date(last.endDate) : (last?.startDate ? new Date(last.startDate) : null)
            setStartDate(d ? d.toISOString().split('T')[0] : '')
        } else {
            setStartDate('')
        }
    }, [selectedStudent, isLockerAddOnMode])
    // Auto-select for Locker Add-on
    useEffect(() => {
        if (isLockerAddOnMode && activeSubscription) {
            // Select the plan
            const plan = plans.find(p => p.id === activeSubscription.planId)
            if (plan) {
                setSelectedPlan(plan)
            }
            
            // Set Date to active plan's start date
            const start = new Date(activeSubscription.startDate)
            if (!isNaN(start.getTime())) {
                setStartDate(start.toISOString().split('T')[0])
            }
        } else if (!isLockerAddOnMode && selectedPlan?.id === activeSubscription?.planId && activeSubscription) {
             // If exiting add-on mode, clear selection if it was the active plan
             setSelectedPlan(null)
             setStartDate(new Date().toISOString().split('T')[0])
        }
    }, [isLockerAddOnMode, activeSubscription, plans])

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

    // Sort lockers naturally
    const sortedLockers = React.useMemo(() => {
        return [...(lockers || [])].sort((a, b) => {
            return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
        })
    }, [lockers])

    // Group lockers by section
    const lockersBySection = React.useMemo(() => {
        return sortedLockers.reduce((acc: Record<string, Locker[]>, locker) => {
            const section = 'General'
            if (!acc[section]) acc[section] = []
            acc[section].push(locker)
            return acc
        }, {})
    }, [sortedLockers])

    const handleSeatSelect = (seat: Seat) => {
        if (seat.isOccupied) return
        setSelectedSeat(seat)
    }

    const handleLockerSelect = (locker: Locker) => {
        if (locker.isOccupied) return
        setSelectedLocker(locker)
    }

    // Check if locker selection is allowed
    const isLockerSelectionEnabled = useMemo(() => {
        // Always enable for locker add-on mode
        if (isLockerAddOnMode) return true

        // Check for "Locker" fee
        const hasLockerFee = selectedFees.some(id => {
            const fee = fees.find(f => String(f.id) === id)
            return fee && fee.name.toLowerCase().includes('locker')
        })

        // If user explicitly pays for a locker fee, allow selection
        if (hasLockerFee) return true

        if (!branchConfig?.hasLockers) return false
        
        // Check if plan includes locker
        if (selectedPlan?.includesLocker) {
            // If plan includes locker, only allow selection if lockers are separate
            return branchConfig.isLockerSeparate
        }

        return false
    }, [selectedPlan, selectedFees, fees, branchConfig, isLockerAddOnMode])
    
    // Check if seat selection is allowed
    const isSeatSelectionEnabled = useMemo(() => {
        if (isLockerAddOnMode) return false
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
    }, [selectedPlan, selectedFees, fees, isLockerAddOnMode])

    // Filter fees
    const lockerFees = useMemo(() => fees.filter(f => f.name.toLowerCase().includes('locker')), [fees])
    const seatFees = useMemo(() => fees.filter(f => f.name.toLowerCase().includes('seat') || f.name.toLowerCase().includes('reservation')), [fees])
    const otherFees = useMemo(() => fees.filter(f => !lockerFees.includes(f) && !seatFees.includes(f)), [fees, lockerFees, seatFees])

    // Handle Fee Toggles with conflict resolution
    const toggleFee = (feeId: string) => {
        const id = String(feeId)
        const fee = fees.find(f => String(f.id) === id)
        
        if (!fee) return

        setSelectedFees(prev => {
            const isSelected = prev.includes(id)
            if (isSelected) {
                return prev.filter(f => f !== id)
            } else {
                // If selecting a locker fee, ensure we don't double charge if plan includes it (though UI should prevent this)
                // Also could implement mutual exclusivity here if needed
                return [...prev, id]
            }
        })
    }

    // Remove conflicting fees when plan includes them
    useEffect(() => {
        if (!selectedPlan) return

        const feesToRemove: string[] = []
        fees.forEach(f => {
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
    }, [selectedPlan, fees, selectedFees])

    // Reset seat/locker if selection becomes disabled
    useEffect(() => {
        if (!isSeatSelectionEnabled && selectedSeat) {
            setSelectedSeat(null)
        }
    }, [isSeatSelectionEnabled, selectedSeat])

    useEffect(() => {
        if (!isLockerSelectionEnabled && selectedLocker) {
            setSelectedLocker(null)
        }
    }, [isLockerSelectionEnabled, selectedLocker])

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
        if (!startDate) {
            toast.error('Please select a start date')
            return
        }

        setSubmitting(true)
        try {
            const result = await createBooking({
                studentId: selectedStudent.id,
                branchId: selectedBranch.id,
                planId: selectedPlan.id,
                seatId: selectedSeat?.id,
                lockerId: selectedLocker?.id,
                startDate,
                quantity,
                additionalFeeIds: selectedFees,
                isAddOn: isLockerAddOnMode,
                activeSubscriptionId: isLockerAddOnMode ? activeSubscription?.id : undefined,
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

    const getReceiptData = (): ReceiptData | null => {
        if (!selectedStudent || !selectedBranch || !selectedPlan) return null
        
        const feeItems = selectedFees.map(id => {
            const fee = fees.find((f) => String(f.id) === id)
            const isMonthly = fee?.billType === 'MONTHLY' && selectedPlan.durationUnit === 'months'
            const base = fee ? (isMonthly ? (Number(fee.amount) * (selectedPlan.duration || 1)) : Number(fee.amount)) : 0
            return {
                description: fee ? (isMonthly ? `${fee.name} (₹${fee.amount} x ${selectedPlan.duration}mo)` : fee.name) : 'Additional Fee',
                amount: base
            }
        })

        // Calculate End Date
        const end = new Date(startDate)
        for (let i = 0; i < quantity; i++) {
            if (selectedPlan.durationUnit === 'days') {
                end.setDate(end.getDate() + selectedPlan.duration)
            } else if (selectedPlan.durationUnit === 'weeks') {
                end.setDate(end.getDate() + (selectedPlan.duration * 7))
            } else {
                end.setMonth(end.getMonth() + selectedPlan.duration)
            }
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
            planDuration: `${selectedPlan.duration} ${selectedPlan.durationUnit} (x${quantity})`,
            planHours: selectedPlan.hoursPerDay ? `${selectedPlan.hoursPerDay} Hrs/Day` : 
                      (selectedPlan.shiftStart && selectedPlan.shiftEnd) ? `${formatTime(selectedPlan.shiftStart)} - ${formatTime(selectedPlan.shiftEnd)}` : undefined,
            seatNumber: selectedSeat ? `${formatSeatNumber(selectedSeat.number)} (${selectedSeat.section || 'General'})` : undefined,
            lockerNumber: selectedLocker ? selectedLocker.number : undefined,
            startDate: new Date(startDate),
            endDate: end,
            amount: parseFloat(amount),
            paymentMethod: method,
            subTotal: subTotal,
            discount: (appliedCoupon?.discount || 0) + (parseFloat(additionalDiscount) || 0),
            items: [
                {
                    description: `Plan: ${selectedPlan.name} (x${quantity})`,
                    amount: selectedPlan.price * quantity
                },
                ...feeItems.map(f => ({
                    description: `${f.description} (x${quantity})`,
                    amount: f.amount * quantity
                }))
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
        setQuantity(1)
        setSelectedSeat(null)
        setSelectedLocker(null)
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
                                {/* Locker Add-on Card */}
                                {activeSubscription && (
                                    <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-xl p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                                    <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-purple-900 dark:text-purple-100">Add Locker to Active Plan</h3>
                                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                                        Student has an active plan. Enable this to add a locker to their existing subscription.
                                                    </p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer" 
                                                    checked={isLockerAddOnMode}
                                                    onChange={(e) => setIsLockerAddOnMode(e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                )}

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
                                            disabled={isLockerAddOnMode}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            required
                                            className={cn(
                                                "w-full pl-4 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all",
                                                isLockerAddOnMode && "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-gray-900"
                                            )}
                                        />
                                    </div>
                                </div>

                                {/* 1. Plan Selection */}
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-3 mb-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                1. Select Plan
                                            </h3>
                                            
                                            {/* Category Filter */}
                                            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-900 rounded-lg shrink-0">
                                                {['all', 'fixed', 'flexible'].map((cat) => (
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
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                                            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                                            {DURATION_FILTERS.map((filter) => (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => setFilterDuration(filter.id as any)}
                                                    className={cn(
                                                        "px-3 py-1.5 text-xs font-medium rounded-full border whitespace-nowrap transition-all",
                                                        filterDuration === filter.id
                                                            ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300"
                                                            : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400"
                                                    )}
                                                >
                                                    {filter.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

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
                                </div>

                                {/* 2. Fees & Customization */}
                                {(fees.length > 0 || selectedPlan?.includesLocker) && (
                                    <div className="space-y-6">
                                        <h3 className="text-lg font-medium flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                            <Info className="w-4 h-4 text-purple-500" />
                                            2. Fees & Customization
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}{fee.billType === 'MONTHLY' ? '/m' : ''}</span>
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
                                                                <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}{fee.billType === 'MONTHLY' ? '/m' : ''}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

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
                                                                    <p className="text-xs text-gray-500 capitalize">{fee.type.replace(/_/g, ' ')}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white">₹{fee.amount}{fee.billType === 'MONTHLY' ? '/m' : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
                                                    <span className="line-clamp-1">{selectedBranch?.name} Lockers</span>
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
                                            <div className="space-y-8">
                                                {Object.entries(lockersBySection).map(([section, lockers]) => (
                                                    <div key={section} className="space-y-3">
                                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                                            {section} Section
                                                            <span className="text-xs font-normal text-gray-400">({lockers.filter(l => !l.isOccupied).length} available)</span>
                                                        </h3>
                                                        <div 
                                                            className="grid gap-2 md:gap-3"
                                                            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                                                        >
                                                            {lockers.filter(locker => {
                                                                if (lockerFilter === 'all') return true
                                                                if (lockerFilter === 'available') return !locker.isOccupied
                                                                if (lockerFilter === 'occupied') return locker.isOccupied
                                                                if (lockerFilter === 'selected') return selectedLocker?.id === locker.id
                                                                return true
                                                            }).map(locker => (
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
                                                ))}
                                            </div>
                                        )}
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
                                            if (!startDate) {
                                                toast.error('Please select a start date')
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
                                <span className="font-medium text-gray-900 dark:text-white">{selectedPlan.name} ({selectedPlan.duration} {selectedPlan.durationUnit}) {quantity > 1 && `x ${quantity}`}</span>
                            </div>
                            {feesTotal > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Additional Fees ({selectedFees.length}) {quantity > 1 && `x ${quantity}`}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">+ ₹{(feesTotal * quantity).toFixed(2)}</span>
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
                                        <span className="font-medium">{selectedPlan.name} ({selectedPlan.duration} {selectedPlan.durationUnit}) {quantity > 1 && `x ${quantity}`}</span>
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
                                    <span className="text-gray-500">Plan Price {quantity > 1 && `(x${quantity})`}</span>
                                    <span>₹{(selectedPlan.price * quantity).toFixed(2)}</span>
                                </div>
                                
                                {feesTotal > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Additional Fees {quantity > 1 && `(x${quantity})`}</span>
                                        <span>+ ₹{(feesTotal * quantity).toFixed(2)}</span>
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
