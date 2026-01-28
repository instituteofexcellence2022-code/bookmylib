'use client'

import React from 'react'
import { AlertCircle, RefreshCw, Bug, FileText, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createAppError, handleError, type AppError } from '@/lib/error-handling'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
  componentName?: string
  showErrorDetails?: boolean
  onError?: (error: Error | AppError, errorInfo: React.ErrorInfo) => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error | AppError
  errorInfo?: React.ErrorInfo
  errorId?: string
}

/**
 * Comprehensive error boundary component with enhanced error handling,
 * detailed error reporting, and customizable fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { 
      hasError: false
    }
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error,
      errorId: undefined // Generated in componentDidCatch to avoid hydration mismatch
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Generate ID here if not present
    const errorId = this.state.errorId || `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Update state with ID if it was undefined
    if (!this.state.errorId) {
        this.setState({ errorId })
    }

    const appError = createAppError(
      'COMPONENT_RENDER',
      error.message,
      {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: errorId
      },
      this.props.componentName
    )

    // Enhanced error logging
    handleError(appError, {
      component: this.props.componentName,
      logToConsole: true,
      showToast: false
    })

    this.setState({ error: appError, errorInfo })
    this.props.onError?.(appError, errorInfo)
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      errorId: this.generateErrorId()
    })
    this.props.onReset?.()
  }

  handleCopyErrorDetails = () => {
    const errorDetails = this.getErrorDetails()
    navigator.clipboard.writeText(errorDetails).catch(() => {
      console.warn('Failed to copy error details to clipboard')
    })
  }

  getErrorDetails(): string {
    const { error, errorInfo, errorId } = this.state
    const { componentName } = this.props
    
    return `Error ID: ${errorId}
Component: ${componentName || 'Unknown'}
Time: ${new Date().toISOString()}
Message: ${error?.message || 'Unknown error'}
Stack: ${(error as Error)?.stack || 'No stack trace'}
Component Stack: ${errorInfo?.componentStack || 'No component stack'}`
  }

  renderErrorDetails() {
    if (!this.props.showErrorDetails) return null

    return (
      <div className="mt-4 p-3 bg-error-100 border border-error-200 rounded-md text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">Error Details</span>
          <button
            onClick={this.handleCopyErrorDetails}
            className="inline-flex items-center gap-1 px-2 py-1 bg-error-200 hover:bg-error-300 rounded text-xs"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <div className="font-mono whitespace-pre-wrap break-words opacity-75">
          {this.state.error?.message}
        </div>
      </div>
    )
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className={cn(
          'flex flex-col items-center justify-center p-6 bg-error-50 border border-error-200 rounded-lg',
          'text-error-800 text-center',
          this.props.className
        )}>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-8 h-8 text-error-600" />
            <Bug className="w-6 h-6 text-error-500" />
          </div>
          
          <h3 className="font-semibold text-lg mb-2">Something went wrong</h3>
          
          <p className="text-sm mb-4 opacity-80 max-w-md">
            {this.props.componentName 
              ? `The ${this.props.componentName} component encountered an error.`
              : 'This component encountered an error.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-error-600 text-white rounded-md hover:bg-error-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 border border-error-300 text-error-700 rounded-md hover:bg-error-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Reload Page
            </button>
          </div>

          {this.renderErrorDetails()}

          {this.state.errorId && (
            <div className="mt-3 text-xs opacity-60">
              Error ID: {this.state.errorId}
            </div>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string,
  errorBoundaryProps?: Partial<ErrorBoundaryProps>
): React.ComponentType<P> {
  const displayName = Component.displayName || Component.name || 'Component'
  
  const ComponentWithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary componentName={componentName} {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`
  
  return ComponentWithErrorBoundary
}

// Error boundary for specific component types
export const ComponentErrorBoundary: React.FC<{
  children: React.ReactNode
  componentName: string
}> = ({ children, componentName }) => (
  <ErrorBoundary
    onError={(error) => {
      console.error(`Error in ${componentName}:`, error)
    }}
    fallback={
      <div className="p-4 bg-warning-50 border border-warning-200 rounded">
        <p className="text-warning-800 text-sm">
          {componentName} component is temporarily unavailable.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)