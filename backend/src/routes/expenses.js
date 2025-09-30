import express from 'express';
import { createSupabaseClient } from '../lib/supabase.js';
import ExpenseService from '../services/ExpenseService.js';

const router = express.Router();

// Get all transactions (expenses + income) for a user
// Supports filtering: ?type=expense|income, ?start_date=YYYY-MM-DD, ?end_date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { user_id, type, start_date, end_date, limit = 50, offset = 0 } = req.query;

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
    const expenseService = new ExpenseService(supabase);

    // If type filtering is requested, use the specialized method
    if (type) {
      const transactions = await expenseService.getTransactionsByType(
        user_id, 
        type, 
        start_date, 
        end_date
      );

      return res.json({
        success: true,
        data: transactions.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
        meta: {
          total: transactions.length,
          type_filter: type,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    }

    // Get all transactions without type filtering
    let query = supabase
      .from('expenses')
      .select('*, categories(id, name, type)')
      .eq('user_id', user_id);

    // Build count query with same filters
    let countQuery = supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id);

    // Add date filtering if provided
    if (start_date) {
      query = query.gte('receipt_date', start_date);
      countQuery = countQuery.gte('receipt_date', start_date);
    }
    if (end_date) {
      query = query.lte('receipt_date', end_date);
      countQuery = countQuery.lte('receipt_date', end_date);
    }

    // Get total count first
    const { count: totalCount, error: countError } = await countQuery;
    if (countError) {
      console.error('Error fetching count:', countError);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch transaction count'
      });
    }

    const { data: transactions, error } = await query
      .order('receipt_date', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch transactions' 
      });
    }

    // Add transaction type information for backward compatibility and normalize categories
    const enhancedTransactions = (transactions || []).map(transaction => {
      // Normalize category name - prioritize categories table, fallback to expenses.category
      const normalizedCategory = transaction.categories?.name || transaction.category;

      return {
        ...transaction,
        transaction_type: transaction.type || 'expense', // Default to expense for old records
        category_name: normalizedCategory,  // Always use the same normalized source
        category: normalizedCategory,       // Make both fields consistent
        category_type: transaction.categories?.type || 'expense'
      };
    });

    res.json({
      success: true,
      data: enhancedTransactions,
      meta: {
        total: totalCount,
        type_filter: 'all',
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Expenses GET error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Get comprehensive income/expense summary
router.get('/summary', async (req, res) => {
  try {
    const { user_id, period = 'month' } = req.query;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    // Validate period parameter
    const validPeriods = ['today', 'yesterday', 'week', 'month'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({ 
        success: false, 
        message: `period must be one of: ${validPeriods.join(', ')}` 
      });
    }

    const supabase = createSupabaseClient();
    const expenseService = new ExpenseService(supabase);

    const summary = await expenseService.getIncomeExpenseSummary(user_id, period);

    res.json({
      success: true,
      data: summary,
      meta: {
        period: period,
        generated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Expenses summary GET error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Create a new transaction (expense or income)
router.post('/', async (req, res) => {
  try {
    const { 
      user_id, 
      type = 'expense',
      receipt_date, 
      store_name,
      description, 
      category, 
      category_id, 
      total_amount,
      project_id 
    } = req.body;

    // Validate required fields
    if (!user_id || !receipt_date || !category || !total_amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id, receipt_date, category, and total_amount are required' 
      });
    }

    // Validate type
    if (!['expense', 'income'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'type must be either "expense" or "income"' 
      });
    }

    // Validate amount
    const amount = parseFloat(total_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'total_amount must be a positive number' 
      });
    }

    const supabase = createSupabaseClient();
    const expenseService = new ExpenseService(supabase);

    let transaction;

    if (type === 'income') {
      // Create income transaction
      transaction = await expenseService.createIncomeTransaction(user_id, {
        receipt_date,
        source: store_name, // Income source
        description: description || store_name,
        category,
        category_id,
        total_amount: amount,
        project_id
      });
    } else {
      // Create expense transaction (existing functionality)
      transaction = await expenseService.createExpense(user_id, {
        receipt_date,
        store_name: store_name || 'Unknown',
        category,
        category_id,
        total_amount: amount,
        project_id
      });
    }

    res.status(201).json({
      success: true,
      data: transaction,
      message: `${type === 'income' ? 'Income' : 'Expense'} transaction created successfully`
    });

  } catch (error) {
    console.error('Expenses POST error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create transaction' 
    });
  }
});

// Update a transaction
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      user_id,
      type,
      receipt_date, 
      store_name,
      description, 
      category, 
      category_id, 
      total_amount 
    } = req.body;

    if (!user_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'user_id is required' 
      });
    }

    // Validate type if provided
    if (type && !['expense', 'income'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        message: 'type must be either "expense" or "income"' 
      });
    }

    const supabase = createSupabaseClient();

    // Check if transaction exists and belongs to user
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('expenses')
      .select('id, type, store_name, category, total_amount')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !existingTransaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (receipt_date) updateData.receipt_date = receipt_date;
    if (store_name) updateData.store_name = store_name;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (category_id) updateData.category_id = category_id;
    if (total_amount) {
      const amount = parseFloat(total_amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'total_amount must be a positive number' 
        });
      }
      updateData.total_amount = amount;
    }
    if (type) updateData.type = type;

    // Update the transaction
    const { data: transaction, error } = await supabase
      .from('expenses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating transaction:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update transaction' 
      });
    }

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    console.error('Expenses PUT error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Delete a transaction
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

    // Check if transaction exists and belongs to user
    const { data: existingTransaction, error: fetchError } = await supabase
      .from('expenses')
      .select('id, type, store_name, total_amount')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (fetchError || !existingTransaction) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transaction not found' 
      });
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', user_id);

    if (deleteError) {
      console.error('Error deleting transaction:', deleteError);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to delete transaction' 
      });
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {
        id: id,
        type: existingTransaction.type || 'expense',
        amount: existingTransaction.total_amount
      }
    });

  } catch (error) {
    console.error('Expenses DELETE error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

export default router;