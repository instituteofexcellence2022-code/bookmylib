'use client'

import { motion } from 'framer-motion'
import { Icons, type IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { createAppError, handleError } from '@/lib/error-handling'
import { ComponentErrorBoundary } from './ErrorBoundary'

/**
 * Props for the Icon component
 * @interface IconProps
 * @property {IconName} name - The name of the icon to display
 * @property {'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'} [size=md] - Size of the icon
 * @property {string} [className] - Additional CSS classes
 * @property {string} [color] - Custom color for the icon
 * @property {'spin'|'pulse'|'bounce'|'shake'|'none'} [animate=none] - Animation type
 * @property {'slow'|'normal'|'fast'} [animationSpeed=normal] - Animation speed
 * @property {'scale'|'glow'|'color'|'none'} [hoverEffect=none] - Hover effect
 * @property {boolean} [mobileOptimized=true] - Whether to optimize for mobile
 * @property {string} [testId] - Test ID for testing purposes
 * @property {boolean} [disabled] - Whether the icon is disabled
 */
interface IconProps {
  name: IconName
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  className?: string
  color?: string
  animate?: 'spin' | 'pulse' | 'bounce' | 'shake' | 'none'
  animationSpeed?: 'slow' | 'normal' | 'fast'
  hoverEffect?: 'scale' | 'glow' | 'color' | 'none'
  mobileOptimized?: boolean
  testId?: string
  disabled?: boolean
}

/**
 * A highly customizable icon component with animations, hover effects, and mobile optimization
 * @component
 * @example
 * <Icon name="home" size="lg" animate="spin" />
 * <Icon name="user" hoverEffect="scale" testId="user-icon" />
 */
export const Icon = ({
  name,
  size = 'md',
  className,
  color,
  animate = 'none',
  animationSpeed = 'normal',
  hoverEffect = 'none',
  mobileOptimized = true,
  testId,
  disabled = false,
  ...props
}: IconProps) => {
  const IconComponent = Icons[name]
  
  if (!IconComponent) {
    const error = createAppError(
      'ICON_NOT_FOUND',
      `Icon "${name}" not found in the icon library`,
      { iconName: name, availableIcons: Object.keys(Icons) },
      'Icon'
    )
    
    handleError(error, {
      component: 'Icon',
      showToast: false,
      logToConsole: true,
      throwError: false
    })
    
    return (
      <div 
        className={cn('inline-flex items-center justify-center text-red-500', className)}
        data-testid={testId}
        data-error="icon-not-found"
        title={`Icon "${name}" not found`}
      >
        <span className="text-xs">❓</span>
      </div>
    )
  }

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
    '2xl': 'w-8 h-8',
    '3xl': 'w-10 h-10',
  }

  const mobileSizeClasses = mobileOptimized ? {
    xs: 'mobile-only:w-2.5 mobile-only:h-2.5',
    sm: 'mobile-only:w-3 mobile-only:h-3',
    md: 'mobile-only:w-4 mobile-only:h-4',
    lg: 'mobile-only:w-5 mobile-only:h-5',
    xl: 'mobile-only:w-6 mobile-only:h-6',
    '2xl': 'mobile-only:w-7 mobile-only:h-7',
    '3xl': 'mobile-only:w-8 mobile-only:h-8',
  } : {}

  const animationVariants = {
    spin: {
      animate: { rotate: 360 },
      transition: { duration: getAnimationDuration(animationSpeed), repeat: Infinity }
    },
    pulse: {
      animate: { scale: [1, 1.1, 1] },
      transition: { duration: getAnimationDuration(animationSpeed) * 1.5, repeat: Infinity }
    },
    bounce: {
      animate: { y: [0, -4, 0] },
      transition: { duration: getAnimationDuration(animationSpeed), repeat: Infinity }
    },
    shake: {
      animate: { x: [0, -2, 2, -2, 2, 0] },
      transition: { duration: getAnimationDuration(animationSpeed), repeat: Infinity }
    },
    none: {}
  }

  const hoverVariants = {
    scale: { whileHover: { scale: 1.1 } },
    glow: { whileHover: { filter: 'brightness(1.2)' } },
    color: { whileHover: { color: 'var(--primary)' } },
    none: {}
  }

  function getAnimationDuration(speed: 'slow' | 'normal' | 'fast'): number {
    switch (speed) {
      case 'slow': return 2
      case 'normal': return 1
      case 'fast': return 0.5
      default: return 1
    }
  }

  return (
    <motion.div
      className={cn(
        'inline-flex items-center justify-center',
        sizeClasses[size],
        mobileSizeClasses[size],
        'transition-all duration-200',
        'touch-device:scale-110', // Slightly larger on touch devices
        {
          'animate-spin': animate === 'spin',
          'animate-pulse': animate === 'pulse',
          'opacity-50 cursor-not-allowed': disabled,
          'cursor-pointer hover:opacity-80': !disabled && hoverEffect !== 'none',
        },
        className
      )}
      style={color ? { color } : undefined}
      {...animationVariants[animate]}
      {...hoverVariants[hoverEffect]}
      data-testid={testId}
      data-icon-name={name}
      data-icon-size={size}
      data-disabled={disabled}
      role="img"
      aria-label={`${name} icon`}
      {...props}
    >
      <IconComponent className={cn("w-full h-full", {
        'opacity-60': disabled
      })} />
    </motion.div>
  )
}

/**
 * Pre-configured spinning icon component
 * @component
 * @example
 * <SpinningIcon name="loader" size="lg" />
 */
export const SpinningIcon = (props: Omit<IconProps, 'animate'>) => (
  <ComponentErrorBoundary componentName="SpinningIcon">
    <Icon animate="spin" {...props} />
  </ComponentErrorBoundary>
)

/**
 * Loading spinner icon component
 * @component
 * @example
 * <LoadingIcon size="md" />
 */
export const LoadingIcon = (props: Omit<IconProps, 'animate' | 'name'>) => (
  <ComponentErrorBoundary componentName="LoadingIcon">
    <Icon name="clock" animate="spin" animationSpeed="fast" {...props} />
  </ComponentErrorBoundary>
)

/**
 * Interactive icon with scale hover effect
 * @component
 * @example
 * <InteractiveIcon name="heart" size="lg" />
 */
export const InteractiveIcon = (props: Omit<IconProps, 'hoverEffect'>) => (
  <ComponentErrorBoundary componentName="InteractiveIcon">
    <Icon hoverEffect="scale" {...props} />
  </ComponentErrorBoundary>
)

/**
 * Glowing icon with brightness hover effect
 * @component
 * @example
 * <GlowingIcon name="star" size="xl" />
 */
export const GlowingIcon = (props: Omit<IconProps, 'hoverEffect'>) => (
  <ComponentErrorBoundary componentName="GlowingIcon">
    <Icon hoverEffect="glow" {...props} />
  </ComponentErrorBoundary>
)

/**
 * Mobile-optimized icon variant
 * @component
 * @example
 * <MobileIcon name="menu" size="lg" />
 */
export const MobileIcon = (props: Omit<IconProps, 'mobileOptimized'>) => (
  <ComponentErrorBoundary componentName="MobileIcon">
    <Icon mobileOptimized={true} size={props.size || 'md'} {...props} />
  </ComponentErrorBoundary>
)

/**
 * Compact mobile-optimized icon variant
 * @component
 * @example
 * <CompactIcon name="close" />
 */
export const CompactIcon = (props: Omit<IconProps, 'size' | 'mobileOptimized'>) => (
  <ComponentErrorBoundary componentName="CompactIcon">
    <Icon size="sm" mobileOptimized={true} {...props} />
  </ComponentErrorBoundary>
)

/**
 * Icon with text component for better alignment and accessibility
 * @component
 * @example
 * <IconWithText name="user" position="left" gap="sm">
 *   Profile
 * </IconWithText>
 */
export const IconWithText = ({
  name,
  children,
  position = 'left',
  gap = 'sm',
  className,
  testId,
  ...iconProps
}: IconProps & {
  children: React.ReactNode
  position?: 'left' | 'right'
  gap?: 'xs' | 'sm' | 'md'
  className?: string
  testId?: string
}) => {
  const gapClasses = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
  }

  return (
    <ComponentErrorBoundary componentName="IconWithText">
      <div 
        className={cn(
          'inline-flex items-center',
          gapClasses[gap],
          'mobile-only:gap-1.5',
          className
        )}
        data-testid={testId}
        data-icon-with-text={name}
        data-position={position}
      >
        {position === 'left' && (
          <Icon 
            name={name} 
            {...iconProps} 
            testId={testId ? `${testId}-icon` : undefined}
          />
        )}
        <span 
          className="mobile-only:text-sm"
          data-testid={testId ? `${testId}-text` : undefined}
        >
          {children}
        </span>
        {position === 'right' && (
          <Icon 
            name={name} 
            {...iconProps} 
            testId={testId ? `${testId}-icon` : undefined}
          />
        )}
      </div>
    </ComponentErrorBoundary>
  )
}