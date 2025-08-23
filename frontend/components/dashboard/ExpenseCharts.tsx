'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'
import {
  Calendar,
  DollarSign,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart3,
  Receipt
} from 'lucide-react'
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface Expense {
  id: string
  receipt_date: string
  store_name: string
  category: string
  total_amount: number
  created_at: string
}

interface ExpenseChartsProps {
  userId: string
}

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#00c49f',
  '#0088fe',
  '#ff0062'
]

const CATEGORY_EMOJIS: { [key: string]: string } = {
  groceries: '🛒',
  dining: '🍽️',
  gas: '⛽',
  pharmacy: '💊',
  retail: '🛍️',
  services: '🔧',
  other: '📦'
}

export default function ExpenseCharts({ userId }: ExpenseChartsProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('month')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadExpenses()
  }, [userId, timeRange])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseClient()

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('receipt_date', { ascending: false })

      // Apply time range filter
      const now = new Date()
      if (timeRange === 'week') {
        const weekStart = startOfWeek(now)
        query = query.gte('receipt_date', format(weekStart, 'yyyy-MM-dd'))
      } else if (timeRange === 'month') {
        const monthStart = startOfMonth(now)
        query = query.gte('receipt_date', format(monthStart, 'yyyy-MM-dd'))
      }

      const { data, error } = await query.limit(1000)

      if (error) {
        throw error
      }

      setExpenses(data || [])
      setError(null)
    } catch (error) {
      console.error('Error loading expenses:', error)
      setError('Failed to load expense data')
    } finally {
      setLoading(false)
    }
  }

  const getDailySpending = () => {
    const dailyData: { [key: string]: number } = {}
    
    expenses.forEach(expense => {
      const date = expense.receipt_date
      dailyData[date] = (dailyData[date] || 0) + parseFloat(expense.total_amount.toString())
    })

    return Object.entries(dailyData)
      .map(([date, amount]) => ({
        date,
        amount: parseFloat(amount.toFixed(2)),
        formatted_date: format(new Date(date), 'MMM dd')
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days
  }

  const getCategoryBreakdown = () => {
    const categoryData: { [key: string]: number } = {}
    
    expenses.forEach(expense => {
      const category = expense.category
      categoryData[category] = (categoryData[category] || 0) + parseFloat(expense.total_amount.toString())
    })

    return Object.entries(categoryData)
      .map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2)),
        percentage: 0 // Will calculate after total
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  const getTopStores = () => {
    const storeData: { [key: string]: { amount: number, count: number } } = {}
    
    expenses.forEach(expense => {
      const store = expense.store_name
      if (!storeData[store]) {
        storeData[store] = { amount: 0, count: 0 }
      }
      storeData[store].amount += parseFloat(expense.total_amount.toString())
      storeData[store].count += 1
    })

    return Object.entries(storeData)
      .map(([store, data]) => ({
        store,
        amount: parseFloat(data.amount.toFixed(2)),
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  const getTotalStats = () => {
    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount.toString()), 0)
    const count = expenses.length
    const avgPerTransaction = count > 0 ? total / count : 0
    
    return {
      total: parseFloat(total.toFixed(2)),
      count,
      avgPerTransaction: parseFloat(avgPerTransaction.toFixed(2))
    }
  }

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <div className="text-gray-300">Loading expense data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center text-red-400">{error}</div>
        </CardContent>
      </Card>
    )
  }

  const dailySpending = getDailySpending()
  const categoryBreakdown = getCategoryBreakdown()
  const topStores = getTopStores()
  const stats = getTotalStats()

  // Calculate percentages for category breakdown
  categoryBreakdown.forEach(item => {
    item.percentage = parseFloat(((item.amount / stats.total) * 100).toFixed(1))
  })

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Expense Analytics</h2>
        <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
          <TabsList className="bg-gray-800 border-gray-600">
            <TabsTrigger value="week" className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white">This Week</TabsTrigger>
            <TabsTrigger value="month" className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white">This Month</TabsTrigger>
            <TabsTrigger value="all" className="text-gray-300 data-[state=active]:bg-blue-600 data-[state=active]:text-white">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${stats.total}</div>
            <p className="text-xs text-gray-400 mt-1">This {timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'period'}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.count}</div>
            <p className="text-xs text-gray-400 mt-1">Total receipts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg per Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">${stats.avgPerTransaction}</div>
            <p className="text-xs text-gray-400 mt-1">Average spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spending Bar Chart */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              Daily Spending
            </CardTitle>
            <CardDescription className="text-gray-400">Your daily expense pattern</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySpending}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="formatted_date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Amount']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F3F4F6' }}
                />
                <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Pie Chart */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChartIcon className="h-5 w-5 text-green-400" />
              Category Breakdown
            </CardTitle>
            <CardDescription className="text-gray-400">Spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${CATEGORY_EMOJIS[category] || ''} ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`$${value}`, 'Amount']}
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F3F4F6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Details and Top Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Details */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Category Details</CardTitle>
            <CardDescription className="text-gray-400">Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categoryBreakdown.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium text-gray-200">
                      {CATEGORY_EMOJIS[category.category]} {category.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white">${category.amount}</div>
                    <div className="text-sm text-gray-400">{category.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Stores */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Top Stores</CardTitle>
            <CardDescription className="text-gray-400">Your most visited stores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStores.map((store, index) => (
                <div key={store.store} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
                  <div>
                    <div className="font-medium text-gray-200">{store.store}</div>
                    <div className="text-sm text-gray-400">{store.count} transactions</div>
                  </div>
                  <div className="font-semibold text-white">${store.amount}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}