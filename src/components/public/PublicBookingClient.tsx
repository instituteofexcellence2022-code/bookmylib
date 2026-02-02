'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Check, Calendar, CreditCard, Info, 
    User, Mail, Phone, Cake, MapPin,
    Armchair, ArrowRight, ArrowLeft, BookOpen
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { cn, formatSeatNumber } from '@/lib/utils'
import { Branch, Seat, Plan, AdditionalFee } from '@prisma/client'
import PublicBranchHeader from './PublicBranchHeader'
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
    rules?: string[]
}

type BookingStep = 'selection' | 'details' | 'payment'

export function PublicBookingClient({ branch, images = [], amenities = [], rules = [] }: PublicBookingClientProps) {
    const router = useRouter()
    const [step, setStep] = useState<BookingStep>('selection')
    const [showDetails, setShowDetails] = useState(false)
    
    // Selection State
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
    const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
    const [selectedFees, setSelectedFees] = useState<string[]>([])
    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0])
    
    // Student Details State
    const [studentDetails, setStudentDetails] = useState({
        name: '',
        email: '',
        phone: '',
        dob: ''
    })

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
        .reduce((sum, f) => sum + f.amount, 0)
    const totalAmount = (selectedPlan?.price || 0) + feesTotal

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <PublicBranchHeader 
                    branch={branch} 
                    images={images} 
                    amenities={amenities} 
                    showDetailsLink={true}
                />
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
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
                        {/* 1. Choose Plan */}
                        <section>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-purple-500" />
                                Choose a Plan
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {branch.plans.map(plan => {
                                    const isBestValue = plan.duration >= 90 // Example logic
                                    return (
                                        <button
                                            key={plan.id}
                                            onClick={() => handlePlanSelect(plan)}
                                            className={cn(
                                                "relative p-5 rounded-xl border-2 text-left transition-all hover:shadow-lg group overflow-hidden",
                                                selectedPlan?.id === plan.id
                                                    ? "border-purple-500 bg-purple-50/50 dark:bg-purple-900/10 shadow-purple-100 dark:shadow-none"
                                                    : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-800"
                                            )}
                                        >
                                            {isBestValue && (
                                                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                                    BEST VALUE
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg group-hover:text-purple-600 transition-colors">{plan.name}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                                                        {plan.description}
                                                    </p>
                                                </div>
                                                {selectedPlan?.id === plan.id ? (
                                                    <div className="bg-purple-500 text-white p-1 rounded-full shadow-sm">
                                                        <Check className="w-3.5 h-3.5" />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 group-hover:border-purple-400 transition-colors" />
                                                )}
                                            </div>
                                            
                                            <div className="flex items-baseline gap-1 mt-4">
                                                <span className="text-2xl font-bold text-gray-900 dark:text-white">₹{plan.price}</span>
                                                <span className="text-sm text-gray-500 dark:text-gray-400">/ {plan.duration} days</span>
                                            </div>
                                            
                                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center gap-2 text-xs text-gray-500 font-medium">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                Full Access
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2" />
                                                WiFi Included
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </section>

                        {/* Amenities Section */}
                        {amenities.length > 0 && (
                            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Check className="w-5 h-5 text-emerald-500" />
                                    Included Amenities
                                </h2>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {amenities.map((amenity, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30 text-sm text-gray-700 dark:text-gray-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="capitalize">{amenity.replace(/-/g, ' ')}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Library Rules Section */}
                        {rules.length > 0 && (
                            <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-emerald-500" />
                                    Library Rules
                                </h2>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {rules.map((rule, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                            <span>{rule}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}


                        {/* 2. Select Seat (Optional) */}
                        <section className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                <Armchair className="w-5 h-5 text-purple-500" />
                                Select Your Preferred Seat
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 pl-7">
                                Optional - You can skip this step and we'll assign one for you
                            </p>

                            <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500 dark:text-gray-400 pl-1">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600" />
                                    <span>Available</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-purple-500 border border-purple-500" />
                                    <span>Selected</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                                    <span>Occupied</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                {branch.seats.filter(s => !s.isOccupied).map(seat => (
                                    <button
                                        key={seat.id}
                                        onClick={() => setSelectedSeat(selectedSeat?.id === seat.id ? null : seat)}
                                        className={cn(
                                            "p-2 text-sm rounded-lg border transition-all text-center font-medium",
                                            selectedSeat?.id === seat.id
                                                ? "bg-emerald-500 text-white border-emerald-600"
                                                : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-300"
                                        )}
                                    >
                                        {formatSeatNumber(seat.number)}
                                    </button>
                                ))}
                                {branch.seats.filter(s => !s.isOccupied).length === 0 && (
                                    <div className="col-span-full text-center text-gray-500 py-4">
                                        No specific seats available currently.
                                    </div>
                                )}
                            </div>
                            {selectedSeat && (
                                <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg inline-block">
                                    <Check className="w-4 h-4" />
                                    Selected Seat: <strong>{formatSeatNumber(selectedSeat.number)}</strong>
                                </div>
                            )}
                        </section>

                        {/* 3. Additional Fees & Date */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Fees */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
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
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-orange-500" />
                                    Start Date
                                </h3>
                                <input
                                    type="date"
                                    value={bookingDate}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                />
                            </div>
                        </div>

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
                                            label="Phone Number"
                                            icon={Phone}
                                            type="tel"
                                            placeholder="9876543210"
                                            value={studentDetails.phone}
                                            onChange={(e) => setStudentDetails(prev => ({ ...prev, phone: e.target.value }))}
                                            required
                                            className="bg-gray-50 dark:bg-gray-900/50"
                                        />
                                    </div>

                                    <FormInput
                                        label="Email Address"
                                        icon={Mail}
                                        type="email"
                                        placeholder="john@example.com"
                                        value={studentDetails.email}
                                        onChange={(e) => setStudentDetails(prev => ({ ...prev, email: e.target.value }))}
                                        required
                                        className="bg-gray-50 dark:bg-gray-900/50"
                                    />
                                    
                                    <FormInput
                                        label="Date of Birth"
                                        icon={Cake}
                                        type="date"
                                        value={studentDetails.dob}
                                        onChange={(e) => setStudentDetails(prev => ({ ...prev, dob: e.target.value }))}
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
