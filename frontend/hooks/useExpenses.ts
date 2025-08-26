/**
 * Custom hooks for expense data management
 * Provides React Query integration for caching and state management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { expenseAPI } from '@/lib/apiClient'
import { queryKeys, invalidateQueries } from '@/lib/queryClient'
import { Expense } from '@/types'

interface ExpenseFilters {
  searchTerm?: string
  categoryFilter?: string
  projectFilter?: string
  dateRange?: string
  customStartDate?: Date | null
  customEndDate?: Date | null
  limit?: number
  offset?: number
}

/**
 * Hook to fetch expenses with filters and pagination
 */
export const useExpenses = (userId: string, filters: ExpenseFilters) => {
  return useQuery({
    queryKey: queryKeys.expenses.list(filters),
    queryFn: () => expenseAPI.getExpenses(userId, filters),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch expense statistics
 */
export const useExpenseStats = (
  userId: string, 
  dateRange: 'week' | 'month' | 'year' | 'all' = 'month'
) => {
  return useQuery({
    queryKey: queryKeys.expenses.stats(dateRange),
    queryFn: () => expenseAPI.getExpenseStats(userId, dateRange),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Hook to create a new expense
 */
export const useCreateExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, expenseData }: {
      userId: string
      expenseData: {
        receiptDate: string
        storeName: string
        category: string
        totalAmount: number
        projectId?: string
      }
    }) => expenseAPI.createExpense(userId, expenseData),
    onSuccess: () => {
      // Invalidate all expense-related queries
      invalidateQueries.expenses()
      invalidateQueries.expenseStats()
    },
    onError: (error) => {
      console.error('Error creating expense:', error)
    },
  })
}

/**
 * Hook to update an expense
 */
export const useUpdateExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ 
      userId, 
      expenseId, 
      updates 
    }: {
      userId: string
      expenseId: string
      updates: Partial<{
        receipt_date: string
        store_name: string
        category: string
        total_amount: number
        project_id: string | null
      }>
    }) => expenseAPI.updateExpense(userId, expenseId, updates),
    onSuccess: () => {
      // Invalidate relevant queries
      invalidateQueries.expenses()
      invalidateQueries.expenseStats()
    },
    onError: (error) => {
      console.error('Error updating expense:', error)
    },
  })
}

/**
 * Hook to delete an expense
 */
export const useDeleteExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, expenseId }: { userId: string; expenseId: string }) =>
      expenseAPI.deleteExpense(userId, expenseId),
    onSuccess: () => {
      // Invalidate relevant queries
      invalidateQueries.expenses()
      invalidateQueries.expenseStats()
    },
    onError: (error) => {
      console.error('Error deleting expense:', error)
    },
  })
}