'use client'

import { useState } from 'react'
import { Filter, Search, Calendar, User, Armchair, Lock, MoreHorizontal, Check, X, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { updateBookingStatus } from '@/actions/owner/bookings'
import { format } from 'date-fns'

interface BookingsClientProps {
  initialBookings: any[]
  branches: any[]
}

export function BookingsClient({ initialBookings, branches }: BookingsClientProps) {
  const [bookings, setBookings] = useState(initialBookings)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const filteredBookings = bookings.filter(booking => {
    const matchesBranch = selectedBranch === 'all' || booking.branchId === selectedBranch
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    const matchesSearch = 
      booking.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.student.phone?.includes(searchQuery)
    return matchesBranch && matchesStatus && matchesSearch
  })

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this booking as ${newStatus}?`)) return
    
    setIsLoading(true)
    const result = await updateBookingStatus(id, newStatus)
    if (result.success) {
      toast.success(`Booking marked as ${newStatus}`)
      setBookings(bookings.map(b => b.id === id ? { ...b, status: newStatus } : b))
    } else {
      toast.error(result.error)
    }
    setIsLoading(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'expired': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 whitespace-nowrap"
          >
            <option value="all">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 whitespace-nowrap"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 font-medium">Student</th>
                <th className="px-6 py-4 font-medium">Plan Details</th>
                <th className="px-6 py-4 font-medium">Duration</th>
                <th className="px-6 py-4 font-medium">Assignment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-medium">
                        {booking.student.image ? (
                          <img src={booking.student.image} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          booking.student.name[0]
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{booking.student.name}</div>
                        <div className="text-xs text-gray-500">{booking.student.phone || booking.student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{booking.plan.name}</div>
                    <div className="text-xs text-gray-500">₹{booking.plan.price} • {booking.branch.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-green-500" />
                        <span>{format(new Date(booking.startDate), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 text-red-500" />
                        <span>{format(new Date(booking.endDate), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {booking.seat ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                          <Armchair className="w-3 h-3" />
                          {booking.seat.number}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No Seat</span>
                      )}
                      
                      {booking.locker ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                          <Lock className="w-3 h-3" />
                          {booking.locker.number}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)} capitalize`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {booking.status === 'active' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'cancelled')}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel Booking"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'active')}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Activate Booking"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredBookings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No bookings found matching your filters.
          </div>
        )}
      </div>
    </div>
  )
}
