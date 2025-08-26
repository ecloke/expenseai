/**
 * Lazy loading utilities for ExpenseAI
 * Provides consistent loading states and error boundaries for code splitting
 */

import dynamic from 'next/dynamic'
import { ComponentType, ReactNode, Suspense } from 'react'

/**
 * Generic loading spinner component
 */
export const LoadingSpinner = ({ message = 'Loading...' }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  </div>
)

/**
 * Page loading skeleton
 */
export const PageSkeleton = () => (
  <div className="animate-pulse">
    {/* Header skeleton */}
    <div className="mb-8">
      <div className="h-8 bg-gray-700 rounded w-64 mb-4"></div>
      <div className="h-4 bg-gray-600 rounded w-96"></div>
    </div>

    {/* Content cards skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="h-6 bg-gray-600 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="h-6 bg-gray-600 rounded w-40 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    </div>

    {/* Table skeleton */}
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="h-6 bg-gray-600 rounded w-32 mb-4"></div>
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-4 bg-gray-700 rounded flex-1"></div>
            <div className="h-4 bg-gray-700 rounded flex-1"></div>
            <div className="h-4 bg-gray-700 rounded flex-1"></div>
            <div className="h-4 bg-gray-700 rounded w-20"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

/**
 * Error fallback component for lazy loaded components
 */
export const ErrorFallback = ({ 
  error, 
  retry 
}: { 
  error?: Error; 
  retry?: () => void 
}) => (
  <div className="flex items-center justify-center min-h-[400px] bg-gray-800 border border-gray-700 rounded-lg">
    <div className="text-center p-8">
      <div className="text-red-400 text-lg mb-4">⚠️ Failed to load component</div>
      <p className="text-gray-400 mb-4">
        {error?.message || 'Something went wrong while loading this section.'}
      </p>
      {retry && (
        <button
          onClick={retry}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  </div>
)

/**
 * Higher-order component for lazy loading with consistent loading states
 */
export function withLazyLoading<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  loadingComponent?: ReactNode,
  errorFallback?: ReactNode
) {
  const LazyComponent = dynamic(importFn, {
    loading: () => loadingComponent as any || <LoadingSpinner />,
    ssr: false,
  })

  return function LazyLoadedComponent(props: P) {
    return (
      <Suspense fallback={loadingComponent || <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    )
  }
}

/**
 * Preload a lazy component for better UX
 */
export function preloadComponent(importFn: () => Promise<any>) {
  // Preload on hover or other interaction
  return () => {
    importFn().catch(() => {
      // Silently handle preload errors
    })
  }
}

/**
 * Lazy load pages with route-based code splitting
 */
export const LazyPages = {
  Dashboard: dynamic(() => import('../app/dashboard/page'), {
    loading: () => <PageSkeleton />,
    ssr: false,
  }),
  Transactions: dynamic(() => import('../app/transactions/page'), {
    loading: () => <PageSkeleton />,
    ssr: false,
  }),
  Projects: dynamic(() => import('../app/projects/page'), {
    loading: () => <PageSkeleton />,
    ssr: false,
  }),
  Settings: dynamic(() => import('../app/settings/page'), {
    loading: () => <PageSkeleton />,
    ssr: false,
  }),
}

export default {
  LoadingSpinner,
  PageSkeleton,
  ErrorFallback,
  withLazyLoading,
  preloadComponent,
  LazyPages,
}