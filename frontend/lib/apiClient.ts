/**
 * Centralized API client for ExpenseAI
 * This eliminates duplicate Supabase queries across components
 */

import { createSupabaseClient } from './supabase'
import { Expense } from '@/types'
import { formatDateForAPI, getTodayString, getYesterdayString, getDaysAgoString, getWeekStartString, getMonthStartString } from './dateUtils'

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

interface PaginatedResponse<T> {
  data: T[]
  count: number
}

/**
 * Expense API operations
 */
export class ExpenseAPI {
  private supabase = createSupabaseClient()

  /**
   * Get expenses with filters and pagination
   */
  async getExpenses(userId: string, filters: ExpenseFilters = {}): Promise<PaginatedResponse<Expense>> {
    const {
      searchTerm,
      categoryFilter,
      projectFilter,
      dateRange,
      customStartDate,
      customEndDate,
      limit = 20,
      offset = 0
    } = filters

    let query = this.supabase
      .from('expenses')
      .select('*, projects(name, currency)', { count: 'exact' })
      .eq('user_id', userId)
      .order('receipt_date', { ascending: false })

    // Apply search filter
    if (searchTerm) {
      query = query.ilike('store_name', `%${searchTerm}%`)
    }

    // Apply category filter
    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter)
    }

    // Apply project filter
    if (projectFilter === 'general') {
      query = query.is('project_id', null)
    } else if (projectFilter && projectFilter !== 'all') {
      query = query.eq('project_id', projectFilter)
    }

    // Apply date range filter
    if (dateRange === 'week') {
      query = query.gte('receipt_date', getDaysAgoString(7))
    } else if (dateRange === 'month') {
      query = query.gte('receipt_date', getMonthStartString())
    } else if (dateRange === 'custom') {
      if (customStartDate) {
        query = query.gte('receipt_date', formatDateForAPI(customStartDate))
      }
      if (customEndDate) {
        query = query.lte('receipt_date', formatDateForAPI(customEndDate))
      }
    }

    // Apply pagination
    const from = offset
    const to = from + limit - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      throw error
    }

    return {
      data: data || [],
      count: count || 0
    }
  }

  /**
   * Get expenses by date range
   */
  async getExpensesByDateRange(userId: string, startDate: string, endDate: string): Promise<Expense[]> {
    const { data, error } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('receipt_date', startDate)
      .lte('receipt_date', endDate)
      .order('receipt_date', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Get expenses for specific time periods
   */
  async getTodayExpenses(userId: string): Promise<Expense[]> {
    const today = getTodayString()
    return this.getExpensesByDateRange(userId, today, today)
  }

  async getYesterdayExpenses(userId: string): Promise<Expense[]> {
    const yesterday = getYesterdayString()
    return this.getExpensesByDateRange(userId, yesterday, yesterday)
  }

  async getWeekExpenses(userId: string): Promise<Expense[]> {
    const weekStart = getWeekStartString()
    const today = getTodayString()
    return this.getExpensesByDateRange(userId, weekStart, today)
  }

  async getMonthExpenses(userId: string): Promise<Expense[]> {
    const monthStart = getMonthStartString()
    const today = getTodayString()
    return this.getExpensesByDateRange(userId, monthStart, today)
  }

  /**
   * Create new expense
   */
  async createExpense(userId: string, expenseData: {
    receiptDate: string
    storeName: string
    category: string
    totalAmount: number
    projectId?: string
  }): Promise<Expense> {
    const { data, error } = await this.supabase
      .from('expenses')
      .insert([{
        user_id: userId,
        receipt_date: expenseData.receiptDate,
        store_name: expenseData.storeName,
        category: expenseData.category,
        total_amount: expenseData.totalAmount,
        project_id: expenseData.projectId || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Update expense
   */
  async updateExpense(userId: string, expenseId: string, updates: Partial<{
    receipt_date: string
    store_name: string
    category: string
    total_amount: number
    project_id: string | null
  }>): Promise<Expense> {
    const { data, error } = await this.supabase
      .from('expenses')
      .update(updates)
      .eq('id', expenseId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Delete expense
   */
  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    const { error } = await this.supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  }

  /**
   * Get expense statistics
   */
  async getExpenseStats(userId: string, dateRange: 'week' | 'month' | 'year' | 'all' = 'month'): Promise<{
    total: number
    count: number
    categories: Array<{
      category: string
      amount: number
      percentage: number
    }>
  }> {
    let query = this.supabase
      .from('expenses')
      .select('category, total_amount')
      .eq('user_id', userId)

    // Apply date filter
    if (dateRange === 'week') {
      query = query.gte('receipt_date', getDaysAgoString(7))
    } else if (dateRange === 'month') {
      query = query.gte('receipt_date', getMonthStartString())
    } else if (dateRange === 'year') {
      query = query.gte('receipt_date', getDaysAgoString(365))
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    const expenses = data || []
    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0)
    const count = expenses.length

    // Category breakdown
    const categoryTotals: { [key: string]: number } = {}
    expenses.forEach(expense => {
      const category = expense.category
      categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.total_amount)
    })

    const categories = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2)),
        percentage: total > 0 ? parseFloat(((amount / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.amount - a.amount)

    return {
      total: parseFloat(total.toFixed(2)),
      count,
      categories
    }
  }
}

/**
 * Project API operations
 */
export class ProjectAPI {
  private supabase = createSupabaseClient()

  /**
   * Get all projects for user
   */
  async getProjects(userId: string): Promise<Array<{
    id: string
    name: string
    currency: string
    status: string
    created_at: string
  }>> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  }

  /**
   * Create new project
   */
  async createProject(userId: string, projectData: {
    name: string
    currency: string
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('projects')
      .insert([{
        user_id: userId,
        name: projectData.name,
        currency: projectData.currency,
        status: 'open',
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Update project
   */
  async updateProject(userId: string, projectId: string, updates: {
    name?: string
    currency?: string
    status?: string
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }

  /**
   * Delete project
   */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  }
}

/**
 * User/Auth API operations
 */
export class AuthAPI {
  private supabase = createSupabaseClient()

  /**
   * Get current session
   */
  async getSession() {
    return await this.supabase.auth.getSession()
  }

  /**
   * Sign in with email/password
   */
  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password })
  }

  /**
   * Sign up with email/password
   */
  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password })
  }

  /**
   * Sign out
   */
  async signOut() {
    return await this.supabase.auth.signOut()
  }
}

/**
 * HTTP Client for backend API endpoints
 */
class HTTPClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'API request failed')
    }

    return result
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}/api${endpoint}`)
    
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.error || 'API request failed')
    }

    return result
  }
}

// Export singleton instances
export const expenseAPI = new ExpenseAPI()
export const projectAPI = new ProjectAPI()
export const authAPI = new AuthAPI()
export const apiClient = new HTTPClient()