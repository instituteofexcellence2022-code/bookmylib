import React, { forwardRef } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode
  icon?: LucideIcon
  startIcon?: React.ReactNode
  error?: string
  helperText?: string
  containerClassName?: string
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, containerClassName, label, icon: Icon, startIcon, error, helperText, id, ...props }, ref) => {
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
          {!Icon && startIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              "w-full bg-background border border-input rounded-lg text-lg transition-colors",
              "focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none",
              "placeholder:text-muted-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              (Icon || startIcon) ? "pl-11 pr-4 py-2" : "px-4 py-2",
              error && "border-red-500 focus:ring-red-500",
              className
            )}
            {...props}
          />
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

FormInput.displayName = "FormInput"

export { FormInput }
