/**
 * Expense Service for database operations
 * Handles expense queries for Telegram commands and dashboard
 */
class ExpenseService {
  constructor(supabase) {
    this.supabase = supabase;
  }

  /**
   * Get expenses for today
   */
  async getTodayExpenses(userId) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return this.getExpensesByDateRange(userId, today, today);
  }

  /**
   * Get expenses for yesterday
   */
  async getYesterdayExpenses(userId) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    return this.getExpensesByDateRange(userId, yesterdayStr, yesterdayStr);
  }

  /**
   * Get expenses for this week
   */
  async getWeekExpenses(userId) {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday
    
    const startDate = startOfWeek.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    return this.getExpensesByDateRange(userId, startDate, endDate);
  }

  /**
   * Get expenses for this month
   */
  async getMonthExpenses(userId) {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const startDate = startOfMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    return this.getExpensesByDateRange(userId, startDate, endDate);
  }

  /**
   * Get expenses by date range
   */
  async getExpensesByDateRange(userId, startDate, endDate) {
    try {
      const { data, error } = await this.supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .gte('receipt_date', startDate)
        .lte('receipt_date', endDate)
        .order('receipt_date', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching expenses by date range:', error);
      throw error;
    }
  }

  /**
   * Get monthly statistics
   */
  async getMonthlyStats(userId) {
    try {
      const monthExpenses = await this.getMonthExpenses(userId);
      
      if (monthExpenses.length === 0) {
        return {
          total: 0,
          count: 0,
          topCategory: null,
          categories: []
        };
      }

      const total = monthExpenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
      const count = monthExpenses.length;

      // Category breakdown
      const categoryTotals = {};
      monthExpenses.forEach(expense => {
        const category = expense.category;
        categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.total_amount);
      });

      const categories = Object.entries(categoryTotals)
        .map(([category, amount]) => ({
          category,
          amount: parseFloat(amount.toFixed(2)),
          percentage: ((amount / total) * 100).toFixed(1)
        }))
        .sort((a, b) => b.amount - a.amount);

      const topCategory = categories.length > 0 ? categories[0] : null;

      return {
        total: parseFloat(total.toFixed(2)),
        count,
        topCategory,
        categories
      };

    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      throw error;
    }
  }

  /**
   * Format expense summary for Telegram
   */
  formatExpenseSummary(expenses, title) {
    if (!expenses || expenses.length === 0) {
      return `📊 ${title}\n💰 Total: $0.00\n📋 No expenses found`;
    }

    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
    const count = expenses.length;
    const stores = [...new Set(expenses.map(e => e.store_name))];

    // Category breakdown
    const categoryTotals = {};
    expenses.forEach(expense => {
      const category = expense.category;
      categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.total_amount);
    });

    let message = `📊 ${title}\n`;
    message += `💰 Total: $${total.toFixed(2)}\n`;
    message += `📋 Transactions: ${count}\n`;
    
    if (stores.length > 0) {
      const storeList = stores.slice(0, 3).join(', ');
      const moreStores = stores.length > 3 ? ` (+${stores.length - 3} more)` : '';
      message += `🏪 Stores: ${storeList}${moreStores}\n`;
    }

    if (Object.keys(categoryTotals).length > 0) {
      message += `\n📈 Categories:\n`;
      Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .forEach(([category, amount]) => {
          const percentage = ((amount / total) * 100).toFixed(0);
          const emoji = this.getCategoryEmoji(category);
          message += `${emoji} ${this.capitalizeFirst(category)}: $${amount.toFixed(2)} (${percentage}%)\n`;
        });
    }

    return message;
  }

  /**
   * Get emoji for category
   */
  getCategoryEmoji(category) {
    const emojis = {
      groceries: '🛒',
      dining: '🍽️',
      gas: '⛽',
      pharmacy: '💊',
      retail: '🛍️',
      services: '🔧',
      other: '📦'
    };
    return emojis[category] || '📦';
  }

  /**
   * Capitalize first letter
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Format monthly stats for Telegram
   */
  formatMonthlyStats(stats) {
    if (stats.total === 0) {
      return `📊 Monthly Overview\n💰 Total: $0.00\n📋 No expenses this month`;
    }

    let message = `📊 Monthly Overview\n`;
    message += `💰 Total: $${stats.total}\n`;
    message += `📋 Transactions: ${stats.count}\n`;

    if (stats.topCategory) {
      const emoji = this.getCategoryEmoji(stats.topCategory.category);
      message += `🏆 Top Category: ${emoji} ${this.capitalizeFirst(stats.topCategory.category)} ($${stats.topCategory.amount})\n`;
    }

    if (stats.categories.length > 1) {
      message += `\n📈 Categories:\n`;
      stats.categories.slice(0, 3).forEach(cat => {
        const emoji = this.getCategoryEmoji(cat.category);
        message += `${emoji} ${this.capitalizeFirst(cat.category)}: $${cat.amount} (${cat.percentage}%)\n`;
      });
    }

    return message;
  }

  /**
   * Get expenses for custom date range
   */
  async getCustomRangeExpenses(userId, startDate, endDate) {
    return this.getExpensesByDateRange(userId, startDate, endDate);
  }

  /**
   * Get top stores from expenses
   */
  getTopStores(expenses, limit = 5) {
    if (!expenses || expenses.length === 0) {
      return [];
    }

    const storeTotals = {};
    const storeCounts = {};

    expenses.forEach(expense => {
      const store = expense.store_name;
      const amount = parseFloat(expense.total_amount);
      
      if (!storeTotals[store]) {
        storeTotals[store] = 0;
        storeCounts[store] = 0;
      }
      
      storeTotals[store] += amount;
      storeCounts[store] += 1;
    });

    return Object.entries(storeTotals)
      .map(([store, total]) => ({
        store,
        total: parseFloat(total.toFixed(2)),
        count: storeCounts[store]
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  /**
   * Get category breakdown from expenses
   */
  getCategoryBreakdown(expenses) {
    if (!expenses || expenses.length === 0) {
      return [];
    }

    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
    const categoryTotals = {};

    expenses.forEach(expense => {
      const category = expense.category;
      const amount = parseFloat(expense.total_amount);
      categoryTotals[category] = (categoryTotals[category] || 0) + amount;
    });

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount: parseFloat(amount.toFixed(2)),
        percentage: ((amount / total) * 100).toFixed(1)
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * Create new expense record
   */
  async createExpense(userId, expenseData) {
    try {
      const { data, error } = await this.supabase
        .from('expenses')
        .insert([{
          user_id: userId,
          receipt_date: expenseData.receiptDate,
          store_name: expenseData.storeName,
          category: expenseData.category,
          total_amount: parseFloat(expenseData.totalAmount),
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  /**
   * Get available categories
   */
  getAvailableCategories() {
    return [
      { value: 'groceries', label: '🛒 Groceries', emoji: '🛒' },
      { value: 'dining', label: '🍽️ Dining', emoji: '🍽️' },
      { value: 'gas', label: '⛽ Gas', emoji: '⛽' },
      { value: 'pharmacy', label: '💊 Pharmacy', emoji: '💊' },
      { value: 'retail', label: '🛍️ Retail', emoji: '🛍️' },
      { value: 'services', label: '🔧 Services', emoji: '🔧' },
      { value: 'other', label: '📦 Other', emoji: '📦' }
    ];
  }
}

export default ExpenseService;