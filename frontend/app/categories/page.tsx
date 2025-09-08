'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createSupabaseClient } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Tag, Edit, Trash2, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Filter } from 'lucide-react'
// Removed category emoji imports - using text-only categories now
import { Skeleton } from '@/components/ui/skeleton'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  is_default: boolean
  created_at: string
  updated_at: string
  transaction_count?: number
  can_delete?: boolean
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all')
  const supabase = createSupabaseClient()

  // Form states
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense'
  })

  const [editForm, setEditForm] = useState({
    name: ''
  })

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      fetchCategories()
    }
  }, [user, selectedType])

  const loadUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        // Handle no session case - DashboardLayout will redirect
        return
      }
      setUser(session.user)
    } catch (error) {
      console.error('Error loading user:', error)
    }
  }

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)

      if (!user) return

      // Build query parameters
      const params = new URLSearchParams({ user_id: user.id })
      if (selectedType !== 'all') {
        params.append('type', selectedType)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch categories')
      }

      // Fetch transaction counts for each category
      const categoriesWithCounts = await Promise.all(
        (result.data || []).map(async (category: Category) => {
          try {
            const usageResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/${category.id}/usage?user_id=${user.id}`)
            const usageResult = await usageResponse.json()
            
            return {
              ...category,
              transaction_count: usageResult.success ? usageResult.data.transaction_count : 0,
              can_delete: usageResult.success ? usageResult.data.can_delete : false
            }
          } catch (error) {
            console.error('Error fetching category usage:', error)
            return {
              ...category,
              transaction_count: 0,
              can_delete: true
            }
          }
        })
      )

      setCategories(categoriesWithCounts)
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError(error.message || 'Failed to load categories')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      setError('Category name is required')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      if (!user) throw new Error('Not authenticated')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          type: newCategory.type,
          user_id: user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create category')
      }

      setNewCategory({ name: '', type: 'expense' })
      setIsCreateDialogOpen(false)
      fetchCategories()
    } catch (error: any) {
      console.error('Error creating category:', error)
      setError(error.message || 'Failed to create category')
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditCategory = async () => {
    if (!editForm.name.trim() || !editingCategory) {
      return
    }

    setError(null)

    try {
      if (!user) throw new Error('Not authenticated')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          user_id: user.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update category')
      }

      setIsEditDialogOpen(false)
      setEditingCategory(null)
      fetchCategories()
    } catch (error: any) {
      console.error('Error updating category:', error)
      setError(error.message || 'Failed to update category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      if (!user) throw new Error('Not authenticated')

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories/${categoryId}?user_id=${user.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete category')
      }

      setDeletingCategory(null)
      fetchCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      setError(error.message || 'Failed to delete category')
    }
  }

  const openEditDialog = (category: Category) => {
    setEditingCategory(category)
    setEditForm({
      name: category.name
    })
    setIsEditDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 pt-16 lg:pt-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Categories</h1>
            <p className="text-gray-400 text-sm sm:text-base">Manage your expense categories</p>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[150px] sm:h-[200px] w-full bg-gray-800" />
            <Skeleton className="h-[300px] sm:h-[400px] w-full bg-gray-800" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pt-16 lg:pt-0">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Categories</h1>
            <p className="text-gray-400 text-sm sm:text-base">Customize your expense categories to match your spending habits</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-sm sm:max-w-md mx-4 sm:mx-auto">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Create New Category</DialogTitle>
                <DialogDescription className="text-gray-400 text-sm sm:text-base">
                  Add a new category to organize your {newCategory.type === 'income' ? 'income' : 'expense'} transactions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name" className="text-gray-300">Category Name</Label>
                  <Input
                    id="category-name"
                    placeholder="e.g., Travel, Subscriptions, Health"
                    value={newCategory.name}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Category Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newCategory.type === 'expense' ? 'default' : 'outline'}
                      onClick={() => setNewCategory({ ...newCategory, type: 'expense' })}
                      className={`flex-1 ${
                        newCategory.type === 'expense'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-gray-800'
                      }`}
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Expense
                    </Button>
                    <Button
                      type="button"
                      variant={newCategory.type === 'income' ? 'default' : 'outline'}
                      onClick={() => setNewCategory({ ...newCategory, type: 'income' })}
                      className={`flex-1 ${
                        newCategory.type === 'income'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white bg-gray-800'
                      }`}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Income
                    </Button>
                  </div>
                </div>
                {error && (
                  <div className="text-red-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCategory}
                    disabled={isCreating}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isCreating ? 'Creating...' : 'Create Category'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Type Filter */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
              <Filter className="h-5 w-5 text-blue-400" />
              Filter by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedType === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedType('all')}
                className={selectedType === 'all' 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              >
                <Tag className="h-4 w-4 mr-2" />
                All Categories
              </Button>
              <Button
                variant={selectedType === 'income' ? 'default' : 'outline'}
                onClick={() => setSelectedType('income')}
                className={selectedType === 'income' 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Income
              </Button>
              <Button
                variant={selectedType === 'expense' ? 'default' : 'outline'}
                onClick={() => setSelectedType('expense')}
                className={selectedType === 'expense' 
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white'
                }
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Expense
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
              <Tag className="h-5 w-5 text-blue-400" />
              Your Categories
            </CardTitle>
            <CardDescription className="text-gray-400 text-sm sm:text-base">
              {categories.length > 0 ? `${categories.length} categories • ${categories.filter(c => c.is_default).length} default` : 'No categories found'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Tag className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">No categories found</h3>
                <p>Create your first category to start organizing your expenses.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-750">
                        <TableHead className="text-gray-300 text-sm">Category</TableHead>
                        <TableHead className="text-gray-300 text-sm">Type</TableHead>
                        <TableHead className="text-gray-300 text-sm">Transactions</TableHead>
                        <TableHead className="text-gray-300 text-sm">Created</TableHead>
                        <TableHead className="text-gray-300 text-right text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id} className="border-gray-700 hover:bg-gray-750/50">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                {category.type === 'income' ? (
                                  <TrendingUp className="h-4 w-4 text-green-400" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-400" />
                                )}
                                <span className="font-medium text-white text-sm capitalize">{category.name}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="secondary"
                                className={`text-xs ${
                                  category.type === 'income'
                                    ? 'bg-green-700/30 text-green-300 border-green-600'
                                    : 'bg-red-700/30 text-red-300 border-red-600'
                                }`}
                              >
                                {category.type === 'income' ? 'Income' : 'Expense'}
                              </Badge>
                              <Badge 
                                variant={category.is_default ? 'default' : 'secondary'}
                                className={
                                  category.is_default 
                                    ? 'bg-blue-700 text-white hover:bg-blue-600 text-xs' 
                                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 text-xs'
                                }
                              >
                                {category.is_default ? 'Default' : 'Custom'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm">
                            {category.transaction_count || 0}
                          </TableCell>
                          <TableCell className="text-gray-300 text-sm">
                            {formatDate(category.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(category)}
                                className="text-gray-400 hover:text-white hover:bg-gray-700 p-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 p-2"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-gray-800 border-gray-700 text-white">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                    <AlertDialogDescription className="text-gray-400">
                                      Are you sure you want to delete "{category.name}"? 
                                      {category.transaction_count && category.transaction_count > 0 
                                        ? ` This category is used by ${category.transaction_count} transactions and cannot be deleted.`
                                        : ' This action cannot be undone.'
                                      }
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800">
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteCategory(category.id)}
                                      disabled={!category.can_delete}
                                      className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-600 disabled:text-gray-400"
                                    >
                                      Delete Category
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {categories.map((category) => (
                    <Card key={category.id} className="bg-gray-700/50 border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                {category.type === 'income' ? (
                                  <TrendingUp className="h-4 w-4 text-green-400" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-red-400" />
                                )}
                                <h3 className="font-medium text-white text-base capitalize">{category.name}</h3>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Badge 
                                  variant="secondary"
                                  className={`text-xs ${
                                    category.type === 'income'
                                      ? 'bg-green-700/30 text-green-300 border-green-600'
                                      : 'bg-red-700/30 text-red-300 border-red-600'
                                  }`}
                                >
                                  {category.type === 'income' ? 'Income' : 'Expense'}
                                </Badge>
                                <Badge 
                                  variant={category.is_default ? 'default' : 'secondary'}
                                  className={
                                    category.is_default 
                                      ? 'bg-blue-700 text-white hover:bg-blue-600 text-xs' 
                                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500 text-xs'
                                  }
                                >
                                  {category.is_default ? 'Default' : 'Custom'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Transactions</div>
                            <div className="text-sm text-white">{category.transaction_count || 0}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 mb-1">Created</div>
                            <div className="text-sm text-white">{formatDate(category.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(category)}
                            className="text-gray-400 hover:text-white hover:bg-gray-700 p-2"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 p-2"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-gray-800 border-gray-700 text-white max-w-sm mx-4">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base">Delete Category</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400 text-sm">
                                  Are you sure you want to delete "{category.name}"?
                                  {category.transaction_count && category.transaction_count > 0 
                                    ? ` This category is used by ${category.transaction_count} transactions and cannot be deleted.`
                                    : ' This action cannot be undone.'
                                  }
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                <AlertDialogCancel className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800 w-full sm:w-auto">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCategory(category.id)}
                                  disabled={!category.can_delete}
                                  className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto disabled:bg-gray-600 disabled:text-gray-400"
                                >
                                  Delete Category
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Edit Category Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-sm sm:max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">Edit Category</DialogTitle>
              <DialogDescription className="text-gray-400 text-sm sm:text-base">
                Update your category name.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-gray-300">Category Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  maxLength={100}
                />
              </div>
              {error && (
                <div className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-gray-800"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditCategory}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Update Category
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}