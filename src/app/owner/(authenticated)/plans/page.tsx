'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { Loader2, PlusCircle, Search, SlidersHorizontal, CalendarClock, IndianRupee, Clock, Trash2, Layers, MapPin, Receipt, X } from 'lucide-react'
import { getOwnerPlans, updatePlan, deletePlan } from '@/actions/plan'
import { getOwnerFees, createFee, deleteFee, updateFee } from '@/actions/fee'
import { getOwnerBranches } from '@/actions/branch'
import { toast } from 'react-hot-toast'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { Plan, AdditionalFee } from '@prisma/client'

interface PlanWithBranch extends Plan {
  branch: { id: string, name: string } | null
}

interface FeeWithBranch extends AdditionalFee {
  branch: { id: string, name: string } | null
}

export default function PlansAndFeesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'plans' | 'fees'>('plans')
  
  // Data State
  const [plans, setPlans] = useState<PlanWithBranch[]>([])
  const [fees, setFees] = useState<FeeWithBranch[]>([])
  const [branches, setBranches] = useState<{id: string, name: string}[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')

  // Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<FeeWithBranch | null>(null)
  const [selectedFeeCategory, setSelectedFeeCategory] = useState('custom')

  useEffect(() => {
    if (isFeeModalOpen) {
      if (editingFee) {
        const presets = ['Seat Reservation Fee', 'Locker Fee', 'Admission Fee']
        if (presets.includes(editingFee.name)) {
          setSelectedFeeCategory(editingFee.name)
        } else {
          setSelectedFeeCategory('custom')
        }
      } else {
        setSelectedFeeCategory('custom')
      }
    }
  }, [isFeeModalOpen, editingFee])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [plansData, feesData, branchesResult] = await Promise.all([
        getOwnerPlans(),
        getOwnerFees(),
        getOwnerBranches()
      ])
      setPlans(plansData || [])
      setFees(feesData || [])
      if (branchesResult.success && branchesResult.data) {
        setBranches(branchesResult.data as {id: string, name: string}[])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // --- Plan Logic ---

  const filteredPlans = useMemo(() => {
    return plans
      .filter(plan => {
        if (!search) return true
        return plan.name.toLowerCase().includes(search.toLowerCase())
      })
      .filter(plan => {
        if (categoryFilter === 'all') return true
        return plan.category === categoryFilter
      })
      .filter(plan => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'active') return plan.isActive
        return !plan.isActive
      })
      .filter(plan => {
        if (branchFilter === 'all') return true
        if (branchFilter === 'global') return plan.branchId === null
        return plan.branchId === branchFilter
      })
  }, [plans, search, categoryFilter, statusFilter, branchFilter])

  const handleTogglePlanStatus = async (plan: PlanWithBranch) => {
    try {
      const formData = new FormData()
      formData.append('id', plan.id)
      formData.append('status', plan.isActive ? 'inactive' : 'active')
      const result = await updatePlan(formData)
      if (result.success) {
        setPlans(prev =>
          prev.map(p => (p.id === plan.id ? { ...p, isActive: !plan.isActive } : p))
        )
        toast.success(plan.isActive ? 'Plan deactivated' : 'Plan activated')
      } else {
        toast.error(result.error || 'Failed to update plan status')
      }
    } catch (error) {
      console.error('Error updating plan status:', error)
      toast.error('Failed to update plan status')
    }
  }

  const handleDeletePlan = async (plan: PlanWithBranch) => {
    const confirmed = window.confirm(`Delete plan "${plan.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      const result = await deletePlan(plan.id)
      if (result.success) {
        if (result.message) {
          toast.success(result.message)
          setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, isActive: false } : p))
        } else {
          setPlans(prev => prev.filter(p => p.id !== plan.id))
          toast.success('Plan deleted')
        }
      } else {
        toast.error(result.error || 'Failed to delete plan')
      }
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Failed to delete plan')
    }
  }

  // --- Fee Logic ---

  const filteredFees = useMemo(() => {
    return fees
      .filter(fee => {
        if (!search) return true
        return fee.name.toLowerCase().includes(search.toLowerCase())
      })
      .filter(fee => {
        if (branchFilter === 'all') return true
        if (branchFilter === 'global') return fee.branchId === null
        return fee.branchId === branchFilter
      })
  }, [fees, search, branchFilter])

  const handleToggleFeeStatus = async (fee: FeeWithBranch) => {
    try {
      const formData = new FormData()
      formData.append('id', fee.id)
      formData.append('status', fee.isActive ? 'inactive' : 'active')
      const result = await updateFee(formData)
      if (result.success) {
        setFees(prev =>
          prev.map(f => (f.id === fee.id ? { ...f, isActive: !fee.isActive } : f))
        )
        toast.success(fee.isActive ? 'Fee deactivated' : 'Fee activated')
      } else {
        toast.error(result.error || 'Failed to update fee status')
      }
    } catch (error) {
      console.error('Error updating fee status:', error)
      toast.error('Failed to update fee status')
    }
  }

  const handleDeleteFee = async (fee: FeeWithBranch) => {
    const confirmed = window.confirm(`Delete fee "${fee.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      const result = await deleteFee(fee.id)
      if (result.success) {
        setFees(prev => prev.filter(f => f.id !== fee.id))
        toast.success('Fee deleted')
      } else {
        toast.error(result.error || 'Failed to delete fee')
      }
    } catch (error) {
      console.error('Error deleting fee:', error)
      toast.error('Failed to delete fee')
    }
  }

  const handleSaveFee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    // Add ID if editing
    if (editingFee) {
        formData.append('id', editingFee.id)
    }

    try {
        const action = editingFee ? updateFee : createFee
        const result = await action(formData)
        
        if (result.success) {
            toast.success(editingFee ? 'Fee updated' : 'Fee created')
            setIsFeeModalOpen(false)
            setEditingFee(null)
            // Refresh fees
            const feesData = await getOwnerFees()
            setFees(feesData || [])
        } else {
            toast.error(result.error || 'Failed to save fee')
        }
    } catch (error) {
        console.error('Error saving fee:', error)
        toast.error('Failed to save fee')
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plan & Fee Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure subscription plans and additional fees for your library.
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex items-center">
            <button
                onClick={() => setActiveTab('plans')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'plans' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                Subscriptions
            </button>
            <button
                onClick={() => setActiveTab('fees')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    activeTab === 'fees' 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
                Additional Fees
            </button>
        </div>

        <div className="flex gap-3">
            {activeTab === 'plans' ? (
                <AnimatedButton
                    variant="primary"
                    icon="add"
                    onClick={() => router.push('/owner/plans/add')}
                >
                    New Plan
                </AnimatedButton>
            ) : (
                <AnimatedButton
                    variant="primary"
                    icon="add"
                    onClick={() => {
                        setEditingFee(null)
                        setIsFeeModalOpen(true)
                    }}
                >
                    Add Fee
                </AnimatedButton>
            )}
        </div>
      </div>

      <CompactCard className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div className="flex-1 flex flex-col md:flex-row gap-3">
            <div className="flex-1 min-w-[200px]">
              <FormInput
                placeholder={`Search ${activeTab}...`}
                icon={Search}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              {activeTab === 'plans' && (
                  <FormSelect
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    options={[
                      { label: 'All Categories', value: 'all' },
                      { label: 'Fixed Shift', value: 'fixed' },
                      { label: 'Flexible Hours', value: 'flexible' }
                    ]}
                    icon={Layers}
                  />
              )}
              <FormSelect
                value={branchFilter}
                onChange={e => setBranchFilter(e.target.value)}
                options={[
                  { label: 'All Branches', value: 'all' },
                  ...branches.map(b => ({ label: b.name, value: b.id }))
                ]}
                icon={MapPin}
              />
              {activeTab === 'plans' && (
                <FormSelect
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    options={[
                    { label: 'All Status', value: 'all' },
                    { label: 'Active', value: 'active' },
                    { label: 'Inactive', value: 'inactive' }
                    ]}
                    icon={SlidersHorizontal}
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <CalendarClock className="w-4 h-4" />
            <span>{activeTab === 'plans' ? filteredPlans.length : filteredFees.length} total</span>
          </div>
        </div>
      </CompactCard>

      {loading ? (
        <div className="flex items-center justify-center min-h-[220px]">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : activeTab === 'plans' ? (
        // PLANS LIST
        filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] text-center">
                <PlusCircle className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-gray-700 dark:text-gray-200 font-medium">No plans found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create your first subscription plan to start managing fees.
                </p>
                <AnimatedButton
                    variant="primary"
                    icon="add"
                    onClick={() => router.push('/owner/plans/add')}
                >
                    Create Plan
                </AnimatedButton>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPlans.map(plan => (
                <div
                key={plan.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {plan.name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                        <Clock className="w-3 h-3" />
                        {plan.duration} {plan.durationUnit}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 capitalize">
                        {plan.category === 'fixed' ? 'Fixed' : 'Flexible'}
                        </span>
                        {plan.branch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                            <MapPin className="w-3 h-3" />
                            {plan.branch.name}
                        </span>
                        )}
                        {!plan.branch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-200">
                            <MapPin className="w-3 h-3" />
                            All Branches
                        </span>
                        )}
                    </div>
                    </div>
                    <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                        plan.isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                    >
                    {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                    <IndianRupee className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {plan.price.toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                        })}
                    </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">
                    Billed {plan.billingCycle.replace(/_/g, ' ')}
                    </p>
                    {plan.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-3">
                        {plan.description}
                    </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                    <AnimatedButton
                        variant="outline"
                        size="sm"
                        icon="edit"
                        onClick={() => router.push(`/owner/plans/${plan.id}`)}
                    >
                        Edit
                    </AnimatedButton>
                    <AnimatedButton
                        variant={plan.isActive ? 'outline' : 'purple'}
                        size="sm"
                        onClick={() => handleTogglePlanStatus(plan)}
                    >
                        {plan.isActive ? 'Pause' : 'Activate'}
                    </AnimatedButton>
                    </div>
                    <button
                    type="button"
                    onClick={() => handleDeletePlan(plan)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    aria-label="Delete plan"
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                </div>
            ))}
            </div>
        )
      ) : (
        // FEES LIST
        filteredFees.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] text-center">
                <Receipt className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-gray-700 dark:text-gray-200 font-medium">No additional fees found</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create fees for admissions, lockers, or reservations.
                </p>
                <AnimatedButton
                    variant="primary"
                    icon="add"
                    onClick={() => {
                        setEditingFee(null)
                        setIsFeeModalOpen(true)
                    }}
                >
                    Add Fee
                </AnimatedButton>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredFees.map(fee => (
                <div
                key={fee.id}
                className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                            {fee.name}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1">

                            {fee.branch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200">
                                <MapPin className="w-3 h-3" />
                                {fee.branch.name}
                            </span>
                            )}
                            {!fee.branch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 dark:bg-slate-900/30 dark:text-slate-200">
                                <MapPin className="w-3 h-3" />
                                All Branches
                            </span>
                            )}
                        </div>
                    </div>
                    <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            fee.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                    >
                        {fee.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>

                <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                    <IndianRupee className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {fee.amount.toLocaleString('en-IN', {
                        maximumFractionDigits: 0
                        })}
                    </p>
                    </div>
                    {fee.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 line-clamp-3">
                        {fee.description}
                    </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                        <AnimatedButton
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setEditingFee(fee)
                                setIsFeeModalOpen(true)
                            }}
                        >
                            Edit
                        </AnimatedButton>
                        <AnimatedButton
                            variant={fee.isActive ? 'outline' : 'purple'}
                            size="sm"
                            onClick={() => handleToggleFeeStatus(fee)}
                        >
                            {fee.isActive ? 'Disable' : 'Enable'}
                        </AnimatedButton>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleDeleteFee(fee)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        aria-label="Delete fee"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                </div>
            ))}
            </div>
        )
      )}

      {/* Fee Modal */}
      {isFeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {editingFee ? 'Edit Additional Fee' : 'Add Additional Fee'}
                    </h3>
                    <button 
                        onClick={() => setIsFeeModalOpen(false)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleSaveFee} className="p-4 space-y-4">
                    <FormSelect
                        label="Fee Category"
                        value={selectedFeeCategory}
                        onChange={(e) => setSelectedFeeCategory(e.target.value)}
                        options={[
                            { label: 'Seat Reservation Fee', value: 'Seat Reservation Fee' },
                            { label: 'Locker Fee', value: 'Locker Fee' },
                            { label: 'Admission Fee', value: 'Admission Fee' },
                            { label: 'Custom', value: 'custom' }
                        ]}
                    />

                    {selectedFeeCategory === 'custom' ? (
                        <FormInput
                            name="name"
                            label="Fee Name"
                            placeholder="e.g. Late Fee"
                            defaultValue={editingFee?.name}
                            required
                        />
                    ) : (
                        <input type="hidden" name="name" value={selectedFeeCategory} />
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput
                            name="amount"
                            label="Amount (₹)"
                            type="number"
                            min="0"
                            placeholder="0.00"
                            defaultValue={editingFee?.amount}
                            required
                        />

                    </div>

                    <FormSelect
                        name="branchId"
                        label="Branch"
                        defaultValue={editingFee?.branchId || 'all'}
                        options={[
                            { label: 'All Branches (Global)', value: 'all' },
                            ...branches.map(b => ({ label: b.name, value: b.id }))
                        ]}
                    />

                    <FormTextarea
                        name="description"
                        label="Description (Optional)"
                        placeholder="Explain what this fee covers..."
                        defaultValue={editingFee?.description || ''}
                        rows={3}
                    />

                    <div className="pt-2 flex gap-3">
                        <AnimatedButton
                            type="button"
                            variant="ghost"
                            fullWidth
                            onClick={() => setIsFeeModalOpen(false)}
                        >
                            Cancel
                        </AnimatedButton>
                        <AnimatedButton
                            type="submit"
                            variant="primary"
                            fullWidth
                        >
                            {editingFee ? 'Save Changes' : 'Create Fee'}
                        </AnimatedButton>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  )
}
