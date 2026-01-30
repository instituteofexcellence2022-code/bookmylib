'use client'

import { cn } from '@/lib/utils'
import { ComponentErrorBoundary } from './ErrorBoundary'

/**
 * Props for the AnimatedCard component
 * Note: 'animation' and 'delay' props are kept for backward compatibility but ignored.
 */
interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  hoverEffect?: boolean
  glowEffect?: boolean
  animation?: 'fade' | 'slide' | 'scale' | 'bounce' | 'none'
  delay?: number
  variant?: 'default' | 'glass' | 'gradient' | 'compact' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingContent?: React.ReactNode
  testId?: string
}

/**
 * A modern, static card component with clean styling and multiple variants.
 * Previously animated, now static for improved performance and cleaner UI.
 */
export const AnimatedCard = ({
  children,
  className,
  hoverEffect = true,
  glowEffect = false,
  // Props ignored intentionally for backward compatibility after removing animations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  animation = 'fade',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delay = 0,
  variant = 'default',
  padding = 'md',
  isLoading = false,
  loadingContent,
  testId,
  ...props
}: AnimatedCardProps) => {
  
  return (
    <ComponentErrorBoundary componentName="AnimatedCard">
      <div
        className={cn(
          // Base styles - Modern, clean, shadcn-like
          'bg-card rounded-xl border border-border transition-colors duration-200',
          
          // Hover effects (CSS only, subtle border change)
          hoverEffect && !isLoading && 'hover:border-primary/50',
          
          // Loading state
          isLoading && 'opacity-70 pointer-events-none',
          
          // Padding
          {
            'p-0': padding === 'none',
            'p-4 mobile-only:p-3': padding === 'sm',
            'p-6 mobile-only:p-4': padding === 'md',
            'p-8 mobile-only:p-6': padding === 'lg',
          },
          
          // Variants
          {
            'shadow-sm': variant === 'default',
            'bg-background/80 backdrop-blur-md border-border/50 shadow-sm': variant === 'glass',
            'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20': variant === 'gradient',
            'p-4 border-muted shadow-sm': variant === 'compact',
            'shadow-lg border-muted': variant === 'elevated',
          },
          
          // Glow effect replacement (cleaner shadow/ring)
          glowEffect && 'shadow-md ring-1 ring-foreground/5',
          
          className
        )}
        data-testid={testId}
        data-loading={isLoading}
        data-variant={variant}
        {...props}
      >
        {isLoading ? (
          loadingContent || (
            <div className="space-y-4 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded" />
                <div className="h-3 bg-muted rounded w-5/6" />
                <div className="h-3 bg-muted rounded w-4/6" />
              </div>
            </div>
          )
        ) : (
          children
        )}
      </div>
    </ComponentErrorBoundary>
  )
}

// Glass card variant
export const GlassCard = ({
  children,
  className,
  ...props
}: Omit<AnimatedCardProps, 'variant' | 'glowEffect'>) => {
  return (
    <AnimatedCard
      variant="glass"
      glowEffect={true}
      className={className}
      {...props}
    >
      {children}
    </AnimatedCard>
  )
}

// Gradient card variant
export const GradientCard = ({
  children,
  className,
  ...props
}: Omit<AnimatedCardProps, 'variant' | 'glowEffect'>) => {
  return (
    <AnimatedCard
      variant="gradient"
      glowEffect={true}
      className={className}
      {...props}
    >
      {children}
    </AnimatedCard>
  )
}

// Compact card variant for mobile-optimized layouts
export const CompactCard = ({
  children,
  className,
  ...props
}: Omit<AnimatedCardProps, 'variant'>) => {
  return (
    <AnimatedCard
      variant="compact"
      padding="sm"
      className={className}
      {...props}
    >
      {children}
    </AnimatedCard>
  )
}

// Elevated card variant for premium feel
export const ElevatedCard = ({
  children,
  className,
  ...props
}: Omit<AnimatedCardProps, 'variant' | 'glowEffect'>) => {
  return (
    <AnimatedCard
      variant="elevated"
      glowEffect={true}
      className={className}
      {...props}
    >
      {children}
    </AnimatedCard>
  )
}

// Stats card variant
export const StatsCard = ({
  title,
  value,
  icon,
  trend,
  className,
}: {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; isPositive: boolean }
  className?: string
}) => {
  return (
    <AnimatedCard
      className={cn('p-6 text-center', className)}
      hoverEffect={true}
      glowEffect={true}
    >
      {icon && (
        <div className="flex justify-center mb-4">
          {icon}
        </div>
      )}
      
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {value}
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {title}
      </div>
      
      {trend && (
        <div className={cn(
          'text-xs font-medium',
          trend.isPositive ? 'text-success-600' : 'text-error-600'
        )}>
          {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
        </div>
      )}
    </AnimatedCard>
  )
}
