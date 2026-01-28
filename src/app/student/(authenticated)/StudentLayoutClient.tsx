'use client'

import React, { useState } from 'react'
import { 
  Home, 
  BookOpen, 
  CreditCard, 
  User, 
  Search,
  Timer,
  IndianRupee,
  AlertCircle,
  Bell,
  Gift,
  CalendarCheck
} from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { logoutStudent } from '@/actions/auth'

const navItems = [
  { href: '/student/home', label: 'Home', icon: Home },
  { href: '/student/book', label: 'Book', icon: Search },
  { href: '/student/my-plan', label: 'My Plan', icon: CreditCard },
  { href: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/student/tools', label: 'Tools', icon: Timer },
  { href: '/student/payments', label: 'Payments', icon: IndianRupee },
  { href: '/student/refer', label: 'Refer & Earn', icon: Gift },
  { href: '/student/issues', label: 'Issues', icon: AlertCircle },
  { href: '/student/notifications', label: 'Updates', icon: Bell },
  { href: '/student/profile', label: 'Profile', icon: User },
]

interface StudentLayoutClientProps {
  children: React.ReactNode
  user: {
    name: string
    role: string
    initials: string
  }
}

export default function StudentLayoutClient({ children, user }: StudentLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logoutStudent()
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar
        title="BookMyLib"
        logo={
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <BookOpen className="text-white w-5 h-5" />
          </div>
        }
        items={navItems}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        themeColor="blue"
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <TopBar
          user={user}
          title="BookMyLib"
          onMenuClick={() => setIsSidebarOpen(true)}
          onLogout={handleLogout}
        />
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth touch-pan-y overscroll-y-contain">
          <div className="p-4 md:p-6 pb-28 md:pb-6 max-w-4xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      <BottomNav
        items={navItems}
        onMenuClick={() => setIsSidebarOpen(true)}
        themeColor="blue"
      />
    </div>
  )
}
