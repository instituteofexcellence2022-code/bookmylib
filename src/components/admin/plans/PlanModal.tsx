'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { PlanFormData, createSaasPlan, updateSaasPlan } from '@/actions/admin/platform-plans'
import { toast } from 'react-hot-toast'
import { Loader2, Check, Star } from 'lucide-react'

interface PlanModalProps {
    isOpen: boolean
    onClose: () => void
    plan?: any // TODO: Type properly
    mode: 'create' | 'edit'
}

const AVAILABLE_FEATURES = [
    { id: 'multi_branch', label: 'Multi-Branch Management' },
    { id: 'staff_accounts', label: 'Staff Accounts' },
    { id: 'email_announcements', label: 'Email Announcements' },
    { id: 'data_export', label: 'Data Export' },
    { id: 'advanced_analytics', label: 'Advanced Analytics' },
    { id: 'biometric', label: 'Biometric Integration' },
    { id: 'whatsapp', label: 'WhatsApp Alerts' },
    { id: 'custom_domain', label: 'Custom Domain' },
    { id: 'priority_support', label: 'Priority Support' },
    { id: 'white_label', label: 'White Labeling' }
]

export function PlanModal({ isOpen, onClose, plan, mode }: PlanModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<PlanFormData>({
        name: '',
        slug: '',
        description: '',
        priceMonthly: 0,
        priceYearly: 0,
        trialDays: 0,
        isPopular: false,
        sortOrder: 0,
        maxBranches: 1,
        maxActiveStudents: 100,
        maxTotalStudents: 500,
        maxSeats: 50,
        maxStorage: 512,
        maxStaff: 2,
        maxEmailsMonthly: 1000,
        maxSmsMonthly: 100,
        features: {}
    })

    useEffect(() => {
        if (plan && mode === 'edit') {
            setFormData({
                name: plan.name,
                slug: plan.slug,
                description: plan.description || '',
                priceMonthly: plan.priceMonthly,
                priceYearly: plan.priceYearly,
                trialDays: plan.trialDays || 0,
                isPopular: plan.isPopular || false,
                sortOrder: plan.sortOrder || 0,
                maxBranches: plan.maxBranches,
                maxActiveStudents: plan.maxActiveStudents || 100,
                maxTotalStudents: plan.maxTotalStudents || 500,
                maxSeats: plan.maxSeats || 50,
                maxStorage: plan.maxStorage,
                maxStaff: plan.maxStaff,
                maxEmailsMonthly: plan.maxEmailsMonthly || 1000,
                maxSmsMonthly: plan.maxSmsMonthly || 100,
                features: (plan.features as Record<string, boolean>) || {}
            })
        } else {
            setFormData({
                name: '',
                slug: '',
                description: '',
                priceMonthly: 0,
                priceYearly: 0,
                trialDays: 14, // Default trial
                isPopular: false,
                sortOrder: 0,
                maxBranches: 1,
                maxActiveStudents: 100,
                maxTotalStudents: 500,
                maxSeats: 50,
                maxStorage: 512,
                maxStaff: 2,
                maxEmailsMonthly: 1000,
                maxSmsMonthly: 100,
                features: {
                    whatsapp: false,
                    biometric: false
                }
            })
        }
    }, [plan, mode, isOpen])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = mode === 'create' 
                ? await createSaasPlan(formData)
                : await updateSaasPlan(plan.id, formData)

            if (result.success) {
                toast.success(`Plan ${mode === 'create' ? 'created' : 'updated'} successfully`)
                onClose()
            } else {
                toast.error(result.error || 'Operation failed')
            }
        } catch (error) {
            toast.error('Something went wrong')
        } finally {
            setLoading(false)
        }
    }

    const toggleFeature = (featureId: string) => {
        setFormData(prev => ({
            ...prev,
            features: {
                ...prev.features,
                [featureId]: !prev.features?.[featureId]
            }
        }))
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? 'Create New SaaS Plan' : 'Edit SaaS Plan'}</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Basic Info</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">SaaS Plan Name</label>
                                    <input 
                                        required
                                        className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                        placeholder="e.g. Pro Plan"
                                        value={formData.name}
                                        onChange={e => {
                                            const name = e.target.value;
                                            setFormData({
                                                ...formData, 
                                                name,
                                                slug: mode === 'create' ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : formData.slug
                                            })
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">Slug (ID)</label>
                                    <input 
                                        required
                                        className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700 font-mono"
                                        value={formData.slug}
                                        onChange={e => setFormData({...formData, slug: e.target.value})}
                                        disabled={mode === 'edit'}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500">Description</label>
                                <textarea 
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700 min-h-[80px]"
                                    placeholder="Describe the plan benefits..."
                                    value={formData.description || ''}
                                    onChange={e => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={formData.isPopular}
                                        onChange={e => setFormData({...formData, isPopular: e.target.checked})}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Mark as Popular</span>
                                    {formData.isPopular && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                                </label>
                                
                                <div className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-gray-500">Sort Order</label>
                                    <input 
                                        type="number"
                                        className="w-20 p-1 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                        value={formData.sortOrder}
                                        onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Pricing & Trial */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Pricing & Trial</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">Monthly Price (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">₹</span>
                                        <input 
                                            type="number"
                                            required
                                            min="0"
                                            className="w-full p-2 pl-7 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                            value={formData.priceMonthly}
                                            onChange={e => setFormData({...formData, priceMonthly: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-500">Yearly Price (₹)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-500">₹</span>
                                        <input 
                                            type="number"
                                            required
                                            min="0"
                                            className="w-full p-2 pl-7 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                            value={formData.priceYearly}
                                            onChange={e => setFormData({...formData, priceYearly: parseFloat(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500">Free Trial (Days)</label>
                                <input 
                                    type="number"
                                    min="0"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.trialDays}
                                    onChange={e => setFormData({...formData, trialDays: parseInt(e.target.value)})}
                                />
                                <p className="text-[10px] text-gray-400">Set to 0 for no trial.</p>
                            </div>
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Resource Limits</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Max Active Students</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxActiveStudents}
                                    onChange={e => setFormData({...formData, maxActiveStudents: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Max Total Students</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxTotalStudents}
                                    onChange={e => setFormData({...formData, maxTotalStudents: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Max Seats</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxSeats}
                                    onChange={e => setFormData({...formData, maxSeats: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Max Branches</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxBranches}
                                    onChange={e => setFormData({...formData, maxBranches: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Max Staff</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxStaff}
                                    onChange={e => setFormData({...formData, maxStaff: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Storage (MB)</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxStorage}
                                    onChange={e => setFormData({...formData, maxStorage: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">Emails / Mo</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxEmailsMonthly}
                                    onChange={e => setFormData({...formData, maxEmailsMonthly: parseInt(e.target.value)})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500">SMS / Mo</label>
                                <input 
                                    type="number"
                                    className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.maxSmsMonthly}
                                    onChange={e => setFormData({...formData, maxSmsMonthly: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 border-b pb-2">Features Included</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {AVAILABLE_FEATURES.map(feat => (
                                <div 
                                    key={feat.id}
                                    onClick={() => toggleFeature(feat.id)}
                                    className={`
                                        flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all
                                        ${formData.features?.[feat.id] 
                                            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
                                    `}
                                >
                                    <div className={`
                                        w-4 h-4 rounded border flex items-center justify-center
                                        ${formData.features?.[feat.id] ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-400'}
                                    `}>
                                        {formData.features?.[feat.id] && <Check size={10} />}
                                    </div>
                                    <span className="text-sm">{feat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={16} />}
                            {mode === 'create' ? 'Create SaaS Plan' : 'Save Changes'}
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}