'use client'

import { useState, useEffect } from 'react'

interface InstallPromptState {
  deferredPrompt: any
  isIOS: boolean
  isStandalone: boolean
  installApp: () => Promise<void>
}

export function useInstallPrompt(): InstallPromptState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
    }

    // Check for iOS
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase()
      setIsIOS(/iphone|ipad|ipod/.test(userAgent))
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handler)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }
  }, [])

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      }
    } else {
      // Manual instructions
      alert("To install this app:\n1. Click the Share icon (iOS) or Menu icon (Android/Desktop)\n2. Select 'Add to Home Screen' or 'Install App'")
    }
  }

  return { deferredPrompt, isIOS, isStandalone, installApp }
}
