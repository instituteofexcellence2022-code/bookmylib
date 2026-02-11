import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { getLibraryDetails, updateLibrary, toggleLibraryStatus, createLibraryOwner } from '@/actions/admin/platform-libraries'
import { getSaasPlans } from '@/actions/admin/platform-plans'
import { updateSubscriptionPlan, updateSubscriptionStatus, updateSubscriptionPeriod } from '@/actions/admin/platform-subscriptions'
import { Loader2, Building2, User, Mail, Phone, MapPin, CreditCard, Shield, Activity, Calendar, Globe, Power, Edit2, Save, X, LayoutDashboard, Plus, Lock, Check, AlertTriangle, HardDrive, Users, Star, CheckCircle2 } from 'lucide-react'
import { format, addMonths } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface LibraryDetailsModalProps {
    libraryId: string | null
    isOpen: boolean
    onClose: () => void
}

type Tab = 'overview' | 'profile' | 'owner' | 'subscription'

export function LibraryDetailsModal({ libraryId, isOpen, onClose }: LibraryDetailsModalProps) {
    const [library, setLibrary] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<Tab>('overview')
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})
    const [saving, setSaving] = useState(false)
    
    // Owner Creation State
    const [newOwnerForm, setNewOwnerForm] = useState({ name: '', email: '', password: '' })
    const [creatingOwner, setCreatingOwner] = useState(false)

    // Subscription Management State
    const [plans, setPlans] = useState<any[]>([])
    const [isEditingSubscription, setIsEditingSubscription] = useState(false)
    const [subForm, setSubForm] = useState({
        planId: '',
        status: '',
        currentPeriodEnd: ''
    })
    const [savingSub, setSavingSub] = useState(false)

    const router = useRouter()

    useEffect(() => {
        if (isOpen && libraryId) {
            fetchDetails()
            setActiveTab('overview')
            setIsEditing(false)
            setIsEditingSubscription(false)
        } else {
            setLibrary(null)
        }
    }, [isOpen, libraryId])

    useEffect(() => {
        if (isOpen) {
            fetchPlans()
        }
    }, [isOpen])

    const fetchPlans = async () => {
        try {
            const data = await getSaasPlans()
            setPlans(data)
        } catch (error) {
            console.error('Failed to fetch plans', error)
        }
    }

    const fetchDetails = async () => {
        if (!libraryId) return
        setLoading(true)
        try {
            const data = await getLibraryDetails(libraryId)
            setLibrary(data)
            setEditForm({
                name: data.name,
                contactEmail: data.contactEmail || '',
                contactPhone: data.contactPhone || '',
                address: data.address || '',
                website: data.website || ''
            })
            
            if (data.subscription) {
                setSubForm({
                    planId: data.subscription.planId,
                    status: data.subscription.status,
                    currentPeriodEnd: new Date(data.subscription.currentPeriodEnd).toISOString().split('T')[0]
                })
            }
        } catch (error) {
            console.error(error)
            toast.error('Failed to fetch details')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateLibrary = async () => {
        setSaving(true)
        try {
            const result = await updateLibrary(libraryId!, editForm)
            if (result.success) {
                toast.success('Library updated successfully')
                setIsEditing(false)
                fetchDetails()
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to update')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setSaving(false)
        }
    }

    const handleToggleStatus = async () => {
        if (!library) return
        const newStatus = !library.isActive
        const toastId = toast.loading(`${newStatus ? 'Activating' : 'Deactivating'} library...`)
        
        try {
            const result = await toggleLibraryStatus(libraryId!, newStatus)
            if (result.success) {
                toast.success(`Library ${newStatus ? 'activated' : 'deactivated'}`, { id: toastId })
                fetchDetails()
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to update status', { id: toastId })
            }
        } catch (error) {
            toast.error('An error occurred', { id: toastId })
        }
    }

    const handleCreateOwner = async () => {
        setCreatingOwner(true)
        try {
            const result = await createLibraryOwner(libraryId!, newOwnerForm)
            if (result.success) {
                toast.success('Owner account created successfully')
                setNewOwnerForm({ name: '', email: '', password: '' })
                fetchDetails()
                router.refresh()
            } else {
                toast.error(result.error || 'Failed to create owner')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setCreatingOwner(false)
        }
    }

    const handleUpdateSubscription = async () => {
        if (!library?.subscription) return
        setSavingSub(true)
        
        try {
            // Update Plan if changed
            if (subForm.planId !== library.subscription.planId) {
                await updateSubscriptionPlan(library.subscription.id, subForm.planId)
            }
            
            // Update Status if changed
            if (subForm.status !== library.subscription.status) {
                await updateSubscriptionStatus(library.subscription.id, subForm.status)
            }
            
            // Update Period if changed
            const currentEndDate = new Date(library.subscription.currentPeriodEnd).toISOString().split('T')[0]
            if (subForm.currentPeriodEnd !== currentEndDate) {
                await updateSubscriptionPeriod(library.subscription.id, new Date(subForm.currentPeriodEnd))
            }
            
            toast.success('Subscription updated successfully')
            setIsEditingSubscription(false)
            fetchDetails()
            router.refresh()
        } catch (error) {
            toast.error('Failed to update subscription')
            console.error(error)
        } finally {
            setSavingSub(false)
        }
    }

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between space-y-0 bg-white dark:bg-gray-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">{library?.name || 'Loading...'}</DialogTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-normal flex items-center gap-2">
                                <Globe size={12} />
                                {library?.subdomain}.lms-platform.com
                            </p>
                        </div>
                    </div>
                    {library && (
                        <div className="flex items-center gap-3">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                                library.isActive 
                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' 
                                    : 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                            }`}>
                                {library.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <a
                                href={`https://${library.subdomain}.lms-platform.com`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 text-xs font-medium border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                Open
                            </a>
                            <button
                                onClick={() => navigator.clipboard.writeText(`${library.subdomain}.lms-platform.com`)}
                                className="px-2 py-1 text-xs font-medium border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="Copy URL"
                            >
                                Copy URL
                            </button>
                            <button 
                                onClick={handleToggleStatus}
                                className={`p-2 rounded-lg transition-colors ${
                                    library.isActive 
                                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                }`}
                                title={library.isActive ? 'Deactivate Library' : 'Activate Library'}
                            >
                                <Power size={18} />
                            </button>
                        </div>
                    )}
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center min-h-[400px]">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : library ? (
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Tabs */}
                        <div className="flex border-b border-gray-100 dark:border-gray-800 px-6 bg-white dark:bg-gray-900">
                            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard size={16} />} label="Overview" />
                            <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<Building2 size={16} />} label="Profile" />
                            <TabButton active={activeTab === 'owner'} onClick={() => setActiveTab('owner')} icon={<Shield size={16} />} label="Owner" />
                            <TabButton active={activeTab === 'subscription'} onClick={() => setActiveTab('subscription')} icon={<CreditCard size={16} />} label="SaaS Plan" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 dark:bg-gray-950">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatBox label="Students" value={library._count?.students || 0} icon={<User size={14} />} />
                                        <StatBox label="Branches" value={library._count?.branches || 0} icon={<MapPin size={14} />} />
                                        <StatBox label="Revenue" value="₹0" icon={<CreditCard size={14} />} />
                                        <StatBox label="Health" value="98%" icon={<Activity size={14} />} />
                                    </div>
                                    
                                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                                        <h3 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
                                            <Building2 size={18} className="text-gray-400" />
                                            Quick Details
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InfoRow label="Library Name" value={library.name} icon={<Building2 size={14} />} />
                                            <InfoRow label="Subdomain" value={library.subdomain} icon={<Globe size={14} />} />
                                            <InfoRow label="Created At" value={format(new Date(library.createdAt), 'PPP')} icon={<Calendar size={14} />} />
                                            <InfoRow label="Status" value={library.isActive ? 'Active' : 'Inactive'} icon={<Activity size={14} />} />
                                            <InfoRow label="Email" value={library.contactEmail || 'N/A'} icon={<Mail size={14} />} />
                                            <InfoRow label="Phone" value={library.contactPhone || 'N/A'} icon={<Phone size={14} />} />
                                            <InfoRow label="Address" value={library.address || 'N/A'} icon={<MapPin size={14} />} />
                                            <InfoRow label="Website" value={library.website || 'N/A'} icon={<Globe size={14} />} />
                                            <InfoRow label="Owners" value={String(library.owners?.length || 0)} icon={<User size={14} />} />
                                            <InfoRow label="Staff" value={String(library._count?.staff || 0)} icon={<User size={14} />} />
                                            <InfoRow label="Branches" value={String(library._count?.branches || 0)} icon={<MapPin size={14} />} />
                                        </div>
                                        <div className="mt-6 flex gap-3">
                                            <button 
                                                onClick={() => setActiveTab('profile')}
                                                className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                Edit Profile
                                            </button>
                                            <button 
                                                onClick={() => setActiveTab('subscription')}
                                                className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                                            >
                                                Manage Subscription
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="font-semibold text-gray-900 dark:text-white">Library Profile</h3>
                                        {!isEditing ? (
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                <Edit2 size={14} /> Edit Profile
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setIsEditing(false)}
                                                    className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-1.5"
                                                >
                                                    <X size={14} /> Cancel
                                                </button>
                                                <button 
                                                    onClick={handleUpdateLibrary}
                                                    disabled={saving}
                                                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Changes
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Field label="Library Name" value={library.name} isEditing={isEditing} onChange={(v: any) => setEditForm({...editForm, name: v})} formValue={editForm.name} icon={<Building2 size={14} />} />
                                        <Field label="Subdomain (Immutable)" value={library.subdomain} isEditing={false} icon={<Globe size={14} />} />
                                        <Field label="Contact Email" value={library.contactEmail || 'N/A'} isEditing={isEditing} onChange={(v: any) => setEditForm({...editForm, contactEmail: v})} formValue={editForm.contactEmail} icon={<Mail size={14} />} />
                                        <Field label="Contact Phone" value={library.contactPhone || 'N/A'} isEditing={isEditing} onChange={(v: any) => setEditForm({...editForm, contactPhone: v})} formValue={editForm.contactPhone} icon={<Phone size={14} />} />
                                        <Field label="Address" value={library.address || 'N/A'} isEditing={isEditing} onChange={(v: any) => setEditForm({...editForm, address: v})} formValue={editForm.address} icon={<MapPin size={14} />} fullWidth />
                                        <Field label="Website" value={library.website || 'N/A'} isEditing={isEditing} onChange={(v: any) => setEditForm({...editForm, website: v})} formValue={editForm.website} icon={<Globe size={14} />} />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'owner' && (
                                <div className="space-y-6">
                                    {library.owners && library.owners.length > 0 ? (
                                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">Primary Owner</h3>
                                            </div>
                                            <div className="p-6 flex items-start gap-4">
                                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-2xl">
                                                    {library.owners[0].name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">{library.owners[0].name}</h4>
                                                    <p className="text-sm text-gray-500 mb-4">Account ID: {library.owners[0].id}</p>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <InfoRow label="Email" value={library.owners[0].email} icon={<Mail size={14} />} />
                                                        <InfoRow label="Phone" value={library.owners[0].phone || 'N/A'} icon={<Phone size={14} />} />
                                                        <InfoRow label="Joined" value={format(new Date(library.owners[0].createdAt), 'PPP')} icon={<Calendar size={14} />} />
                                                    </div>
                                                    <div className="pt-4 flex gap-3">
                                                        <button className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                                                            Reset Password
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900 rounded-xl p-6">
                                            <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200 mb-4">
                                                <Shield className="w-5 h-5" />
                                                <h4 className="font-semibold">Assign Owner Account</h4>
                                            </div>
                                            <p className="text-sm text-orange-600 dark:text-orange-300 mb-6">
                                                This library currently has no owner assigned. Create an owner account to grant access to the dashboard.
                                            </p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Full Name</label>
                                                    <div className="relative">
                                                        <User className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                                        <input 
                                                            type="text" 
                                                            value={newOwnerForm.name}
                                                            onChange={e => setNewOwnerForm({...newOwnerForm, name: e.target.value})}
                                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                            placeholder="John Doe"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Email Address</label>
                                                    <div className="relative">
                                                        <Mail className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                                        <input 
                                                            type="email" 
                                                            value={newOwnerForm.email}
                                                            onChange={e => setNewOwnerForm({...newOwnerForm, email: e.target.value})}
                                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                            placeholder="john@example.com"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                                                        <input 
                                                            type="password" 
                                                            value={newOwnerForm.password}
                                                            onChange={e => setNewOwnerForm({...newOwnerForm, password: e.target.value})}
                                                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                            placeholder="••••••••"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <button 
                                                    onClick={handleCreateOwner}
                                                    disabled={creatingOwner || !newOwnerForm.name || !newOwnerForm.email || !newOwnerForm.password}
                                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {creatingOwner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                    Create Owner Account
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'subscription' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold text-lg flex items-center gap-2">
                                            Platform Subscription & SaaS Plan
                                            {library.subscription?.status === 'active' && <Check className="w-4 h-4 text-green-500" />}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            {library.subscription && !isEditingSubscription && (
                                                <button 
                                                    onClick={() => setIsEditingSubscription(true)}
                                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200 flex items-center gap-2"
                                                >
                                                    <Edit2 size={14} />
                                                    Manage Subscription
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {isEditingSubscription && library.subscription ? (
                                        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-blue-100 dark:border-blue-900 shadow-sm space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Change SaaS Plan</label>
                                                    <select
                                                        value={subForm.planId}
                                                        onChange={(e) => setSubForm({...subForm, planId: e.target.value})}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800"
                                                    >
                                                        {plans.map(plan => (
                                                            <option key={plan.id} value={plan.id}>
                                                                {plan.name} - ₹{plan.priceMonthly}/mo
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Status</label>
                                                    <select
                                                        value={subForm.status}
                                                        onChange={(e) => setSubForm({...subForm, status: e.target.value})}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="past_due">Past Due</option>
                                                        <option value="canceled">Canceled</option>
                                                        <option value="incomplete">Incomplete</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Current Period End</label>
                                                    <input
                                                        type="date"
                                                        value={subForm.currentPeriodEnd}
                                                        onChange={(e) => setSubForm({...subForm, currentPeriodEnd: e.target.value})}
                                                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-800"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-3 pt-4">
                                                <button 
                                                    onClick={() => setIsEditingSubscription(false)}
                                                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={handleUpdateSubscription}
                                                    disabled={savingSub}
                                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                                >
                                                    {savingSub ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                                    Save Changes
                                                </button>
                                            </div>
                                        </div>
                                    ) : library.subscription ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Plan Card */}
                                            <div className="md:col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-xl p-6 shadow-lg relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                                                <div className="relative z-10">
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div>
                                                            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Current SaaS Plan</p>
                                                            <h2 className="text-3xl font-bold flex items-center gap-2">
                                                                {library.subscription.plan.name}
                                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                                                    library.subscription.status === 'active' ? 'bg-green-500/20 border-green-500/30 text-green-300' : 'bg-red-500/20 border-red-500/30 text-red-300'
                                                                }`}>
                                                                    {library.subscription.status.toUpperCase()}
                                                                </span>
                                                            </h2>
                                                            <p className="text-gray-400 text-sm mt-1">₹{library.subscription.plan.priceMonthly}/month</p>
                                                        </div>
                                                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                                                            <CreditCard className="text-white w-8 h-8" />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-700/50">
                                                        <div>
                                                            <p className="text-gray-400 text-xs uppercase mb-1">Start Date</p>
                                                            <p className="font-medium font-mono">{format(new Date(library.subscription.currentPeriodStart), 'MMM d, yyyy')}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-400 text-xs uppercase mb-1">Renewal Date</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium font-mono">{format(new Date(library.subscription.currentPeriodEnd), 'MMM d, yyyy')}</p>
                                                                {new Date(library.subscription.currentPeriodEnd) < new Date() && (
                                                                    <AlertTriangle size={14} className="text-red-400" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Features/Limits Card */}
                                            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                                <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                    <Activity size={16} className="text-blue-500" />
                                                    SaaS Plan Limits
                                                </h4>
                                                <div className="space-y-4">
                                                    <LimitRow 
                                                        label="Branches" 
                                                        limit={library.subscription.plan.maxBranches} 
                                                        used={library._count?.branches || 0}
                                                        icon={<MapPin size={14} />} 
                                                    />
                                                    <LimitRow 
                                                        label="Active Students" 
                                                        limit={library.subscription.plan.maxActiveStudents} 
                                                        used={library._count?.students || 0}
                                                        icon={<Users size={14} />} 
                                                    />
                                                    <LimitRow 
                                                        label="Total Students" 
                                                        limit={library.subscription.plan.maxTotalStudents} 
                                                        used={library._count?.students || 0}
                                                        icon={<Users size={14} />} 
                                                    />
                                                    <LimitRow 
                                                        label="Staff" 
                                                        limit={library.subscription.plan.maxStaff} 
                                                        used={library._count?.staff || 0}
                                                        icon={<User size={14} />} 
                                                    />
                                                    <LimitRow 
                                                        label="Storage" 
                                                        limit={`${library.subscription.plan.maxStorage}MB`} 
                                                        used="0MB" 
                                                        icon={<HardDrive size={14} />} 
                                                    />
                                                    <LimitRow 
                                                        label="Emails / Month" 
                                                        limit={library.subscription.plan.maxEmailsMonthly} 
                                                        used={0} 
                                                        icon={<Mail size={14} />} 
                                                    />
                                                    <LimitRow 
                                                        label="SMS / Month" 
                                                        limit={library.subscription.plan.maxSmsMonthly} 
                                                        used={0} 
                                                        icon={<Phone size={14} />} 
                                                    />
                                                </div>
                                            </div>

                                            {/* Included Features */}
                                            {library.subscription.plan.features && Object.keys(library.subscription.plan.features as Record<string, boolean>).length > 0 && (
                                                <div className="md:col-span-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                                        <Star size={16} className="text-yellow-500" />
                                                        Included Features
                                                    </h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {Object.entries(library.subscription.plan.features as Record<string, boolean>).map(([key, enabled]) => (
                                                            enabled && (
                                                                <div key={key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                                    <CheckCircle2 size={16} className="text-green-500" />
                                                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                                </div>
                                                            )
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CreditCard className="text-gray-400 w-8 h-8" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-1">No Active SaaS Plan</h3>
                                            <p className="text-gray-500 mb-6">This library does not have an active subscription.</p>
                                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                                                Assign Subscription
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-red-500">
                        Failed to load library details
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                active 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/10' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
        >
            {icon}
            {label}
        </button>
    )
}

function StatBox({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-500 mb-2 text-xs uppercase font-semibold">
                {icon}
                {label}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        </div>
    )
}

function InfoRow({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            {icon && <div className="text-gray-400">{icon}</div>}
            <div>
                <p className="text-xs text-gray-400 uppercase">{label}</p>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    )
}

function LimitRow({ label, limit, used, icon }: { label: string, limit: string | number, used: string | number, icon: React.ReactNode }) {
    // Calculate percentage if numbers
    const percentage = typeof limit === 'number' && typeof used === 'number' 
        ? Math.min((used / limit) * 100, 100) 
        : 0

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {icon} {label}
                </div>
                <div className="text-xs text-gray-500">
                    {used} / {limit}
                </div>
            </div>
            {typeof limit === 'number' && typeof used === 'number' && (
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`} 
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </div>
    )
}

function Field({ label, value, isEditing, onChange, formValue, icon, fullWidth }: any) {
    return (
        <div className={`space-y-1 ${fullWidth ? 'md:col-span-2' : ''}`}>
            <label className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                {icon} {label}
            </label>
            {isEditing ? (
                <input
                    value={formValue}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            ) : (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm border border-transparent">
                    {value}
                </div>
            )}
        </div>
    )
}
