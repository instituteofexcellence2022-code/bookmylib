import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { getBranchDetails, toggleBranchStatus, updateBranch } from '@/actions/admin/platform-branches'
import { Loader2, MapPin, Phone, Mail, User, Wifi, Clock, Lock, Shield, HardDrive, Info, Power, ExternalLink, Save, Edit2, X } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

interface BranchDetailsModalProps {
    branchId: string | null
    isOpen: boolean
    onClose: () => void
}

export function BranchDetailsModal({ branchId, isOpen, onClose }: BranchDetailsModalProps) {
    const [branch, setBranch] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [toggling, setToggling] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editForm, setEditForm] = useState<any>({})
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
            setEditForm({
                name: data.name || '',
                managerName: data.managerName || '',
                contactPhone: data.contactPhone || '',
                contactEmail: data.contactEmail || '',
                address: data.address || '',
                city: data.city || '',
                district: data.district || '',
                state: data.state || '',
                pincode: data.pincode || '',
                description: data.description || '',
                mapsLink: data.mapsLink || '',
                seatCount: data.seatCount || 0,
                area: data.area || '',
                latitude: data.latitude ?? '',
                longitude: data.longitude ?? '',
                amenities: data.amenities ? safeParseAmenities(data.amenities) : [],
                operatingHours: data.operatingHours || null,
                upiId: data.upiId || '',
                payeeName: data.payeeName || '',
                hasLockers: !!data.hasLockers,
                isLockerSeparate: !!data.isLockerSeparate,
                totalLockers: data.totalLockers || 0
            })
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

    const handleSave = async () => {
        if (!branch) return
        setSaving(true)
        try {
            const res = await updateBranch(branch.id, {
                name: editForm.name,
                managerName: editForm.managerName,
                contactPhone: editForm.contactPhone,
                contactEmail: editForm.contactEmail,
                address: editForm.address,
                city: editForm.city,
                district: editForm.district,
                state: editForm.state,
                pincode: editForm.pincode,
                description: editForm.description,
                mapsLink: editForm.mapsLink,
                seatCount: Number(editForm.seatCount) || 0,
                area: editForm.area,
                latitude: editForm.latitude ? Number(editForm.latitude) : null,
                longitude: editForm.longitude ? Number(editForm.longitude) : null,
                amenities: Array.isArray(editForm.amenities) ? editForm.amenities : parseAmenitiesInput(editForm.amenities),
                operatingHours: editForm.operatingHours || null,
                upiId: editForm.upiId,
                payeeName: editForm.payeeName,
                hasLockers: !!editForm.hasLockers,
                isLockerSeparate: !!editForm.isLockerSeparate,
                totalLockers: Number(editForm.totalLockers) || 0
            })
            if (res.success) {
                toast.success('Branch updated')
                setIsEditing(false)
                await fetchDetails()
                router.refresh()
            } else {
                toast.error(res.error || 'Failed to update branch')
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Shield className="text-blue-600" />
                        Branch Details
                    </DialogTitle>
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
                                {branch.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                                onClick={() => setIsEditing(v => !v)}
                                className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium bg-blue-50 text-blue-600 hover:bg-blue-100"
                            >
                                <Edit2 className="w-3 h-3" />
                                {isEditing ? 'Cancel Edit' : 'Edit'}
                            </button>
                            {isEditing && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5 font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    Save
                                </button>
                            )}
                        </div>
                    )}
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : branch ? (
                    <div className="space-y-8 overflow-y-auto p-6">
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
                                {!isEditing ? (
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
                                        <InfoRow label="UPI ID" value={branch.upiId || 'N/A'} />
                                        <InfoRow label="Payee Name" value={branch.payeeName || 'N/A'} />
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-sm">
                                        <InputRow label="Name" value={editForm.name} onChange={(v: string) => setEditForm({ ...editForm, name: v })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputRow label="Manager" value={editForm.managerName} onChange={(v: string) => setEditForm({ ...editForm, managerName: v })} />
                                            <InputRow label="Contact Phone" value={editForm.contactPhone} onChange={(v: string) => setEditForm({ ...editForm, contactPhone: v })} />
                                            <InputRow label="Contact Email" value={editForm.contactEmail} onChange={(v: string) => setEditForm({ ...editForm, contactEmail: v })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputRow label="UPI ID" value={editForm.upiId} onChange={(v: string) => setEditForm({ ...editForm, upiId: v })} />
                                            <InputRow label="Payee Name" value={editForm.payeeName} onChange={(v: string) => setEditForm({ ...editForm, payeeName: v })} />
                                        </div>
                                        <TextAreaRow label="Description" value={editForm.description} onChange={(v: string) => setEditForm({ ...editForm, description: v })} />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-gray-500" />
                                    Location
                                </h3>
                                {!isEditing ? (
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
                                ) : (
                                    <div className="space-y-3 text-sm">
                                        <InputRow label="Address" value={editForm.address} onChange={(v: string) => setEditForm({ ...editForm, address: v })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputRow label="City" value={editForm.city} onChange={(v: string) => setEditForm({ ...editForm, city: v })} />
                                            <InputRow label="District" value={editForm.district} onChange={(v: string) => setEditForm({ ...editForm, district: v })} />
                                            <InputRow label="State" value={editForm.state} onChange={(v: string) => setEditForm({ ...editForm, state: v })} />
                                            <InputRow label="Pincode" value={editForm.pincode} onChange={(v: string) => setEditForm({ ...editForm, pincode: v })} />
                                        </div>
                                        <InputRow label="Maps Link" value={editForm.mapsLink} onChange={(v: string) => setEditForm({ ...editForm, mapsLink: v })} />
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputRow label="Latitude" value={String(editForm.latitude ?? '')} onChange={(v: string) => setEditForm({ ...editForm, latitude: v })} />
                                            <InputRow label="Longitude" value={String(editForm.longitude ?? '')} onChange={(v: string) => setEditForm({ ...editForm, longitude: v })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Facilities & Rules */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wifi className="w-4 h-4 text-gray-500" />
                                    Facilities & Config
                                </h3>
                                {!isEditing ? (
                                    <div className="space-y-3 text-sm">
                                        <InfoRow label="Lockers Available" value={branch.hasLockers ? 'Yes' : 'No'} />
                                        <InfoRow label="Separate Locker Area" value={branch.isLockerSeparate ? 'Yes' : 'No'} />
                                        <InfoRow label="Total Lockers" value={branch.totalLockers} />
                                        <InfoRow label="Seat Count" value={branch.seatCount} />
                                        <InfoRow label="Amenities" value={branch.amenities ? safeParseAmenities(branch.amenities).join(', ') : 'None listed'} />
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={!!editForm.hasLockers} onChange={(e) => setEditForm({ ...editForm, hasLockers: e.target.checked })} />
                                            <span className="text-gray-700 dark:text-gray-300">Lockers Available</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={!!editForm.isLockerSeparate} onChange={(e) => setEditForm({ ...editForm, isLockerSeparate: e.target.checked })} />
                                            <span className="text-gray-700 dark:text-gray-300">Separate Locker Area</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InputRow label="Total Lockers" value={String(editForm.totalLockers)} onChange={(v: string) => setEditForm({ ...editForm, totalLockers: v })} />
                                            <InputRow label="Seat Count" value={String(editForm.seatCount)} onChange={(v: string) => setEditForm({ ...editForm, seatCount: v })} />
                                        </div>
                                        <TextAreaRow label="Amenities (comma separated)" value={Array.isArray(editForm.amenities) ? editForm.amenities.join(', ') : editForm.amenities || ''} onChange={(v: string) => setEditForm({ ...editForm, amenities: v })} />
                                    </div>
                                )}
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
                                {isEditing && (
                                    <TextAreaRow label="Operating Hours (JSON)" value={editForm.operatingHours ? JSON.stringify(editForm.operatingHours, null, 2) : ''} onChange={(v: string) => setEditForm({ ...editForm, operatingHours: parseJson(v) })} />
                                )}
                            </div>
                        </div>

                        {/* Relations Preview */}
                        <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Relations</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium">Recent Staff</span>
                                        <span className="text-xs text-gray-500">{branch._count.staff} total</span>
                                    </div>
                                    <div className="space-y-2">
                                        {(branch.staff || []).map((s: any) => (
                                            <div key={s.id} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{s.name}</span>
                                                <span className="text-xs text-gray-500">{s.role}</span>
                                            </div>
                                        ))}
                                        {(!branch.staff || branch.staff.length === 0) && (
                                            <div className="text-xs text-gray-500">No staff</div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium">Sample Seats</span>
                                        <span className="text-xs text-gray-500">{branch._count.seats} total</span>
                                    </div>
                                    <div className="space-y-2">
                                        {(branch.seats || []).map((seat: any) => (
                                            <div key={seat.id} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{seat.number}</span>
                                                <span className="text-xs text-gray-500">{seat.type}</span>
                                            </div>
                                        ))}
                                        {(!branch.seats || branch.seats.length === 0) && (
                                            <div className="text-xs text-gray-500">No seats</div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="font-medium">Sample Lockers</span>
                                        <span className="text-xs text-gray-500">{branch._count.lockers} total</span>
                                    </div>
                                    <div className="space-y-2">
                                        {(branch.lockers || []).map((locker: any) => (
                                            <div key={locker.id} className="flex items-center justify-between text-sm">
                                                <span className="font-medium">{locker.number}</span>
                                                <span className="text-xs text-gray-500">{locker.type || 'standard'}</span>
                                            </div>
                                        ))}
                                        {(!branch.lockers || branch.lockers.length === 0) && (
                                            <div className="text-xs text-gray-500">No lockers</div>
                                        )}
                                    </div>
                                </div>
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

function InputRow({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">{label}</label>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
        </div>
    )
}

function TextAreaRow({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 uppercase">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[90px]"
            />
        </div>
    )
}

function safeParseAmenities(amenities: string): string[] {
    try {
        const parsed = JSON.parse(amenities)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function parseAmenitiesInput(input: string): string[] {
    if (!input) return []
    return input.split(',').map(s => s.trim()).filter(Boolean)
}

function parseJson(input: string): any | null {
    try {
        const obj = JSON.parse(input || '{}')
        return obj
    } catch {
        return null
    }
}
