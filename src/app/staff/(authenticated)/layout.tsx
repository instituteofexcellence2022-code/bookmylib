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
  UserCircle
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'

const navItems = [
  { href: '/staff/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/staff/shift', label: 'My Shift', icon: Clock },
  { href: '/staff/leads', label: 'Leads', icon: Users },
  { href: '/staff/students', label: 'Students', icon: GraduationCap },
  { href: '/staff/seats', label: 'Seats', icon: Armchair },
  { href: '/staff/finance', label: 'Finance', icon: IndianRupee },
  { href: '/staff/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/staff/issues', label: 'Issues', icon: AlertTriangle },
  { href: '/staff/profile', label: 'Profile', icon: UserCircle },
]

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar
        title="Staff"
        items={navItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        themeColor="green"
        onLogout={() => {}}
      />

      <div className="flex-1 flex flex-col min-w-0 mb-20 md:mb-0 pb-safe">
        <TopBar
          user={{
            name: 'Staff Member',
            role: 'staff',
            initials: 'SM'
          }}
          title="Staff Portal"
          onMenuClick={() => setIsSidebarOpen(true)}
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
