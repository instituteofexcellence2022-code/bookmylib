'use client'

import React, { useState } from 'react'
import { 
  LayoutDashboard, 
  Scan,
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
  ShieldCheck,
  BookOpen,
  Clock
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { logout } from '@/actions/auth'

const navItems = [
  { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Overview' },
  
  { href: '/owner/scanner', label: 'Master Scanner', icon: Scan, group: 'Operations' },
  { href: '/owner/students', label: 'Students', icon: GraduationCap, group: 'Operations' },
  { href: '/owner/verification', label: 'Verification', icon: ShieldCheck, group: 'Operations' },
  { href: '/owner/issues', label: 'Issues', icon: AlertCircle, group: 'Operations', badge: 3, badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { href: '/owner/expiries', label: 'Expiries', icon: Clock, group: 'Operations' },
  { href: '/owner/attendance', label: 'Attendance', icon: CalendarCheck, group: 'Operations' },
  
  { href: '/owner/branches', label: 'Branches', icon: Store, group: 'Business' },
  { href: '/owner/staff', label: 'Staff', icon: Users, group: 'Business' },
  { href: '/owner/plans', label: 'Plans & Fees', icon: CreditCard, group: 'Business' },
  { href: '/owner/promos', label: 'Promotions', icon: Tag, group: 'Business' },
  { href: '/owner/marketing', label: 'Marketing', icon: Megaphone, group: 'Business' },
  { href: '/owner/finance', label: 'Finance', icon: TrendingUp, group: 'Business' },
  { href: '/owner/khatabook', label: 'Khatabook', icon: BookOpen, group: 'Business' },
  
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
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/owner/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar
        title={
          <span className="font-bold text-xl tracking-tighter">
            BookMy<span className="text-amber-600">Lib</span>
          </span>
        }
        items={navItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        themeColor="amber"
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 pb-safe">
        <TopBar
          user={user}
          title="Owner Dashboard"
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 p-4 md:p-6 pb-28 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <BottomNav
        items={navItems}
        onMenuClick={() => setIsSidebarOpen(true)}
        themeColor="amber"
      />
    </div>
  )
}
