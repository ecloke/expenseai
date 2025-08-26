'use client'

/**
 * Error Boundary component for ExpenseAI
 * Provides standardized error handling and user-friendly error messages
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Update state with error info
    this.setState({
      error,
      errorInfo
    })

    // You could also log the error to an error reporting service here
    // logErrorToService(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <Card className="bg-gray-800 border-red-600/50 max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-white text-2xl mb-2">
                Something went wrong
              </CardTitle>
              <CardDescription className="text-gray-300">
                We encountered an unexpected error. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Error details (only in development) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                  <h4 className="text-red-400 font-medium mb-2">Error Details (Development)</h4>
                  <pre className="text-xs text-gray-400 overflow-x-auto">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-4">
                      <summary className="text-gray-500 cursor-pointer text-sm">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-gray-500 mt-2 overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={this.handleRetry}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {/* Help text */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">
                  If this problem persists, please try refreshing the page or contact support.
                </p>
                {process.env.NODE_ENV === 'production' && (
                  <p className="text-gray-500 text-xs mt-2">
                    Error ID: {Date.now().toString(36)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Lightweight error fallback for smaller components
 */
export const ErrorFallback = ({
  error,
  resetError,
  message = 'Something went wrong'
}: {
  error?: Error
  resetError?: () => void
  message?: string
}) => (
  <Card className="bg-gray-800 border-red-600/50">
    <CardContent className="p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-white text-lg font-medium mb-2">{message}</h3>
      <p className="text-gray-400 text-sm mb-4">
        We encountered an error loading this section.
      </p>
      {resetError && (
        <Button
          onClick={resetError}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      )}
      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-4 text-left">
          <summary className="text-gray-500 cursor-pointer text-sm">
            Error Details
          </summary>
          <pre className="text-xs text-gray-500 mt-2 bg-gray-900 p-2 rounded overflow-x-auto">
            {error.toString()}
          </pre>
        </details>
      )}
    </CardContent>
  </Card>
)

/**
 * Hook to use with React Error Boundary
 */
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by error handler:', error, errorInfo)
    }

    // In production, you might want to send this to an error tracking service
    // Example: logErrorToService(error, errorInfo)
  }
}

export default ErrorBoundary