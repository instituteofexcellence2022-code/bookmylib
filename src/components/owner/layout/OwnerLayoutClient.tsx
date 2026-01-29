'use client'

import React, { useState } from 'react'
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  GraduationCap, 
  CreditCard, 
  AlertCircle, 
  Settings,
  Tag,
  TrendingUp,
  Megaphone,
  CalendarCheck,
  User,
  ShieldCheck
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { logoutOwner } from '@/actions/auth'

const navItems = [
  { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  
  { href: '/owner/branches', label: 'Branches', icon: Store, group: 'Operations' },
  { href: '/owner/staff', label: 'Staff', icon: Users, group: 'Operations' },
  { href: '/owner/students', label: 'Students', icon: GraduationCap, group: 'Operations' },
  { href: '/owner/attendance', label: 'Attendance', icon: CalendarCheck, group: 'Operations' },
  { href: '/owner/verification', label: 'Verification', icon: ShieldCheck, group: 'Operations' },
  
  { href: '/owner/plans', label: 'Plans & Fees', icon: CreditCard, group: 'Business' },
  { href: '/owner/promos', label: 'Promotions', icon: Tag, group: 'Business' },
  { href: '/owner/marketing', label: 'Marketing', icon: Megaphone, group: 'Business' },
  { href: '/owner/finance', label: 'Finance', icon: TrendingUp, group: 'Business' },
  
  { href: '/owner/issues', label: 'Issues', icon: AlertCircle, group: 'System', badge: 3, badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { href: '/owner/profile', label: 'My Profile', icon: User, group: 'System' },
  { href: '/owner/settings', label: 'Settings', icon: Settings, group: 'System' },
]

interface OwnerLayoutClientProps {
  children: React.ReactNode
  user: {
    name: string
    role: string
    image?: string
    initials: string
  }
}

export function OwnerLayoutClient({ children, user }: OwnerLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar
        title="Owner"
        items={navItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        themeColor="purple"
        onLogout={async () => {
          await logoutOwner()
        }}
      />

      <div className="flex-1 flex flex-col min-w-0 mb-20 md:mb-0 pb-safe">
        <TopBar
          user={user}
          title="Owner Dashboard"
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={async () => {
            await logoutOwner()
          }}
        />
        
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <BottomNav
        items={navItems}
        onMenuClick={() => setIsSidebarOpen(true)}
        themeColor="purple"
      />
    </div>
  )
}
