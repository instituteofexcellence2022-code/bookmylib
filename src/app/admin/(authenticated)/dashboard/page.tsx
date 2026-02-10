import React from 'react'
import { getAdminDashboardStats } from '@/actions/admin/platform-dashboard'
import { StatCard } from '@/components/ui/StatCard'
import { Building2, Users, CreditCard, TicketCheck } from 'lucide-react'

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats()

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h1>
                <p className="text-gray-500 dark:text-gray-400">Welcome to the platform command center.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Active Libraries"
                    value={stats.activeLibraries}
                    subValue={`Total: ${stats.totalLibraries}`}
                    icon={<Building2 className="w-6 h-6" />}
                    color="blue"
                />
                <StatCard
                    title="Total Students"
                    value={stats.totalStudents}
                    icon={<Users className="w-6 h-6" />}
                    color="purple"
                />
                <StatCard
                    title="Monthly Revenue (MRR)"
                    value={`₹${stats.mrr.toLocaleString()}`}
                    icon={<CreditCard className="w-6 h-6" />}
                    color="green"
                />
                <StatCard
                    title="Active Platform Subs"
                    value={stats.activeSubscriptions}
                    icon={<TicketCheck className="w-6 h-6" />}
                    color="orange"
                />
            </div>
            
            {/* Placeholder for future charts/tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">Recent Onboarding</h3>
                    <p className="text-gray-500 text-sm">No recent libraries.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-semibold mb-4">System Health</h3>
                    <div className="flex items-center gap-2 text-green-500 text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        All systems operational
                    </div>
                </div>
            </div>
        </div>
    )
}
