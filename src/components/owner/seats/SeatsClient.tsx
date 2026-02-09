'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
  Plus, 
  Filter, 
  Armchair, 
  Trash2, 
  Edit, 
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
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { 
  createSeat, 
  deleteSeat, 
  updateSeat, 
  createBulkSeats,
  getSeatHistory,
  getEligibleStudents,
  assignSeat,
  unassignSeat
} from '@/actions/owner/seats'
import { useRouter } from 'next/navigation'

interface SeatsClientProps {
  initialSeats: any[]
  branches: any[]
}

export function SeatsClient({ initialSeats, branches }: SeatsClientProps) {
  const router = useRouter()
  const [seats, setSeats] = useState(initialSeats)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [selectedSeat, setSelectedSeat] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Derived State
  const filteredSeats = useMemo(() => {
    return seats.filter(seat => {
      const matchesBranch = selectedBranch === 'all' || seat.branchId === selectedBranch
      const matchesType = selectedType === 'all' || seat.type === selectedType
      
      const isOccupied = seat.subscriptions && seat.subscriptions.length > 0
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' && seat.isActive && !isOccupied) ||
        (selectedStatus === 'occupied' && isOccupied) ||
        (selectedStatus === 'maintenance' && !seat.isActive)

      const matchesSearch = 
        seat.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seat.section?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seat.subscriptions?.some((sub: any) => sub.student.name.toLowerCase().includes(searchQuery.toLowerCase()))
      
      return matchesBranch && matchesType && matchesStatus && matchesSearch
    }).sort((a, b) => {
      // Sort by seat number naturally (e.g. A-2 before A-10)
      return a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' })
    })
  }, [seats, selectedBranch, selectedType, selectedStatus, searchQuery])

  const stats = useMemo(() => {
    const total = filteredSeats.length
    const occupied = filteredSeats.filter(s => s.subscriptions && s.subscriptions.length > 0).length
    const available = total - occupied
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0
    
    return { total, occupied, available, occupancyRate }
  }, [filteredSeats])

  const groupedSeats = useMemo(() => {
    return filteredSeats.reduce((acc: Record<string, any[]>, seat) => {
      const branchName = seat.branch.name
      if (!acc[branchName]) acc[branchName] = []
      acc[branchName].push(seat)
      return acc
    }, {})
  }, [filteredSeats])

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

    const result = await createSeat(data)
    if (result.success) {
      toast.success('Seat created successfully')
      setIsCreateModalOpen(false)
      router.refresh()
      // Manually update local state if needed, but router.refresh handles data sync usually
      // For immediate feedback we can append to state
      if (result.data) {
        const branch = branches.find(b => b.id === data.branchId)
        setSeats(prev => [...prev, { ...result.data, branch, subscriptions: [] }])
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

    const result = await createBulkSeats(data)
    if (result.success) {
      toast.success(`Created ${result.count} seats successfully`)
      if (result.skipped && result.skipped.length > 0) {
        toast.info(`Skipped ${result.skipped.length} existing seats`)
      }
      setIsBulkModalOpen(false)
      router.refresh()
      // Ideally we should refetch seats here, but for now we'll rely on refresh
      // A full refetch would be better for bulk ops
      window.location.reload() 
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  const handleUpdate = async (id: string, data: any) => {
    const result = await updateSeat(id, data)
    if (result.success) {
      toast.success('Seat updated successfully')
      setSeats(prev => prev.map((s: any) => s.id === id ? { ...s, ...result.data } : s))
      setSelectedSeat((prev: any) => ({ ...prev, ...result.data }))
      router.refresh()
      return true
    } else {
      toast.error(result.error)
      return false
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this seat?')) return
    
    const result = await deleteSeat(id)
    if (result.success) {
      toast.success('Seat deleted')
      setSeats(prev => prev.filter(s => s.id !== id))
      setSelectedSeat(null)
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-2 md:space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          label="Total Seats" 
          value={stats.total} 
          icon={Armchair} 
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
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="col-span-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">Type: All</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="window">Window</option>
            <option value="cubicle">Cubicle</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="col-span-2 sm:col-span-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
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
            Add Seat
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8">
        {Object.entries(groupedSeats).map(([branchName, branchSeats]) => (
          <div key={branchName} className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{branchName}</h3>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs rounded-full">
                {branchSeats.length} seats
              </span>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
                {branchSeats.map((seat) => (
                  <SeatGridItem 
                    key={seat.id} 
                    seat={seat} 
                    onClick={() => setSelectedSeat(seat)} 
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
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Occupant</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {branchSeats.map((seat) => (
                      <SeatListItem 
                        key={seat.id} 
                        seat={seat} 
                        onClick={() => setSelectedSeat(seat)} 
                      />
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredSeats.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Armchair className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No seats found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateSeatModal 
          branches={branches} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSubmit={handleCreate}
          isLoading={isLoading}
        />
      )}

      {isBulkModalOpen && (
        <BulkCreateModal 
          branches={branches} 
          onClose={() => setIsBulkModalOpen(false)} 
          onSubmit={handleBulkCreate}
          isLoading={isLoading}
        />
      )}

      {selectedSeat && (
        <SeatDetailModal
          seat={selectedSeat}
          onClose={() => setSelectedSeat(null)}
          onDelete={() => handleDelete(selectedSeat.id)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}

// Sub-components

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  )
}

function SeatGridItem({ seat, onClick }: any) {
  const isOccupied = seat.subscriptions && seat.subscriptions.length > 0
  const isMaintenance = !seat.isActive

  return (
    <button
      onClick={onClick}
      className={`relative group p-3 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2
        ${isMaintenance 
          ? 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-75' 
          : isOccupied 
            ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30 hover:border-red-300' 
            : 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30 hover:border-green-300'
        }
      `}
    >
      <div className={`p-2 rounded-full ${
        isMaintenance ? 'bg-gray-200 text-gray-500' :
        isOccupied ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
      }`}>
        {isMaintenance ? <Ban className="w-5 h-5" /> : <Armchair className="w-5 h-5" />}
      </div>
      <div className="text-center">
        <span className="block font-bold text-gray-900 dark:text-gray-100">{seat.number}</span>
        {seat.section && <span className="text-[10px] text-gray-500 uppercase tracking-wide">{seat.section}</span>}
      </div>
      
      {isOccupied && !isMaintenance && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800" />
      )}
      {seat.type !== 'standard' && (
        <div className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200">
          {seat.type[0].toUpperCase()}
        </div>
      )}
    </button>
  )
}

function SeatListItem({ seat, onClick }: any) {
  const isOccupied = seat.subscriptions && seat.subscriptions.length > 0
  const isMaintenance = !seat.isActive
  const occupant = isOccupied ? seat.subscriptions[0].student : null

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{seat.number}</td>
      <td className="px-4 py-3 text-gray-500">{seat.section || '-'}</td>
      <td className="px-4 py-3">
        <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-full">{seat.type}</span>
      </td>
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

function CreateSeatModal({ branches, onClose, onSubmit, isLoading }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add New Seat</h3>
          <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select name="branchId" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Seat Number</label>
              <input name="number" required placeholder="e.g. S-01" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Section (Optional)</label>
              <input name="section" placeholder="e.g. Quiet Zone" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select name="type" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="window">Window Seat</option>
            </select>
          </div>
          
          <button 
            disabled={isLoading}
            className="w-full mt-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Seat'}
          </button>
        </form>
      </div>
    </div>
  )
}

function BulkCreateModal({ branches, onClose, onSubmit, isLoading }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Bulk Add Seats</h3>
          <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Branch</label>
            <select name="branchId" required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">Prefix</label>
              <input name="prefix" defaultValue="S-" placeholder="e.g. S-" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">Start No.</label>
              <input name="start" type="number" required min="1" placeholder="1" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">End No.</label>
              <input name="end" type="number" required min="1" placeholder="10" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
            </div>
          </div>
          <p className="text-xs text-gray-500">Will create seats like: S-01, S-02... S-10</p>

          <div>
            <label className="block text-sm font-medium mb-1">Section (Optional)</label>
            <input name="section" placeholder="e.g. Main Hall" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select name="type" className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          
          <button 
            disabled={isLoading}
            className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Generate Seats'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SeatDetailModal({ seat, onClose, onDelete, onUpdate }: any) {
  const [activeTab, setActiveTab] = useState('details')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Data States
  const [history, setHistory] = useState<any[]>([])
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  const isOccupied = seat.subscriptions && seat.subscriptions.length > 0
  const occupant = isOccupied ? seat.subscriptions[0].student : null
  const sub = isOccupied ? seat.subscriptions[0] : null
  const isMaintenance = !seat.isActive

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true)
      if (activeTab === 'history') {
        const res = await getSeatHistory(seat.id)
        if (res.success && res.data) setHistory(res.data)
      } else if (activeTab === 'assign' && !isOccupied && !isMaintenance) {
        const res = await getEligibleStudents(seat.branchId)
        if (res.success && res.data) setEligibleStudents(res.data)
      }
      setIsLoadingData(false)
    }
    fetchData()
  }, [activeTab, seat.id, seat.branchId, isOccupied, isMaintenance])

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    const data = {
      number: formData.get('number') as string,
      section: formData.get('section') as string,
      type: formData.get('type') as string,
      isActive: formData.get('isActive') === 'true'
    }
    
    const success = await onUpdate(seat.id, data)
    if (success) {
      setIsEditing(false)
    }
    setIsLoading(false)
  }

  const handleAssign = async (subscriptionId: string) => {
    if(!confirm('Assign this seat to student?')) return
    setIsLoading(true)
    const res = await assignSeat(seat.id, subscriptionId)
    if (res.success) {
        toast.success('Seat assigned successfully')
        // Optimistic update or refresh
        window.location.reload() // Simplest for now to refresh all data
    } else {
        toast.error(res.error)
    }
    setIsLoading(false)
  }

  const handleUnassign = async () => {
      if(!confirm('Unassign this seat? The student will still have an active subscription.')) return
      setIsLoading(true)
      const res = await unassignSeat(sub.id)
      if (res.success) {
          toast.success('Seat unassigned')
          window.location.reload()
      } else {
          toast.error(res.error)
      }
      setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
                {isEditing ? 'Edit Seat' : `Seat ${seat.number}`}
                {!isEditing && isMaintenance && <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-full border border-gray-300">Maintenance</span>}
            </h3>
            {!isEditing && <p className="text-gray-500">{seat.branch.name} • {seat.section || 'General'}</p>}
          </div>
          <button onClick={onClose}><XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Tabs */}
        {!isEditing && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <button onClick={() => setActiveTab('details')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Details</button>
                <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'history' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>History</button>
                {!isOccupied && !isMaintenance && (
                    <button onClick={() => setActiveTab('assign')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assign' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Assign Student</button>
                )}
            </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Seat Number</label>
                <input name="number" defaultValue={seat.number} required className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <input name="section" defaultValue={seat.section} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select name="type" defaultValue={seat.type} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="window">Window Seat</option>
                <option value="cubicle">Cubicle</option>
              </select>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select name="isActive" defaultValue={seat.isActive.toString()} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent">
                    <option value="true">Active (Available for Booking)</option>
                    <option value="false">Maintenance (Unavailable)</option>
                </select>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                disabled={isLoading}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : activeTab === 'details' ? (
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border ${isMaintenance ? 'bg-gray-50 border-gray-200' : isOccupied ? 'bg-red-50 border-red-200 dark:bg-red-900/10' : 'bg-green-50 border-green-200 dark:bg-green-900/10'}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${isMaintenance ? 'bg-gray-200 text-gray-500' : isOccupied ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {isMaintenance ? <Ban className="w-5 h-5" /> : isOccupied ? <Users className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <span className={`font-semibold ${isMaintenance ? 'text-gray-700' : isOccupied ? 'text-red-700' : 'text-green-700'}`}>
                  {isMaintenance ? 'Under Maintenance' : isOccupied ? 'Currently Occupied' : 'Available for Booking'}
                </span>
              </div>
              
              {isOccupied && occupant && (
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                      {occupant.image ? <img src={occupant.image} alt="" /> : <span className="flex items-center justify-center h-full font-bold text-gray-500">{occupant.name[0]}</span>}
                    </div>
                    <div>
                      <p className="font-medium">{occupant.name}</p>
                      <p className="text-xs text-gray-500">
                        Ends: {new Date(sub.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                        onClick={handleUnassign}
                        className="ml-auto text-xs text-red-600 hover:text-red-800 underline"
                    >
                        Unassign
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Details
              </button>
              <button 
                onClick={onDelete}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Seat
              </button>
            </div>
          </div>
        ) : activeTab === 'history' ? (
            <div className="space-y-3">
                {isLoadingData ? (
                    <p className="text-center text-gray-500 py-4">Loading history...</p>
                ) : history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>No booking history found</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((h: any) => (
                            <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden text-xs">
                                        {h.student.image ? <img src={h.student.image} alt="" /> : <span className="flex items-center justify-center h-full font-bold text-gray-500">{h.student.name[0]}</span>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{h.student.name}</p>
                                        <p className="text-xs text-gray-500">{h.plan.name}</p>
                                    </div>
                                </div>
                                <div className="text-right text-xs text-gray-500">
                                    <p>{new Date(h.startDate).toLocaleDateString()} -</p>
                                    <p>{new Date(h.endDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        ) : (
            <div className="space-y-3">
                <div className="mb-4">
                    <h4 className="font-medium mb-1">Select Student</h4>
                    <p className="text-xs text-gray-500">Only showing students with active subscriptions who don't have a seat assigned.</p>
                </div>
                
                {isLoadingData ? (
                    <p className="text-center text-gray-500 py-4">Loading students...</p>
                ) : eligibleStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>No eligible students found</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {eligibleStudents.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden text-xs">
                                        {s.student.image ? <img src={s.student.image} alt="" /> : <span className="flex items-center justify-center h-full font-bold text-gray-500">{s.student.name[0]}</span>}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{s.student.name}</p>
                                        <p className="text-xs text-gray-500">{s.plan.name}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleAssign(s.id)}
                                    disabled={isLoading}
                                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-md transition-colors"
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
  )
}
