'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, Search, 
  Building2, Clock, 
  CheckCircle, AlertCircle, Edit, User
} from 'lucide-react'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FormInput } from '@/components/ui/FormInput'
import { FormSelect } from '@/components/ui/FormSelect'
import { CompactCard } from '@/components/ui/AnimatedCard'
import Image from 'next/image'
import { getAllStaff, getGlobalStaffStats, getStaffManagementData } from '@/actions/staff'
import { getOwnerBranches } from '@/actions/branch'
import { toast } from 'react-hot-toast'

// Define types based on Prisma model
interface StaffWithBranch {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  status: string
  image: string | null
  joiningDate: Date | null
  createdAt: Date
  employmentType: string | null
  branch: {
    name: string
  }
  // ... other fields
}

export default function StaffPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  
  const [staffList, setStaffList] = useState<StaffWithBranch[]>([])
  const [branches, setBranches] = useState<{ label: string, value: string }[]>([])
  const [stats, setStats] = useState({
    totalStaff: 0,
    presentToday: 0,
    onLeave: 0,
    inactive: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getStaffManagementData()
        
        if (data) {
          setStaffList(data.staff as unknown as StaffWithBranch[])
          setStats(data.stats)
          setBranches(data.branches.map((b: { name: string, id: string }) => ({ label: b.name, value: b.name })))
        } else {
            toast.error('Failed to load staff data')
        }
        
      } catch (error) {
        console.error('Error loading staff data:', error)
        toast.error('Failed to load staff data')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         staff.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter ? staff.role === roleFilter : true
    const matchesStatus = statusFilter ? staff.status === statusFilter : true
    const matchesBranch = branchFilter ? staff.branch?.name === branchFilter : true
    
    return matchesSearch && matchesRole && matchesStatus && matchesBranch
  })

  const statsDisplay = [
    { label: 'Total Staff', value: stats.totalStaff, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', trend: 'Total employees', trendUp: true },
    { label: 'Present Today', value: stats.presentToday, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', trend: 'Checked in today', trendUp: true },
    { label: 'On Leave', value: stats.onLeave, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', trend: 'Currently on leave', trendUp: false },
    { label: 'Inactive', value: stats.inactive, icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-800', trend: 'Former/Suspended', trendUp: true }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your team members and their roles</p>
        </div>
        <AnimatedButton
          variant="purple"
          icon="add"
          onClick={() => router.push('/owner/staff/add')}
        >
          Add New Staff
        </AnimatedButton>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsDisplay.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</h3>
              <p className="text-xs mt-2 flex items-center gap-1 font-medium text-gray-500 dark:text-gray-400">
                {stat.trend}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <CompactCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <FormInput
              placeholder="Search by name or email..."
              icon={Search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2 flex-nowrap">
            <FormSelect
              placeholder="All Roles"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { label: 'All Roles', value: '' },
                { label: 'Branch Manager', value: 'manager' },
                { label: 'Librarian', value: 'librarian' },
                { label: 'Staff Member', value: 'staff' },
                { label: 'Cleaner', value: 'cleaner' },
                { label: 'Security', value: 'security' }
              ]}
              containerClassName="w-[140px]"
            />
            <FormSelect
              placeholder="All Branches"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={[
                { label: 'All Branches', value: '' },
                ...branches
              ]}
              containerClassName="w-[140px]"
            />
            <FormSelect
              placeholder="All Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: 'All Status', value: '' },
                { label: 'Active', value: 'active' },
                { label: 'On Leave', value: 'on_leave' },
                { label: 'Inactive', value: 'inactive' }
              ]}
              containerClassName="w-[140px]"
            />
          </div>
        </div>
      </CompactCard>

      {/* Staff List Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          No staff members found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStaff.map((staff) => (
            <div 
              key={staff.id} 
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-all hover:border-purple-200 dark:hover:border-purple-800"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {staff.image ? (
                        <Image 
                          src={staff.image} 
                          alt={staff.name}
                          width={48}
                          height={48}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <User className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">
                      {staff.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{staff.email}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                  staff.status === 'active' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : staff.status === 'on_leave'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {staff.status.replace('_', ' ')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Role</p>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium capitalize">
                    {staff.role}
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Branch</p>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">{staff.branch?.name || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Joined</p>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {staff.joiningDate 
                      ? new Date(staff.joiningDate).toLocaleDateString() 
                      : staff.createdAt 
                        ? new Date(staff.createdAt).toLocaleDateString()
                        : 'N/A'}
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Type</p>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium capitalize">
                    {staff.employmentType ? staff.employmentType.replace('_', ' ') : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <AnimatedButton
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => router.push(`/owner/staff/${staff.id}`)}
                >
                  View Profile
                </AnimatedButton>
                <AnimatedButton
                  variant="ghost"
                  size="sm"
                  className="px-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  onClick={() => router.push(`/owner/staff/${staff.id}/edit`)}
                >
                  <Edit className="w-4 h-4" />
                </AnimatedButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}