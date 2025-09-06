import express from 'express';
import { createSupabaseClient } from '../lib/supabase.js';

const router = express.Router();

// Get all categories for a user (alphabetically sorted)
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    const supabase = createSupabaseClient();
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, is_default, created_at, updated_at')
      .eq('user_id', user_id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch categories' 
      });
    }

    res.json({ 
      success: true, 
      data: categories || []
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

    // Check for duplicate category names
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user_id)
      .eq('name', trimmedName)
      .single();

    if (existingCategory) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name already exists' 
      });
    }
    
    const { data: category, error } = await supabase
      .from('categories')
      .insert([{ 
        name: trimmedName, 
        user_id: user_id,
        is_default: false
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
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