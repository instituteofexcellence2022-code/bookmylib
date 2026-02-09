'use client'

import { useState, useMemo } from 'react'
import { 
  Plus, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  XCircle,
  Users,
  LayoutGrid,
  List as ListIcon,
  Layers,
  History,
  UserPlus,
  Power,
  Ban,
  Calendar,
  Lock,
  Trash2,
  Edit
} from 'lucide-react'

import { toast } from 'sonner'
import { 
  createLocker, 
  deleteLocker, 
  updateLocker, 
  createBulkLockers,
  getLockerHistory,
  getEligibleStudentsForLocker,
  assignLocker,
  unassignLocker
} from '@/actions/owner/lockers'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

interface LockersClientProps {
  initialLockers: any[]
  branches: any[]
}

export function LockersClient({ initialLockers, branches }: LockersClientProps) {
  const router = useRouter()
  const [lockers, setLockers] = useState(initialLockers)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [selectedLocker, setSelectedLocker] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Derived State
  const filteredLockers = useMemo(() => {
    return lockers.filter(locker => {
      const matchesBranch = selectedBranch === 'all' || locker.branchId === selectedBranch
      
      const isOccupied = locker.subscriptions && locker.subscriptions.length > 0
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' && locker.isActive && !isOccupied) ||
        (selectedStatus === 'occupied' && isOccupied) ||
        (selectedStatus === 'maintenance' && !locker.isActive)

      const matchesSearch = 
        locker.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        locker.subscriptions?.some((sub: any) => sub.student.name.toLowerCase().includes(searchQuery.toLowerCase()))
      
      return matchesBranch && matchesStatus && matchesSearch
    }).sort((a, b) => {
      return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [lockers, selectedBranch, selectedStatus, searchQuery])

  const stats = useMemo(() => {
    const total = filteredLockers.length
    const occupied = filteredLockers.filter(l => l.subscriptions && l.subscriptions.length > 0).length
    const available = total - occupied
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0
    
    return { total, occupied, available, occupancyRate }
  }, [filteredLockers])

  const groupedLockers = useMemo(() => {
    return filteredLockers.reduce((acc: Record<string, any[]>, locker) => {
      const branchName = locker.branch.name
      if (!acc[branchName]) acc[branchName] = []
      acc[branchName].push(locker)
      return acc
    }, {})
  }, [filteredLockers])

  // Handlers
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const data = {
      branchId: formData.get('branchId') as string,
      number: formData.get('number') as string,
      section: formData.get('section') as string,
      type: formData.get('type') as string
    }

    const result = await createLocker(data)
    if (result.success) {
      toast.success('Locker created successfully')
      setIsCreateModalOpen(false)
      router.refresh()
      if (result.data) {
        const branch = branches.find(b => b.id === data.branchId)
        setLockers(prev => [...prev, { ...result.data, branch, subscriptions: [] }])
      }
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  const handleBulkCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const data = {
      branchId: formData.get('branchId') as string,
      prefix: formData.get('prefix') as string,
      start: parseInt(formData.get('start') as string),
      end: parseInt(formData.get('end') as string),
      section: formData.get('section') as string,
      type: formData.get('type') as string
    }

    const result = await createBulkLockers(data)
    if (result.success) {
      toast.success(`Created ${result.count} lockers successfully`)
      if (result.skipped && result.skipped.length > 0) {
        toast.info(`Skipped ${result.skipped.length} existing lockers`)
      }
      setIsBulkModalOpen(false)
      router.refresh()
      window.location.reload()
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  const handleUpdate = async (id: string, data: any) => {
    const result = await updateLocker(id, data)
    if (result.success) {
      toast.success('Locker updated successfully')
      setLockers(prev => prev.map((l: any) => l.id === id ? { ...l, ...result.data } : l))
      setSelectedLocker((prev: any) => ({ ...prev, ...result.data }))
      router.refresh()
      return true
    } else {
      toast.error(result.error)
      return false
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this locker?')) return
    
    const result = await deleteLocker(id)
    if (result.success) {
      toast.success('Locker deleted')
      setLockers(prev => prev.filter(l => l.id !== id))
      setSelectedLocker(null)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-2 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <StatCard 
          label="Total Lockers" 
          value={stats.total} 
          icon={Lock} 
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard 
          label="Occupied" 
          value={stats.occupied} 
          icon={Users} 
          color="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        />
        <StatCard 
          label="Available" 
          value={stats.available} 
          icon={CheckCircle2} 
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard 
          label="Occupancy" 
          value={`${stats.occupancyRate}%`} 
          icon={Layers} 
          color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 md:gap-4 justify-between items-start lg:items-center bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full lg:w-auto">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="col-span-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Branch: All</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="col-span-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Status: All</option>
            <option value="active">Available</option>
            <option value="occupied">Occupied</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-500'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Layers className="w-4 h-4" />
            Bulk Add
          </button>
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Locker
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-4 md:space-y-8">
        {Object.entries(groupedLockers).map(([branchName, branchLockers]) => (
          <div key={branchName} className="space-y-3 md:space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{branchName}</h3>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs rounded-full">
                {branchLockers.length} lockers
              </span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4">
                {branchLockers.map((locker) => (
                  <LockerGridItem 
                    key={locker.id} 
                    locker={locker} 
                    onClick={() => setSelectedLocker(locker)} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-medium">
                      <tr>
                        <th className="px-4 py-3">Number</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Occupant</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {branchLockers.map((locker) => (
                        <LockerListItem 
                          key={locker.id} 
                          locker={locker} 
                          onClick={() => setSelectedLocker(locker)} 
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredLockers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Lock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No lockers found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateLockerModal 
          branches={branches} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSubmit={handleCreate}
          isLoading={isLoading}
        />
      )}

      {isBulkModalOpen && (
        <BulkCreateLockerModal 
          branches={branches} 
          onClose={() => setIsBulkModalOpen(false)} 
          onSubmit={handleBulkCreate}
          isLoading={isLoading}
        />
      )}

      {selectedLocker && (
        <LockerDetailModal
          locker={selectedLocker}
          onClose={() => setSelectedLocker(null)}
          onDelete={() => handleDelete(selectedLocker.id)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}

// Sub-components

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-3 md:gap-4">
      <div className={`p-2 md:p-3 rounded-lg ${color}`}>
        <Icon className="w-4 h-4 md:w-5 md:h-5" />
      </div>
      <div>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  )
}

import { differenceInDays } from 'date-fns'

function LockerGridItem({ locker, onClick }: any) {
  const activeSubscription = locker.subscriptions && locker.subscriptions.length > 0 ? locker.subscriptions[0] : null
  const isOccupied = !!activeSubscription
  const isMaintenance = !locker.isActive
  
  const daysRemaining = activeSubscription 
    ? differenceInDays(new Date(activeSubscription.endDate), new Date()) 
    : 0

  return (
    <button
      onClick={onClick}
      className={`relative group w-full p-2 md:p-2.5 rounded-lg border transition-all duration-200 flex flex-col gap-2 text-left
        ${isMaintenance 
          ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 opacity-75' 
          : isOccupied 
            ? 'bg-white border-red-200 shadow-sm dark:bg-gray-800 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-800' 
            : 'bg-white border-green-200 shadow-sm dark:bg-gray-800 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-800'
        }
      `}
    >
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
            isMaintenance ? 'bg-gray-200 text-gray-500' :
            isOccupied ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
          }`}>
            <Lock className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-gray-900 dark:text-gray-100 truncate leading-none">
            {locker.number}
          </span>
        </div>
        
        <div className={`flex items-center justify-center w-5 h-5 rounded-full ${
          isMaintenance ? 'bg-gray-100 text-gray-400' :
          isOccupied ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
        }`}>
          {isMaintenance ? <Ban className="w-2.5 h-2.5" /> : 
           isOccupied ? <Lock className="w-2.5 h-2.5" /> : 
           <CheckCircle2 className="w-2.5 h-2.5" />}
        </div>
      </div>

      <div className="space-y-0.5">
        {isOccupied ? (
          <>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-3.5 h-3.5 rounded-full bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {activeSubscription.student.image ? (
                  <img src={activeSubscription.student.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[8px] font-medium">{activeSubscription.student.name[0]}</span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {activeSubscription.student.name}
              </p>
            </div>
            <p className={`text-[10px] ${daysRemaining <= 3 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
              {daysRemaining} days left
            </p>
          </>
        ) : isMaintenance ? (
          <>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Maintenance</p>
            <p className="text-[10px] text-gray-400">Unavailable</p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">Available</p>
            <p className="text-[10px] text-gray-400 truncate">
              {locker.section ? `Sec ${locker.section}` : ''}
              {locker.section && locker.type ? ' • ' : ''}
              {locker.type || (locker.section ? '' : 'Standard')}
            </p>
          </>
        )}
      </div>
    </button>
  )
}

function LockerListItem({ locker, onClick }: any) {
  const isOccupied = locker.subscriptions && locker.subscriptions.length > 0
  const isMaintenance = !locker.isActive
  const occupant = isOccupied ? locker.subscriptions[0].student : null

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{locker.number}</td>
      <td className="px-4 py-3">
        {isMaintenance ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Maintenance
          </span>
        ) : isOccupied ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Occupied
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Available
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        {occupant ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden">
              {occupant.image ? <img src={occupant.image} alt="" /> : occupant.name[0]}
            </div>
            <span className="text-sm">{occupant.name}</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>
      </td>
    </tr>
  )
}

function CreateLockerModal({ branches, onClose, onSubmit, isLoading }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add New Locker</h3>
          <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select name="branchId" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Locker Number</label>
                <input name="number" required defaultValue="L-" placeholder="e.g. L-01" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
              </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Section (Optional)</label>
              <input name="section" placeholder="e.g. A" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type (Optional)</label>
              <select name="type" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                <option value="">Standard</option>
                <option value="large">Large</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Creating...' : 'Create Locker'}
          </button>
        </form>
      </div>
    </div>
  )
}

function BulkCreateLockerModal({ branches, onClose, onSubmit, isLoading }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add Multiple Lockers</h3>
          <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select name="branchId" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Prefix</label>
            <input name="prefix" defaultValue="L-" placeholder="e.g. L-" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            <p className="text-xs text-gray-500 mt-1">Will create lockers like: L-01, L-02... L-10</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Number</label>
              <input name="start" type="number" required min="1" placeholder="1" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Number</label>
              <input name="end" type="number" required min="1" placeholder="10" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Section (Optional)</label>
              <input name="section" placeholder="e.g. A" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type (Optional)</label>
              <select name="type" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                <option value="">Standard</option>
                <option value="large">Large</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 mt-2"
          >
            {isLoading ? 'Creating...' : 'Create Lockers'}
          </button>
        </form>
      </div>
    </div>
  )
}

function LockerDetailModal({ locker, onClose, onDelete, onUpdate }: any) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'assign'>('details')
  const [history, setHistory] = useState<any[]>([])
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  const [editNumber, setEditNumber] = useState(locker.number)
  const [editSection, setEditSection] = useState(locker.section || '')
  const [editType, setEditType] = useState(locker.type || '')

  const router = useRouter()

  const isOccupied = locker.subscriptions && locker.subscriptions.length > 0
  const isMaintenance = !locker.isActive
  const occupant = isOccupied ? locker.subscriptions[0].student : null
  const currentSub = isOccupied ? locker.subscriptions[0] : null

  useMemo(() => {
    const fetchData = async () => {
      setIsLoadingData(true)
      if (activeTab === 'history') {
        const res = await getLockerHistory(locker.id)
        if (res.success && res.data) setHistory(res.data)
      } else if (activeTab === 'assign' && !isOccupied && !isMaintenance) {
        const res = await getEligibleStudentsForLocker(locker.branchId)
        if (res.success && res.data) setEligibleStudents(res.data)
      }
      setIsLoadingData(false)
    }
    fetchData()
  }, [activeTab, locker.id, locker.branchId, isOccupied, isMaintenance])

  const handleSaveEdit = async () => {
    const success = await onUpdate(locker.id, { 
      number: editNumber,
      section: editSection,
      type: editType
    })
    if (success) setIsEditing(false)
  }

  const handleToggleMaintenance = async () => {
    await onUpdate(locker.id, { isActive: !locker.isActive })
  }

  const handleAssign = async (subscriptionId: string) => {
    const res = await assignLocker(locker.id, subscriptionId)
    if (res.success) {
      toast.success('Locker assigned successfully')
      window.location.reload() // Full reload to refresh server data properly
    } else {
      toast.error(res.error)
    }
  }

  const handleUnassign = async () => {
    if (!currentSub) return
    if (!confirm('Are you sure you want to unassign this locker?')) return

    const res = await unassignLocker(currentSub.id)
    if (res.success) {
      toast.success('Locker unassigned')
      window.location.reload()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${isMaintenance ? 'bg-gray-200' : isOccupied ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
              {isMaintenance ? <Ban className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input 
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="px-2 py-1 border rounded text-lg font-bold w-32"
                      placeholder="Number"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      value={editSection}
                      onChange={(e) => setEditSection(e.target.value)}
                      className="px-2 py-1 border rounded text-sm w-24"
                      placeholder="Section"
                    />
                    <select 
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      className="px-2 py-1 border rounded text-sm w-32"
                    >
                      <option value="">Standard</option>
                      <option value="large">Large</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleSaveEdit} className="text-xs bg-green-500 text-white px-2 py-1 rounded">Save</button>
                    <button onClick={() => setIsEditing(false)} className="text-xs bg-gray-300 px-2 py-1 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    {locker.number}
                    <button onClick={() => setIsEditing(true)} className="text-gray-400 hover:text-gray-600"><Edit className="w-4 h-4" /></button>
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>{locker.branch.name}</span>
                    {(locker.section || locker.type) && (
                      <>
                        <span>•</span>
                        {locker.section && <span>Sec {locker.section}</span>}
                        {locker.type && <span className="capitalize">{locker.type}</span>}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Details
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            History
          </button>
          {!isOccupied && !isMaintenance && (
            <button 
              onClick={() => setActiveTab('assign')}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assign' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Assign
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Status</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isMaintenance ? 'bg-gray-500' : isOccupied ? 'bg-red-500' : 'bg-green-500'}`} />
                    <span className="font-medium">
                      {isMaintenance ? 'Maintenance' : isOccupied ? 'Occupied' : 'Available'}
                    </span>
                  </div>
                </div>
                {occupant && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Occupant</span>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-xs text-purple-600 font-bold">
                        {occupant.name[0]}
                      </div>
                      <span className="font-medium truncate">{occupant.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {isOccupied && currentSub && (
                <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-900/20">
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">Current Subscription</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plan</span>
                      <span className="font-medium">{currentSub.plan?.name || 'Unknown Plan'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Valid Until</span>
                      <span className="font-medium">{format(new Date(currentSub.endDate), 'PPP')}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleUnassign}
                    className="w-full mt-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    Unassign Locker
                  </button>
                </div>
              )}

              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-3">
                <button 
                  onClick={handleToggleMaintenance}
                  className="w-full py-2.5 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium"
                >
                  <Power className="w-4 h-4" />
                  {isMaintenance ? 'Enable Locker' : 'Set Maintenance Mode'}
                </button>
                
                <button 
                  onClick={onDelete}
                  className="w-full py-2.5 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Locker
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {isLoadingData ? (
                <div className="text-center py-8 text-gray-500">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-gray-500 flex flex-col items-center">
                  <History className="w-10 h-10 mb-2 opacity-20" />
                  No history found
                </div>
              ) : (
                history.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">
                        {record.student.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{record.student.name}</p>
                        <p className="text-xs text-gray-500">{record.plan?.name}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <p>{format(new Date(record.startDate), 'MMM d')} - {format(new Date(record.endDate), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'assign' && (
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">
                Showing active students in this branch who don't have a locker assigned.
              </div>
              
              {isLoadingData ? (
                <div className="text-center py-8 text-gray-500">Loading students...</div>
              ) : eligibleStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No eligible students found</div>
              ) : (
                <div className="space-y-2">
                  {eligibleStudents.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between p-3 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                          {sub.student.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{sub.student.name}</p>
                          <p className="text-xs text-gray-500">{sub.plan?.name}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAssign(sub.id)}
                        className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}