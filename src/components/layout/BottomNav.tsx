'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NavItem } from './Sidebar'

interface BottomNavProps {
  items: NavItem[]
  onMenuClick: () => void
  themeColor?: 'purple' | 'green' | 'blue' | 'amber' | 'emerald'
}

const colorVariants = {
  purple: {
    activeText: 'text-purple-600 dark:text-purple-400',
    indicator: 'bg-purple-600 dark:bg-purple-400'
  },
  green: {
    activeText: 'text-green-600 dark:text-green-400',
    indicator: 'bg-green-600 dark:bg-green-400'
  },
  blue: {
    activeText: 'text-blue-600 dark:text-blue-400',
    indicator: 'bg-blue-600 dark:bg-blue-400'
  },
  amber: {
    activeText: 'text-amber-600 dark:text-amber-400',
    indicator: 'bg-amber-600 dark:bg-amber-400'
  },
  emerald: {
    activeText: 'text-emerald-600 dark:text-emerald-400',
    indicator: 'bg-emerald-600 dark:bg-emerald-400'
  }
}

export function BottomNav({ items, onMenuClick, themeColor = 'purple' }: BottomNavProps) {
  const pathname = usePathname()
  const colors = colorVariants[themeColor] || colorVariants.purple
  
  const displayItems = items.slice(0, 4)
  const hasMore = items.length > 4

  const handleHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-6 py-2 pb-safe z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300">
      <div className="flex justify-between items-center">
        {displayItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className="relative py-2 px-1 flex-1"
              onClick={handleHaptic}
            >
              <motion.div 
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors duration-200",
                  isActive ? colors.activeText : "text-gray-400 dark:text-gray-500"
                )}
                whileTap={{ scale: 0.9 }}
              >
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium truncate max-w-[64px]">{item.label}</span>
              </motion.div>
              {isActive && (
                <motion.div
                  layoutId="mobileNavIndicator"
                  className={cn("absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full", colors.indicator)}
                />
              )}
            </Link>
          )
        })}
        
        {hasMore && (
           <button 
             onClick={() => {
               handleHaptic()
               onMenuClick()
             }} 
             className="relative py-2 px-1 flex-1"
           >
              <motion.div 
                className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                whileTap={{ scale: 0.9 }}
              >
                <MoreHorizontal size={24} />
                <span className="text-[10px] font-medium">Menu</span>
              </motion.div>
           </button>
        )}
      </div>
    </nav>
  )
}
