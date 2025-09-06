import { useState, useEffect } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { CATEGORY_EMOJIS, getCategoryEmoji } from '@/lib/constants'

interface Category {
  id: string
  name: string
  is_default: boolean
}

interface CategoryOption {
  value: string
  label: string
  emoji: string
  id: string | null
}

export function useCategories() {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('Not authenticated')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/categories?user_id=${session.user.id}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch categories')
      }

      const categoryOptions: CategoryOption[] = (result.data || []).map((category: Category) => ({
        value: category.name,
        label: `${getCategoryEmoji(category.name)} ${category.name}`,
        emoji: getCategoryEmoji(category.name),
        id: category.id
      }))

      setCategories(categoryOptions)
    } catch (error: any) {
      console.error('Error fetching categories:', error)
      setError(error.message || 'Failed to load categories')
      
      // Fallback to default categories
      const defaultCategories = ['groceries', 'dining', 'gas', 'pharmacy', 'retail', 'services', 'entertainment', 'other']
      const fallbackOptions: CategoryOption[] = defaultCategories.map(category => ({
        value: category,
        label: `${CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS]} ${category}`,
        emoji: CATEGORY_EMOJIS[category as keyof typeof CATEGORY_EMOJIS],
        id: null
      }))
      setCategories(fallbackOptions)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories
  }
}

// Hook for categories with "All Categories" option for filtering
export function useCategoriesWithAll() {
  const { categories, isLoading, error, refetch } = useCategories()

  const categoriesWithAll = [
    {
      value: 'all',
      label: 'All Categories',
      emoji: '📂',
      id: null
    },
    ...categories
  ]

  return {
    categories: categoriesWithAll,
    isLoading,
    error,
    refetch
  }
}