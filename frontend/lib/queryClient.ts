/**
 * React Query configuration for ExpenseAI
 * Provides centralized caching and query management
 */

import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry delay
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (for fresh data when user returns)
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
})

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters: Record<string, any>) => [...queryKeys.expenses.lists(), filters] as const,
    details: () => [...queryKeys.expenses.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.expenses.details(), id] as const,
    stats: (period: string, projectId?: string) => 
      [...queryKeys.expenses.all, 'stats', period, projectId] as const,
    charts: (timeRange: string, projectId?: string) => 
      [...queryKeys.expenses.all, 'charts', timeRange, projectId] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    session: () => [...queryKeys.user.all, 'session'] as const,
  },
} as const

/**
 * Cache invalidation helpers
 */
export const invalidateQueries = {
  // Invalidate all expense-related queries
  expenses: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all }),
  
  // Invalidate specific expense lists
  expenseLists: () => queryClient.invalidateQueries({ queryKey: queryKeys.expenses.lists() }),
  
  // Invalidate expense stats and charts
  expenseStats: () => queryClient.invalidateQueries({ 
    queryKey: queryKeys.expenses.all,
    predicate: query => query.queryKey.includes('stats') || query.queryKey.includes('charts')
  }),
  
  // Invalidate all project-related queries
  projects: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  
  // Invalidate user-related queries
  user: () => queryClient.invalidateQueries({ queryKey: queryKeys.user.all }),
}

/**
 * Prefetch helpers for better UX
 */
export const prefetchQueries = {
  // Prefetch today's expenses
  todayExpenses: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.expenses.list({ 
        userId, 
        dateRange: 'today',
        categoryFilter: 'all',
        projectFilter: 'all' 
      }),
      staleTime: 2 * 60 * 1000, // Fresh for 2 minutes
    })
  },
  
  // Prefetch projects list
  projects: async (userId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.projects.lists(),
      staleTime: 10 * 60 * 1000, // Projects change less frequently
    })
  },
}