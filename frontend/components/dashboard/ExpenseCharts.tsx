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
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Receipt,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Expense } from '@/types'
import { CHART_COLORS, TimeRange } from '@/lib/constants'
import { getDateRange, formatDateForAPI, getDaysAgoString, getMonthStartString } from '@/lib/dateUtils'
import { format } from 'date-fns'
import { InlineDateRangePicker } from '@/components/dashboard/InlineDateRangePicker'

interface ExpenseChartsProps {
  userId: string
  projectId?: string
  currency?: string
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  receipt_date: string
  store_name: string
  category: string
  total_amount: number
  created_at: string
  project_id?: string
}

export default function ExpenseCharts({ userId, projectId, currency = '$' }: ExpenseChartsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'income' | 'expense'>('overview')

  useEffect(() => {
    if (userId) {
      loadTransactions()
    }
  }, [userId, timeRange, projectId, customDateRange])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      
      // Build query parameters - MATCH TRANSACTIONS PAGE EXACTLY
      const params = new URLSearchParams({
        user_id: userId,
        limit: '1000',
        offset: '0'
      })

      // Apply time range filter - EXACT SAME LOGIC AS TRANSACTIONS PAGE
      if (timeRange === 'week') {
        params.append('start_date', getDaysAgoString(7))
      } else if (timeRange === 'month') {
        params.append('start_date', getMonthStartString())
      } else if (timeRange === 'custom') {
        if (customDateRange?.start) {
          params.append('start_date', formatDateForAPI(customDateRange.start))
        }
        if (customDateRange?.end) {
          params.append('end_date', formatDateForAPI(customDateRange.end))
        }
      }

      // Fetch transactions from the new API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/expenses?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch transactions')
      }

      let data = result.data || []

      // Apply project filter client-side
      if (projectId === 'general') {
        data = data.filter((tx: Transaction) => !tx.project_id)
      } else if (projectId && projectId !== 'general') {
        data = data.filter((tx: Transaction) => tx.project_id === projectId)
      }

      // Convert data to consistent format
      const transactions: Transaction[] = data.map((tx: any) => ({
        id: tx.id,
        type: tx.type || tx.transaction_type || 'expense',
        receipt_date: tx.receipt_date,
        store_name: tx.store_name,
        category: tx.category || tx.category_name,
        total_amount: parseFloat(tx.total_amount.toString()),
        created_at: tx.created_at,
        project_id: tx.project_id
      }))

      setTransactions(transactions)
      setError(null)
    } catch (error) {
      console.error('Error loading transactions:', error)
      setError('Failed to load transaction data')
    } finally {
      setLoading(false)
    }
  }

  const getDailyTransactionData = () => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    const dailyData: { [key: string]: { income: number, expense: number } } = {}
    
    transactions.forEach(tx => {
      const date = tx.receipt_date
      if (!dailyData[date]) {
        dailyData[date] = { income: 0, expense: 0 }
      }
      
      if (tx.type === 'income') {
        dailyData[date].income += tx.total_amount
      } else {
        dailyData[date].expense += tx.total_amount
      }
    })

    return Object.entries(dailyData)
      .map(([date, amounts]) => ({
        date,
        income: parseFloat(amounts.income.toFixed(2)),
        expense: parseFloat(amounts.expense.toFixed(2)),
        net: parseFloat((amounts.income - amounts.expense).toFixed(2)),
        formatted_date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30) // Last 30 days
  }

  const getCategoryBreakdownData = (type?: 'income' | 'expense') => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    const filteredTx = type ? transactions.filter(tx => tx.type === type) : transactions
    const categoryData: { [key: string]: { amount: number, type: string } } = {}
    
    filteredTx.forEach(tx => {
      const category = tx.category
      if (!categoryData[category]) {
        categoryData[category] = { amount: 0, type: tx.type }
      }
      categoryData[category].amount += tx.total_amount
    })

    return Object.entries(categoryData)
      .map(([category, data]) => ({
        category,
        amount: parseFloat(data.amount.toFixed(2)),
        type: data.type,
        percentage: 0 // Will calculate after total
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  const getTopStoresData = (type?: 'income' | 'expense') => {
    if (!transactions || transactions.length === 0) {
      return [];
    }
    
    const filteredTx = type ? transactions.filter(tx => tx.type === type) : transactions
    const storeData: { [key: string]: { amount: number, count: number, type: string } } = {}
    
    filteredTx.forEach(tx => {
      const store = tx.store_name
      if (!storeData[store]) {
        storeData[store] = { amount: 0, count: 0, type: tx.type }
      }
      storeData[store].amount += tx.total_amount
      storeData[store].count += 1
    })

    return Object.entries(storeData)
      .map(([store, data]) => ({
        store,
        amount: parseFloat(data.amount.toFixed(2)),
        count: data.count,
        type: data.type
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  const getTotalStatsData = () => {
    if (!transactions || transactions.length === 0) {
      return {
        totalIncome: 0,
        totalExpense: 0,
        netIncome: 0,
        incomeCount: 0,
        expenseCount: 0,
        totalCount: 0,
        avgPerTransaction: 0
      };
    }
    
    const income = transactions.filter(tx => tx.type === 'income')
    const expenses = transactions.filter(tx => tx.type === 'expense')
    
    const totalIncome = income.reduce((sum, tx) => sum + tx.total_amount, 0)
    const totalExpense = expenses.reduce((sum, tx) => sum + tx.total_amount, 0)
    const netIncome = totalIncome - totalExpense
    const totalCount = transactions.length
    const avgPerTransaction = totalCount > 0 ? (totalIncome + totalExpense) / totalCount : 0
    
    return {
      totalIncome: parseFloat(totalIncome.toFixed(2)),
      totalExpense: parseFloat(totalExpense.toFixed(2)),
      netIncome: parseFloat(netIncome.toFixed(2)),
      incomeCount: income.length,
      expenseCount: expenses.length,
      totalCount,
      avgPerTransaction: parseFloat(avgPerTransaction.toFixed(2))
    }
  }

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <div className="text-gray-300">Loading financial data...</div>
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

  const dailyTransactionData = getDailyTransactionData()
  const stats = getTotalStatsData()
  
  // Get data based on selected view
  const getViewData = () => {
    if (selectedView === 'income') {
      return {
        categoryData: getCategoryBreakdownData('income'),
        topStores: getTopStoresData('income'),
        total: stats.totalIncome
      }
    } else if (selectedView === 'expense') {
      return {
        categoryData: getCategoryBreakdownData('expense'),
        topStores: getTopStoresData('expense'),
        total: stats.totalExpense
      }
    } else {
      return {
        categoryData: getCategoryBreakdownData(),
        topStores: getTopStoresData('expense'), // Only show expense stores
        total: stats.totalIncome + stats.totalExpense
      }
    }
  }
  
  const viewData = getViewData()
  
  const getCategoryBreakdown = () => {
    // Calculate percentages for category breakdown
    if (!viewData.categoryData || !viewData.total || viewData.total === 0) {
      return [];
    }
    return viewData.categoryData.map(item => ({
      ...item,
      percentage: parseFloat(((item.amount / viewData.total) * 100).toFixed(1))
    }))
  }
  
  const categoryBreakdown = getCategoryBreakdown()

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <h2 className="text-2xl font-bold text-white">Expense Analytics</h2>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center relative inline-block">
          <Tabs value={timeRange} onValueChange={(value) => {
            const newRange = value as TimeRange
            setTimeRange(newRange)
            if (newRange !== 'custom') {
              setCustomDateRange(null)
            }
          }}>
            <TabsList className="bg-gray-800 border-gray-600">
              <TabsTrigger value="today" className="text-xs text-gray-300 hover:bg-gray-700 hover:text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">Today</TabsTrigger>
              <TabsTrigger value="week" className="text-xs text-gray-300 hover:bg-gray-700 hover:text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs text-gray-300 hover:bg-gray-700 hover:text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">Month</TabsTrigger>
              <TabsTrigger value="year" className="text-xs text-gray-300 hover:bg-gray-700 hover:text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">Year</TabsTrigger>
              <TabsTrigger value="all" className="text-xs text-gray-300 hover:bg-gray-700 hover:text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">All Time</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs text-gray-300 hover:bg-gray-700 hover:text-white data-[state=active]:bg-blue-600 data-[state=active]:text-white">Custom</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Quick select INSIDE the flex container */}
          {timeRange === 'custom' && (
            <div style={{ marginTop: '5px', position: 'absolute', right: '0', top: '40px' }} className="p-4 bg-gray-700 border border-gray-600 rounded-md w-80 z-50">
            <div className="space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quick Select</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - 6) // Last 7 days
                      setCustomDateRange({ start, end })
                    }}
                    className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - 29) // Last 30 days
                      setCustomDateRange({ start, end })
                    }}
                    className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
                  >
                    Last 30 days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - 89) // Last 90 days
                      setCustomDateRange({ start, end })
                    }}
                    className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
                  >
                    Last 90 days
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const end = new Date()
                      const start = new Date()
                      start.setDate(start.getDate() - 364) // Last year
                      setCustomDateRange({ start, end })
                    }}
                    className="px-2 py-1 text-xs bg-gray-600 text-gray-300 rounded hover:bg-gray-500 hover:text-white transition-colors"
                  >
                    Last year
                  </button>
                </div>
              </div>
              
              {/* Custom Date Inputs */}
              <div className="border-t border-gray-600 pt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customDateRange?.start ? format(customDateRange.start, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const newStart = new Date(e.target.value)
                        setCustomDateRange({ 
                          start: newStart, 
                          end: customDateRange?.end || newStart 
                        })
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-md focus:border-blue-500"
                  />
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customDateRange?.end ? format(customDateRange.end, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        const newEnd = new Date(e.target.value)
                        setCustomDateRange({ 
                          start: customDateRange?.start || newEnd, 
                          end: newEnd 
                        })
                      }
                    }}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 text-white rounded-md focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currency}{stats.totalExpense}</div>
            <p className="text-xs text-gray-400 mt-1">
              {timeRange === 'today' ? 'Today' : 
               timeRange === 'week' ? 'This week' : 
               timeRange === 'month' ? 'This month' :
               timeRange === 'year' ? 'This year' :
               timeRange === 'custom' && customDateRange ? 
                 (customDateRange.start.toDateString() === customDateRange.end.toDateString() ? 
                   format(customDateRange.start, 'MMM dd, yyyy') :
                   `${format(customDateRange.start, 'MMM dd')} - ${format(customDateRange.end, 'MMM dd, yyyy')}`) :
               timeRange === 'all' ? 'All time' : 'Selected period'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalCount}</div>
            <p className="text-xs text-gray-400 mt-1">Total receipts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Avg per Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{currency}{stats.avgPerTransaction}</div>
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
            {dailyTransactionData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                <BarChart3 className="h-12 w-12 mb-4 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No spending data</h3>
                <p className="text-sm text-center">Start adding expenses to see your daily spending patterns</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyTransactionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="formatted_date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    formatter={(value) => [`${currency}${value}`, 'Amount']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px', 
                      color: '#F3F4F6',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                    }}
                    cursor={{ fill: 'rgba(75, 85, 99, 0.1)' }}
                  />
                  <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Income Statement */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Target className="h-5 w-5 text-blue-400" />
              Income Statement
            </CardTitle>
            <CardDescription className="text-gray-400">
              Financial breakdown for {
                timeRange === 'today' ? 'today' : 
                timeRange === 'week' ? 'this week' : 
                timeRange === 'month' ? 'this month' : 
                timeRange === 'year' ? 'this year' :
                timeRange === 'custom' && customDateRange ? 
                  (customDateRange.start.toDateString() === customDateRange.end.toDateString() ? 
                    format(customDateRange.start, 'MMM dd, yyyy') :
                    `${format(customDateRange.start, 'MMM dd')} - ${format(customDateRange.end, 'MMM dd, yyyy')}`) :
                timeRange === 'all' ? 'all time' : 'selected period'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Income Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                  <h3 className="text-lg font-semibold text-green-400">INCOME: {currency}{stats.totalIncome}</h3>
                </div>
                {stats.totalIncome > 0 ? (
                  <div className="space-y-2">
                    {getCategoryBreakdownData('income').slice(0, 4).map((category) => (
                      <div key={category.category} className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-medium">{currency}{category.amount}</span>
                          <span className="text-gray-500 text-xs">({Math.round((category.amount / stats.totalIncome) * 100)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No income recorded</p>
                )}
              </div>

              {/* Expense Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-5 w-5 text-red-400" />
                  <h3 className="text-lg font-semibold text-red-400">EXPENSES: {currency}{stats.totalExpense}</h3>
                </div>
                {stats.totalExpense > 0 ? (
                  <div className="space-y-2">
                    {getCategoryBreakdownData('expense').slice(0, 4).map((category) => (
                      <div key={category.category} className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">{category.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 font-medium">{currency}{category.amount}</span>
                          <span className="text-gray-500 text-xs">({Math.round((category.amount / stats.totalExpense) * 100)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No expenses recorded</p>
                )}
              </div>

              {/* Net Balance */}
              <div className="pt-4 border-t border-gray-600">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-400" />
                  <h3 className={`text-lg font-bold ${ 
                    stats.netIncome >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    NET BALANCE: {stats.netIncome >= 0 ? '+' : ''}{currency}{Math.abs(stats.netIncome)} 
                    {stats.netIncome >= 0 ? ' ✅' : ' ⚠️'}
                  </h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown (Expenses Only) & Top Stores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enhanced Category Breakdown - Expenses Only */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <PieChartIcon className="h-5 w-5 text-green-400" />
              Category Breakdown
            </CardTitle>
            <CardDescription className="text-gray-400">Expense spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            {getCategoryBreakdownData('expense').length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
                <PieChartIcon className="h-12 w-12 mb-4 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No expense data</h3>
                <p className="text-sm text-center">Add expenses to see category breakdowns</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={getCategoryBreakdownData('expense').map(item => ({
                        ...item,
                        percentage: Math.round((item.amount / stats.totalExpense) * 100)
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {getCategoryBreakdownData('expense').map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${currency}${value}`, 'Amount']}
                      labelFormatter={(label) => label}
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151', 
                        borderRadius: '8px', 
                        color: '#F3F4F6',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                      labelStyle={{ color: '#F3F4F6', fontWeight: '600', marginBottom: '4px' }}
                      itemStyle={{ color: '#F3F4F6', fontWeight: '500' }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend with Details */}
                <div className="space-y-3">
                  {getCategoryBreakdownData('expense').map((category, index) => (
                    <div key={category.category} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="font-medium text-gray-200">
                          {category.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">{currency}{category.amount}</div>
                        <div className="text-sm text-gray-400">{Math.round((category.amount / stats.totalExpense) * 100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Stores - 50% */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Top Stores</CardTitle>
            <CardDescription className="text-gray-400">Your most visited stores</CardDescription>
          </CardHeader>
          <CardContent>
            {viewData.topStores.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[200px] text-gray-400">
                <Receipt className="h-12 w-12 mb-4 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No store data</h3>
                <p className="text-sm text-center">Start shopping to see your favorite stores</p>
              </div>
            ) : (
              <div className="space-y-3">
                {viewData.topStores.slice(0, 8).map((store: any, index: number) => (
                  <div key={store.store} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-300">#{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-200 text-sm">{store.store}</div>
                        <div className="text-xs text-gray-400">{store.count} visit{store.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-400">{currency}{store.amount.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}