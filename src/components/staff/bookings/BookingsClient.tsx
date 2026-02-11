'use client'

import { useState, useMemo } from 'react'
import { 
  Search, Calendar, Plus, ChevronLeft
} from 'lucide-react'
import { toast } from 'sonner'
import { updateBookingStatus, updateBookingDetails } from '@/actions/staff/bookings'
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, startOfWeek, endOfWeek, subDays, subWeeks, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import { StaffAcceptPaymentClient } from '@/components/staff/finance/StaffAcceptPaymentClient'
import { AnimatedButton } from '@/components/ui/AnimatedButton'
import { BookingDetailsModal } from '@/components/shared/bookings/BookingDetailsModal'
import { EditBookingModal } from '@/components/shared/bookings/EditBookingModal'
import { BookingStats } from '@/components/shared/bookings/BookingStats'
import { BookingListTable } from '@/components/shared/bookings/BookingListTable'
import { FilterSelect } from '@/components/ui/FilterSelect'
import { useRouter } from 'next/navigation'

interface BookingsClientProps {
  initialBookings: any[]
}

export function BookingsClient({ initialBookings }: BookingsClientProps) {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'create'>('list')
  const [bookings, setBookings] = useState(initialBookings)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [createBookingStudentId, setCreateBookingStudentId] = useState<string | undefined>(undefined)
  
  // Date Range Filter State
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
  const [period, setPeriod] = useState('all')

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
            start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
            end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 })
            break
        case 'this_month':
            start = startOfMonth(now)
            end = endOfMonth(now)
            break
        case 'last_month':
            start = startOfMonth(subMonths(now, 1))
            end = endOfMonth(subMonths(now, 1))
            break
        case 'last_3_months':
            start = startOfMonth(subMonths(now, 3))
            end = endOfDay(now)
            break
        case 'last_6_months':
            start = startOfMonth(subMonths(now, 6))
            end = endOfDay(now)
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
            // Do not reset dateRange if it's already set
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

      return matchesStatus && matchesSearch && matchesDate
    })
  }, [bookings, statusFilter, searchQuery, dateRange])

  const stats = useMemo(() => {
    const total = bookings.length
    const active = bookings.filter(b => b.status === 'active').length
    const pending = bookings.filter(b => b.status === 'pending').length
    // Approximate revenue from active/completed bookings
    const revenue = bookings
      .filter(b => ['active', 'completed'].includes(b.status))
      .reduce((acc, curr) => acc + (curr.plan?.price || 0), 0)

    return { total, active, pending, revenue }
  }, [bookings])

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
        <StaffAcceptPaymentClient initialStudentId={createBookingStudentId} />
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
      <BookingStats stats={stats} />

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

          <div className="flex gap-2 w-full md:w-auto items-center flex-wrap">
            <FilterSelect 
              icon={Calendar}
              value={period}
              onChange={handlePeriodChange}
              options={[
                { label: 'All Time', value: 'all' },
                { label: 'Today', value: 'today' },
                { label: 'Yesterday', value: 'yesterday' },
                { label: 'This Week', value: 'this_week' },
                { label: 'Last Week', value: 'last_week' },
                { label: 'This Month', value: 'this_month' },
                { label: 'Last Month', value: 'last_month' },
                { label: 'Last 3 Months', value: 'last_3_months' },
                { label: 'Last 6 Months', value: 'last_6_months' },
                { label: 'This Year', value: 'this_year' },
                { label: 'Custom Range', value: 'custom' }
              ]}
            />

            {period === 'custom' && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-5 duration-200">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Start Date"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500"
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
      <BookingListTable 
        bookings={filteredBookings}
        onViewDetails={(booking) => {
          setSelectedBooking(booking)
          setShowModal(true)
        }}
        onStatusUpdate={handleStatusUpdate}
        showBranch={false}
      />
      
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
          onUpdated={() => {
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

