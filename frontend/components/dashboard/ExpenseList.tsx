'use client'

import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, Search, Calendar, Store } from 'lucide-react'
import { format } from 'date-fns'
import { Expense } from '@/types'

interface ExpenseListProps {
  userId: string
}

const CATEGORY_COLORS: { [key: string]: string } = {
  groceries: 'bg-green-100 text-green-800',
  dining: 'bg-orange-100 text-orange-800',
  gas: 'bg-blue-100 text-blue-800',
  pharmacy: 'bg-purple-100 text-purple-800',
  retail: 'bg-pink-100 text-pink-800',
  services: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800'
}

const CATEGORY_EMOJIS: { [key: string]: string } = {
  groceries: '🛒',
  dining: '🍽️',
  gas: '⛽',
  pharmacy: '💊',
  retail: '🛍️',
  services: '🔧',
  other: '📦'
}

export default function ExpenseList({ userId }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  const itemsPerPage = 10

  useEffect(() => {
    loadExpenses()
  }, [userId, currentPage, searchTerm])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseClient()

      let query = supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('receipt_date', { ascending: false })

      // Apply search filter
      if (searchTerm.trim()) {
        query = query.or(`store_name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
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

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Calendar className="h-5 w-5 text-blue-400" />
          Recent Expenses
        </CardTitle>
        <CardDescription className="text-gray-400">
          All your expense transactions {totalCount > 0 && `(${totalCount} total)`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by store name or category..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:bg-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
            />
          </div>
        </div>

        <div className="min-h-[400px]">
          {loading ? (
            <div className="text-center py-8 text-gray-300">Loading expenses...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-400">{error}</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {searchTerm ? 'No expenses found matching your search.' : 'No expenses found.'}
            </div>
          ) : (
          <>
            {/* Expenses Table */}
            <div className="rounded-md border border-gray-700 bg-gray-700/50">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600 hover:bg-gray-700/50">
                    <TableHead className="text-gray-300">Date</TableHead>
                    <TableHead className="text-gray-300">Store</TableHead>
                    <TableHead className="text-gray-300">Category</TableHead>
                    <TableHead className="text-right text-gray-300">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} className="border-gray-600 hover:bg-gray-600/50">
                      <TableCell>
                        <div className="font-medium text-gray-200">
                          {format(new Date(expense.receipt_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-400">
                          {format(new Date(expense.created_at), 'h:mm a')}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} expenses
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
  )
}