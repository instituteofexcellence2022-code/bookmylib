'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, Menu, LogOut, User, Settings, Moon, Sun } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { InstallButton } from '@/components/ui/InstallButton'
import { cn } from '@/lib/utils'

interface TopBarProps {
  user: {
    name: string
    role: string
    image?: string | null
    initials: string
  }
  title?: string | React.ReactNode
  className?: string
  onMenuClick?: () => void
  onLogout?: () => void | Promise<void>
  announcements?: any[]
}

export function TopBar({ user, title, className, onMenuClick, onLogout, announcements }: TopBarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout()
      return
    }

    const roleLoginRoute =
      user.role === 'owner' ? '/owner/login' :
      user.role === 'staff' ? '/staff/login' :
      user.role === 'student' ? '/student/login' :
      '/'

    router.push(roleLoginRoute)
  }

  return (
    <header className={cn(
      "sticky top-0 z-30 bg-white dark:bg-gray-900/80 dark:backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 md:px-6 flex items-center justify-between",
      className
    )}>
       <div className="flex items-center gap-4">
         {onMenuClick && (
           <button onClick={onMenuClick} className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
             <Menu size={24} />
           </button>
         )}
         <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-none">
              {title || 'Dashboard'}
            </h1>
         </div>
       </div>

       <div className="flex items-center gap-3 md:gap-4">
          <InstallButton />
          
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              <Bell size={20} />
              {announcements && announcements.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900" />
              )}
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {announcements && announcements.length > 0 && (
                    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                      {announcements.length} New
                    </span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {announcements && announcements.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">{announcement.title}</h4>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {announcement.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  )}
                </div>
                <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                  <Link 
                    href={user.role === 'student' ? '/student/notifications' : user.role === 'staff' ? '/staff/dashboard' : '/owner/marketing'}
                    className="flex items-center justify-center w-full py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    onClick={() => setIsNotificationOpen(false)}
                  >
                    View All Notifications
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 pl-2 md:pl-4 md:border-l md:border-gray-200 dark:md:border-gray-700 focus:outline-none group"
            >
              <div className="hidden md:flex flex-col items-end">
                 <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">{user.name}</span>
                 <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</span>
              </div>

              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold text-sm md:text-base border-2 border-white dark:border-gray-800 shadow-sm relative overflow-hidden group-hover:ring-2 group-hover:ring-purple-500 transition-all">
                 {user.image ? (
                   <Image 
                      src={user.image} 
                      alt={user.name} 
                      fill
                      className="object-cover"
                      unoptimized // Since we don't know the domain source of the user image yet
                   />
                 ) : (
                   user.initials
                 )}
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 md:hidden">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                </div>
                
                <div className="p-1">
                  <Link 
                    href={`/${user.role}/profile`}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User size={16} />
                    My Profile
                  </Link>
                  <Link 
                    href={`/${user.role}/settings`}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Settings size={16} />
                    Settings
                  </Link>
                  <button 
                    onClick={() => {
                      setTheme(theme === 'dark' ? 'light' : 'dark')
                      setIsDropdownOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    {mounted && theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    {mounted && theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </div>
                
                <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                
                <div className="p-1">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
       </div>
    </header>
  )
}
