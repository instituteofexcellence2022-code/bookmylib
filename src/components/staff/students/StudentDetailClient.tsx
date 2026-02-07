'use client'

import React, { useState } from 'react'
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
    MessageSquare,
    StickyNote,
    ArrowLeft,
    Lock
} from 'lucide-react'
import { format } from 'date-fns'
import { formatSeatNumber } from '@/lib/utils'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { AttendanceHeatmap } from '@/components/ui/attendance-heatmap'
import GovtIdVerification from '@/components/staff/students/GovtIdVerification'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { EditStudentModal } from './EditStudentModal'
import { ReportStudentModal } from './ReportStudentModal'
import { StudentNotesClient } from './StudentNotesClient'

interface Subscription {
  id: string
  status: string
  startDate: string | Date
  endDate: string | Date
  finalAmount?: number | null
  amountPaid?: number
  plan: { name: string }
  branch: { name: string }
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
    plan: { name: string }
  } | null
  additionalFee?: {
    name: string
  } | null
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
  hasGovtId?: boolean
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
    const [activeTab, setActiveTab] = useState('profile')
    const [showEditModal, setShowEditModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    
    const activeSub = student.subscriptions.find(s => s.status === 'active')

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'subscriptions', label: 'Subscriptions', icon: Calendar },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'issues', label: 'Issues', icon: MessageSquare },
        { id: 'notes', label: 'Notes', icon: StickyNote },
    ]

    // Removed block functionality for staff
    /*
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
    */

    return (
        <div className="space-y-6">
            <Link 
                href="/staff/students" 
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
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
                                {student.name}
                                {student.isBlocked && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium border border-red-200">
                                        Blocked
                                    </span>
                                )}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    <Mail size={14} />
                                    <span className="truncate">{student.email}</span>
                                </div>
                                {student.phone && (
                                    <div className="flex items-center gap-1.5">
                                        <Phone size={14} />
                                        <span>{student.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats & Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 px-4 sm:border-r border-gray-100 dark:border-gray-700">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Status</div>
                                <div className={`font-semibold ${activeSub ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                    {activeSub ? 'Active' : 'Inactive'}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Plan</div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                    {stats.activePlan}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <AnimatedButton
                                variant="outline"
                                onClick={() => setShowEditModal(true)}
                                className="flex-1 sm:flex-none justify-center"
                                icon="edit"
                            >
                                Edit
                            </AnimatedButton>
                            
                            <AnimatedButton
                                variant="destructive"
                                onClick={() => setShowReportModal(true)}
                                className="flex-1 sm:flex-none justify-center"
                                icon="warning"
                            >
                                Report
                            </AnimatedButton>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-2 -mb-2 scrollbar-hide">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                    isActive 
                                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800' 
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Content Area */}
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
                            {/* Personal Info */}
                            <div className="lg:col-span-2 space-y-6">
                                <AnimatedCard>
                                    <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Full Name</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Gender</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{student.gender || 'Not set'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Joined Date</div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {format(new Date(student.createdAt), 'MMMM d, yyyy')}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                <MapPin size={14} />
                                                Address
                                            </div>
                                            <div className="font-medium text-gray-900 dark:text-white">
                                                {[student.address, student.area, student.city, student.state, student.pincode]
                                                    .filter(Boolean)
                                                    .join(', ') || 'Not set'}
                                            </div>
                                        </div>
                                    </div>
                                </AnimatedCard>

                                <AnimatedCard>
                                    <h3 className="text-lg font-semibold mb-4">Guardian Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Guardian Name</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{student.guardianName || 'Not set'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Guardian Phone</div>
                                            <div className="font-medium text-gray-900 dark:text-white">{student.guardianPhone || 'Not set'}</div>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-6">
                                <AnimatedCard>
                                    <h3 className="text-lg font-semibold mb-4">Identity Verification</h3>
                                    <GovtIdVerification 
                                        studentId={student.id}
                                        govtIdUrl={student.govtIdUrl || null}
                                        govtIdStatus={student.govtIdStatus || 'pending'}
                                        hasGovtId={student.hasGovtId}
                                    />
                                </AnimatedCard>

                                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                        <Shield size={20} />
                                        Membership Status
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-white/10 p-3 rounded-lg">
                                            <span className="text-blue-100">Plan</span>
                                            <span className="font-semibold">{stats.activePlan}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/10 p-3 rounded-lg">
                                            <span className="text-blue-100">Total Spent</span>
                                            <span className="font-semibold">₹{stats.totalSpent}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white/10 p-3 rounded-lg">
                                            <span className="text-blue-100">Attendance</span>
                                            <span className="font-semibold">{stats.totalAttendance} days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'attendance' && (
                        <div className="space-y-6">
                            <AttendanceHeatmap data={student.attendance.map(a => ({
                                date: new Date(a.date),
                                duration: a.duration || 0,
                                status: a.status
                            }))} />
                            
                            <AnimatedCard>
                                <h3 className="text-lg font-semibold mb-4">Attendance History</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50">
                                            <tr>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Branch</th>
                                                <th className="px-6 py-3">Check In</th>
                                                <th className="px-6 py-3">Check Out</th>
                                                <th className="px-6 py-3">Duration</th>
                                                <th className="px-6 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {student.attendance.map((record) => (
                                                <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                        {format(new Date(record.date), 'MMM d, yyyy')}
                                                    </td>
                                                    <td className="px-6 py-4">{record.branch.name}</td>
                                                    <td className="px-6 py-4">
                                                        {record.checkIn ? format(new Date(record.checkIn), 'h:mm a') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {record.checkOut ? format(new Date(record.checkOut), 'h:mm a') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {record.duration ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                            record.status === 'present' 
                                                                ? 'bg-green-100 text-green-700' 
                                                                : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {student.attendance.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                        No attendance records found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </AnimatedCard>
                        </div>
                    )}

                    {activeTab === 'subscriptions' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {student.subscriptions.map((sub) => (
                                    <div 
                                        key={sub.id} 
                                        className={`p-6 rounded-xl border ${
                                            sub.status === 'active' 
                                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                                : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">{sub.plan.name}</h3>
                                                <p className="text-sm text-gray-500">{sub.branch.name}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                sub.status === 'active' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {sub.status}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Duration</span>
                                                <span className="font-medium">
                                                    {format(new Date(sub.startDate), 'MMM d')} - {format(new Date(sub.endDate), 'MMM d, yyyy')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Amount Paid</span>
                                                <span className="font-medium">₹{sub.amountPaid || sub.finalAmount || 0}</span>
                                            </div>
                                            {sub.seat && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Seat</span>
                                                    <span className="font-medium">{formatSeatNumber(sub.seat.number)}</span>
                                                </div>
                                            )}
                                            {sub.hasLocker && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Locker</span>
                                                    <span className="font-medium flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                                        <Lock size={12} /> Included
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {student.subscriptions.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-gray-500">
                                        No subscription history
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <AnimatedCard>
                            <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Description</th>
                                            <th className="px-6 py-3">Method</th>
                                            <th className="px-6 py-3">Amount</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Invoice</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {student.payments.map((payment) => (
                                            <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800">
                                                <td className="px-6 py-4 text-gray-500">
                                                    {format(new Date(payment.date), 'MMM d, yyyy')}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                                    {payment.subscription 
                                                        ? `${payment.subscription.plan.name} Subscription`
                                                        : payment.additionalFee?.name || payment.description || payment.type}
                                                </td>
                                                <td className="px-6 py-4 capitalize">{payment.method}</td>
                                                <td className="px-6 py-4 font-medium">₹{payment.amount}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        payment.status === 'completed' || payment.status === 'success'
                                                            ? 'bg-green-100 text-green-700' 
                                                            : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {payment.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {payment.invoiceNo || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {student.payments.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    No payment history found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </AnimatedCard>
                    )}

                    {activeTab === 'issues' && (
                        <div className="space-y-4">
                            {student.supportTickets.map((ticket) => (
                                <div key={ticket.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{ticket.subject}</h3>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            ticket.status === 'open' ? 'bg-blue-100 text-blue-700' :
                                            ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{ticket.description}</p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span>{format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
                                        <span className="capitalize">{ticket.category}</span>
                                    </div>
                                </div>
                            ))}
                            {student.supportTickets.length === 0 && (
                                <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                                    No support tickets found
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <StudentNotesClient 
                            studentId={student.id} 
                            notes={student.notes} 
                        />
                    )}
                </motion.div>
            </AnimatePresence>

            <EditStudentModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                student={student}
            />

            <ReportStudentModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                studentId={student.id}
                studentName={student.name}
            />
        </div>
    )
}
