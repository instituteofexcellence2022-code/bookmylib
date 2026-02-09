'use client'

import { useState } from 'react'
import { Plus, Filter, Lock, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { createLocker, deleteLocker } from '@/actions/owner/lockers'

interface LockersClientProps {
  initialLockers: any[]
  branches: any[]
}

export function LockersClient({ initialLockers, branches }: LockersClientProps) {
  const [lockers, setLockers] = useState(initialLockers)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const filteredLockers = lockers.filter(locker => {
    const matchesBranch = selectedBranch === 'all' || locker.branchId === selectedBranch
    const matchesSearch = locker.number.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesBranch && matchesSearch
  })

  const groupedLockers = filteredLockers.reduce((acc: Record<string, any[]>, locker) => {
    const branchName = locker.branch.name
    if (!acc[branchName]) acc[branchName] = []
    acc[branchName].push(locker)
    return acc
  }, {})

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const data = {
      branchId: formData.get('branchId') as string,
      number: formData.get('number') as string
    }

    const result = await createLocker(data)
    if (result.success) {
      toast.success('Locker created successfully')
      setIsModalOpen(false)
      if (result.data) {
        setLockers([...lockers, { ...result.data, branch: branches.find(b => b.id === data.branchId), subscriptions: [] }])
      }
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this locker?')) return
    
    const result = await deleteLocker(id)
    if (result.success) {
      toast.success('Locker deleted')
      setLockers(lockers.filter(l => l.id !== id))
    } else {
      toast.error(result.error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex gap-2 items-center flex-1 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search locker number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Locker
        </button>
      </div>

      <div className="space-y-8">
        {Object.entries(groupedLockers).map(([branchName, branchLockers]) => (
          <div key={branchName} className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
              {branchName}
              <span className="text-sm font-normal text-gray-500 ml-2">({branchLockers.length} lockers)</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {branchLockers.map((locker: any) => {
                const isOccupied = locker.subscriptions && locker.subscriptions.length > 0
                const occupant = isOccupied ? locker.subscriptions[0].student : null

                return (
                  <div 
                    key={locker.id}
                    className={`relative group p-4 rounded-xl border transition-all hover:shadow-md ${
                      isOccupied 
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800' 
                        : 'bg-white border-gray-200 hover:border-purple-300 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Lock className={`w-8 h-8 ${isOccupied ? 'text-red-500' : 'text-blue-500'}`} />
                      <div className="text-center">
                        <div className="font-bold text-gray-900 dark:text-gray-100">{locker.number}</div>
                      </div>
                      
                      {isOccupied && occupant && (
                        <div className="text-xs text-center text-red-600 font-medium bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full w-full truncate">
                          {occupant.name}
                        </div>
                      )}
                      
                      {!isOccupied && (
                        <div className="text-xs text-center text-blue-600 font-medium bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full w-full">
                          Available
                        </div>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDelete(locker.id)}
                        className="p-2 bg-white text-red-600 rounded-lg hover:bg-red-50"
                        title="Delete Locker"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        
        {lockers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No lockers found. Create one to get started.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold mb-4">Add New Locker</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Branch</label>
                <select 
                  name="branchId" 
                  required
                  defaultValue={selectedBranch !== 'all' ? selectedBranch : ''}
                  className="w-full px-3 py-2 rounded-lg border bg-transparent"
                >
                  <option value="" disabled>Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Locker Number</label>
                <input 
                  name="number" 
                  required 
                  placeholder="e.g. L101"
                  className="w-full px-3 py-2 rounded-lg border bg-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Locker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
