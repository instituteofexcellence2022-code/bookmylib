'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface BackButtonProps {
    className?: string
    href?: string
}

export function BackButton({ className, href }: BackButtonProps) {
    const router = useRouter()
    
    if (href) {
        return (
            <Link 
                href={href}
                className={cn(
                    "px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-105 shadow-sm flex items-center gap-1.5 inline-flex text-xs font-medium",
                    className
                )}
                aria-label="Go back"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
            </Link>
        )
    }

    return (
        <button 
            onClick={() => router.back()}
            className={cn(
                "px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:scale-105 shadow-sm flex items-center gap-1.5 text-xs font-medium",
                className
            )}
            aria-label="Go back"
        >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
        </button>
    )
}
