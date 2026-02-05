'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
    Plus, 
    Search, 
    Filter, 
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
import { formatSeatNumber } from '@/lib/utils'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { getOwnerStudents, type StudentFilter } from '@/actions/owner/students'
import { getOwnerBranches } from '@/actions/branch'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

interface Branch {
    id: string
    name: string
}

interface Student {
    id: string
    name: string
    email: string | null
    phone: string | null
    image: string | null
    currentPlan?: string
    seatNumber?: string
    currentBranch?: string
    status: string
    govtIdStatus?: string
}

export default function StudentsPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [students, setStudents] = useState<Student[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [total, setTotal] = useState(0)
    
    // Filters
    const [filters, setFilters] = useState<StudentFilter>({
        search: '',
        branchId: '',
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

    // Fetch Branches
    useEffect(() => {
        getOwnerBranches().then(result => {
            if (result.success && result.data) {
                setBranches(result.data)
            }
        })
    }, [])

    // Fetch Students
    const fetchStudents = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getOwnerStudents(filters)
            setStudents(result.students)
            setTotal(result.total)
        } catch (_) {
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
                        onClick={() => router.push('/owner/students/add')}
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
                        icon={Filter}
                        value={filters.branchId}
                        onChange={(e) => setFilters(prev => ({ ...prev, branchId: e.target.value, page: 1 }))}
                        options={[
                            { label: 'All Branches', value: '' },
                            ...branches.map(b => ({ label: b.name, value: b.id }))
                        ]}
                        className="w-full md:w-48"
                    />
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
                                <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Branch & Plan</th>
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
                                                        <Image src={student.image} alt={student.name} width={40} height={40} className="w-full h-full object-cover" />
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
                                            {student.currentPlan ? (
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {student.currentPlan}
                                                        {student.seatNumber && <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{formatSeatNumber(student.seatNumber)}</span>}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{student.currentBranch}</div>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400 italic">No Active Plan</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                                ${student.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 
                                                  student.status === 'blocked' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                                                  student.status === 'new' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}
                                            `}>
                                                {student.status === 'active' && <CheckCircle size={10} className="mr-1" />}
                                                {student.status === 'new' && <Sparkles size={10} className="mr-1" />}
                                                {student.status === 'blocked' && <Ban size={10} className="mr-1" />}
                                                {student.status.replace('_', ' ')}
                                            </span>
                                            {student.govtIdStatus === 'verified' && (
                                                <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded" title="ID Verified">
                                                    Verified
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link href={`/owner/students/${student.id}`}>
                                                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View Details">
                                                        <Eye size={16} />
                                                    </button>
                                                </Link>
                                                <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title="Edit">
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
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <button 
                        onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, (prev.page || 1) - 1) }))}
                        disabled={filters.page === 1}
                        className="text-sm text-gray-600 disabled:opacity-50 hover:text-gray-900"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-500">
                        Page {filters.page} of {Math.ceil(total / (filters.limit || 10))}
                    </span>
                    <button 
                        onClick={() => setFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                        disabled={filters.page === Math.ceil(total / (filters.limit || 10))}
                        className="text-sm text-gray-600 disabled:opacity-50 hover:text-gray-900"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}
