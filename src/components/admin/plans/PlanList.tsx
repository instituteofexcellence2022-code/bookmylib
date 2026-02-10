'use client'

import React, { useState } from 'react'
import { Plus, Edit2, Power, Check, X, Star, Clock } from 'lucide-react'
import { toggleSaasPlanStatus } from '@/actions/admin/platform-plans'
import { PlanModal } from './PlanModal'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface PlanListProps {
    plans: any[]
}

const FEATURE_LABELS: Record<string, string> = {
    multi_branch: 'Multi-Branch Management',
    staff_accounts: 'Staff Accounts',
    email_announcements: 'Email Announcements',
    data_export: 'Data Export',
    advanced_analytics: 'Advanced Analytics',
    biometric: 'Biometric Integration',
    whatsapp: 'WhatsApp Alerts',
    custom_domain: 'Custom Domain',
    priority_support: 'Priority Support',
    white_label: 'White Labeling'
}

export function PlanList({ plans }: PlanListProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState<any>(null)
    const [mode, setMode] = useState<'create' | 'edit'>('create')
    const router = useRouter()

    const handleCreate = () => {
        setSelectedPlan(null)
        setMode('create')
        setIsModalOpen(true)
    }

    const handleEdit = (plan: any) => {
        setSelectedPlan(plan)
        setMode('edit')
        setIsModalOpen(true)
    }

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const promise = toggleSaasPlanStatus(id, !currentStatus)
        toast.promise(promise, {
            loading: 'Updating...',
            success: 'Status updated',
            error: 'Failed to update'
        })
        await promise
        router.refresh()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <p className="text-gray-500 dark:text-gray-400">Manage subscription tiers and limits.</p>
                <button 
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus size={16} />
                    Create Plan
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map(plan => (
                    <div key={plan.id} className={`
                        bg-white dark:bg-gray-800 rounded-xl border-2 shadow-sm p-6 relative flex flex-col
                        ${plan.isPopular ? 'border-blue-500 dark:border-blue-500 ring-4 ring-blue-500/10' : 'border-gray-100 dark:border-gray-700'}
                        ${!plan.isActive && 'opacity-75 grayscale'}
                    `}>
                        {plan.isPopular && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                <Star size={10} className="fill-white" />
                                MOST POPULAR
                            </div>
                        )}

                        {!plan.isActive && (
                            <div className="absolute top-4 right-4 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded font-medium">
                                Archived
                            </div>
                        )}
                        
                        <div className="mb-2 mt-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                            <p className="text-sm text-gray-500 font-mono">{plan.slug}</p>
                        </div>

                        {plan.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 min-h-[40px]">
                                {plan.description}
                            </p>
                        )}

                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">₹{plan.priceMonthly}</span>
                            <span className="text-sm text-gray-500">/mo</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                            <span>₹{plan.priceYearly}/yr billed yearly</span>
                            {plan.trialDays > 0 && (
                                <span className="flex items-center gap-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 px-2 py-0.5 rounded-full">
                                    <Clock size={10} />
                                    {plan.trialDays}d trial
                                </span>
                            )}
                        </div>

                        <div className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                            <LimitItem label="Active Students" value={plan.maxActiveStudents || 100} />
                            <LimitItem label="Total Students" value={plan.maxTotalStudents || 500} />
                            <LimitItem label="Max Seats" value={plan.maxSeats || 50} />
                            <LimitItem label="Branches" value={plan.maxBranches} />
                            <LimitItem label="Staff Members" value={plan.maxStaff} />
                            <LimitItem label="Storage" value={`${plan.maxStorage} MB`} />
                            <LimitItem label="Emails / Month" value={plan.maxEmailsMonthly || 1000} />
                            <LimitItem label="SMS / Month" value={plan.maxSmsMonthly || 100} />
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mb-6 flex-1">
                            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Included Features</h4>
                            <div className="space-y-2">
                                {Object.entries(plan.features || {})
                                    .filter(([_, enabled]) => enabled)
                                    .slice(0, 5) // Show top 5
                                    .map(([key]) => (
                                        <FeatureItem key={key} label={FEATURE_LABELS[key] || key.replace('_', ' ')} included={true} />
                                    ))
                                }
                                {Object.keys(plan.features || {}).filter(k => plan.features[k]).length === 0 && (
                                    <p className="text-xs text-gray-400 italic">No specific features enabled</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 mt-auto">
                            <button 
                                onClick={() => handleEdit(plan)}
                                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Edit2 size={14} />
                                Edit
                            </button>
                            <button 
                                onClick={() => handleToggleStatus(plan.id, plan.isActive)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                                    plan.isActive 
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400' 
                                    : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
                                }`}
                                title={plan.isActive ? "Archive Plan" : "Activate Plan"}
                            >
                                <Power size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <PlanModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                plan={selectedPlan}
                mode={mode}
            />
        </div>
    )
}

function LimitItem({ label, value }: { label: string, value: string | number }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-900 dark:text-white">{value}</span>
        </div>
    )
}

function FeatureItem({ label, included }: { label: string, included?: boolean }) {
    return (
        <div className="flex items-center gap-2 text-sm">
            {included ? (
                <Check size={14} className="text-green-500" />
            ) : (
                <X size={14} className="text-gray-300 dark:text-gray-600" />
            )}
            <span className={`capitalize ${included ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {label}
            </span>
        </div>
    )
}