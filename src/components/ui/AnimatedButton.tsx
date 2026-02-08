'use client'

import React from 'react'
import { Icons, type IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { ComponentErrorBoundary } from './ErrorBoundary'
import { LoadingIcon } from './Icon'
import { Button, type ButtonProps } from '@/components/ui/button'

interface AnimatedButtonProps extends Omit<ButtonProps, 'variant' | 'size'> {
  /** Button visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass' | 'gradient' | 'purple' | 'default' | 'destructive' | 'link'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs' | 'md' | 'xl'
  /** Optional icon name from the icon library */
  icon?: IconName
  /** Icon position relative to text */
  iconPosition?: 'left' | 'right'
  /** Show loading state */
  isLoading?: boolean
  /** Text to show when loading */
  loadingText?: string
  /** Make button full width */
  fullWidth?: boolean
  /** Use compact styling */
  compact?: boolean
  /** Test ID for testing */
  'data-testid'?: string
}

/**
 * A customizable button component with mobile responsiveness,
 * loading states, and comprehensive error handling.
 * Now wraps the standard Shadcn UI Button.
 */
export const AnimatedButton = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  isLoading = false,
  loadingText,
  disabled = false,
  children,
  className,
  onClick,
  type = 'button',
  fullWidth = false,
  compact = false,
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}: AnimatedButtonProps) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || isLoading) {
      event.preventDefault()
      return
    }
    
    if (onClick) {
      try {
        onClick(event)
      } catch (error) {
        console.error('Button click handler error:', error)
        event.preventDefault()
      }
    }
  }

  const IconComponent = icon ? Icons[icon] : null
  
  // Validate icon existence
  if (icon && !IconComponent) {
    console.warn(`Icon "${icon}" not found in button component`)
  }

  // Map legacy variants to Shadcn variants
  const getVariant = () => {
    switch (variant) {
      case 'primary': return 'default'
      case 'danger': return 'destructive'
      case 'glass': return 'glass' // Added to button.tsx
      case 'gradient': return 'gradient' // Added to button.tsx
      case 'purple': return 'purple' // Added to button.tsx
      case 'secondary': return 'secondary'
      case 'outline': return 'outline'
      case 'ghost': return 'ghost'
      default: return 'default'
    }
  }

  // Map legacy sizes to Shadcn sizes
  const getSize = () => {
    if (compact) return 'sm'
    switch (size) {
      case 'xs': return 'sm' // Map xs to sm
      case 'md': return 'default' // Map md to default
      case 'xl': return 'lg' // Map xl to lg
      default: return size as "default" | "sm" | "lg" | "icon"
    }
  }
  
  return (
    <ComponentErrorBoundary componentName="AnimatedButton">
      <Button
        type={type}
        onClick={onClick ? handleClick : undefined}
        disabled={disabled || isLoading}
        variant={getVariant()}
        size={getSize()}
        className={cn(
          fullWidth && 'w-full',
          // Mobile touch targets
          !compact && 'touch-device:min-h-11 touch-device:min-w-11',
          className
        )}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        aria-disabled={disabled || isLoading}
        data-testid={testId}
        data-loading={isLoading}
        {...props}
      >
      {isLoading ? (
        <>
          <LoadingIcon 
            size={size === 'xl' ? 'lg' : size === 'lg' ? 'md' : 'sm'} 
            className={cn(
              {
                'mr-2': iconPosition === 'left' || !!loadingText,
                'ml-2': iconPosition === 'right' && !loadingText,
              }
            )}
          />
          {loadingText ? (
            <span>{loadingText}</span>
          ) : (
            <span className="sr-only">Loading...</span>
          )}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && IconComponent && (
            <IconComponent className={cn(
              {
                'w-3 h-3': size === 'xs',
                'w-4 h-4': size === 'sm' || size === 'md',
                'w-5 h-5': size === 'lg',
                'w-6 h-6': size === 'xl',
              },
              'mr-2'
            )} />
          )}
          
          {children}
          
          {icon && iconPosition === 'right' && IconComponent && (
            <IconComponent className={cn(
              {
                'w-3 h-3': size === 'xs',
                'w-4 h-4': size === 'sm' || size === 'md',
                'w-5 h-5': size === 'lg',
                'w-6 h-6': size === 'xl',
              },
              'ml-2'
            )} />
          )}
        </>
      )}
      </Button>
    </ComponentErrorBoundary>
  )
}
