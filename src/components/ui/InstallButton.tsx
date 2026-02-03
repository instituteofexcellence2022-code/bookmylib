'use client'

import React from 'react'
import { Download } from 'lucide-react'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { cn } from '@/lib/utils'

interface InstallButtonProps {
  className?: string
}

export function InstallButton({ className }: InstallButtonProps) {
  const { isStandalone, installApp } = useInstallPrompt()

  // Don't show if already installed (standalone mode)
  if (isStandalone) return null

  return (
    <button
      onClick={installApp}
      className={cn(
        "p-2 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/50 dark:hover:text-blue-400 rounded-full transition-colors",
        className
      )}
      title="Install App"
    >
      <Download size={20} />
    </button>
  )
}
