/**
 * Comprehensive error handling utilities for the application
 * Provides consistent error handling patterns across all components
 */

export interface AppError {
  code: string
  message: string
  component?: string
  details?: unknown
  timestamp: Date
}

export interface ErrorHandlerOptions {
  component?: string
  showToast?: boolean
  logToConsole?: boolean
  throwError?: boolean
}

/**
 * Error codes for consistent error handling
 */
export const ErrorCodes = {
  // Component errors
  COMPONENT_RENDER: 'COMPONENT_RENDER_ERROR',
  COMPONENT_MOUNT: 'COMPONENT_MOUNT_ERROR',
  COMPONENT_PROPS: 'COMPONENT_PROPS_ERROR',
  
  // UI errors
  ICON_NOT_FOUND: 'ICON_NOT_FOUND',
  ANIMATION_FAILED: 'ANIMATION_FAILED',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  
  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TYPE_ERROR: 'TYPE_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const

/**
 * Creates a standardized application error
 */
export function createAppError(
  code: keyof typeof ErrorCodes,
  message: string,
  details?: unknown,
  component?: string
): AppError {
  return {
    code: ErrorCodes[code],
    message,
    details,
    component,
    timestamp: new Date()
  }
}

/**
 * Handles errors with consistent logging and optional UI feedback
 */
export function handleError(
  error: unknown,
  options: ErrorHandlerOptions = {}
): AppError {
  const {
    component,
    showToast = false,
    logToConsole = true,
    throwError = false
  } = options

  // Convert to AppError if it's not already
  const appError = isAppError(error)
    ? error
    : createAppError(
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'An unknown error occurred',
        error,
        component
      )

  // Log to console if enabled
  if (logToConsole) {
    console.error(`[${appError.component || 'Unknown Component'}] ${appError.code}: ${appError.message}`, {
      error: appError,
      timestamp: appError.timestamp.toISOString()
    })
  }

  // Show toast notification if enabled
  if (showToast && typeof window !== 'undefined') {
    // This would integrate with your toast system
    console.warn('Toast notification would show here:', appError.message)
  }

  // Re-throw if configured to do so
  if (throwError) {
    throw appError
  }

  return appError
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  )
}

/**
 * Error boundary utility for wrapping component functions
 */
export function withErrorBoundary<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  componentName: string,
  errorHandler?: (error: AppError) => void
): (...args: TArgs) => TReturn | null {
  return (...args: TArgs) => {
    try {
      return fn(...args)
    } catch (error) {
      const appError = handleError(error, {
        component: componentName,
        logToConsole: true,
        throwError: false
      })
      
      errorHandler?.(appError)
      return null
    }
  }
}

/**
 * Validates component props with detailed error reporting
 */
export function validateProps<T extends object>(
  props: T,
  validator: (props: T) => { isValid: boolean; errors: string[] },
  componentName: string
): void {
  const validation = validator(props)
  
  if (!validation.isValid) {
    const error = createAppError(
      'COMPONENT_PROPS',
      `Invalid props for ${componentName}: ${validation.errors.join(', ')}`,
      { props, errors: validation.errors },
      componentName
    )
    
    handleError(error, { component: componentName })
  }
}

/**
 * Safe hook for handling async operations in components
 */
export function useAsyncErrorBoundary() {
  const handleAsyncError = (error: unknown, componentName: string) => {
    return handleError(error, {
      component: componentName,
      showToast: true,
      logToConsole: true
    })
  }

  return { handleAsyncError }
}