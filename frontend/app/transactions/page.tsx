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
import { ChevronLeft, ChevronRight, Search, Calendar, Store, Filter, Download, Receipt, Edit, Trash2 } from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { Expense } from '@/types'
import { SimpleSelect } from '@/components/ui/simple-select'
import { DateRangePicker } from '@/components/ui/date-range-picker'

const CATEGORY_EMOJIS: { [key: string]: string } = {
  groceries: '🛒',
  dining: '🍽️',
  gas: '⛽',
  pharmacy: '💊',
  retail: '🛍️',
  services: '🔧',
  entertainment: '🎬',
  other: '📦'
}

const CATEGORIES = ['all', 'groceries', 'dining', 'gas', 'pharmacy', 'retail', 'services', 'entertainment', 'other']

const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur'

export default function Transactions() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
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
  
  const itemsPerPage = 20

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadExpenses()
    }
  }, [user, currentPage, searchTerm, categoryFilter, dateRange, customStartDate, customEndDate])

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
      const supabase = createSupabaseClient()

      let query = supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('receipt_date', { ascending: false })

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.or(`store_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      // Apply date range filter
      const now = new Date()
      if (dateRange === 'week') {
        const weekAgo = subDays(now, 7)
        query = query.gte('receipt_date', format(weekAgo, 'yyyy-MM-dd'))
      } else if (dateRange === 'month') {
        const monthStart = startOfMonth(now)
        query = query.gte('receipt_date', format(monthStart, 'yyyy-MM-dd'))
      } else if (dateRange === 'custom') {
        if (customStartDate) {
          query = query.gte('receipt_date', format(customStartDate, 'yyyy-MM-dd'))
        }
        if (customEndDate) {
          query = query.lte('receipt_date', format(customEndDate, 'yyyy-MM-dd'))
        }
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await query.range(from, to)

      if (error) {
        throw error
      }

      setExpenses(data || [])
      setTotalCount(count || 0)
      setError(null)
    } catch (error) {
      console.error('Error loading expenses:', error)
      setError('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
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
    a.download = `expenses-${formatInTimeZone(new Date(), MALAYSIA_TIMEZONE, 'yyyy-MM-dd')}.csv`
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
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">View and manage all your expense transactions</p>
          </div>
          <Button
            onClick={exportData}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={expenses.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Filter className="h-5 w-5 text-blue-400" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by store name or category..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:bg-gray-50 dark:focus:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <SimpleSelect
                  value={categoryFilter}
                  onValueChange={handleCategoryChange}
                  options={CATEGORIES.map(category => ({
                    value: category,
                    label: category === 'all' ? 'All Categories' : `${CATEGORY_EMOJIS[category]} ${category}`
                  }))}
                  placeholder="All Categories"
                />
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Period</label>
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
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Calendar className="h-5 w-5 text-blue-400" />
              Transactions
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {totalCount > 0 ? `${totalCount} total transactions` : 'No transactions found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="min-h-[600px]">
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
                  {/* Table */}
                  <div className="rounded-md border border-gray-700 bg-gray-700/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-600 hover:bg-gray-700/50">
                          <TableHead className="text-gray-300">Date</TableHead>
                          <TableHead className="text-gray-300">Store</TableHead>
                          <TableHead className="text-gray-300">Category</TableHead>
                          <TableHead className="text-right text-gray-300">Amount</TableHead>
                          <TableHead className="text-gray-300">Added</TableHead>
                          <TableHead className="text-gray-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id} className="border-gray-600 hover:bg-gray-600/50">
                            <TableCell>
                              <div className="font-medium text-gray-200">
                                {formatInTimeZone(new Date(expense.receipt_date), MALAYSIA_TIMEZONE, 'MMM dd, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Store className="h-4 w-4 text-gray-400" />
                                <span className="font-medium text-gray-200">{expense.store_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant="secondary" 
                                className="bg-gray-600 text-gray-200 border-gray-500"
                              >
                                {CATEGORY_EMOJIS[expense.category]} {expense.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-lg text-green-400">
                                ${parseFloat(expense.total_amount.toString()).toFixed(2)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-400">
                                {formatInTimeZone(new Date(expense.created_at), MALAYSIA_TIMEZONE, 'MMM dd, h:mm a')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(expense)}
                                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(expense)}
                                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-500"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
                      <div className="text-sm text-gray-400">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} transactions
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => goToPage(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 disabled:hover:bg-transparent disabled:hover:text-gray-300 disabled:hover:border-gray-600"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        
                        <div className="flex items-center space-x-1">
                          {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNum = Math.max(1, currentPage - 2) + i
                            if (pageNum > totalPages) return null
                            
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => goToPage(pageNum)}
                                className={pageNum === currentPage ? 
                                  "w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700 text-white" : 
                                  "w-8 h-8 p-0 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500"}
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
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white hover:border-gray-500 disabled:hover:bg-transparent disabled:hover:text-gray-300 disabled:hover:border-gray-600"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
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
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription className="text-gray-400">
                Make changes to your expense record
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
                  options={CATEGORIES.filter(cat => cat !== 'all').map(category => ({
                    value: category,
                    label: `${CATEGORY_EMOJIS[category]} ${category}`
                  }))}
                  placeholder="Select category"
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
              <Button variant="outline" onClick={() => setEditingExpense(null)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
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
              <DialogTitle>Delete Expense</DialogTitle>
              <DialogDescription className="text-gray-400">
                Are you sure you want to delete this expense? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            {deletingExpense && (
              <div className="py-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Date:</span>
                      <div className="text-white">{formatInTimeZone(new Date(deletingExpense.receipt_date), MALAYSIA_TIMEZONE, 'MMM dd, yyyy')}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Store:</span>
                      <div className="text-white">{deletingExpense.store_name}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <div className="text-white">{CATEGORY_EMOJIS[deletingExpense.category]} {deletingExpense.category}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Amount:</span>
                      <div className="text-green-400 font-semibold">${parseFloat(deletingExpense.total_amount.toString()).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingExpense(null)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </Button>
              <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}