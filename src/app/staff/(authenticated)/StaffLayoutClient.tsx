'use client'

import React, { useState } from 'react'
import { 
  LayoutGrid, 
  Clock, 
  Users, 
  GraduationCap,
  Armchair, 
  IndianRupee, 
  CalendarCheck,
  AlertTriangle, 
  UserCircle,
  Settings,
  NotebookTabs
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { logout } from '@/actions/auth'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

const navItems = [
  // Main
  { href: '/staff/dashboard', label: 'Dashboard', icon: LayoutGrid, group: 'Main' },

  // Operations
  { href: '/staff/leads', label: 'Leads', icon: Users, group: 'Operations' },
  { href: '/staff/students', label: 'Students', icon: GraduationCap, group: 'Operations' },
  { href: '/staff/attendance', label: 'Attendance', icon: CalendarCheck, group: 'Operations' },
  { href: '/staff/issues', label: 'Issues', icon: AlertTriangle, group: 'Operations' },

  // Finance
  { href: '/staff/finance', label: 'Finance', icon: IndianRupee, group: 'Finance' },
  { href: '/staff/khatabook', label: 'Khatabook', icon: NotebookTabs, group: 'Finance' },

  // Others
  { href: '/staff/seats', label: 'Seats', icon: Armchair, group: 'Others' },
  { href: '/staff/shift', label: 'My Shift', icon: Clock, group: 'Others' },
  { href: '/staff/settings', label: 'Settings', icon: Settings, group: 'Others' },
  { href: '/staff/profile', label: 'Profile', icon: UserCircle, group: 'Others' },
]

export default function StaffLayoutClient({ children, user, announcements }: { 
  children: React.ReactNode
  user: {
    name: string
    role: string
    image?: string | null
    initials: string
  }
  announcements?: any[]
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/staff/login')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar
        title="Staff"
        items={navItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        themeColor="green"
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 mb-20 md:mb-0 pb-safe">
        <TopBar
          user={user}
          title="Staff Portal"
          onMenuClick={() => setIsSidebarOpen(true)}
          announcements={announcements}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <BottomNav
        items={navItems}
        onMenuClick={() => setIsSidebarOpen(true)}
        themeColor="green"
      />
    </div>
  )
}
