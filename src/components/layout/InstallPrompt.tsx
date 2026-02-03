
'use client'

import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
    }

    // Check for iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    setIsIOS(/iphone|ipad|ipod/.test(userAgent))

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
  }

  // Don't show if already installed
  if (isStandalone) return null

  // Don't show if no prompt available (except maybe special iOS handling later)
  if (!showPrompt && !isIOS) return null

  // For iOS, we might want to show a custom instruction, but for now we'll stick to the "Add to Home Screen" standard behavior which is browser-controlled or manual.
  // We'll focus on the standard `beforeinstallprompt` for now.
  if (!showPrompt) return null 

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-3 p-3 pr-4 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/50 rounded-xl shadow-lg shadow-purple-500/10"
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
            onClick={handleInstall}
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
