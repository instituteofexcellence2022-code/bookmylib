'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { 
  Loader2, Search, SlidersHorizontal, 
  Tag, Calendar, IndianRupee, Trash2, 
  Percent, Hash, X, MapPin, Layers,
  Clock
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { CompactCard } from '@/components/ui/AnimatedCard'
import { FormTextarea } from '@/components/ui/FormTextarea'
import { toast } from 'react-hot-toast'

import { 
  getOwnerPromotions, 
  createPromotion, 
  updatePromotion, 
  deletePromotion, 
  togglePromotionStatus 
} from '@/actions/promo'
import { getOwnerBranches } from '@/actions/branch'
import { getOwnerPlans } from '@/actions/plan'

interface Promotion {
  id: string
  code: string
  description?: string
  isActive: boolean
  type: string
  value: number | null
  duration?: number | null
  durationUnit?: string | null
  validFrom: string | Date
  validTo: string | Date
  usedCount: number
  usageLimit?: number
  minOrder?: number
  maxDiscount?: number
  perUserLimit?: number
  branchId?: string | null
  planId?: string | null
  branch?: { name: string } | null
  plan?: { name: string } | null
}

interface Branch {
  id: string
  name: string
}

interface Plan {
  id: string
  name: string
}

export function PromotionsList() {
  // Data State
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [filterBranchId, setFilterBranchId] = useState('all')
  const [filterPlanId, setFilterPlanId] = useState('all')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null)
  const [promoType, setPromoType] = useState('percentage')
  
  // Form State for Conditional Fields
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const [selectedPlanId, setSelectedPlanId] = useState<string>('all')

  useEffect(() => {
    if (editingPromo) {
      setPromoType(editingPromo.type)
      setSelectedBranchId(editingPromo.branchId || 'all')
      setSelectedPlanId(editingPromo.planId || 'all')
    } else {
      setPromoType('percentage')
      setSelectedBranchId('all')
      setSelectedPlanId('all')
    }
  }, [editingPromo])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [promosData, branchesRes, plansData] = await Promise.all([
        getOwnerPromotions(),
        getOwnerBranches(),
        getOwnerPlans()
      ])
      
      setPromotions(promosData as unknown as Promotion[] || [])
      
      if (branchesRes && branchesRes.success && branchesRes.data) {
        setBranches(branchesRes.data as unknown as Branch[])
      }
      
      setPlans(plansData as unknown as Plan[] || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Derived State (Stats & Filtering)
  const stats = useMemo(() => {
    const total = promotions.length
    const active = promotions.filter(p => p.isActive).length
    const used = promotions.reduce((acc, curr) => acc + (curr.usedCount || 0), 0)
    return { total, active, used }
  }, [promotions])

  const filteredPromotions = useMemo(() => {
    return promotions
      .filter(p => {
        if (!search) return true
        return p.code.toLowerCase().includes(search.toLowerCase()) || 
               p.description?.toLowerCase().includes(search.toLowerCase())
      })
      .filter(p => {
        if (statusFilter === 'all') return true
        if (statusFilter === 'active') return p.isActive
        return !p.isActive
      })
  }, [promotions, search, statusFilter])

  // Handlers
  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    if (editingPromo) {
      formData.append('id', editingPromo.id)
    }

    try {
      const action = editingPromo ? updatePromotion : createPromotion
      const result = await action(formData)
      
      if (result.success) {
        toast.success(editingPromo ? 'Promotion updated' : 'Promotion created')
        setIsModalOpen(false)
        setEditingPromo(null)
        // Refresh
        const newData = await getOwnerPromotions()
        setPromotions(newData as unknown as Promotion[])
      } else {
        toast.error(result.error || 'Failed to save promotion')
      }
    } catch (error) {
      console.error('Error saving promotion:', error)
      toast.error('Failed to save promotion')
    }
  }

  const handleDelete = async (promo: Promotion) => {
    if (!confirm(`Delete promotion "${promo.code}"? This cannot be undone.`)) return
    
    try {
      const result = await deletePromotion(promo.id)
      if (result.success) {
        setPromotions(prev => prev.filter(p => p.id !== promo.id))
        toast.success('Promotion deleted')
      } else {
        toast.error(result.error || 'Failed to delete promotion')
      }
    } catch {
      toast.error('Failed to delete promotion')
    }
  }

  const handleToggleStatus = async (promo: Promotion) => {
    try {
      const result = await togglePromotionStatus(promo.id)
      if (result.success) {
        setPromotions(prev => 
          prev.map(p => p.id === promo.id ? { ...p, isActive: !p.isActive } : p)
        )
        toast.success(promo.isActive ? 'Promotion deactivated' : 'Promotion activated')
      } else {
        toast.error('Failed to update status')
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const getPromoIcon = (type: string) => {
      switch (type) {
          case 'percentage': return <Percent className="w-5 h-5" />
          case 'fixed': return <IndianRupee className="w-5 h-5" />
          case 'free_trial': return <Clock className="w-5 h-5" />
          default: return <Tag className="w-5 h-5" />
      }
  }

  const getPromoColorClass = (type: string) => {
    switch (type) {
        case 'percentage': return 'bg-orange-50 text-orange-600 dark:bg-orange-900/20'
        case 'fixed': return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'
        case 'free_trial': return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
        default: return 'bg-gray-50 text-gray-600 dark:bg-gray-900/20'
    }
  }

  const getPromoLabel = (promo: Promotion) => {
      if (promo.type === 'free_trial') {
          return `${promo.duration} ${promo.durationUnit} FREE TRIAL`
      }
      if (promo.type === 'percentage') {
          return `${promo.value}% OFF`
      }
      return `₹${promo.value} FLAT OFF`
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Active Promotions</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage coupon codes and special offers.
          </p>
        </div>
        <AnimatedButton
          variant="primary"
          icon="add"
          onClick={() => {
            setEditingPromo(null)
            setPromoType('percentage')
            setIsModalOpen(true)
          }}
        >
          Create Promotion
        </AnimatedButton>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Promotions</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</h3>
          </div>
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
            <Tag className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Redemptions</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.used}</h3>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
            <Hash className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Campaigns</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <CompactCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex-1 max-w-md">
            <FormInput
              placeholder="Search promotions..."
              icon={Search}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <div className="w-full md:w-40">
              <FormSelect
                value={filterBranchId}
                onChange={e => setFilterBranchId(e.target.value)}
                options={[
                  { label: 'All Branches', value: 'all' },
                  { label: 'Global Only', value: 'global' },
                  ...branches.map(b => ({ label: b.name, value: b.id }))
                ]}
                icon={MapPin}
              />
            </div>
            <div className="w-full md:w-40">
              <FormSelect
                value={filterPlanId}
                onChange={e => setFilterPlanId(e.target.value)}
                options={[
                  { label: 'All Plans', value: 'all' },
                  { label: 'Global Only', value: 'global' },
                  ...plans.map(p => ({ label: p.name, value: p.id }))
                ]}
                icon={Layers}
              />
            </div>
            <div className="w-full md:w-40">
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
            </div>
          </div>
        </div>
      </CompactCard>

      {/* Promotions List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <Tag className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No promotions found</p>
          <p className="text-sm mt-1">Try adjusting your filters or create a new one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromotions.map(promo => (
            <div 
              key={promo.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:border-purple-200 dark:hover:border-purple-800 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${getPromoColorClass(promo.type)}`}>
                      {getPromoIcon(promo.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">{promo.code}</h3>
                      <p className="text-xs text-gray-500 uppercase font-medium tracking-wider">
                        {getPromoLabel(promo)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    promo.isActive 
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {promo.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {promo.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
                    {promo.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(promo.validFrom).toLocaleDateString()} - {new Date(promo.validTo).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {(promo.branch || promo.plan) && (
                    <div className="flex flex-wrap gap-2">
                      {promo.branch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          <MapPin className="w-3 h-3" />
                          {promo.branch.name}
                        </span>
                      )}
                      {promo.plan && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          <Layers className="w-3 h-3" />
                          {promo.plan.name}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 uppercase font-bold">Used</p>
                      <p className="font-semibold text-gray-900 dark:text-white">{promo.usedCount}</p>
                    </div>
                    {promo.usageLimit && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Limit</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{promo.usageLimit}</p>
                      </div>
                    )}
                    {promo.minOrder && (
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Min Order</p>
                        <p className="font-semibold text-gray-900 dark:text-white">₹{promo.minOrder}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                  <AnimatedButton
                    variant="outline"
                    size="xs"
                    onClick={() => {
                      setEditingPromo(promo)
                      setIsModalOpen(true)
                    }}
                  >
                    Edit
                  </AnimatedButton>
                  <AnimatedButton
                    variant={promo.isActive ? 'outline' : 'primary'}
                    size="xs"
                    onClick={() => handleToggleStatus(promo)}
                  >
                    {promo.isActive ? 'Deactivate' : 'Activate'}
                  </AnimatedButton>
                </div>
                <button
                  onClick={() => handleDelete(promo)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingPromo ? 'Edit Promotion' : 'New Promotion'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  name="code"
                  label="Coupon Code"
                  placeholder="e.g. SUMMER50"
                  defaultValue={editingPromo?.code}
                  required
                  className="uppercase"
                />
                <FormSelect
                  name="type"
                  label="Discount Type"
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value)}
                  options={[
                    { label: 'Percentage (%)', value: 'percentage' },
                    { label: 'Flat Amount (₹)', value: 'fixed' },
                    { label: 'Free Trial', value: 'free_trial' }
                  ]}
                />
              </div>

              {promoType === 'free_trial' ? (
                  <div className="grid grid-cols-2 gap-4">
                      <FormInput
                          name="duration"
                          label="Trial Duration"
                          type="number"
                          min="1"
                          placeholder="e.g. 7"
                          defaultValue={editingPromo?.duration || ''}
                          required
                      />
                      <FormSelect
                          name="durationUnit"
                          label="Duration Unit"
                          defaultValue={editingPromo?.durationUnit || 'days'}
                          options={[
                              { label: 'Days', value: 'days' },
                              { label: 'Months', value: 'months' }
                          ]}
                      />
                      {/* Hidden inputs for non-relevant fields */}
                      <input type="hidden" name="value" value="0" />
                  </div>
              ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <FormInput
                      name="value"
                      label="Discount Value"
                      type="number"
                      min="0"
                      max={promoType === 'percentage' ? "100" : undefined}
                      step="0.01"
                      placeholder="e.g. 20"
                      defaultValue={editingPromo?.value ?? ''}
                      required
                    />
                    {promoType === 'percentage' ? (
                      <FormInput
                        name="maxDiscount"
                        label="Max Discount (Optional)"
                        type="number"
                        min="0"
                        placeholder="e.g. 500"
                        defaultValue={editingPromo?.maxDiscount ?? ''}
                      />
                    ) : (
                      <div className="hidden">
                        {/* Hidden input to clear maxDiscount when switching to fixed */}
                        <input type="hidden" name="maxDiscount" value="" />
                      </div>
                    )}
                  </div>
              )}

              {/* Branch and Plan Selection */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <FormSelect
                  name="branchId"
                  label="Applicable Branch"
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  options={[
                    { label: 'All Branches', value: 'all' },
                    ...branches.map(b => ({ label: b.name, value: b.id }))
                  ]}
                  icon={MapPin}
                />
                <FormSelect
                  name="planId"
                  label="Applicable Plan"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  options={[
                    { label: 'All Plans', value: 'all' },
                    ...plans.map(p => ({ label: p.name, value: p.id }))
                  ]}
                  icon={Layers}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  name="validFrom"
                  label="Valid From"
                  type="date"
                  defaultValue={editingPromo?.validFrom ? new Date(editingPromo.validFrom).toISOString().split('T')[0] : ''}
                  required
                />
                <FormInput
                  name="validTo"
                  label="Valid To"
                  type="date"
                  defaultValue={editingPromo?.validTo ? new Date(editingPromo.validTo).toISOString().split('T')[0] : ''}
                  required
                />
              </div>

              <FormTextarea
                name="description"
                label="Description"
                placeholder="Internal notes or terms..."
                defaultValue={editingPromo?.description || ''}
                rows={2}
              />

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">Restrictions & Limits</h4>
                <div className="grid grid-cols-2 gap-4">
                  {promoType !== 'free_trial' && (
                      <FormInput
                        name="minOrder"
                        label="Min Order Value"
                        type="number"
                        min="0"
                        placeholder="e.g. 1000"
                        defaultValue={editingPromo?.minOrder}
                      />
                  )}
                  <FormInput
                    name="usageLimit"
                    label="Total Usage Limit"
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    defaultValue={editingPromo?.usageLimit}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormInput
                        name="perUserLimit"
                        label="Per User Limit"
                        type="number"
                        min="1"
                        placeholder="e.g. 1"
                        defaultValue={editingPromo?.perUserLimit}
                    />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <AnimatedButton
                  variant="outline"
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </AnimatedButton>
                <AnimatedButton
                  variant="primary"
                  type="submit"
                >
                  {editingPromo ? 'Update' : 'Create'}
                </AnimatedButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
