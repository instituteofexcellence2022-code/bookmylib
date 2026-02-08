'use client'

import { cn } from '@/lib/utils'
import { ComponentErrorBoundary } from './ErrorBoundary'

/**
 * Skeleton loading component props
 * @interface SkeletonProps
 * @property {'text'|'circle'|'rect'|'card'} [type=text] - Type of skeleton
 * @property {'xs'|'sm'|'md'|'lg'|'xl'} [size=md] - Size of the skeleton
 * @property {number} [lines=1] - Number of lines for text skeleton
 * @property {boolean} [animated=true] - Whether to show shimmer animation
 * @property {string} [className] - Additional CSS classes
 * @property {string} [testId] - Test ID for testing
 */
interface SkeletonProps {
  type?: 'text' | 'circle' | 'rect' | 'card'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  lines?: number
  animated?: boolean
  className?: string
  testId?: string
}

/**
 * Skeleton loading component for displaying loading states
 * @component
 * @example
 * <Skeleton type="text" lines={3} />
 * <Skeleton type="circle" size="lg" />
 * <Skeleton type="card" animated={true} />
 */
export const Skeleton = ({
  type = 'text',
  size = 'md',
  lines = 1,
  animated = true,
  className,
  testId,
}: SkeletonProps) => {
  const sizeClasses = {
    xs: 'h-3',
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-6',
    xl: 'h-8',
  }

  const skeletonClasses = cn(
    'bg-gray-200 dark:bg-gray-700 rounded-md',
    animated && 'animate-pulse',
    {
      'rounded-full': type === 'circle',
      'rounded-lg': type === 'card',
      'rounded-md': type === 'text' || type === 'rect',
    },
    className
  )

  if (type === 'text' && lines > 1) {
    return (
      <div 
        className="space-y-2"
        data-testid={testId}
        data-skeleton-type="multi-text"
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              skeletonClasses,
              sizeClasses[size],
              i === lines - 1 ? 'w-3/4' : 'w-full',
              'mobile-only:h-3 mobile-only:rounded'
            )}
            data-skeleton-line={i + 1}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        skeletonClasses,
        {
          [sizeClasses[size]]: type !== 'card',
          'h-16 w-16': type === 'circle' && size === 'md',
          'h-12 w-12': type === 'circle' && size === 'sm',
          'h-20 w-20': type === 'circle' && size === 'lg',
          'h-24 w-24': type === 'circle' && size === 'xl',
          'h-8 w-8': type === 'circle' && size === 'xs',
          'h-20': type === 'card',
          'w-full': type === 'rect' || type === 'card',
        },
        'mobile-only:rounded mobile-only:h-3',
        type === 'card' && 'mobile-only:h-16'
      )}
      data-testid={testId}
      data-skeleton-type={type}
      data-skeleton-size={size}
    />
  )
}

/**
 * Card skeleton component for loading card states
 * @component
 * @example
 * <CardSkeleton />
 * <CardSkeleton withImage />
 */
export const CardSkeleton = ({
  withImage = false,
  lines = 2,
  className,
  testId,
}: {
  withImage?: boolean
  lines?: number
  className?: string
  testId?: string
} = {}) => (
  <ComponentErrorBoundary componentName="CardSkeleton">
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-200 p-6 shadow-md',
        'mobile-only:rounded-xl mobile-only:p-4',
        className
      )}
      data-testid={testId}
      data-skeleton-card="true"
    >
      {withImage && (
        <Skeleton
          type="rect"
          size="lg"
          className="mb-4 h-32 mobile-only:h-24"
        />
      )}
      <div className="space-y-3">
        <Skeleton type="text" size="lg" className="w-3/4" />
        <Skeleton type="text" size="md" lines={lines} />
        <div className="flex items-center justify-between pt-4">
          <Skeleton type="text" size="sm" className="w-1/3" />
          <Skeleton type="text" size="sm" className="w-1/4" />
        </div>
      </div>
    </div>
  </ComponentErrorBoundary>
)

/**
 * Button skeleton component for loading button states
 * @component
 * @example
 * <ButtonSkeleton />
 * <ButtonSkeleton size="lg" />
 */
export const ButtonSkeleton = ({
  size = 'md',
  fullWidth = false,
  className,
  testId,
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  className?: string
  testId?: string
} = {}) => (
  <ComponentErrorBoundary componentName="ButtonSkeleton">
    <div
      className={cn(
        'bg-gray-200 rounded-lg animate-pulse',
        {
          'h-6 px-3': size === 'xs',
          'h-8 px-4': size === 'sm',
          'h-10 px-6': size === 'md',
          'h-12 px-8': size === 'lg',
          'h-14 px-10': size === 'xl',
          'w-full': fullWidth,
          'w-24': !fullWidth && size === 'md',
          'w-20': !fullWidth && size === 'sm',
          'w-16': !fullWidth && size === 'xs',
          'w-32': !fullWidth && size === 'lg',
          'w-40': !fullWidth && size === 'xl',
        },
        'mobile-only:rounded mobile-only:h-8',
        className
      )}
      data-testid={testId}
      data-skeleton-button="true"
      data-button-size={size}
    />
  </ComponentErrorBoundary>
)

/**
 * Profile skeleton component for user profile loading
 * @component
 * @example
 * <ProfileSkeleton />
 * <ProfileSkeleton withBio />
 */
export const ProfileSkeleton = ({
  withBio = false,
  className,
  testId,
}: {
  withBio?: boolean
  className?: string
  testId?: string
} = {}) => (
  <ComponentErrorBoundary componentName="ProfileSkeleton">
    <div
      className={cn('flex items-center space-x-4', className)}
      data-testid={testId}
      data-skeleton-profile="true"
    >
      <Skeleton
        type="circle"
        size="lg"
        className="mobile-only:h-10 mobile-only:w-10"
      />
      <div className="flex-1 space-y-2">
        <Skeleton type="text" size="lg" className="w-1/2" />
        <Skeleton type="text" size="sm" className="w-1/3" />
        {withBio && <Skeleton type="text" size="md" lines={2} />}
      </div>
    </div>
  </ComponentErrorBoundary>
)