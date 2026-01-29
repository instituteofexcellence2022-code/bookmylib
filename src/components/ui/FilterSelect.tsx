import React from 'react'
import { LucideIcon, ChevronDown } from 'lucide-react'

interface FilterSelectProps {
  icon?: LucideIcon
  value?: string
  onChange?: (value: string) => void
  options: string[] | { label: string; value: string }[]
  placeholder?: string
  className?: string
}

export function FilterSelect({ icon: Icon, options, value, onChange, className }: FilterSelectProps) {
  return (
    <div className={`relative ${className || ''}`}>
      {Icon && (
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={`appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg ${Icon ? 'pl-10' : 'pl-4'} pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors w-full`}
      >
        {options.map((opt) => {
          const isString = typeof opt === 'string'
          const label = isString ? opt : opt.label
          const val = isString ? opt : opt.value
          return (
            <option key={val} value={val}>
              {label}
            </option>
          )
        })}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  )
}
