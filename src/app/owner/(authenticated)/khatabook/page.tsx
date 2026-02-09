'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getStaffBalances } from '@/actions/owner/khatabook'
import { AnimatedCard } from '@/components/ui/AnimatedCard'
import { Wallet, ArrowRight, Clock, AlertCircle, Search, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { FormInput } from '@/components/ui/FormInput'

interface StaffBalance {
    id: string
    name: string
    branchName: string
    image: string | null
    totalCollected: number
    totalHandedOver: number
    balance: number
    lastHandoverAt: Date | null
    pendingHandoverCount: number
    pendingHandoverAmount: number
}

export default function OwnerKhatabookPage() {
    const router = useRouter()
    const [balances, setBalances] = useState<StaffBalance[]>([])
    const [filteredBalances, setFilteredBalances] = useState<StaffBalance[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (!balances.length) return
        
        const filtered = balances.filter(staff => 
            staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            staff.branchName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        setFilteredBalances(filtered)
    }, [searchQuery, balances])

    const loadData = async () => {
        try {
            const response = await getStaffBalances()
            if (response.success && Array.isArray(response.data)) {
                setBalances(response.data as unknown as StaffBalance[])
                setFilteredBalances(response.data as unknown as StaffBalance[])
            } else {
                toast.error(response.error || 'Failed to load staff balances')
                setBalances([])
                setFilteredBalances([])
            }
        } catch (error) {
            toast.error('Failed to load staff balances')
            setBalances([])
            setFilteredBalances([])
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    const totalCashInHands = balances.reduce((sum, b) => sum + b.balance, 0)
    const totalPendingVerification = balances.reduce((sum, b) => sum + b.pendingHandoverAmount, 0)

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Khatabook Manager</h1>
                    <p className="text-gray-500 dark:text-gray-400">Track cash collection and handovers</p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg shadow-sm flex items-center gap-3 flex-1 md:flex-none">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Pending Verify</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(totalPendingVerification)}</p>
                        </div>
                    </div>

                    <div className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-3 flex-1 md:flex-none">
                        <div className="p-2 bg-white/20 rounded-full">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs text-blue-100 font-medium">Total Cash with Staff</p>
                            <p className="text-xl font-bold">{formatCurrency(totalCashInHands)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search staff or branch..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>
            </div>

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBalances.map((staff) => (
                    <AnimatedCard 
                        key={staff.id}
                        onClick={() => router.push(`/owner/khatabook/${staff.id}`)}
                        className="cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-3">
                            {staff.pendingHandoverCount > 0 && (
                                <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 rounded-full text-[10px] font-bold border border-red-100 dark:border-red-900/30">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {staff.pendingHandoverCount} Pending ({formatCurrency(staff.pendingHandoverAmount)})
                                </div>
                            )}
                        </div>

                        <div className="p-5">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-xl font-bold text-gray-500 border-2 border-white dark:border-gray-800 shadow-sm">
                                    {staff.image ? (
                                        <img src={staff.image} alt={staff.name} className="w-full h-full object-cover" />
                                    ) : (
                                        staff.name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                        {staff.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
                                        {staff.branchName}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Total Collected</p>
                                    <p className="font-semibold text-gray-900 dark:text-gray-200">
                                        {formatCurrency(staff.totalCollected)}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 mb-1">Verified Given</p>
                                    <p className="font-semibold text-green-600 dark:text-green-400">
                                        {formatCurrency(staff.totalHandedOver)}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Current Cash In Hand</p>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {formatCurrency(staff.balance)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    {staff.lastHandoverAt && (
                                        <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
                                            <Clock className="w-3 h-3" />
                                            Last: {format(new Date(staff.lastHandoverAt), 'MMM d')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>
                ))}
            </div>

            {filteredBalances.length === 0 && !loading && (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No staff members found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search terms</p>
                </div>
            )}
        </div>
    )
}
