'use client'

import React, { useState } from 'react'
import { Sidebar, NavItem } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { BottomNav } from '@/components/layout/BottomNav'
import { 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Package, 
  TicketCheck, 
  ShieldAlert, 
  Settings, 
  Users,
  MessageSquare
} from 'lucide-react'
import { logoutAdmin } from '@/actions/admin/platform-auth'

const adminNavItems: NavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/libraries', label: 'Libraries', icon: Building2 },
  { href: '/admin/plans', label: 'SaaS Plans', icon: Package },
  { href: '/admin/tickets', label: 'Tickets', icon: MessageSquare },
  { href: '/admin/subscriptions', label: 'Platform Subscriptions', icon: TicketCheck },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/users', label: 'Platform Users', icon: Users },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminLayout({ children, user }: { children: React.ReactNode, user: any }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar
        title="Admin Console"
        items={adminNavItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={logoutAdmin}
        themeColor="blue"
      />
      
      <div className="md:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <TopBar 
          onMenuClick={() => setSidebarOpen(true)} 
          title="Platform Admin"
          user={{ 
            name: user?.name || 'Admin', 
            role: 'admin',
            initials: (user?.name || 'Admin').substring(0, 2).toUpperCase(),
            image: user?.image
          }}
          onLogout={logoutAdmin}
        />
        
        <main className="flex-1 p-4 md:p-6 pb-28 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>

      <BottomNav
        items={adminNavItems}
        onMenuClick={() => setSidebarOpen(true)}
        themeColor="blue"
      />
    </div>
  )
}
