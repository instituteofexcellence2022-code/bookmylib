'use client'

import { useState, useMemo } from 'react'
import { 
  Filter, Search, Calendar, User, Armchair, Lock, MoreHorizontal, 
  Check, X, AlertCircle, Wallet, CreditCard, Banknote, Clock, 
  Activity, CheckCircle, LayoutGrid, List, Plus, ChevronLeft, FileText
} from 'lucide-react'
import { toast } from 'sonner'
import { updateBookingStatus, updateBookingDetails } from '@/actions/owner/bookings'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, startOfYear, endOfYear } from 'date-fns'
import { AcceptPaymentClient } from '@/components/owner/finance/AcceptPaymentClient'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { BookingDetailsModal } from '@/components/shared/bookings/BookingDetailsModal'
import { EditBookingModal } from '@/components/shared/bookings/EditBookingModal'

interface BookingsClientProps {
  initialBookings: any[]
  branches: any[]
}

export function BookingsClient({ initialBookings, branches }: BookingsClientProps) {
  const [view, setView] = useState<'list' | 'create'>('list')
  const [bookings, setBookings] = useState(initialBookings)
  const [selectedBranch, setSelectedBranch] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [createBookingStudentId, setCreateBookingStudentId] = useState<string | undefined>(undefined)
  
  // Date Range Filter State
  const [period, setPeriod] = useState<string>('all')
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    
    const now = new Date()
    let start: Date | undefined
    let end: Date | undefined

    switch (newPeriod) {
        case 'today':
            start = startOfDay(now)
            end = endOfDay(now)
            break
        case 'yesterday':
            start = startOfDay(subDays(now, 1))
            end = endOfDay(subDays(now, 1))
            break
        case 'this_week':
            start = startOfWeek(now, { weekStartsOn: 1 })
            end = endOfWeek(now, { weekStartsOn: 1 })
            break
        case 'last_week':
            const lastWeek = subDays(now, 7)
            start = startOfWeek(lastWeek, { weekStartsOn: 1 })
            end = endOfWeek(lastWeek, { weekStartsOn: 1 })
            break
        case 'this_month':
            start = startOfMonth(now)
            end = endOfMonth(now)
            break
        case 'last_month':
            const lastMonth = subMonths(now, 1)
            start = startOfMonth(lastMonth)
            end = endOfMonth(lastMonth)
            break
        case 'last_3_months':
            start = startOfMonth(subMonths(now, 3))
            end = endOfMonth(now)
            break
        case 'last_6_months':
            start = startOfMonth(subMonths(now, 6))
            end = endOfMonth(now)
            break
        case 'this_year':
            start = startOfYear(now)
            end = endOfYear(now)
            break
        case 'all':
            start = undefined
            end = undefined
            break
        case 'custom':
            // Don't change dates, let user pick
            return
    }

    if (newPeriod !== 'custom') {
        setDateRange({
            start: start ? start.toISOString() : '',
            end: end ? end.toISOString() : ''
        })
    }
  }

  // Derived State
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const matchesBranch = selectedBranch === 'all' || booking.branchId === selectedBranch
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
      const matchesSearch = 
        booking.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.student.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.student.phone?.includes(searchQuery)
      
      let matchesDate = true
      if (dateRange.start && dateRange.end) {
        const bookingDate = new Date(booking.startDate)
        const start = startOfDay(parseISO(dateRange.start))
        const end = endOfDay(parseISO(dateRange.end))
        matchesDate = isWithinInterval(bookingDate, { start, end })
      }

      return matchesBranch && matchesStatus && matchesSearch && matchesDate
    })
  }, [bookings, selectedBranch, statusFilter, searchQuery, dateRange])

  const stats = useMemo(() => {
    // Calculate stats based on current branch filter (but ignoring status filter to show overview)
    const relevantBookings = bookings.filter(b => 
      selectedBranch === 'all' || b.branchId === selectedBranch
    )

    const total = relevantBookings.length
    const active = relevantBookings.filter(b => b.status === 'active').length
    const pending = relevantBookings.filter(b => b.status === 'pending').length
    // Approximate revenue from active/completed bookings
    const revenue = relevantBookings
      .filter(b => ['active', 'completed'].includes(b.status))
      .reduce((acc, curr) => acc + (curr.plan?.price || 0), 0)

    return { total, active, pending, revenue }
  }, [bookings, selectedBranch])

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

  const getPaymentStatus = (booking: any) => {
    // This assumes booking.payments is populated. If not, it falls back to 'unpaid'
    const isPaid = booking.payments?.some((p: any) => p.status === 'success' || p.status === 'captured')
    return isPaid ? 'paid' : 'unpaid'
  }

  if (view === 'create') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setView('list')
                setCreateBookingStudentId(undefined)
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Booking & Accept Payment</h2>
          </div>
        </div>
        <AcceptPaymentClient initialStudentId={createBookingStudentId} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AnimatedButton
          onClick={() => {
            setCreateBookingStudentId(undefined)
            setView('create')
          }}
          className="bg-purple-600 text-white hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Booking / Accept Payment
        </AnimatedButton>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          label="Total Bookings" 
          value={stats.total} 
          icon={Wallet} 
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard 
          label="Active" 
          value={stats.active} 
          icon={Activity} 
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard 
          label="Pending" 
          value={stats.pending} 
          icon={Clock} 
          color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
        />
        <StatCard 
          label="Est. Revenue" 
          value={`₹${stats.revenue.toLocaleString()}`} 
          icon={Banknote} 
          color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col space-y-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          {/* Tabs for Status */}
          <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-x-auto max-w-full">
            {['all', 'active', 'pending', 'expired', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all capitalize whitespace-nowrap ${
                  statusFilter === status 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-end md:items-center">
            {/* Filter Group: Branch & Time */}
            <div className="flex flex-row gap-2 w-full md:w-auto">
              {/* Branch Filter */}
              <div className="flex-1 md:w-[200px] md:flex-none">
                <FilterSelect
                  value={selectedBranch}
                  onChange={setSelectedBranch}
                  options={[
                    { value: 'all', label: 'All Branches' },
                    ...branches.map(b => ({ value: b.id, label: b.name }))
                  ]}
                  placeholder="Select Branch"
                />
              </div>

              {/* Time Filter */}
              <div className="flex-1 md:w-[200px] md:flex-none">
                <FilterSelect
                  value={period}
                  onChange={handlePeriodChange}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'this_week', label: 'This Week' },
                    { value: 'last_week', label: 'Last Week' },
                    { value: 'this_month', label: 'This Month' },
                    { value: 'last_month', label: 'Last Month' },
                    { value: 'last_3_months', label: 'Last 3 Months' },
                    { value: 'last_6_months', label: 'Last 6 Months' },
                    { value: 'this_year', label: 'This Year' },
                    { value: 'custom', label: 'Custom Range' },
                  ]}
                  placeholder="Select Period"
                />
              </div>
            </div>

            {/* Custom Date Inputs */}
            {period === 'custom' && (
              <div className="flex items-center gap-2 w-full md:w-auto animate-in fade-in slide-in-from-left-4 duration-200">
                <input
                  type="date"
                  value={dateRange.start ? format(parseISO(dateRange.start), 'yyyy-MM-dd') : ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full md:w-auto px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Start Date"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dateRange.end ? format(parseISO(dateRange.end), 'yyyy-MM-dd') : ''}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full md:w-auto px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="End Date"
                />
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
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
                <th className="px-6 py-4 font-medium">Payment</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredBookings.map((booking) => {
                const paymentStatus = getPaymentStatus(booking)
                return (
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      paymentStatus === 'paid' 
                        ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                    }`}>
                      {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)} capitalize`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking)
                          setShowModal(true)
                        }}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
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
              )})}
            </tbody>
          </table>
        </div>
        {filteredBookings.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No bookings found matching your filters.
          </div>
        )}
      </div>
      
      {showModal && selectedBooking && (
        <BookingDetailsModal 
          booking={selectedBooking} 
          onClose={() => {
            setShowModal(false)
            setSelectedBooking(null)
          }}
          onRenew={() => {
            setCreateBookingStudentId(selectedBooking.student.id)
            setShowModal(false)
            setView('create')
          }}
          onEdit={() => {
            setShowModal(false)
            setShowEditModal(true)
          }}
        />
      )}

      {showEditModal && selectedBooking && (
        <EditBookingModal 
          booking={selectedBooking} 
          onClose={() => {
            setShowEditModal(false)
            setSelectedBooking(null)
          }}
          updateAction={updateBookingDetails}
        />
      )}
    </div>
  )
}

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
