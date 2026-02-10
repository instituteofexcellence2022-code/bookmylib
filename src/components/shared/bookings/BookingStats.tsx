
import { Wallet, Activity, Clock, Banknote } from 'lucide-react'

interface BookingStatsProps {
  stats: {
    total: number
    active: number
    pending: number
    revenue: number
  }
}

export function BookingStats({ stats }: BookingStatsProps) {
  return (
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
