/**
 * Lazy-loaded transactions table component
 * Code splitting for better performance
 */

import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'

// Create a reusable loading skeleton for the transactions table
const TransactionsTableSkeleton = () => (
  <Card className="bg-gray-800 border-gray-700">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
        <Calendar className="h-5 w-5 text-blue-400" />
        Transactions
      </CardTitle>
      <CardDescription className="text-gray-400 text-sm sm:text-base">
        Loading transactions...
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="min-h-[400px] sm:min-h-[600px]">
        <div className="animate-pulse space-y-4">
          {/* Desktop table skeleton */}
          <div className="hidden sm:block">
            <div className="border border-gray-700 rounded-lg">
              {/* Table header */}
              <div className="flex border-b border-gray-600 p-4">
                <div className="flex-1 h-4 bg-gray-600 rounded mr-4"></div>
                <div className="flex-1 h-4 bg-gray-600 rounded mr-4"></div>
                <div className="flex-1 h-4 bg-gray-600 rounded mr-4"></div>
                <div className="w-20 h-4 bg-gray-600 rounded mr-4"></div>
                <div className="flex-1 h-4 bg-gray-600 rounded mr-4"></div>
                <div className="w-20 h-4 bg-gray-600 rounded"></div>
              </div>
              
              {/* Table rows */}
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex border-b border-gray-700 p-4 last:border-b-0">
                  <div className="flex-1 h-4 bg-gray-700 rounded mr-4"></div>
                  <div className="flex-1 h-4 bg-gray-700 rounded mr-4"></div>
                  <div className="flex-1 h-4 bg-gray-700 rounded mr-4"></div>
                  <div className="w-20 h-4 bg-gray-700 rounded mr-4"></div>
                  <div className="flex-1 h-4 bg-gray-700 rounded mr-4"></div>
                  <div className="w-20 h-4 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile cards skeleton */}
          <div className="sm:hidden space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-20"></div>
                  </div>
                  <div className="text-right">
                    <div className="h-5 bg-gray-600 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-600 rounded w-20"></div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-3 bg-gray-600 rounded w-32"></div>
                  <div className="flex gap-2">
                    <div className="h-8 w-8 bg-gray-600 rounded"></div>
                    <div className="h-8 w-8 bg-gray-600 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
)

// This would be used if we had a separate TransactionsTable component
// For now, this serves as a template for future lazy loading
export { TransactionsTableSkeleton }