/**
 * Lazy-loaded ExpenseCharts component
 * Improves initial page load performance by code splitting
 */

import dynamic from 'next/dynamic'
import { ComponentProps } from 'react'
import ExpenseCharts from './ExpenseCharts'

// Lazy load the ExpenseCharts component with loading state
const ExpenseChartsLazy = dynamic(() => import('./ExpenseCharts'), {
  loading: () => (
    <div className="space-y-6">
      {/* Loading skeleton for charts */}
      <div className="animate-pulse">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-700 rounded w-48"></div>
          <div className="h-10 bg-gray-700 rounded w-64"></div>
        </div>
        
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="h-6 bg-gray-600 rounded w-32 mb-3"></div>
              <div className="h-8 bg-gray-600 rounded w-24"></div>
            </div>
          ))}
        </div>
        
        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="h-6 bg-gray-600 rounded w-40 mb-4"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="h-6 bg-gray-600 rounded w-40 mb-4"></div>
            <div className="h-64 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  ),
  ssr: false, // Disable SSR for better performance
})

export default ExpenseChartsLazy