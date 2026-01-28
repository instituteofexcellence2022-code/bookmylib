import React, { forwardRef } from 'react'
import { LucideIcon, AlertCircle } from 'lucide-react'

export interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  icon?: LucideIcon
  error?: string
  helperText?: string
  containerClassName?: string
}

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ className, containerClassName, label, icon: Icon, error, helperText, id, ...props }, ref) => {
    return (
      <div className={`space-y-1.5 ${containerClassName || ''}`}>
        {label && (
          <label 
            htmlFor={id} 
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute left-3 top-3 pointer-events-none text-muted-foreground">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <textarea
            ref={ref}
            id={id}
            className={`
              w-full rounded-lg border bg-background px-4 py-2 text-lg outline-none transition-all
              ${Icon ? 'pl-11' : ''}
              ${error 
                ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' 
                : 'border-input focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              resize-none
              ${className || ''}
            `}
            {...props}
          />
        </div>
        {(error || helperText) && (
          <div className="flex items-center gap-1 text-xs">
            {error && <AlertCircle className="h-3 w-3 text-red-500" />}
            <span className={error ? 'text-red-500' : 'text-muted-foreground'}>
              {error || helperText}
            </span>
          </div>
        )}
      </div>
    )
  }
)

FormTextarea.displayName = 'FormTextarea'

export { FormTextarea }
