import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { createLibrary, CreateLibraryFormData } from '@/actions/admin/platform-libraries'
import { Loader2, Building2, User, Mail, Lock, Globe, CreditCard } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface Plan {
    id: string
    name: string
    priceMonthly: number
}

interface AddLibraryModalProps {
    isOpen: boolean
    onClose: () => void
    plans: Plan[]
}

export function AddLibraryModal({ isOpen, onClose, plans }: AddLibraryModalProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    
    const [formData, setFormData] = useState<CreateLibraryFormData>({
        name: '',
        subdomain: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        planId: plans[0]?.id || ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        
        // Auto-generate subdomain from name if subdomain is empty
        if (name === 'name' && !formData.subdomain) {
            const generated = value.toLowerCase().replace(/[^a-z0-9]/g, '-')
            setFormData(prev => ({ ...prev, subdomain: generated }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        
        try {
            const result = await createLibrary(formData)
            if (result.success) {
                toast.success('Library created successfully')
                router.refresh()
                onClose()
                // Reset form
                setFormData({
                    name: '',
                    subdomain: '',
                    ownerName: '',
                    ownerEmail: '',
                    ownerPassword: '',
                    planId: plans[0]?.id || ''
                })
            } else {
                toast.error(result.error || 'Failed to create library')
            }
        } catch (error) {
            console.error(error)
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="text-blue-600" />
                        Add New Library
                    </DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Library Details */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Library Details</h3>
                        
                        <div className="relative">
                            <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                name="name"
                                placeholder="Library Name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        
                        <div className="relative">
                            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <div className="flex items-center">
                                <input
                                    name="subdomain"
                                    placeholder="subdomain"
                                    value={formData.subdomain}
                                    onChange={handleChange}
                                    required
                                    pattern="^[a-z0-9-]+$"
                                    title="Lowercase alphanumeric and hyphens only"
                                    className="w-full pl-9 pr-32 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <span className="absolute right-3 text-sm text-gray-400 pointer-events-none">
                                    .bookmylib.com
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Owner Details */}
                    <div className="space-y-3 pt-2">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Owner Details</h3>
                        
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                name="ownerName"
                                placeholder="Owner Full Name"
                                value={formData.ownerName}
                                onChange={handleChange}
                                required
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="email"
                                name="ownerEmail"
                                placeholder="Owner Email"
                                value={formData.ownerEmail}
                                onChange={handleChange}
                                required
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>

                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="password"
                                name="ownerPassword"
                                placeholder="Initial Password"
                                value={formData.ownerPassword}
                                onChange={handleChange}
                                required
                                minLength={6}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Plan Selection */}
                    <div className="space-y-3 pt-2">
                        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Subscription</h3>
                        
                        <div className="relative">
                            <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <select
                                name="planId"
                                value={formData.planId}
                                onChange={handleChange}
                                required
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                            >
                                <option value="" disabled>Select a Plan</option>
                                {plans.map(plan => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.name} - ₹{plan.priceMonthly}/mo
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <DialogFooter className="mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                            Create Library
                        </button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
