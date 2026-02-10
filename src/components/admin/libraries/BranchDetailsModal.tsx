import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { getBranchDetails, toggleBranchStatus } from '@/actions/admin/platform-branches'
import { Loader2, MapPin, Phone, Mail, User, Wifi, Clock, Lock, Shield, HardDrive, Info, Power, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface BranchDetailsModalProps {
    branchId: string | null
    isOpen: boolean
    onClose: () => void
}

export function BranchDetailsModal({ branchId, isOpen, onClose }: BranchDetailsModalProps) {
    const [branch, setBranch] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [toggling, setToggling] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (isOpen && branchId) {
            fetchDetails()
        } else {
            setBranch(null)
        }
    }, [isOpen, branchId])

    const fetchDetails = async () => {
        if (!branchId) return
        setLoading(true)
        try {
            const data = await getBranchDetails(branchId)
            setBranch(data)
        } catch (error) {
            console.error('Failed to fetch branch details', error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusToggle = async () => {
        if (!branch) return
        if (!confirm(`Are you sure you want to ${branch.isActive ? 'deactivate' : 'activate'} this branch?`)) return

        setToggling(true)
        try {
            await toggleBranchStatus(branch.id, !branch.isActive)
            setBranch({ ...branch, isActive: !branch.isActive })
            router.refresh()
        } catch (error) {
            console.error('Failed to toggle status', error)
            alert('Failed to update branch status')
        } finally {
            setToggling(false)
        }
    }

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xl">
                            <Shield className="text-blue-600" />
                            Branch Details
                        </div>
                        {branch && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleStatusToggle}
                                    disabled={toggling}
                                    className={`text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium transition-colors ${
                                        branch.isActive 
                                            ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                                    }`}
                                >
                                    {toggling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                                    {branch.isActive ? 'Deactivate Branch' : 'Activate Branch'}
                                </button>
                            </div>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : branch ? (
                    <div className="space-y-8">
                        {/* Header Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatBox label="Students" value={branch._count.students} icon={<User className="w-4 h-4" />} />
                            <StatBox label="Staff" value={branch._count.staff} icon={<Shield className="w-4 h-4" />} />
                            <StatBox label="Seats" value={branch.seatCount} subValue={`${branch._count.seats} assigned`} icon={<HardDrive className="w-4 h-4" />} />
                            <StatBox label="Lockers" value={branch.totalLockers} subValue={`${branch._count.lockers} assigned`} icon={<Lock className="w-4 h-4" />} />
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Info className="w-4 h-4 text-gray-500" />
                                    General Information
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <InfoRow label="Name" value={branch.name} />
                                    <InfoRow label="Status" value={
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${branch.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {branch.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    } />
                                    <InfoRow label="Created" value={format(new Date(branch.createdAt), 'PPP')} />
                                    <InfoRow label="Manager" value={branch.managerName || 'N/A'} />
                                    <InfoRow label="Contact Phone" value={branch.contactPhone || 'N/A'} />
                                    <InfoRow label="Contact Email" value={branch.contactEmail || 'N/A'} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    Location
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <InfoRow label="Address" value={branch.address} />
                                    <InfoRow label="City" value={`${branch.city}, ${branch.state}`} />
                                    <InfoRow label="Pincode" value={branch.pincode} />
                                    {branch.mapsLink && (
                                        <a href={branch.mapsLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                            View on Maps <MapPin className="w-3 h-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Facilities & Rules */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wifi className="w-4 h-4 text-gray-500" />
                                    Facilities & Config
                                </h3>
                                <div className="space-y-3 text-sm">
                                    <InfoRow label="Lockers Available" value={branch.hasLockers ? 'Yes' : 'No'} />
                                    <InfoRow label="Separate Locker Area" value={branch.isLockerSeparate ? 'Yes' : 'No'} />
                                    <InfoRow label="Amenities" value={branch.amenities ? JSON.parse(branch.amenities).join(', ') : 'None listed'} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-500" />
                                    Operating Hours
                                </h3>
                                {branch.operatingHours ? (
                                    <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm space-y-1">
                                        {Object.entries(branch.operatingHours).map(([day, hours]: [string, any]) => (
                                            <div key={day} className="flex justify-between">
                                                <span className="capitalize text-gray-500">{day}</span>
                                                <span className="font-medium">{hours.isOpen ? `${hours.open} - ${hours.close}` : 'Closed'}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No operating hours configured</p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12 text-red-500">
                        Failed to load branch details
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

function StatBox({ label, value, subValue, icon }: { label: string, value: string | number, subValue?: string, icon: React.ReactNode }) {
    return (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-gray-500 mb-2 text-xs uppercase font-semibold">
                {icon}
                {label}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
        </div>
    )
}

function InfoRow({ label, value }: { label: string, value: React.ReactNode }) {
    return (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0 last:pb-0">
            <span className="text-gray-500 dark:text-gray-400">{label}</span>
            <span className="font-medium text-gray-900 dark:text-white text-right">{value}</span>
        </div>
    )
}
