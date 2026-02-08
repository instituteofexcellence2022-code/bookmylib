import React, { forwardRef } from 'react'
import { LucideIcon, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FormSelectOption {
  label: string
  value: string | number
}

export interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  icon?: LucideIcon
  error?: string
  helperText?: string
  containerClassName?: string
  options?: FormSelectOption[]
  isLoading?: boolean
  placeholder?: string
}

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ className, containerClassName, label, icon: Icon, error, helperText, id, options = [], isLoading, placeholder, children, ...props }, ref) => {
    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        {label && (
          <label 
            htmlFor={id} 
            className="text-sm font-medium text-foreground block"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <select
            ref={ref}
            id={id}
            className={cn(
              "w-full bg-background border border-input rounded-lg text-lg transition-colors appearance-none",
              "focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              Icon ? "pl-11 pr-10 py-2" : "pl-4 pr-10 py-2",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            disabled={isLoading || props.disabled}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {(error || helperText) && (
          <p className={cn("text-xs", error ? "text-red-500" : "text-muted-foreground")}>
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

FormSelect.displayName = "FormSelect"

export { FormSelect }
