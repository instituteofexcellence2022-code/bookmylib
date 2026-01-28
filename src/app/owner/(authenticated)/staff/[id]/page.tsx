'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, Mail, Phone, MapPin, 
  Briefcase, ArrowLeft,
  Clock, Activity, Edit,
  CreditCard, BookOpen, Trash2, LogIn,
  Camera, Building2,
  FileText, Download, AlertCircle, Loader2
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { CompactCard } from '@/components/ui/AnimatedCard'
import Image from 'next/image'
import { getStaffDetails, getStaffAttendance, getStaffActivities, updateStaffImage, deleteStaff } from '@/actions/staff'
import { toast } from 'react-hot-toast'

interface StaffDocument {
  name: string
  size: number
  type?: string
  url?: string
}

interface StaffData {
  id: string
  name: string
  email: string
  phone: string | null
  dob: Date | null
  gender: string | null
  address: string | null
  role: string
  branchId: string
  joiningDate: Date | null
  salary: number | null
  employmentType: string | null
  username: string | null
  status: string
  image: string | null
  branch: {
    name: string
  }
  documents: StaffDocument[]
  isActive: boolean
  createdAt: Date
}

interface AttendanceRecord {
  id: string
  date: Date
  checkIn: Date
  checkOut: Date | null
  duration: number | null
  status: string
}

interface ActivityRecord {
  id: string
  type: string
  action: string
  details: string
  createdAt: Date
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'create': return <User className="w-5 h-5" />
    case 'payment': return <CreditCard className="w-5 h-5" />
    case 'update': return <BookOpen className="w-5 h-5" />
    case 'issue': return <BookOpen className="w-5 h-5" />
    case 'delete': return <Trash2 className="w-5 h-5" />
    case 'login': return <LogIn className="w-5 h-5" />
    default: return <Activity className="w-5 h-5" />
  }
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'create': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    case 'payment': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    case 'update': return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
    case 'issue': return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'delete': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    case 'login': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

export default function StaffDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params)
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'activity'>('profile')
  
  const [staffData, setStaffData] = useState<StaffData | null>(null)
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([])
  const [activityData, setActivityData] = useState<ActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const toastId = toast.loading('Updating profile picture...')
    try {
      const formData = new FormData()
      formData.append('image', file)
      
      const result = await updateStaffImage(id, formData)
      if (result.success && result.imageUrl) {
        setStaffData((prev) => prev ? ({ ...prev, image: result.imageUrl! }) : null)
        toast.success('Profile picture updated', { id: toastId })
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to upload image', { id: toastId })
      }
    } catch (error) {
      console.error(error)
      toast.error('An error occurred while uploading image', { id: toastId })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      setIsDeleting(true)
      const toastId = toast.loading('Deleting staff member...')
      try {
        const result = await deleteStaff(id)
        if (result.success) {
          toast.success('Staff member deleted successfully', { id: toastId })
          router.push('/owner/staff')
        } else {
          toast.error(result.error || 'Failed to delete staff', { id: toastId })
          setIsDeleting(false)
        }
      } catch (error) {
        toast.error('An error occurred', { id: toastId })
        setIsDeleting(false)
      }
    }
  }

  useEffect(() => {
    async function fetchData() {
      try {
        const [staff, attendance, activities] = await Promise.all([
          getStaffDetails(id),
          getStaffAttendance(id),
          getStaffActivities(id)
        ])
        
        if (!staff) {
          toast.error('Staff member not found')
          router.push('/owner/staff')
          return
        }

        setStaffData(staff as unknown as StaffData) // Type assertion due to Prisma types vs Interface mismatch
        setAttendanceData(attendance as unknown as AttendanceRecord[])
        setActivityData(activities as unknown as ActivityRecord[])
      } catch (err) {
        console.error(err)
        toast.error('Failed to load staff details')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!staffData) return null

  // Derived values
  const roleLabel = staffData.role ? staffData.role.charAt(0).toUpperCase() + staffData.role.slice(1).replace('_', ' ') : 'N/A'
  const employmentLabel = staffData.employmentType ? staffData.employmentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A'
  const documents = (staffData.documents as unknown as StaffDocument[]) || []

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <AnimatedButton
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </AnimatedButton>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Profile</h1>
              <AnimatedButton
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/owner/staff/${id}/edit`)}
                className="w-8 h-8 p-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Edit Profile"
              >
                <Edit className="w-4 h-4" />
              </AnimatedButton>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">View and manage staff details</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'profile'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <User className="w-4 h-4" />
          Profile
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'attendance'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'activity'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Activity Log
        </button>
      </div>

      <div className="mt-6">
        
        {/* Profile Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CompactCard className="p-6 text-center space-y-4">
              <div className="relative w-32 h-32 mx-auto group">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-50 dark:border-purple-900/20 shadow-sm relative flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                  {staffData.image ? (
                    <Image 
                      src={staffData.image} 
                      alt={staffData.name}
                      width={128}
                      height={128}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                  
                  {/* Overlay for upload */}
                  <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                      <Camera className="w-8 h-8 text-white" />
                    )}
                  </div>
                </div>
                <div className={`absolute bottom-2 right-2 w-5 h-5 rounded-full border-4 border-white dark:border-gray-800 z-20 ${
                  staffData.status === 'active' ? 'bg-green-500' : 
                  staffData.status === 'on_leave' ? 'bg-orange-500' : 'bg-gray-400'
                }`} />
              </div>
              
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{staffData.name}</h2>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">{roleLabel}</p>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                    staffData.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                    staffData.status === 'on_leave' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 
                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {staffData.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 space-y-3 text-left">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300 truncate">{staffData.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">{staffData.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300 truncate">{staffData.address || 'N/A'}</span>
                </div>
              </div>
            </CompactCard>

            <CompactCard className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date of Birth</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                      {staffData.dob ? new Date(staffData.dob).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gender</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1 capitalize">
                      {staffData.gender || 'N/A'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Residential Address</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{staffData.address || 'N/A'}</p>
                  </div>
                </div>
              </CompactCard>

              <CompactCard className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Work Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Branch</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{staffData.branch?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Joined Date</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1" suppressHydrationWarning>
                      {staffData.joiningDate ? new Date(staffData.joiningDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </CompactCard>

              <CompactCard className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Briefcase className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Employment Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Employment Type</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{employmentLabel}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Salary</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                      {staffData.salary ? `₹${staffData.salary}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </CompactCard>

              <CompactCard className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Documents</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.length > 0 ? (
                    documents.map((doc, index) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{doc.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(doc.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        {doc.url && (
                          <a 
                            href={doc.url} 
                            download 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-500 py-4">No documents uploaded</div>
                  )}
                </div>
              </CompactCard>

              <div className="border border-red-200 dark:border-red-900/50 rounded-xl p-6 bg-red-50 dark:bg-red-900/10">
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Danger Zone
                </h3>
                <p className="text-sm text-red-600 dark:text-red-300 mb-6">
                  Deleting this staff member will remove all their data and revoke their access to the system. This action cannot be undone.
                </p>
                <div className="flex justify-end">
                  <AnimatedButton 
                    variant="danger" 
                    size="sm" 
                    icon="delete"
                    onClick={handleDelete}
                    isLoading={isDeleting}
                  >
                    Delete Staff Member
                  </AnimatedButton>
                </div>
              </div>
          </div>
        )}

        {/* Attendance Tab Content */}
        {activeTab === 'attendance' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CompactCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance History</h3>
              </div>
              
              <div className="space-y-4">
                {attendanceData.length > 0 ? (
                  attendanceData.map((record, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          record.status === 'present' ? 'bg-green-100 text-green-600' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          <Clock className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {new Date(record.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Check In: {new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {record.checkOut && ` • Check Out: ${new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          record.status === 'present' ? 'bg-green-100 text-green-700' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {record.status}
                        </span>
                        {record.duration && (
                          <p className="text-xs text-gray-500 mt-1">
                            {Math.floor(record.duration / 60)}h {record.duration % 60}m
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No attendance records found
                  </div>
                )}
              </div>
            </CompactCard>
          </div>
        )}

        {/* Activity Tab Content */}
        {activeTab === 'activity' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <CompactCard>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              </div>
              
              <div className="relative border-l-2 border-gray-200 dark:border-gray-700 ml-3 space-y-8 pl-6">
                {activityData.length > 0 ? (
                  activityData.map((activity, index) => (
                    <div key={index} className="relative">
                      <div className={`absolute -left-[31px] top-0 p-1.5 rounded-full border-2 border-white dark:border-gray-800 ${getActivityColor(activity.type)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.action}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(activity.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {activity.details}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500 -ml-6">
                    No activity records found
                  </div>
                )}
              </div>
            </CompactCard>
          </div>
        )}
      </div>
    </div>
  )
}