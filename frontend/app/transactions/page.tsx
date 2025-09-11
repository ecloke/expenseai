'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search, Calendar, Store, Filter, Download, Receipt, Edit, Trash2, Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { Expense } from '@/types'
import { SimpleSelect } from '@/components/ui/simple-select'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { ITEMS_PER_PAGE } from '@/lib/constants'
import { useCategoriesWithAll, useCategories } from '@/hooks/useCategories'
import { formatDateForDisplay, formatDateTimeForDisplay, getTodayString, getDaysAgoString, getMonthStartString, formatDateForAPI } from '@/lib/dateUtils'
import { CreateTransactionDialog } from '@/components/transactions/CreateTransactionDialog'

export default function Transactions() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [transactionType, setTransactionType] = useState('all') // 'all', 'income', 'expense'
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [dateRange, setDateRange] = useState('all') // 'week', 'month', 'custom', 'all'
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null)
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null)
  const [editForm, setEditForm] = useState({
    receipt_date: '',
    store_name: '',
    category: '',
    total_amount: 0
  })
  const router = useRouter()
  
  // Dynamic categories
  const { categories: categoriesWithAll } = useCategoriesWithAll()
  const { categories: categoriesOnly } = useCategories()
  
  const itemsPerPage = ITEMS_PER_PAGE

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadExpenses()
      loadProjects()
    }
  }, [user, currentPage, searchTerm, categoryFilter, projectFilter, transactionType, dateRange, customStartDate, customEndDate])

  const loadUser = async () => {
    try {
      const supabase = createSupabaseClient()
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session) {
        router.push('/login')
        return
      }

      setUser(session.user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const loadExpenses = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams({
        user_id: user.id,
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString()
      })

      // Add transaction type filter
      if (transactionType !== 'all') {
        params.append('type', transactionType)
      }

      // Add date range filters
      if (dateRange === 'week') {
        params.append('start_date', getDaysAgoString(7))
      } else if (dateRange === 'month') {
        params.append('start_date', getMonthStartString())
      } else if (dateRange === 'custom') {
        if (customStartDate) {
          params.append('start_date', formatDateForAPI(customStartDate))
        }
        if (customEndDate) {
          params.append('end_date', formatDateForAPI(customEndDate))
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

      let transactions = result.data || []

      // Apply client-side filters for backward compatibility
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase()
        transactions = transactions.filter((tx: any) => 
          tx.store_name?.toLowerCase().includes(searchLower) ||
          tx.category?.toLowerCase().includes(searchLower) ||
          tx.category_name?.toLowerCase().includes(searchLower)
        )
      }

      if (categoryFilter !== 'all') {
        transactions = transactions.filter((tx: any) => 
          tx.category === categoryFilter || tx.category_name === categoryFilter
        )
      }

      if (projectFilter === 'general') {
        transactions = transactions.filter((tx: any) => !tx.project_id)
      } else if (projectFilter !== 'all') {
        transactions = transactions.filter((tx: any) => tx.project_id === projectFilter)
      }

      setExpenses(transactions)
      setTotalCount(transactions.length)
      setError(null)
    } catch (error) {
      console.error('Error loading expenses:', error)
      setError('Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    if (!user) return

    try {
      const supabase = createSupabaseClient()
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, currency')
        .eq('user_id', user.id)
        .order('name')

      if (error) {
        console.error('Error loading projects:', error)
        return
      }

      setProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const formatAmount = (expense: any) => {
    const currency = expense.projects?.currency || '$'
    const amount = parseFloat(expense.total_amount.toString()).toFixed(2)
    return `${currency}${amount}`
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }

  const handleProjectChange = (value: string) => {
    setProjectFilter(value)
    setCurrentPage(1)
  }

  const handleDateRangeChange = (value: string) => {
    setDateRange(value)
    setCurrentPage(1)
    // Reset custom dates when switching away from custom
    if (value !== 'custom') {
      setCustomStartDate(null)
      setCustomEndDate(null)
    }
  }

  const handleCustomDateChange = (startDate: Date | null, endDate: Date | null) => {
    setCustomStartDate(startDate)
    setCustomEndDate(endDate)
    setDateRange('custom')
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const exportData = async () => {
    // Simple CSV export
    const csvHeaders = ['Date', 'Store', 'Category', 'Amount']
    const csvRows = expenses.map(expense => [
      expense.receipt_date,
      expense.store_name,
      expense.category,
      expense.total_amount.toString()
    ])

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${getTodayString()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setEditForm({
      receipt_date: expense.receipt_date,
      store_name: expense.store_name,
      category: expense.category,
      total_amount: parseFloat(expense.total_amount.toString())
    })
  }

  const handleDelete = (expense: Expense) => {
    setDeletingExpense(expense)
  }

  const confirmDelete = async () => {
    if (!deletingExpense || !user) return

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', deletingExpense.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Refresh the expenses list
      await loadExpenses()
      setDeletingExpense(null)
    } catch (error) {
      console.error('Error deleting expense:', error)
      setError('Failed to delete expense')
    }
  }

  const handleEditSave = async () => {
    if (!editingExpense || !user) return

    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from('expenses')
        .update({
          receipt_date: editForm.receipt_date,
          store_name: editForm.store_name,
          category: editForm.category,
          total_amount: editForm.total_amount
        })
        .eq('id', editingExpense.id)
        .eq('user_id', user.id)

      if (error) throw error

      // Refresh the expenses list
      await loadExpenses()
      setEditingExpense(null)
    } catch (error) {
      console.error('Error updating expense:', error)
      setError('Failed to update expense')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pt-16 lg:pt-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Transactions</h1>
            <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">View and manage all your financial transactions</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
            <Button
              onClick={exportData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={expenses.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
              <Filter className="h-5 w-5 text-blue-400" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by store name or category..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  />
                </div>
              </div>

              {/* Transaction Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                <SimpleSelect
                  value={transactionType}
                  onValueChange={(value) => {
                    setTransactionType(value)
                    setCurrentPage(1)
                  }}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'income', label: '💰 Income' },
                    { value: 'expense', label: '💸 Expense' }
                  ]}
                  placeholder="All Types"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <SimpleSelect
                  value={categoryFilter}
                  onValueChange={handleCategoryChange}
                  options={categoriesWithAll.map(category => ({
                    value: category.value,
                    label: category.label
                  }))}
                  placeholder="All Categories"
                />
              </div>

              {/* Project Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
                <SimpleSelect
                  value={projectFilter}
                  onValueChange={handleProjectChange}
                  options={[
                    { value: 'all', label: 'All Projects' },
                    { value: 'general', label: '📁 General Expenses' },
                    ...projects.map(project => ({
                      value: project.id,
                      label: `📁 ${project.name}`
                    }))
                  ]}
                  placeholder="All Projects"
                />
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Time Period</label>
                <SimpleSelect
                  value={dateRange}
                  onValueChange={handleDateRangeChange}
                  options={[
                    { value: 'all', label: 'All Time' },
                    { value: 'week', label: 'Last 7 Days' },
                    { value: 'month', label: 'This Month' },
                    { value: 'custom', label: 'Custom Range' }
                  ]}
                  placeholder="All Time"
                />
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {dateRange === 'custom' && (
              <div className="mt-4 pt-4 border-t border-gray-600">
                <label className="block text-sm font-medium text-gray-300 mb-2">Custom Date Range</label>
                <DateRangePicker
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onDateChange={handleCustomDateChange}
                  className="max-w-sm"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
              <Calendar className="h-5 w-5 text-blue-400" />
              Transactions
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              {totalCount > 0 ? `${totalCount} total transactions` : 'No transactions found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[400px] sm:min-h-[600px]">
              {loading ? (
                <div className="text-center py-8 text-gray-300">Loading transactions...</div>
              ) : error ? (
                <div className="text-center py-8 text-red-400">{error}</div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No transactions found</h3>
                  <p>Try adjusting your filters or add some expenses to get started.</p>
                </div>
              ) : (
                <>
                  {/* Table - Desktop View */}
                  <div className="hidden sm:block rounded-md border border-gray-700 bg-gray-700/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-600 hover:bg-gray-700/50">
                          <TableHead className="text-gray-300 text-xs sm:text-sm">Type</TableHead>
                          <TableHead className="text-gray-300 text-xs sm:text-sm">Date</TableHead>
                          <TableHead className="text-gray-300 text-xs sm:text-sm">Store/Source</TableHead>
                          <TableHead className="text-gray-300 text-xs sm:text-sm">Category</TableHead>
                          <TableHead className="text-right text-gray-300 text-xs sm:text-sm">Amount</TableHead>
                          <TableHead className="text-gray-300 text-xs sm:text-sm">Added</TableHead>
                          <TableHead className="text-gray-300 text-xs sm:text-sm">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => {
                          const transactionType = expense.type || expense.transaction_type || 'expense'
                          const isIncome = transactionType === 'income'
                          
                          return (
                          <TableRow key={expense.id} className="border-gray-600 hover:bg-gray-600/50">
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {isIncome ? (
                                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                                )}
                                <span className={`text-xs font-medium ${
                                  isIncome ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {isIncome ? 'Income' : 'Expense'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-200 text-xs sm:text-sm">
                                {formatDateForDisplay(expense.receipt_date)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Store className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                                <span className="font-medium text-gray-200 text-xs sm:text-sm truncate max-w-24 sm:max-w-none">{expense.store_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className="bg-gray-600 text-gray-200 border-gray-500 text-xs"
                              >
                                {expense.category || expense.category_name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-semibold text-sm sm:text-lg ${
                                isIncome ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {isIncome ? '+' : '-'}{formatAmount(expense)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs sm:text-sm text-gray-400">
                                {formatDateTimeForDisplay(expense.created_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(expense)}
                                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:text-white hover:border-gray-500 p-1 sm:p-2"
                                >
                                  <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(expense)}
                                  className="bg-gray-800 border-red-600 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500 p-1 sm:p-2"
                                >
                                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )})}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="sm:hidden space-y-3">
                    {expenses.map((expense) => {
                      const transactionType = expense.type || expense.transaction_type || 'expense'
                      const isIncome = transactionType === 'income'
                      
                      return (
                      <Card key={expense.id} className="bg-gray-700/50 border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Store className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-200 text-sm">{expense.store_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-400">{formatDateForDisplay(expense.receipt_date)}</span>
                                <div className="flex items-center gap-1">
                                  {isIncome ? (
                                    <TrendingUp className="h-3 w-3 text-green-400" />
                                  ) : (
                                    <TrendingDown className="h-3 w-3 text-red-400" />
                                  )}
                                  <span className={`font-medium ${
                                    isIncome ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {isIncome ? 'Income' : 'Expense'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold text-lg mb-1 ${
                                isIncome ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {isIncome ? '+' : '-'}{formatAmount(expense)}
                              </div>
                              <Badge 
                                variant="secondary" 
                                className="bg-gray-600 text-gray-200 border-gray-500 text-xs"
                              >
                                {expense.category || expense.category_name}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-400">
                              Added {formatDateTimeForDisplay(expense.created_at)}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(expense)}
                                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700 hover:text-white hover:border-gray-500 p-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDelete(expense)}
                                className="bg-gray-800 border-red-600 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500 p-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )})}                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 space-y-3 sm:space-y-0">
                      <div className="text-xs sm:text-sm text-gray-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} transactions
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 disabled:hover:bg-transparent disabled:hover:text-gray-300 disabled:hover:border-gray-600 text-xs sm:text-sm"
                        >
                          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden sm:inline">Previous</span>
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {[...Array(Math.min(3, totalPages))].map((_, i) => {
                            const pageNum = Math.max(1, currentPage - 1) + i
                            if (pageNum > totalPages) return null
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(pageNum)}
                                className={pageNum === currentPage ? 
                                  "w-7 h-7 sm:w-8 sm:h-8 p-0 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm" : 
                                  "w-7 h-7 sm:w-8 sm:h-8 p-0 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 text-xs sm:text-sm"}
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 disabled:hover:bg-transparent disabled:hover:text-gray-300 disabled:hover:border-gray-600 text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">Next</span>
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription className="text-gray-400">
                Make changes to your transaction record
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-date" className="text-right text-gray-300">
                  Date
                </Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editForm.receipt_date}
                  onChange={(e) => setEditForm({ ...editForm, receipt_date: e.target.value })}
                  className="col-span-3 bg-gray-700 border-gray-600 text-white"
                  autoFocus={false}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-store" className="text-right text-gray-300">
                  Store
                </Label>
                <Input
                  id="edit-store"
                  value={editForm.store_name}
                  onChange={(e) => setEditForm({ ...editForm, store_name: e.target.value })}
                  className="col-span-3 bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right text-gray-300">
                  Category
                </Label>
                <SimpleSelect
                  value={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                  options={categoriesOnly.map(category => ({
                    value: category.value,
                    label: category.label
                  }))}
                  placeholder="Select category"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-amount" className="text-right text-gray-300">
                  Amount
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editForm.total_amount}
                  onChange={(e) => setEditForm({ ...editForm, total_amount: parseFloat(e.target.value) || 0 })}
                  className="col-span-3 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingExpense(null)} className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                Cancel
              </Button>
              <Button onClick={handleEditSave} className="bg-blue-600 hover:bg-blue-700">
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingExpense} onOpenChange={(open) => !open && setDeletingExpense(null)}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle>Delete Transaction</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete this transaction? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {deletingExpense && (
              <div className="py-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Date:</span>
                      <div className="text-white">{formatDateForDisplay(deletingExpense.receipt_date)}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Store:</span>
                      <div className="text-white">{deletingExpense.store_name}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <div className="text-white">{deletingExpense.category || deletingExpense.category_name}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Amount:</span>
                      <div className="text-green-400 font-semibold">{formatAmount(deletingExpense)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingExpense(null)} className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Transaction Dialog */}
        <CreateTransactionDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onTransactionCreated={loadExpenses}
          userId={user?.id || ''}
        />
      </div>
    </DashboardLayout>
  )
}