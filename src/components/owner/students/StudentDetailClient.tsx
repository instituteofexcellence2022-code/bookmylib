'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    User, 
    Calendar, 
    CreditCard, 
    Clock, 
    MapPin, 
    Phone, 
    Mail, 
    Shield, 
    FileText,
    History,
    Edit,
    Trash2,
    MessageSquare,
    ExternalLink,
    StickyNote,
    ArrowLeft,
    Download,
    CheckCircle,
    Lock
} from 'lucide-react'
import { format } from 'date-fns'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AttendanceHeatmap } from '@/components/ui/attendance-heatmap'
import GovtIdVerification from '@/components/owner/GovtIdVerification'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { EditStudentModal } from './EditStudentModal'
import { StudentNotesClient } from './StudentNotesClient'
import { deleteStudent, toggleBlockStudent } from '@/actions/owner/students'
import { toast } from 'react-hot-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { sendReceiptEmail } from '@/actions/email'
import { generateReceiptPDF, ReceiptData } from '@/lib/pdf-generator'
import { verifyPayment } from '@/actions/payment'
import { formatSeatNumber } from '@/lib/utils'

interface Subscription {
  id: string
  status: string
  startDate: string | Date
  endDate: string | Date
  finalAmount?: number | null
  amountPaid?: number
  plan: { name: string }
  branch: { name: string; id: string }
  seat?: { number: string } | null
  hasLocker?: boolean
}

interface Attendance {
  id: string
  date: string | Date
  duration?: number | null
  status: string
  checkIn?: string | Date | null
  checkOut?: string | Date | null
  branch: { name: string }
}

interface Payment {
  id: string
  amount: number
  status: string
  date: string | Date
  createdAt?: string | Date
  type: string
  method: string
  transactionId?: string | null
  invoiceNo?: string | null
  description?: string | null
  subscription?: {
    plan: { 
        name: string
        duration?: number | null
        durationUnit?: string | null
        hoursPerDay?: number | null
    }
    seat?: { number: string } | null
    startDate?: string | Date
    endDate?: string | Date
  } | null
  additionalFee?: {
    name: string
  } | null
  discountAmount?: number | null
  branch?: {
      name: string
      address?: string | null
      city?: string | null
  } | null
  remarks?: string | null
}

interface Ticket {
  id: string
  createdAt: string | Date
  subject: string
  description?: string
  category: string
  status: string
}

interface StudentDetail {
  id: string
  name: string
  email: string | null
  phone?: string | null
  image?: string | null
  dob?: string | Date | null
  gender?: string | null
  address?: string | null
  status?: string
  isBlocked: boolean
  createdAt: string | Date
  govtIdStatus?: string | null
  subscriptions: Subscription[]
  attendance: Attendance[]
  payments: Payment[]
  supportTickets: Ticket[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface Stats {
  totalSpent: number
  totalAttendance: number
  activePlan: string
}

interface StudentDetailClientProps {
    student: StudentDetail
    stats: Stats
}

export function StudentDetailClient({ student, stats }: StudentDetailClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    
    const tabs = useMemo(() => [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'issues', label: 'Issues', icon: MessageSquare },
        { id: 'notes', label: 'Notes', icon: StickyNote },
    ], [])

    const tabParam = searchParams.get('tab')
    const [activeTab, setActiveTab] = useState(() => {
        if (tabParam && tabs.some(t => t.id === tabParam)) {
            return tabParam
        }
        return 'profile'
    })
    
    const [showEditModal, setShowEditModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isBlocking, setIsBlocking] = useState(false)

    const activeSub = student.subscriptions.find(s => s.status === 'active')

    const handleBlockToggle = async () => {
        const action = student.isBlocked ? 'unblock' : 'block'
        if (!window.confirm(`Are you sure you want to ${action} this student?`)) {
            return
        }

        setIsBlocking(true)
        const result = await toggleBlockStudent(student.id, !student.isBlocked)
        
        if (result.success) {
            toast.success(`Student ${action}ed successfully`)
            router.refresh()
        } else {
            toast.error(result.error || `Failed to ${action} student`)
        }
        setIsBlocking(false)
    }

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone and will remove all their data including subscriptions, attendance, and payments.')) {
            return
        }
        
        setIsDeleting(true)
        const result = await deleteStudent(student.id)
        
        if (result.success) {
            toast.success('Student deleted successfully')
            router.push('/owner/students')
        } else {
            toast.error(result.error || 'Failed to delete student')
            setIsDeleting(false)
        }
    }

    const handleSendReceipt = async (payment: Payment) => {
        if (!payment.branch) {
            toast.error('Branch details missing for receipt')
            return
        }
        
        const toastId = toast.loading('Sending receipt...')
        
        try {
            // Determine quantity from remarks if available
            let quantity = 1
            try {
                if (payment.remarks && payment.remarks.startsWith('[')) {
                    const ids = JSON.parse(payment.remarks)
                    if (Array.isArray(ids)) {
                        quantity = ids.length
                    }
                }
            } catch (e) {
                // ignore
            }

            // Calculate End Date for multi-quantity
            let endDate = payment.subscription?.endDate ? new Date(payment.subscription.endDate) : undefined
            if (quantity > 1 && payment.subscription?.plan && payment.subscription.startDate) {
                const start = new Date(payment.subscription.startDate)
                endDate = new Date(start)
                const plan = payment.subscription.plan
                
                // Add total duration
                const totalDuration = (plan.duration || 1) * quantity
                if (plan.durationUnit === 'days') {
                    endDate.setDate(endDate.getDate() + totalDuration)
                } else if (plan.durationUnit === 'weeks') {
                    endDate.setDate(endDate.getDate() + (totalDuration * 7))
                } else {
                    endDate.setMonth(endDate.getMonth() + totalDuration)
                }
            }

            const receiptData: ReceiptData = {
                invoiceNo: payment.invoiceNo || payment.id.slice(0, 8).toUpperCase(),
                date: new Date(payment.date),
                studentName: student.name,
                studentEmail: student.email,
                studentPhone: student.phone,
                branchName: payment.branch.name,
                branchAddress: payment.branch.address ? `${payment.branch.address}, ${payment.branch.city || ''}` : undefined,
                planName: payment.subscription?.plan?.name || payment.additionalFee?.name || 'Payment',
                planDuration: payment.subscription?.plan?.duration ? `${payment.subscription.plan.duration} ${payment.subscription.plan.durationUnit}${quantity > 1 ? ` (x${quantity})` : ''}` : undefined,
                planHours: payment.subscription?.plan?.hoursPerDay ? `${payment.subscription.plan.hoursPerDay} Hrs/Day` : undefined,
                seatNumber: payment.subscription?.seat?.number ? formatSeatNumber(payment.subscription.seat.number) : undefined,
                startDate: payment.subscription?.startDate ? new Date(payment.subscription.startDate) : undefined,
                endDate: endDate,
                amount: payment.amount,
                paymentMethod: payment.method,
                subTotal: payment.amount,
                discount: payment.discountAmount || 0,
                items: [{
                    description: payment.description || payment.subscription?.plan?.name || payment.additionalFee?.name || 'Payment',
                    amount: payment.amount
                }]
            }
            
            const result = await sendReceiptEmail(receiptData)
            if (result.success) {
                toast.success('Receipt sent successfully', { id: toastId })
            } else {
                toast.error(result.error || 'Failed to send receipt', { id: toastId })
            }
        } catch (error) {
            console.error(error)
            toast.error('An unexpected error occurred', { id: toastId })
        }
    }

    const handleDownloadReceipt = (payment: Payment) => {
        if (!payment.branch) {
             toast.error('Branch details missing for receipt')
             return
        }

        // Determine quantity from remarks if available
        let quantity = 1
        try {
            if (payment.remarks && payment.remarks.startsWith('[')) {
                const ids = JSON.parse(payment.remarks)
                if (Array.isArray(ids)) {
                    quantity = ids.length
                }
            }
        } catch (e) {
            // ignore
        }

        // Calculate End Date for multi-quantity
        let endDate = payment.subscription?.endDate ? new Date(payment.subscription.endDate) : undefined
        if (quantity > 1 && payment.subscription?.plan && payment.subscription.startDate) {
            const start = new Date(payment.subscription.startDate)
            endDate = new Date(start)
            const plan = payment.subscription.plan
            
            // Add total duration
            const totalDuration = (plan.duration || 1) * quantity
            if (plan.durationUnit === 'days') {
                endDate.setDate(endDate.getDate() + totalDuration)
            } else if (plan.durationUnit === 'weeks') {
                endDate.setDate(endDate.getDate() + (totalDuration * 7))
            } else {
                endDate.setMonth(endDate.getMonth() + totalDuration)
            }
        }

        const receiptData: ReceiptData = {
                invoiceNo: payment.invoiceNo || payment.id.slice(0, 8).toUpperCase(),
                date: new Date(payment.date),
                studentName: student.name,
                studentEmail: student.email,
                studentPhone: student.phone,
                branchName: payment.branch.name,
                branchAddress: payment.branch.address ? `${payment.branch.address}, ${payment.branch.city || ''}` : undefined,
                planName: payment.subscription?.plan?.name || payment.additionalFee?.name || 'Payment',
                planDuration: payment.subscription?.plan?.duration ? `${payment.subscription.plan.duration} ${payment.subscription.plan.durationUnit}${quantity > 1 ? ` (x${quantity})` : ''}` : undefined,
                planHours: payment.subscription?.plan?.hoursPerDay ? `${payment.subscription.plan.hoursPerDay} Hrs/Day` : undefined,
                seatNumber: payment.subscription?.seat?.number,
                startDate: payment.subscription?.startDate ? new Date(payment.subscription.startDate) : undefined,
                endDate: endDate,
                amount: payment.amount,
                paymentMethod: payment.method,
                subTotal: payment.amount,
                discount: payment.discountAmount || 0, 
                items: [{
                    description: payment.description || payment.subscription?.plan?.name || payment.additionalFee?.name || 'Payment',
                    amount: payment.amount
                }]
        }
        
        generateReceiptPDF(receiptData, 'download')
        toast.success('Receipt downloaded')
    }

    const handleAcceptPayment = async (paymentId: string) => {
        if (!confirm('Are you sure you want to accept this payment?')) return

        const toastId = toast.loading('Verifying payment...')
        try {
            const result = await verifyPayment(paymentId, 'completed')
            if (result.success) {
                toast.success('Payment verified successfully', { id: toastId })
                router.refresh()
            } else {
                toast.error(result.error || 'Verification failed', { id: toastId })
            }
        } catch (error) {
            console.error(error)
            toast.error('An unexpected error occurred', { id: toastId })
        }
    }

    return (
        <div className="space-y-6">
            <Link 
                href="/owner/students" 
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={16} />
                <span>Back to Students</span>
            </Link>

            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                    {/* Identity Section */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xl font-bold shrink-0 overflow-hidden ring-2 ring-white dark:ring-gray-800">
                            {student.image ? (
                                <Image 
                                    src={student.image} 
                                    alt={student.name} 
                                    width={64}
                                    height={64}
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                student.name.charAt(0).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{student.name}</h1>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${
                                    stats.activePlan !== 'None'
                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                }`}>
                                    {stats.activePlan !== 'None' ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wider ${
                                    student.govtIdStatus === 'verified'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                        : 'bg-orange-50 text-orange-700 border-orange-200'
                                }`}>
                                    <Shield size={10} className={student.govtIdStatus === 'verified' ? 'text-blue-600' : 'text-orange-600'} />
                                    {student.govtIdStatus || 'Unverified'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-base text-gray-500 dark:text-gray-400 mt-1">
                                <div className="flex items-center gap-2">
                                    <Mail size={16} className="text-gray-400" /> <span className="truncate">{student.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-gray-400" /> <span>{student.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Section - Integrated horizontally */}
                    <div className="flex-1 flex items-center justify-around gap-2 lg:gap-6 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-700 pt-3 lg:pt-0 pl-0 lg:pl-6 overflow-x-auto">
                        <div className="text-center">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Spent</div>
                            <div className="font-bold text-gray-900 dark:text-white text-lg">₹{stats.totalSpent.toFixed(2)}</div>
                        </div>
                        <div className="w-px h-8 bg-gray-100 dark:bg-gray-700 hidden lg:block"></div>
                        <div className="text-center">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Attendance</div>
                            <div className="font-bold text-gray-900 dark:text-white text-lg">{stats.totalAttendance} Days</div>
                        </div>
                        <div className="w-px h-8 bg-gray-100 dark:bg-gray-700 hidden lg:block"></div>
                        <div className="text-center">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">Plan</div>
                            <div className="font-bold text-gray-900 dark:text-white text-lg truncate max-w-[120px]" title={stats.activePlan}>{stats.activePlan}</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 lg:ml-2">
                        <AnimatedButton 
                            variant="outline" 
                            onClick={() => setShowEditModal(true)}
                            className="h-8 px-3 text-xs bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                        >
                            <Edit size={12} className="mr-1.5" />
                            Edit
                        </AnimatedButton>
                        <AnimatedButton
                            variant="default"
                            onClick={handleBlockToggle}
                            disabled={isBlocking}
                            className={`h-8 px-3 text-xs ${student.isBlocked 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : 'bg-yellow-600 hover:bg-yellow-700 text-white'}`}
                            icon={student.isBlocked ? "check" : "lock"}
                        >
                            {student.isBlocked ? "Unblock Student" : "Block Access"}
                        </AnimatedButton>
                        <AnimatedButton 
                            variant="danger" 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="h-8 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 border-red-100"
                        >
                            <Trash2 size={12} className="mr-1.5" />
                            Delete
                        </AnimatedButton>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                            ${activeTab === tab.id 
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-lg scale-105' 
                                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                            }
                        `}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'profile' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Col: Personal Details */}
                            <div className="lg:col-span-2 space-y-6">
                                <AnimatedCard>
                                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                    <User className="h-5 w-5 text-gray-500" />
                                    <h3 className="text-lg font-semibold">Personal Information</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</label>
                                            <p className="mt-1 text-gray-900 dark:text-white">{student.dob ? format(new Date(student.dob), 'PP') : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</label>
                                            <p className="mt-1 text-gray-900 dark:text-white capitalize">{student.gender || 'N/A'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Address</label>
                                            <p className="mt-1 text-gray-900 dark:text-white flex items-start gap-2">
                                                <MapPin size={16} className="mt-1 text-gray-400" />
                                                <span>
                                                    {student.address ? (
                                                        <>
                                                            {student.address}, {student.area}<br/>
                                                            {student.city}, {student.state} {student.pincode && `- ${student.pincode}`}
                                                        </>
                                                    ) : 'No address provided'}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Guardian</label>
                                            <p className="mt-1 text-gray-900 dark:text-white">{student.guardianName || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Guardian Phone</label>
                                            <p className="mt-1 text-gray-900 dark:text-white">{student.guardianPhone || 'N/A'}</p>
                                        </div>
                                    </div>
                                </AnimatedCard>

                                <GovtIdVerification 
                                    studentId={student.id} 
                                    govtIdUrl={student.govtIdUrl} 
                                    govtIdStatus={student.govtIdStatus || 'pending'} 
                                />
                            </div>

                            {/* Right Col: Current Plan & Quick Stats */}
                            <div className="space-y-6">
                                <AnimatedCard>
                                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <CreditCard className="h-5 w-5 text-gray-500" />
                                        <h3 className="text-lg font-semibold">Current Subscription</h3>
                                    </div>
                                    <div className="p-4">
                                        {activeSub ? (
                                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
                                                <div className="text-indigo-100 text-xs font-medium uppercase tracking-wider mb-2">Active Plan</div>
                                                <div className="text-2xl font-bold mb-1">{activeSub.plan.name}</div>
                                                <div className="text-indigo-100 text-sm mb-4 space-y-1">
                                                    <div>{activeSub.branch.name}</div>
                                                    <div className="flex items-center gap-3 text-indigo-100/90">
                                                        <span>{activeSub.seat ? formatSeatNumber(activeSub.seat.number) : 'No Seat'}</span>
                                                        {activeSub.hasLocker && (
                                                            <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] font-medium">
                                                                <Lock size={10} /> Locker
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-end border-t border-white/20 pt-4">
                                                    <div>
                                                        <div className="text-xs text-indigo-200">Expires</div>
                                                        <div className="font-semibold">{format(new Date(activeSub.endDate), 'PP')}</div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className="bg-white/20 px-2 py-1 rounded text-xs font-bold">
                                                            {Math.ceil((new Date(activeSub.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days left
                                                        </div>
                                                        <button 
                                                            onClick={() => router.push(`/owner/finance?tab=accept&studentId=${student.id}&branchId=${activeSub.branch.id || ''}`)}
                                                            className="text-xs bg-white text-indigo-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-sm"
                                                        >
                                                            Renew / Add Plan
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                                                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>No active subscription</p>
                                                <AnimatedButton 
                                                    variant="primary" 
                                                    className="mt-4 mx-auto" 
                                                    onClick={() => router.push(`/owner/finance?tab=accept&studentId=${student.id}`)}
                                                >
                                                    Assign Plan
                                                </AnimatedButton>
                                            </div>
                                        )}
                                    </div>
                                </AnimatedCard>

                                <AnimatedCard>
                                    <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <FileText className="h-5 w-5 text-gray-500" />
                                        <h3 className="text-lg font-semibold">Account Info</h3>
                                    </div>
                                    <div className="p-4 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 text-sm">Joined</span>
                                            <span className="font-medium text-gray-900 dark:text-white">{format(new Date(student.createdAt), 'PP')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 text-sm">Status</span>
                                            <span className="capitalize font-medium text-green-600">{student.status || 'Active'}</span>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="space-y-6">
                            <AnimatedCard>
                                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                    <History className="h-5 w-5 text-gray-500" />
                                    <h3 className="text-lg font-semibold">Attendance Heatmap</h3>
                                </div>
                                <div className="p-6">
                                    <AttendanceHeatmap data={student.attendance.map((a) => ({
                                        date: new Date(a.date),
                                        duration: a.duration || 0,
                                        status: a.status
                                    }))} />
                                </div>
                            </AnimatedCard>

                            <AnimatedCard>
                                <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                    <Clock className="h-5 w-5 text-gray-500" />
                                    <h3 className="text-lg font-semibold">Recent Logs</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                            <tr>
                                                <th className="p-4 font-medium">Date</th>
                                                <th className="p-4 font-medium">Branch</th>
                                                <th className="p-4 font-medium">Check In</th>
                                                <th className="p-4 font-medium">Check Out</th>
                                                <th className="p-4 font-medium">Duration</th>
                                                <th className="p-4 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {student.attendance.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-gray-500">No attendance records found</td>
                                                </tr>
                                            ) : (
                                                student.attendance.map((log) => (
                                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                        <td className="p-4 text-gray-900 dark:text-white font-medium">
                                                            {format(new Date(log.date), 'PP')}
                                                        </td>
                                                        <td className="p-4 text-gray-500">{log.branch.name}</td>
                                                        <td className="p-4 text-gray-500">
                                                            {log.checkIn ? format(new Date(log.checkIn), 'p') : '-'}
                                                        </td>
                                                        <td className="p-4 text-gray-500">
                                                            {log.checkOut ? format(new Date(log.checkOut), 'p') : '-'}
                                                        </td>
                                                        <td className="p-4 text-gray-500">
                                                            {log.duration ? `${Math.floor(log.duration / 60)}h ${log.duration % 60}m` : '-'}
                                                        </td>
                                                        <td className="p-4">
                                                            <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${
                                                                log.status === 'present' ? 'bg-green-100 text-green-700' : 
                                                                log.status === 'late' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-gray-100 text-gray-700'
                                                            }`}>
                                                                {log.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </AnimatedCard>
                        </div>
                    )}

                    {activeTab === 'subscriptions' && (
                        <AnimatedCard>
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                <Calendar className="h-5 w-5 text-gray-500" />
                                <h3 className="text-lg font-semibold">Subscription History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="p-4 font-medium">Plan</th>
                                            <th className="p-4 font-medium">Branch</th>
                                            <th className="p-4 font-medium">Start Date</th>
                                            <th className="p-4 font-medium">End Date</th>
                                            <th className="p-4 font-medium">Amount</th>
                                            <th className="p-4 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {student.subscriptions.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">No subscriptions found</td>
                                            </tr>
                                        ) : (
                                            student.subscriptions.map((sub) => (
                                                <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                        {sub.plan.name}
                                                        {sub.seat && <div className="text-xs text-gray-500 font-normal">Seat: {sub.seat.number}</div>}
                                                        {sub.hasLocker && (
                                                            <div className="text-xs text-purple-600 dark:text-purple-400 font-normal flex items-center gap-1 mt-0.5">
                                                                <Lock size={10} /> Locker Included
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-gray-500">{sub.branch.name}</td>
                                                    <td className="p-4 text-gray-500">{format(new Date(sub.startDate), 'PP')}</td>
                                                    <td className="p-4 text-gray-500">{format(new Date(sub.endDate), 'PP')}</td>
                                                    <td className="p-4 text-gray-900 dark:text-white font-medium">₹{(sub.finalAmount || sub.amountPaid || 0).toFixed(2)}</td>
                                                    <td className="p-4">
                                                        <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${
                                                            sub.status === 'active' ? 'bg-green-100 text-green-700' : 
                                                            sub.status === 'expired' ? 'bg-gray-100 text-gray-600' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </AnimatedCard>
                    )}

                    {activeTab === 'payments' && (
                        <AnimatedCard>
                            <div className="flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                <CreditCard className="h-5 w-5 text-gray-500" />
                                <h3 className="text-lg font-semibold">Payment History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="p-4 font-medium">Date</th>
                                            <th className="p-4 font-medium">Description</th>
                                            <th className="p-4 font-medium">Method</th>
                                            <th className="p-4 font-medium">Transaction ID</th>
                                            <th className="p-4 font-medium text-right">Amount</th>
                                            <th className="p-4 font-medium text-center">Status</th>
                                            <th className="p-4 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {student.payments.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-gray-500">No payments found</td>
                                            </tr>
                                        ) : (
                                            student.payments.map((pay) => (
                                                <tr key={pay.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="p-4 text-gray-500">{format(new Date(pay.date), 'PP')}</td>
                                                    <td className="p-4 text-gray-900 dark:text-white">
                                                        {pay.subscription 
                                                            ? `Subscription: ${pay.subscription.plan.name}`
                                                            : pay.additionalFee 
                                                                ? `Fee: ${pay.additionalFee.name}` 
                                                                : pay.description || 'Payment'}
                                                    </td>
                                                    <td className="p-4 text-gray-500 capitalize">{pay.method.replace('_', ' ')}</td>
                                                    <td className="p-4 text-gray-500 font-mono text-xs">{pay.transactionId || '-'}</td>
                                                    <td className="p-4 text-right font-medium text-gray-900 dark:text-white">₹{pay.amount.toFixed(2)}</td>
                                                    <td className="p-4 text-center">
                                                        <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${
                                                            pay.status === 'completed' ? 'bg-green-100 text-green-700' : 
                                                            pay.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {pay.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {pay.status !== 'completed' && (
                                                                <button 
                                                                    onClick={() => handleAcceptPayment(pay.id)}
                                                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                                    title="Accept Payment"
                                                                >
                                                                    <CheckCircle size={16} />
                                                                </button>
                                                            )}
                                                            {pay.status === 'completed' && (
                                                                <>
                                                                    <button 
                                                                        onClick={() => handleSendReceipt(pay)}
                                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                        title="Send Receipt Email"
                                                                    >
                                                                        <Mail size={16} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDownloadReceipt(pay)}
                                                                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                                                                        title="Download Receipt"
                                                                    >
                                                                        <Download size={16} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </AnimatedCard>
                    )}

                    {activeTab === 'issues' && (
                         <AnimatedCard>
                             <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                                 <div className="flex items-center gap-2">
                                     <MessageSquare className="h-5 w-5 text-gray-500" />
                                     <h3 className="text-lg font-semibold">Support Tickets</h3>
                                 </div>
                                 <AnimatedButton 
                                     variant="outline" 
                                     className="h-8 px-3 text-xs"
                                     onClick={() => router.push(`/owner/issues/new?studentId=${student.id}`)}
                                 >
                                     New Ticket
                                 </AnimatedButton>
                             </div>
                             <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="p-4 font-medium">Created</th>
                                            <th className="p-4 font-medium">Subject</th>
                                            <th className="p-4 font-medium">Category</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {!student.supportTickets || student.supportTickets.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-gray-500">No tickets found</td>
                                            </tr>
                                        ) : (
                                            student.supportTickets.map((ticket) => (
                                                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="p-4 text-gray-500">{format(new Date(ticket.createdAt), 'PP')}</td>
                                                    <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                        {ticket.subject}
                                                        <div className="text-xs text-gray-400 font-normal truncate max-w-xs">{ticket.description}</div>
                                                    </td>
                                                    <td className="p-4 text-gray-500 capitalize">{ticket.category}</td>
                                                    <td className="p-4">
                                                        <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${
                                                            ticket.status === 'resolved' || ticket.status === 'closed'
                                                                ? 'bg-green-100 text-green-600' 
                                                                : ticket.status === 'in_progress'
                                                                ? 'bg-blue-100 text-blue-600'
                                                                : 'bg-yellow-100 text-yellow-600'
                                                        }`}>
                                                            {ticket.status.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <Link href={`/owner/issues/${ticket.id}`} className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 text-xs">
                                                            View <ExternalLink size={12} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                         </AnimatedCard>
                    )}

                    {activeTab === 'notes' && (
                        <StudentNotesClient studentId={student.id} notes={student.notes || []} />
                    )}
                </motion.div>
            </AnimatePresence>

            <EditStudentModal 
                isOpen={showEditModal} 
                onClose={() => setShowEditModal(false)} 
                student={student} 
            />
        </div>
    )
}
