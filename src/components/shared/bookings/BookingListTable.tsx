
import { Calendar, AlertCircle, Armchair, Lock, FileText, Check, X } from 'lucide-react'
import { format } from 'date-fns'

interface BookingListTableProps {
  bookings: any[]
  onViewDetails: (booking: any) => void
  onStatusUpdate: (id: string, status: string) => void
  showBranch: boolean
}

export function BookingListTable({ bookings, onViewDetails, onStatusUpdate, showBranch }: BookingListTableProps) {
  
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
    const isPaid = booking.payments?.some((p: any) => p.status === 'completed')
    return isPaid ? 'paid' : 'unpaid'
  }

  return (
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
            {bookings.map((booking) => {
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
                  <div className="text-xs text-gray-500">
                    ₹{booking.plan.price}
                    {showBranch && booking.branch && (
                      <> • {booking.branch.name}</>
                    )}
                  </div>
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
                      onClick={() => onViewDetails(booking)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {booking.status === 'active' && (
                      <button
                        onClick={() => onStatusUpdate(booking.id, 'cancelled')}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel Booking"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => onStatusUpdate(booking.id, 'active')}
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
      {bookings.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No bookings found matching your filters.
        </div>
      )}
    </div>
  )
}
