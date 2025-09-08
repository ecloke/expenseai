import express from 'express';
import { createSupabaseClient } from '../lib/supabase.js';

const router = express.Router();

// Get all categories for a user (alphabetically sorted)
// Supports type filtering: ?type=expense or ?type=income
router.get('/', async (req, res) => {
  try {
    const { user_id, type } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    // Validate type parameter if provided
    if (type && !['expense', 'income'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'type must be either "expense" or "income"' 
      });
    }

    const supabase = createSupabaseClient();
    
    // Build query with optional type filtering
    let query = supabase
      .from('categories')
      .select('id, name, is_default, type, created_at, updated_at')
      .eq('user_id', user_id);

    // Add type filtering if specified
    if (type) {
      query = query.eq('type', type);
    }

    const { data: categories, error } = await query
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch categories' 
      });
    }

    // If no categories found and type filtering is used, provide helpful message
    if ((!categories || categories.length === 0) && type) {
      console.log(`No ${type} categories found for user ${user_id}`);
    }

    // Ensure backward compatibility for clients that don't expect 'type' field
    const categoriesWithDefaults = (categories || []).map(cat => ({
      ...cat,
      type: cat.type || 'expense' // Default to expense if type is null
    }));

    res.json({ 
      success: true, 
      data: categoriesWithDefaults,
      meta: {
        total: categoriesWithDefaults.length,
        type_filter: type || 'all'
      }
    });

  } catch (error) {
    console.error('Categories GET error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Create a new category
router.post('/', async (req, res) => {
  try {
    const { name, user_id, type } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name is required' 
      });
    }

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    // Validate type (required for new income tracking feature)
    const categoryType = type || 'expense'; // Default to expense for backward compatibility
    if (!['expense', 'income'].includes(categoryType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'type must be either "expense" or "income"' 
      });
    }

    const trimmedName = name.trim();

    // Validate name length
    if (trimmedName.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name must be 100 characters or less' 
      });
    }

    const supabase = createSupabaseClient();

    // Check for duplicate category names within the same type
    // Allow same names across different types (e.g., "Other" for both income and expense)
    let duplicateQuery = supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', trimmedName);

    // Add type constraint if the type column exists
    duplicateQuery = duplicateQuery.eq('type', categoryType);

    const { data: existingCategory } = await duplicateQuery.single();

    if (existingCategory) {
      return res.status(400).json({ 
        success: false, 
        message: `${categoryType} category name already exists` 
      });
    }
    
    // Create the new category
    const insertData = { 
      name: trimmedName, 
      user_id: user_id,
      is_default: false,
      type: categoryType,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: category, error } = await supabase
      .from('categories')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      
      // Handle case where type column doesn't exist yet
      if (error.message?.includes('column "type" of relation "categories" does not exist')) {
        console.log('Type column not yet added, creating without type field');
        const fallbackData = {
          name: trimmedName,
          user_id: user_id,
          is_default: false
        };
        
        const { data: fallbackCategory, error: fallbackError } = await supabase
          .from('categories')
          .insert([fallbackData])
          .select()
          .single();

        if (fallbackError) {
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to create category' 
          });
        }

        return res.status(201).json({ 
          success: true, 
          data: { ...fallbackCategory, type: 'expense' },
          message: 'Category created successfully (fallback mode)'
        });
      }
      
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to create category' 
      });
    }

    res.status(201).json({ 
      success: true, 
      data: category,
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Categories POST error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Update a category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, user_id } = req.body;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name is required' 
      });
    }

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    const trimmedName = name.trim();

    // Validate name length
    if (trimmedName.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name must be 100 characters or less' 
      });
    }

    const supabase = createSupabaseClient();

    // Check if category exists and belongs to user
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !existingCategory) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    // Check for duplicate category names (excluding current category)
    const { data: duplicateCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', trimmedName)
      .neq('id', id)
      .single();

    if (duplicateCategory) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name already exists' 
      });
    }

    // Update the category
    const { data: category, error } = await supabase
      .from('categories')
      .update({ name: trimmedName })
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update category' 
      });
    }

    res.json({ 
      success: true, 
      data: category,
      message: 'Category updated successfully'
    });

  } catch (error) {
    console.error('Categories PUT error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Check category usage (for delete validation)
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    const supabase = createSupabaseClient();

    // Check if category exists and belongs to user
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (categoryError || !category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    // Count expenses using this category
    const { count, error: countError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('user_id', user_id);

    if (countError) {
      console.error('Error counting expenses:', countError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to check category usage' 
      });
    }

    const transactionCount = count || 0;

    res.json({ 
      success: true, 
      data: {
        category_id: id,
        transaction_count: transactionCount,
        can_delete: transactionCount === 0
      }
    });

  } catch (error) {
    console.error('Categories usage GET error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Delete a category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    const supabase = createSupabaseClient();

    // Check if category exists and belongs to user
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (categoryError || !category) {
      return res.status(404).json({ 
        success: false, 
        message: 'Category not found' 
      });
    }

    // Check if category is being used by any expenses
    const { count, error: countError } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('user_id', user_id);

    if (countError) {
      console.error('Error counting expenses:', countError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to check category usage' 
      });
    }

    const transactionCount = count || 0;

    if (transactionCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete category with existing transactions',
        data: {
          transaction_count: transactionCount
        }
      });
    }

    // Delete the category
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete category' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Categories DELETE error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;