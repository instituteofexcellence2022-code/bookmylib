'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogOut, X, ChevronLeft, ChevronRight, LucideIcon, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  group?: string
  badge?: string | number
  badgeColor?: string
}

interface SidebarProps {
  title: string | React.ReactNode
  logo?: React.ReactNode
  items: NavItem[]
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
  themeColor?: 'purple' | 'green' | 'blue' | 'amber' | 'emerald'
}

const colorVariants = {
  purple: {
    activeBg: 'bg-purple-50 dark:bg-purple-900/20',
    activeText: 'text-purple-600 dark:text-purple-400',
    indicator: 'bg-purple-600 dark:bg-purple-400',
    logoBg: 'bg-purple-600',
    logoGradient: 'bg-gradient-to-br from-purple-500 to-purple-700',
    hoverBg: 'bg-purple-100/40 dark:bg-purple-900/10',
  },
  green: {
    activeBg: 'bg-green-50 dark:bg-green-900/20',
    activeText: 'text-green-600 dark:text-green-400',
    indicator: 'bg-green-600 dark:bg-green-400',
    logoBg: 'bg-green-600',
    logoGradient: 'bg-gradient-to-br from-green-500 to-green-700',
    hoverBg: 'bg-green-100/40 dark:bg-green-900/10',
  },
  blue: {
    activeBg: 'bg-blue-50 dark:bg-blue-900/20',
    activeText: 'text-blue-600 dark:text-blue-400',
    indicator: 'bg-blue-600 dark:bg-blue-400',
    logoBg: 'bg-blue-600',
    logoGradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
    hoverBg: 'bg-blue-100/40 dark:bg-blue-900/10',
  },
  amber: {
    activeBg: 'bg-amber-50 dark:bg-amber-900/20',
    activeText: 'text-amber-600 dark:text-amber-400',
    indicator: 'bg-amber-600 dark:bg-amber-400',
    logoBg: 'bg-amber-600',
    logoGradient: 'bg-gradient-to-br from-amber-500 to-amber-700',
    hoverBg: 'bg-amber-100/40 dark:bg-amber-900/10',
  },
  emerald: {
    activeBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    activeText: 'text-emerald-600 dark:text-emerald-400',
    indicator: 'bg-emerald-600 dark:bg-emerald-400',
    logoBg: 'bg-emerald-600',
    logoGradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    hoverBg: 'bg-emerald-100/40 dark:bg-emerald-900/10',
  }
}

export function Sidebar({ 
  title, 
  logo, 
  items, 
  isOpen, 
  onClose, 
  onLogout, 
  themeColor = 'purple' 
}: SidebarProps) {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)
  const colors = colorVariants[themeColor] || colorVariants.purple

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={onClose}
      />

      <aside className={cn(
      "fixed md:sticky top-0 left-0 z-40 h-[100dvh] w-52 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "md:w-[72px]" : "md:w-52",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
        {/* Header */}
        <div className={cn(
          "h-14 flex items-center px-4 md:px-5 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm",
          isCollapsed ? "md:justify-center" : "justify-between"
        )}>
            <div className={cn("flex items-center gap-3 overflow-hidden whitespace-nowrap group/header", isCollapsed && "md:justify-center w-full")}>
                {logo || (
                  <div className={cn(
                    "min-w-[2rem] w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition-transform duration-300 group-hover/header:scale-105",
                    colors.logoGradient || colors.logoBg
                  )}>
                    <BookOpen className="text-white w-5 h-5 drop-shadow-sm" />
                  </div>
                )}
                <motion.span 
                  initial={false}
                  animate={{ opacity: isCollapsed ? 0 : 1, width: isCollapsed ? 0 : 'auto' }}
                  className={cn("text-base font-bold text-slate-900 dark:text-white md:block tracking-tight", isCollapsed ? "hidden" : "block")}
                >
                  {title}
                </motion.span>
             </div>
             <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1">
                <X size={18} />
             </button>
        </div>
        
        {/* Navigation */}
        <nav className={cn(
          "flex-1 py-3 px-2 space-y-0.5 min-h-0",
          isCollapsed ? "overflow-visible" : "overflow-y-auto overflow-x-hidden"
        )}>
           {items.map((item, index) => {
             const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
             const showHeader = item.group && (index === 0 || items[index - 1].group !== item.group)

             return (
               <React.Fragment key={item.href}>
                 {showHeader && (
                    <div className={cn(
                      "px-3 mt-4 mb-2 transition-all duration-300",
                      isCollapsed ? "flex justify-center" : ""
                    )}>
                      {isCollapsed ? (
                        <div className="w-4 h-px bg-gray-200 dark:bg-gray-700" />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                          {item.group}
                        </span>
                      )}
                    </div>
                 )}
                 <Link 
                   key={item.href} 
                   href={item.href} 
                   onClick={onClose} 
                   className="block group relative"
                   onMouseEnter={() => setHoveredPath(item.href)}
                   onMouseLeave={() => setHoveredPath(null)}
                 >
                   {hoveredPath === item.href && !isActive && (
                     <motion.div
                       layoutId="sidebar-hover-bg"
                       className={cn("absolute inset-0 rounded-lg backdrop-blur-[1px]", colors.hoverBg)}
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       transition={{ type: "spring", stiffness: 400, damping: 30 }}
                     />
                   )}
                   {isActive && (
                     <motion.div
                       layoutId="sidebar-active-bg"
                       className={cn("absolute inset-0 rounded-lg", colors.activeBg)}
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       transition={{ type: "spring", stiffness: 300, damping: 30 }}
                     />
                   )}
                   <div className={cn(
                     "flex items-center rounded-lg transition-all duration-200 relative z-10",
                     isCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2 gap-3",
                     isActive 
                       ? cn(colors.activeText, "font-medium shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/5")
                       : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200"
                   )}>
                     <motion.div 
                        className={cn("relative z-10 flex items-center justify-center")}
                        animate={{ 
                          scale: (isActive || hoveredPath === item.href) ? 1.05 : 1,
                          x: (!isCollapsed && hoveredPath === item.href && !isActive) ? 4 : 0
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                     >
                       <item.icon size={isCollapsed ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} />
                     </motion.div>
                     
                     {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: 1,
                          x: (hoveredPath === item.href && !isActive) ? 4 : 0 
                        }}
                        exit={{ opacity: 0 }}
                        className="truncate text-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                    
                    {!isCollapsed && (
                      <div className="ml-auto flex items-center gap-2">
                        {item.badge && (
                          <span className={cn(
                            "px-1.5 py-0.5 text-[10px] font-semibold rounded-md",
                            item.badgeColor || "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          )}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && (
                          <motion.div
                            layoutId="activeIndicator"
                            className={cn("w-1.5 h-1.5 rounded-full", colors.indicator)}
                          />
                        )}
                      </div>
                    )}
  
                      {/* Collapsed Tooltip */}
                      {isCollapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg border border-gray-700/50">
                          {item.label}
                          {/* Arrow */}
                          <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45" />
                        </div>
                      )}
                   </div>
                 </Link>
               </React.Fragment>
             )
           })}
        </nav>

        {/* Footer Actions */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          {/* Collapse Toggle (Desktop only) */}
          <button 
            onClick={toggleCollapse}
            className={cn(
              "hidden md:flex w-full items-center rounded-lg px-2 py-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-700/50 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700 shadow-sm hover:shadow",
              isCollapsed ? "justify-center" : "gap-3"
            )}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isCollapsed && <span className="text-sm font-medium">Collapse</span>}
          </button>

          {onLogout && (
            <button 
              onClick={onLogout} 
              className={cn(
                "flex items-center w-full rounded-lg px-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group relative",
                isCollapsed ? "justify-center" : "gap-3"
              )}
            >
              <LogOut size={isCollapsed ? 20 : 18} />
              {!isCollapsed && <span className="text-sm font-medium">Sign Out</span>}
              
              {/* Tooltip for logout */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                  Sign Out
                   <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45" />
                </div>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
