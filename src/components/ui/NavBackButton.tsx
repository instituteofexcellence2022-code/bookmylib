'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function NavBackButton() {
  const router = useRouter()

  return (
    <button 
      onClick={() => router.back()}
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
      aria-label="Go back"
    >
      <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
    </button>
  )
}
