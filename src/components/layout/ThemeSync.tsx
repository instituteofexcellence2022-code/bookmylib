'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export function ThemeSync() {
  const pathname = usePathname()

  useEffect(() => {
    let theme = 'discover' // Default

    if (pathname?.startsWith('/student')) {
      theme = 'student'
    } else if (pathname?.startsWith('/staff')) {
      theme = 'staff'
    } else if (pathname?.startsWith('/owner')) {
      theme = 'owner'
    }

    // Set cookie with a long expiry (e.g., 7 days)
    document.cookie = `app-theme=${theme}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
  }, [pathname])

  return null
}
