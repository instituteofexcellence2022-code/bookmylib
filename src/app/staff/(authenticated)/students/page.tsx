'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Plus, 
    Search, 
    Filter, 
    MoreVertical, 
    Eye, 
    Edit, 
    Ban, 
    CheckCircle,
    Download,
    Mail,
    Phone,
    Sparkles
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { getStaffStudents, type StudentFilter } from '@/actions/staff/students'
import { EditStudentModal } from '@/components/staff/students/EditStudentModal'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { format } from 'date-fns'

export default function StudentsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [students, setStudents] = useState<any[]>([])
    const [total, setTotal] = useState(0)
    const [showEditModal, setShowEditModal] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    
    // Filters
    const [filters, setFilters] = useState<StudentFilter>({
        search: '',
        status: '',
        page: 1,
        limit: 10
    })

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }))
        }, 500)
        return () => clearTimeout(timer)
    }, [debouncedSearch])

    // Fetch Students
    const fetchStudents = useCallback(async () => {
        console.log('[CLIENT DEBUG] fetchStudents called with filters:', filters)
        setLoading(true)
        try {
            const result = await getStaffStudents(filters)
            console.log('[CLIENT DEBUG] fetchStudents result:', result)
            if (result.success && result.data) {
                setStudents(result.data.students)
                setTotal(result.data.total)
            } else {
                toast.error(result.error || 'Failed to fetch students')
            }
        } catch (error) {
            console.error('[CLIENT DEBUG] fetchStudents error:', error)
            toast.error('Failed to fetch students')
        } finally {
            setLoading(false)
        }
    }, [filters])

    useEffect(() => {
        fetchStudents()
    }, [fetchStudents])

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Total {total} students found
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <AnimatedButton 
                        variant="outline" 
                        onClick={() => {}} // TODO: Export functionality
                        className="hidden sm:flex"
                    >
                        <Download size={18} />
                        Export
                    </AnimatedButton>
                    <AnimatedButton 
                        variant="primary" 
                        onClick={() => router.push('/staff/students/add')}
                        className="flex-1 sm:flex-none justify-center"
                    >
                        <Plus size={18} />
                        Add Student
                    </AnimatedButton>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <FormInput 
                        icon={Search}
                        placeholder="Search by name, email or phone..."
                        value={debouncedSearch}
                        onChange={(e) => setDebouncedSearch(e.target.value)}
                        className="w-full"
                    />
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <FormSelect 
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                        options={[
                            { label: 'All Status', value: '' },
                            { label: 'Active', value: 'active' },
                            { label: 'New', value: 'new' },
                            { label: 'Expired', value: 'expired' },
                            { label: 'Blocked', value: 'blocked' }
                        ]}
                        className="w-full md:w-40"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loading ? (
                                // Skeleton Loading
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-4"><div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" /></td>
                                        <td className="p-4"><div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                                        <td className="p-4"><div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                                        <td className="p-4"><div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" /></td>
                                        <td className="p-4"></td>
                                    </tr>
                                ))
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        No students found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                students.map((student) => (
                                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm overflow-hidden">
                                                    {student.image ? (
                                                        <img src={student.image} alt={student.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-white">{student.name}</div>
                                                    <div className="text-xs text-gray-500">ID: {student.id.slice(-6).toUpperCase()}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                                    <Phone size={12} /> {student.phone}
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                    <Mail size={12} /> {student.email}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {student.subscriptions?.[0] ? (
                                                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                            <Sparkles size={14} />
                                                            {student.subscriptions[0].plan.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">No active plan</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {student.isBlocked ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                    Blocked
                                                </span>
                                            ) : student.subscriptions?.[0]?.status === 'active' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => router.push(`/staff/students/${student.id}`)}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedStudent(student)
                                                        setShowEditModal(true)
                                                    }}
                                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-amber-600 transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                {total > filters.limit! && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                            Showing {((filters.page! - 1) * filters.limit!) + 1} to {Math.min(filters.page! * filters.limit!, total)} of {total} results
                        </div>
                        <div className="flex gap-2">
                            <AnimatedButton
                                variant="outline"
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page! - 1 }))}
                                disabled={filters.page === 1}
                                className="px-3 py-1 h-8 text-sm"
                            >
                                Previous
                            </AnimatedButton>
                            <AnimatedButton
                                variant="outline"
                                onClick={() => setFilters(prev => ({ ...prev, page: prev.page! + 1 }))}
                                disabled={filters.page! * filters.limit! >= total}
                                className="px-3 py-1 h-8 text-sm"
                            >
                                Next
                            </AnimatedButton>
                        </div>
                    </div>
                )}
            </div>

            {selectedStudent && (
                <EditStudentModal 
                    isOpen={showEditModal}
                    onClose={() => {
                        setShowEditModal(false)
                        fetchStudents()
                    }}
                    student={selectedStudent}
                />
            )}
        </div>
    )
}
