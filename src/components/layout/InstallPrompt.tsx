'use client'

import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

interface InstallPromptProps {
  onOpenChange?: (isOpen: boolean) => void
}

export function InstallPrompt({ onOpenChange }: InstallPromptProps) {
  const { deferredPrompt, isStandalone, installApp, isIOS } = useInstallPrompt()
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    onOpenChange?.(showPrompt)
  }, [showPrompt])

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
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 right-4 z-50 flex items-center gap-3 p-3 pr-4 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/50 rounded-xl shadow-lg shadow-purple-500/10"
        >
          <div className="flex items-center justify-center w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
             {/* Using a generic app icon or the Lucide download icon */}
            <Download className="w-5 h-5 text-purple-600 dark:text-purple-400" />
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
            className="ml-2 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
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
