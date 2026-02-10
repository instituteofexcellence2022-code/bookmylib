'use client'

import React, { useState } from 'react'
import { LibraryWithStats } from '@/actions/admin/platform-libraries'
import { Search, Building2, Users, HardDrive, MoreVertical, ExternalLink, Power, Shield, ChevronDown, ChevronUp, MapPin, UserCheck, Phone, Mail, User, Clock, LogIn } from 'lucide-react'
import { toggleLibraryStatus } from '@/actions/admin/platform-libraries'
import { impersonateOwner } from '@/actions/admin/impersonate'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { BranchDetailsModal } from './BranchDetailsModal'
import { AddLibraryModal } from './AddLibraryModal'
import { LibraryDetailsModal } from './LibraryDetailsModal'
import { format } from 'date-fns'

interface LibraryListProps {
    initialLibraries: LibraryWithStats[]
    plans?: any[] // Using any to avoid strict type dependency cycle for now, ideally import from platform-plans
}

export function LibraryList({ initialLibraries, plans = [] }: LibraryListProps) {
    const [libraries, setLibraries] = useState(initialLibraries)
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null)
    const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const router = useRouter()

    const filtered = libraries.filter(l => 
        l.name.toLowerCase().includes(search.toLowerCase()) || 
        l.subdomain.toLowerCase().includes(search.toLowerCase()) ||
        l.owner?.email.toLowerCase().includes(search.toLowerCase())
    )

    const handleImpersonate = async (ownerId: string | undefined) => {
        if (!ownerId) {
            toast.error('No owner assigned to this library')
            return
        }
        
        const toastId = toast.loading('Redirecting to owner dashboard...')
        try {
            const result = await impersonateOwner(ownerId)
            if (result && result.success) {
                toast.success('Login successful', { id: toastId })
                router.push('/owner/dashboard')
            } else {
                toast.error(result.error || 'Failed to impersonate', { id: toastId })
            }
        } catch (error) {
            console.error('Impersonation error:', error)
            toast.error('Failed to start impersonation session', { id: toastId })
        }
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const promise = toggleLibraryStatus(id, !currentStatus)
        toast.promise(promise, {
            loading: 'Updating...',
            success: 'Status updated',
            error: 'Failed to update'
        })
        
        await promise
        setLibraries(prev => prev.map(l => l.id === id ? { ...l, isActive: !currentStatus } : l))
        router.refresh()
    }

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id)
    }

    const getUtilizationColor = (current: number, max: number) => {
        const percentage = (current / max) * 100
        if (percentage > 90) return 'text-red-500'
        if (percentage > 75) return 'text-orange-500'
        return 'text-green-500'
    }

    return (
        <>
            <div className="space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input 
                            type="text" 
                            placeholder="Search libraries, subdomains, or emails..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <Building2 size={16} />
                            Add Library
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="grid grid-cols-1 gap-4">
                    {filtered.map(lib => (
                        <div key={lib.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                {/* Identity */}
                                <div className="flex items-start gap-4 min-w-[200px]">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xl">
                                        {lib.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            {lib.name}
                                            {!lib.isActive && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">Inactive</span>}
                                        </h3>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-col gap-1 mt-1">
                                            <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded w-fit">{lib.subdomain}.bookmylib.com</span>
                                            <div className="flex items-center gap-2 text-xs">
                                                <User size={12} className="text-gray-400" />
                                                <span>{lib.owner?.name || 'No Owner'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs">
                                                <Mail size={12} className="text-gray-400" />
                                                <span>{lib.owner?.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Clock size={12} />
                                                Joined {format(new Date(lib.createdAt), 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Health / Stats */}
                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 border-l border-r border-gray-100 dark:border-gray-700 px-0 md:px-6">
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">SaaS Plan</p>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-white">{lib.subscription?.plan.name || 'No Plan'}</span>
                                            <span className="text-xs text-gray-500 mt-1">
                                                {lib.subscription?.status === 'active' ? (
                                                    <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                        Active Platform Subscription
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">No Active Platform Subscription</span>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Renewal</p>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-gray-900 dark:text-white text-sm">
                                                {lib.subscription?.currentPeriodEnd 
                                                    ? format(new Date(lib.subscription.currentPeriodEnd), 'MMM d, yyyy') 
                                                    : 'N/A'}
                                            </span>
                                            {lib.subscription?.currentPeriodEnd && new Date(lib.subscription.currentPeriodEnd) < new Date() && (
                                                <span className="text-[10px] text-red-500 font-medium">Overdue</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Branches</p>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900 dark:text-white">{lib.stats.branchesCount} / {lib.subscription?.plan.maxBranches || 1}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Students</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${getUtilizationColor(lib.stats.studentsCount, lib.subscription?.plan.maxTotalStudents || 100)}`}>
                                                {lib.stats.studentsCount} / {lib.subscription?.plan.maxTotalStudents || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col items-end gap-2 min-w-[140px]">
                                    <button 
                                        className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                        title="Login as Owner (Impersonation)"
                                        onClick={() => handleImpersonate(lib.owner?.id)}
                                    >
                                        <LogIn size={14} />
                                        Login as Owner
                                    </button>
                                    <button 
                                        onClick={() => toggleExpand(lib.id)}
                                        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {expandedId === lib.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        {expandedId === lib.id ? 'Hide Branches' : 'View Branches'}
                                    </button>
                                    
                                    <div className="flex gap-2 w-full">
                                        <button 
                                            onClick={() => setSelectedLibraryId(lib.id)}
                                            className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center"
                                            title="View Details"
                                        >
                                            <HardDrive size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleToggleStatus(lib.id, lib.isActive)}
                                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                                                lib.isActive 
                                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                                            }`}
                                        >
                                            <Power size={16} />
                                            {lib.isActive ? 'Disable' : 'Enable'}
                                        </button>
                                        <a 
                                            href={`https://${lib.subdomain}.bookmylib.com`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Branches View */}
                            {expandedId === lib.id && (
                                <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6 animate-in slide-in-from-top-2 duration-200">
                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Building2 size={16} className="text-gray-400" />
                                        Branch Network
                                    </h4>
                                    
                                    {lib.branches.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-gray-100 dark:border-gray-700">
                                                        <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Branch Name</th>
                                                        <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Location & Manager</th>
                                                        <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase w-48">Capacity & Utilization</th>
                                                        <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {lib.branches.map(branch => {
                                                        const utilization = branch.seatCount > 0 ? (branch.stats.studentsCount / branch.seatCount) * 100 : 0
                                                        
                                                        return (
                                                            <tr key={branch.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                                <td className="px-4 py-3 align-top">
                                                                    <div className="font-medium text-gray-900 dark:text-white">{branch.name}</div>
                                                                    <div className={`text-xs mt-1 inline-flex items-center px-2 py-0.5 rounded-full ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                        {branch.isActive ? 'Active' : 'Inactive'}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <div className="flex flex-col gap-1">
                                                                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                                                                            <MapPin size={14} className="text-gray-400" />
                                                                            {branch.city}
                                                                        </div>
                                                                        {branch.managerName && (
                                                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                                                                <User size={12} className="text-gray-400" />
                                                                                {branch.managerName}
                                                                            </div>
                                                                        )}
                                                                        {branch.contactPhone && (
                                                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                                                                <Phone size={12} />
                                                                                {branch.contactPhone}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-top">
                                                                    <div className="w-full max-w-[160px]">
                                                                        <div className="flex justify-between text-xs mb-1">
                                                                            <span className="text-gray-600 dark:text-gray-300">{branch.stats.studentsCount} Students</span>
                                                                            <span className="text-gray-400">{branch.seatCount} Seats</span>
                                                                        </div>
                                                                        <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                                            <div 
                                                                                className={`h-full rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 75 ? 'bg-orange-500' : 'bg-green-500'}`} 
                                                                                style={{ width: `${Math.min(utilization, 100)}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                                                            <UserCheck size={12} />
                                                                            {branch.stats.staffCount} Staff
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 align-top text-right">
                                                                    <button 
                                                                        onClick={() => setSelectedBranchId(branch.id)}
                                                                        className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                                                    >
                                                                        View Details
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-gray-500 text-sm">
                                            No branches found for this library
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <BranchDetailsModal 
                branchId={selectedBranchId}
                isOpen={!!selectedBranchId}
                onClose={() => setSelectedBranchId(null)}
            />

            <AddLibraryModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                plans={plans}
            />

            <LibraryDetailsModal 
                libraryId={selectedLibraryId}
                isOpen={!!selectedLibraryId}
                onClose={() => setSelectedLibraryId(null)}
            />
        </>
    )
}
