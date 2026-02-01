import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(date)
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatRelativeTime(date: Date) {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatDate(date)
}

export function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

export function formatSeatNumber(number: number | string | null | undefined): string {
  if (number === null || number === undefined) return 'N/A'
  const numStr = String(number)
  if (numStr.startsWith('S-')) return numStr
  return `S-${numStr.padStart(2, '0')}`
}

export function generateId(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function generateGradient(colors: string[]) {
  return `linear-gradient(135deg, ${colors.join(', ')})`
}

export type ThemeColor = 'emerald' | 'blue' | 'indigo' | 'rose' | 'amber' | 'purple' | 'cyan' | 'teal'

export const getThemeClasses = (color: ThemeColor = 'emerald') => {
  const themes = {
    emerald: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
      bgLight: 'bg-emerald-50 dark:bg-emerald-900/50',
      text: 'text-emerald-700 dark:text-emerald-400',
      textLight: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: 'text-emerald-500',
      iconLight: 'text-emerald-300 dark:text-emerald-700/50',
      iconFocus: 'group-focus-within:text-emerald-500',
      bgSolid: 'bg-emerald-500',
      borderSolid: 'border-emerald-500',
      borderFocus: 'focus:border-emerald-500',
      ringFocus: 'focus:ring-emerald-500/20',
      textHover: 'hover:text-emerald-700',
      button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none',
      ring: 'ring-emerald-500/20',
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      toggleActive: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 shadow-sm ring-1 ring-emerald-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-600 dark:hover:text-emerald-400',
      ping: 'bg-emerald-400',
      tag: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40',
      groupHoverText: 'group-hover:text-emerald-600',
      textOnDark: 'text-emerald-400'
    },
    blue: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      bgLight: 'bg-blue-50 dark:bg-blue-900/50',
      text: 'text-blue-700 dark:text-blue-400',
      textLight: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-500',
      iconLight: 'text-blue-300 dark:text-blue-700/50',
      iconFocus: 'group-focus-within:text-blue-500',
      bgSolid: 'bg-blue-500',
      borderSolid: 'border-blue-500',
      borderFocus: 'focus:border-blue-500',
      ringFocus: 'focus:ring-blue-500/20',
      textHover: 'hover:text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none',
      ring: 'ring-blue-500/20',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      toggleActive: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 shadow-sm ring-1 ring-blue-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400',
      ping: 'bg-blue-400',
      tag: 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40',
      groupHoverText: 'group-hover:text-blue-600',
      textOnDark: 'text-blue-400'
    },
    indigo: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/20',
      bgLight: 'bg-indigo-50 dark:bg-indigo-900/50',
      text: 'text-indigo-700 dark:text-indigo-400',
      textLight: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200 dark:border-indigo-800',
      icon: 'text-indigo-500',
      iconLight: 'text-indigo-300 dark:text-indigo-700/50',
      iconFocus: 'group-focus-within:text-indigo-500',
      bgSolid: 'bg-indigo-500',
      borderSolid: 'border-indigo-500',
      borderFocus: 'focus:border-indigo-500',
      ringFocus: 'focus:ring-indigo-500/20',
      textHover: 'hover:text-indigo-700',
      button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none',
      ring: 'ring-indigo-500/20',
      badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
      toggleActive: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800 shadow-sm ring-1 ring-indigo-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 hover:text-indigo-600 dark:hover:text-indigo-400',
      ping: 'bg-indigo-400',
      tag: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/40',
      groupHoverText: 'group-hover:text-indigo-600',
      textOnDark: 'text-indigo-400'
    },
    purple: {
      bg: 'bg-purple-100 dark:bg-purple-900/20',
      bgLight: 'bg-purple-50 dark:bg-purple-900/50',
      text: 'text-purple-700 dark:text-purple-400',
      textLight: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'text-purple-500',
      iconLight: 'text-purple-300 dark:text-purple-700/50',
      iconFocus: 'group-focus-within:text-purple-500',
      bgSolid: 'bg-purple-500',
      borderSolid: 'border-purple-500',
      borderFocus: 'focus:border-purple-500',
      ringFocus: 'focus:ring-purple-500/20',
      textHover: 'hover:text-purple-700',
      button: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200 dark:shadow-none',
      ring: 'ring-purple-500/20',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      toggleActive: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800 shadow-sm ring-1 ring-purple-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-purple-200 dark:hover:border-purple-800 hover:text-purple-600 dark:hover:text-purple-400',
      ping: 'bg-purple-400',
      tag: 'bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40',
      groupHoverText: 'group-hover:text-purple-600',
      textOnDark: 'text-purple-400'
    },
    rose: {
      bg: 'bg-rose-100 dark:bg-rose-900/20',
      bgLight: 'bg-rose-50 dark:bg-rose-900/50',
      text: 'text-rose-700 dark:text-rose-400',
      textLight: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800',
      icon: 'text-rose-500',
      iconLight: 'text-rose-300 dark:text-rose-700/50',
      iconFocus: 'group-focus-within:text-rose-500',
      bgSolid: 'bg-rose-500',
      borderSolid: 'border-rose-500',
      borderFocus: 'focus:border-rose-500',
      ringFocus: 'focus:ring-rose-500/20',
      textHover: 'hover:text-rose-700',
      button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none',
      ring: 'ring-rose-500/20',
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
      toggleActive: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800 shadow-sm ring-1 ring-rose-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-rose-200 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400',
      ping: 'bg-rose-400',
      tag: 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:hover:bg-rose-900/40',
      groupHoverText: 'group-hover:text-rose-600',
      textOnDark: 'text-rose-400'
    },
    amber: {
      bg: 'bg-amber-100 dark:bg-amber-900/20',
      bgLight: 'bg-amber-50 dark:bg-amber-900/50',
      text: 'text-amber-700 dark:text-amber-400',
      textLight: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-500',
      iconLight: 'text-amber-300 dark:text-amber-700/50',
      iconFocus: 'group-focus-within:text-amber-500',
      bgSolid: 'bg-amber-500',
      borderSolid: 'border-amber-500',
      borderFocus: 'focus:border-amber-500',
      ringFocus: 'focus:ring-amber-500/20',
      textHover: 'hover:text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none',
      ring: 'ring-amber-500/20',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      toggleActive: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 shadow-sm ring-1 ring-amber-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-amber-200 dark:hover:border-amber-800 hover:text-amber-600 dark:hover:text-amber-400',
      ping: 'bg-amber-400',
      tag: 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40',
      groupHoverText: 'group-hover:text-amber-600',
      textOnDark: 'text-amber-400'
    },
    cyan: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/20',
      bgLight: 'bg-cyan-50 dark:bg-cyan-900/50',
      text: 'text-cyan-700 dark:text-cyan-400',
      textLight: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-800',
      icon: 'text-cyan-500',
      iconLight: 'text-cyan-300 dark:text-cyan-700/50',
      iconFocus: 'group-focus-within:text-cyan-500',
      bgSolid: 'bg-cyan-500',
      borderSolid: 'border-cyan-500',
      borderFocus: 'focus:border-cyan-500',
      ringFocus: 'focus:ring-cyan-500/20',
      textHover: 'hover:text-cyan-700',
      button: 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200 dark:shadow-none',
      ring: 'ring-cyan-500/20',
      badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      toggleActive: 'bg-cyan-50 text-cyan-600 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800 shadow-sm ring-1 ring-cyan-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-cyan-200 dark:hover:border-cyan-800 hover:text-cyan-600 dark:hover:text-cyan-400',
      ping: 'bg-cyan-400',
      tag: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-400 dark:hover:bg-cyan-900/40',
      groupHoverText: 'group-hover:text-cyan-600',
      textOnDark: 'text-cyan-400'
    },
    teal: {
      bg: 'bg-teal-100 dark:bg-teal-900/20',
      bgLight: 'bg-teal-50 dark:bg-teal-900/50',
      text: 'text-teal-700 dark:text-teal-400',
      textLight: 'text-teal-600 dark:text-teal-400',
      border: 'border-teal-200 dark:border-teal-800',
      icon: 'text-teal-500',
      iconLight: 'text-teal-300 dark:text-teal-700/50',
      iconFocus: 'group-focus-within:text-teal-500',
      bgSolid: 'bg-teal-500',
      borderSolid: 'border-teal-500',
      borderFocus: 'focus:border-teal-500',
      ringFocus: 'focus:ring-teal-500/20',
      textHover: 'hover:text-teal-700',
      button: 'bg-teal-600 hover:bg-teal-700 shadow-teal-200 dark:shadow-none',
      ring: 'ring-teal-500/20',
      badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      toggleActive: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800 shadow-sm ring-1 ring-teal-500/20',
      toggleInactive: 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 hover:bg-white dark:hover:bg-gray-800 hover:border-teal-200 dark:hover:border-teal-800 hover:text-teal-600 dark:hover:text-teal-400',
      ping: 'bg-teal-400',
      tag: 'bg-teal-50 text-teal-600 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40',
      groupHoverText: 'group-hover:text-teal-600',
      textOnDark: 'text-teal-400'
    }
  }
  return themes[color as keyof typeof themes] || themes.emerald
}