'use client'

import React, { useEffect, useState } from 'react'
import { Download, X, BookOpen, Users, Shield } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

interface InstallPromptProps {
  onOpenChange?: (isOpen: boolean) => void
  role?: string
}

export function InstallPrompt({ onOpenChange, role }: InstallPromptProps) {
  const { deferredPrompt, isStandalone, installApp, isIOS } = useInstallPrompt()
  const [showPrompt, setShowPrompt] = useState(false)

  // Determine theme based on role
  const getTheme = () => {
    switch (role) {
      case 'owner':
        return {
          icon: Shield,
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-600 dark:text-amber-400',
          border: 'border-amber-100 dark:border-amber-900/50',
          shadow: 'shadow-amber-500/10',
          button: 'bg-amber-600 hover:bg-amber-700'
        }
      case 'staff':
        return {
          icon: Users,
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-600 dark:text-emerald-400',
          border: 'border-emerald-100 dark:border-emerald-900/50',
          shadow: 'shadow-emerald-500/10',
          button: 'bg-emerald-600 hover:bg-emerald-700'
        }
      case 'student':
      case 'discover':
        return {
          icon: BookOpen,
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-600 dark:text-blue-400',
          border: 'border-blue-100 dark:border-blue-900/50',
          shadow: 'shadow-blue-500/10',
          button: 'bg-blue-600 hover:bg-blue-700'
        }
      default:
        // Default (Purple)
        return {
          icon: Download,
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-600 dark:text-purple-400',
          border: 'border-purple-100 dark:border-purple-900/50',
          shadow: 'shadow-purple-500/10',
          button: 'bg-purple-600 hover:bg-purple-700'
        }
    }
  }

  const theme = getTheme()
  const Icon = theme.icon

  useEffect(() => {
    onOpenChange?.(showPrompt)
  }, [showPrompt, onOpenChange])

  useEffect(() => {
    // Only show if:
    // 1. Not in standalone mode
    // 2. AND (Is iOS OR has deferredPrompt)
    // Note: deferredPrompt is null if already installed on Android/Desktop
    const timer = setTimeout(() => {
        if (isStandalone) return;

        if (isIOS || deferredPrompt) {
            setShowPrompt(true)
        }
    }, 2000)

    return () => clearTimeout(timer)
  }, [isStandalone, isIOS, deferredPrompt])

  // Auto-dismiss after 10 seconds
  useEffect(() => {
    if (showPrompt) {
      const timer = setTimeout(() => {
        setShowPrompt(false)
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [showPrompt])

  const handleInstallClick = async () => {
      await installApp()
      setShowPrompt(false)
  }

  // Don't show if already installed
  if (isStandalone) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-[5.5rem] left-4 right-4 md:top-20 md:right-4 md:left-auto md:bottom-auto md:w-auto z-50 flex items-center gap-3 p-3 pr-4 bg-white dark:bg-gray-900 border rounded-xl shadow-lg ${theme.border} ${theme.shadow}`}
        >
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${theme.bg}`}>
             {/* Using a generic app icon or the Lucide download icon */}
            <Icon className={`w-5 h-5 ${theme.text}`} />
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Install App
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              For a better experience
            </span>
          </div>

          <button
            onClick={handleInstallClick}
            className={`ml-2 px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors ${theme.button}`}
          >
            Install
          </button>
          
          <button 
            onClick={() => setShowPrompt(false)}
            className="p-1 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
