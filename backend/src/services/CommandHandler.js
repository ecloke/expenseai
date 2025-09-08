import { parseMonthRange, formatDateRange } from '../utils/dateUtils.js';

/**
 * Handles all text commands for bot interactions
 * Extracted from BotManager.js to improve maintainability and debugging
 */
class CommandHandler {
  constructor(supabase, expenseService, conversationManager) {
    this.supabase = supabase;
    this.expenseService = expenseService;
    this.conversationManager = conversationManager;
  }

  /**
   * Process text commands and route to appropriate handler
   */
  async handleTextCommand(text, userId) {
    const trimmedText = text.trim();
    const parts = trimmedText.split(' ');
    const command = parts[0].toLowerCase();
    const params = parts.slice(1);

    try {
      switch (command) {
        case '/start':
          return this.getHelpMessage();
        case '/help':
          return this.getHelpMessage();
        case '/stats':
          const stats = await this.expenseService.getMonthlyStats(userId);
          return this.expenseService.formatMonthlyStats(stats);
        case '/today':
          const todayExpenses = await this.expenseService.getTodayExpensesWithProjects(userId);
          return this.expenseService.formatExpenseSummaryWithProjects(todayExpenses, "Today's Expenses");
        case '/yesterday':
          const yesterdayExpenses = await this.expenseService.getYesterdayExpensesWithProjects(userId);
          return this.expenseService.formatExpenseSummaryWithProjects(yesterdayExpenses, "Yesterday's Expenses");
        case '/week':
          const weekExpenses = await this.expenseService.getWeekExpensesWithProjects(userId);
          return this.expenseService.formatExpenseSummaryWithProjects(weekExpenses, "This Week's Expenses");
        case '/month':
          const monthExpenses = await this.expenseService.getMonthExpensesWithProjects(userId);
          return this.expenseService.formatExpenseSummaryWithProjects(monthExpenses, "This Month's Expenses");
        case '/summary':
          return this.handleSummaryCommand(userId, params);
        case '/create':
          return this.handleCreateCommand(userId);
        case '/income':
          return this.handleIncomeCommand(userId);
        case '/list':
          return this.handleListCommand(userId);
        case '/new':
          return this.handleNewProjectCommand(userId);
        case '/close':
          return this.handleCloseCommand(userId);
        case '/open':
          return this.handleOpenCommand(userId);
        case '/cancel':
          return '❌ No active operation to cancel.';
        default:
          return this.getUnknownCommandMessage();
      }
    } catch (error) {
      console.error('Error handling command:', error);
      return '❌ Sorry, I encountered an error processing your request. Please try again.';
    }
  }

  /**
   * Handle /summary command with parameters
   * Enhanced to show comprehensive income/expense breakdown
   */
  async handleSummaryCommand(userId, params) {
    if (params.length === 0) {
      return this.getSummaryUsageMessage();
    }

    const period = params.join(' ').toLowerCase();
    let validPeriod = '';
    let customRange = null;

    try {
      // First try basic period aliases
      switch (period) {
        case 'day':
        case 'today':
          validPeriod = 'today';
          break;
        case 'week':
          validPeriod = 'week';
          break;
        case 'month':
          validPeriod = 'month';
          break;
        default:
          // Try parsing as custom month/range (e.g., "august", "jan-aug")
          const monthRange = parseMonthRange(period);
          if (monthRange) {
            customRange = monthRange;
            validPeriod = 'custom';
          } else {
            return this.getSummaryUsageMessage();
          }
      }

      // Get comprehensive income/expense summary
      let summary;
      if (validPeriod === 'custom' && customRange) {
        // Use custom date range - get raw transactions and build summary
        const transactions = await this.expenseService.getExpensesByDateRangeWithProjects(userId, customRange.startDate, customRange.endDate);
        summary = this.buildCustomSummary(transactions, formatDateRange(customRange));
      } else {
        // Use predefined period
        summary = await this.expenseService.getIncomeExpenseSummary(userId, validPeriod);
      }
      
      if (!summary) {
        return `📊 No transactions found for ${validPeriod}.`;
      }

      const periodLabel = validPeriod === 'custom' ? customRange.displayName || 'Custom Period' : validPeriod.charAt(0).toUpperCase() + validPeriod.slice(1);
      const netAmount = summary.net_balance;
      const netEmoji = netAmount >= 0 ? '💚' : '❤️';
      const netLabel = netAmount >= 0 ? 'Net Gain' : 'Net Loss';

      return `📊 **${periodLabel} Financial Summary**

💰 **Income: +$${summary.total_income.toFixed(2)}**
📈 Transactions: ${summary.transaction_count.income}
📋 Categories: ${summary.income_breakdown.map(c => `${c.category} (+$${c.amount.toFixed(2)})`).join(', ') || 'None'}

💸 **Expenses: -$${summary.total_expenses.toFixed(2)}**  
📉 Transactions: ${summary.transaction_count.expenses}
📋 Categories: ${summary.expense_breakdown.map(c => `${c.category} (-$${c.amount.toFixed(2)})`).join(', ') || 'None'}

${netEmoji} **${netLabel}: ${netAmount >= 0 ? '+' : ''}$${Math.abs(netAmount).toFixed(2)}**

💡 Use \`/summary week\` or \`/summary month\` for different periods.`;

    } catch (error) {
      console.error('Error getting summary:', error);
      return `❌ Sorry, I couldn't retrieve your ${validPeriod} summary. Please try again.`;
    }
  }

  /**
   * Handle /create command - start expense creation flow
   */
  async handleCreateCommand(userId) {
    this.conversationManager.startConversation(userId, 'create_expense');
    return `💰 **Create New Expense**

📅 Please enter the expense date (YYYY-MM-DD format):

*Examples:* 2025-01-15, 2025-08-24

💡 Or type /cancel to stop.`;
  }

  /**
   * Handle /income command - start income creation flow
   */
  async handleIncomeCommand(userId) {
    this.conversationManager.startConversation(userId, 'create_income');
    return `💰 **Create New Income**

📅 Please enter the income date (YYYY-MM-DD format):

*Examples:* 2025-01-15, 2025-08-24

💡 Or type /cancel to stop.`;
  }

  /**
   * Handle /list command - show open projects
   */
  async handleListCommand(userId) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('name, currency, created_at')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        return '❌ Sorry, I couldn\'t fetch your projects. Please try again.';
      }

      if (!projects || projects.length === 0) {
        return `📁 **No Open Projects**

You don't have any open projects yet.

💡 Use **/new** to create your first project!`;
      }

      let message = `📁 **Your Open Projects (${projects.length})**\n\n`;
      projects.forEach((project, index) => {
        const createdDate = new Date(project.created_at).toLocaleDateString();
        message += `${index + 1}. **${project.name}** (${project.currency})\n`;
        message += `   📅 Created: ${createdDate}\n\n`;
      });

      message += `💡 Use **/close** to close a project when finished.`;
      return message;

    } catch (error) {
      console.error('Error in handleListCommand:', error);
      return '❌ Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Handle /new command - create new project
   */
  async handleNewProjectCommand(userId) {
    this.conversationManager.startConversation(userId, 'create_project', { step: 'name' });
    return `🆕 **Create New Project**

📝 What would you like to name your project?

*Examples:* "Japan Trip 2025", "Home Renovation", "Wedding Planning"

💡 Choose a descriptive name to help you track expenses.`;
  }

  /**
   * Handle /close command - close existing project
   */
  async handleCloseCommand(userId) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name, currency, created_at')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('name');

      if (error) {
        console.error('Error fetching projects for closing:', error);
        return '❌ Sorry, I couldn\'t fetch your projects. Please try again.';
      }

      if (!projects || projects.length === 0) {
        return `📁 **No Open Projects to Close**

You don't have any open projects to close.

💡 Use **/list** to see all your projects.`;
      }

      this.conversationManager.startConversation(userId, 'close_project', { projects });

      let message = `📁 **Close Project**

Which project would you like to close?

`;

      projects.forEach((project, index) => {
        message += `${index + 1}. ${project.name} (${project.currency})\n`;
      });

      message += `\n💡 Reply with the number of the project to close.`;
      return message;

    } catch (error) {
      console.error('Error in handleCloseCommand:', error);
      return '❌ Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Handle /open command - reopen closed project
   */
  async handleOpenCommand(userId) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name, currency, created_at')
        .eq('user_id', userId)
        .eq('status', 'closed')
        .order('name');

      if (error) {
        console.error('Error fetching closed projects:', error);
        return '❌ Sorry, I couldn\'t fetch your closed projects. Please try again.';
      }

      if (!projects || projects.length === 0) {
        return `📁 **No Closed Projects to Reopen**

All your projects are already open!

💡 Use **/list** to see your open projects.`;
      }

      this.conversationManager.startConversation(userId, 'open_project', { projects });

      let message = `📁 **Reopen Project**

Which closed project would you like to reopen?

`;

      projects.forEach((project, index) => {
        message += `${index + 1}. ${project.name} (${project.currency})\n`;
      });

      message += `\n💡 Reply with the number of the project to reopen.`;
      return message;

    } catch (error) {
      console.error('Error in handleOpenCommand:', error);
      return '❌ Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Get summary usage message
   */
  getSummaryUsageMessage() {
    return `📊 **Financial Summary**

Get your income and expense breakdown for any period.

**Basic Usage:**
• \`/summary today\` - Today's transactions
• \`/summary week\` - This week's summary  
• \`/summary month\` - This month's summary

**Custom Months:**
• \`/summary august\` - August this year
• \`/summary jan-aug\` - January to August range
• \`/summary december\` - December this year

**What you'll see:**
✅ Total income and expense amounts
✅ Transaction counts by type
✅ Category breakdowns
✅ Net gain/loss calculation

💡 Perfect for tracking your financial health!`;
  }

  /**
   * Get help message with all available commands
   */
  getHelpMessage() {
    return `🤖 **ExpenseAI Bot - Help Guide**

**💰 Financial Tracking:**
• \`/summary [period]\` - View income/expense summary
• \`/create\` - Add a new expense manually
• \`/income\` - Add a new income transaction
• 📸 **Send receipt photos** - Auto-extract expense data

**📁 Project Management:**
• \`/list\` - Show your open projects  
• \`/new\` - Create a new project
• \`/close\` - Close a finished project
• \`/open\` - Reopen a closed project

**📊 Smart Features:**
• **Photo Recognition** - Upload receipts for instant processing
• **Project Assignment** - Organize expenses by project  
• **Income Tracking** - Complete financial picture
• **Category Auto-Detection** - Smart expense categorization

**🔍 Examples:**
• \`/summary week\` - This week's financial summary
• \`/summary month\` - Monthly income vs expenses
• Upload a receipt photo → Get instant expense entry

**💡 Tips:**
• Start with \`/new\` to create your first project
• Use \`/summary month\` to see your spending patterns
• Upload receipt photos for fastest expense tracking

Need help? Just send any message and I'll guide you! 🚀`;
  }

  /**
   * Get message for unknown commands
   */
  getUnknownCommandMessage() {
    return `❓ **Unknown Command**

I didn't recognize that command. Here are the available options:

**📊 Quick Actions:**
• \`/summary week\` - Financial summary
• \`/create\` - Add expense
• \`/income\` - Add income  
• \`/list\` - View projects

**📸 Or simply upload a receipt photo!**

💡 Type \`/help\` for complete command list.`;
  }

  /**
   * Build summary from raw transaction data for custom date ranges
   */
  buildCustomSummary(transactions, displayName) {
    if (!transactions || transactions.length === 0) {
      return {
        period: 'custom',
        total_income: 0,
        total_expenses: 0,
        net_balance: 0,
        income_breakdown: [],
        expense_breakdown: [],
        transaction_count: {
          income: 0,
          expenses: 0,
          total: 0
        },
        displayName: displayName
      };
    }

    // Separate income and expenses
    const income = [];
    const expenses = [];

    for (const transaction of transactions) {
      if (transaction.type === 'income') {
        income.push(transaction);
      } else {
        expenses.push(transaction);
      }
    }

    // Calculate totals
    const totalIncome = income.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.total_amount || 0), 0);
    const netBalance = totalIncome - totalExpenses;

    // Calculate category breakdowns
    const incomeBreakdown = this.calculateCategoryBreakdown(income, totalIncome);
    const expenseBreakdown = this.calculateCategoryBreakdown(expenses, totalExpenses);

    return {
      period: 'custom',
      total_income: totalIncome,
      total_expenses: totalExpenses,
      net_balance: netBalance,
      income_breakdown: incomeBreakdown,
      expense_breakdown: expenseBreakdown,
      transaction_count: {
        income: income.length,
        expenses: expenses.length,
        total: transactions.length
      },
      displayName: displayName
    };
  }

  /**
   * Calculate category breakdown with percentages (same logic as ExpenseService)
   */
  calculateCategoryBreakdown(transactions, total) {
    if (!transactions || transactions.length === 0 || total === 0) {
      return [];
    }

    const categoryTotals = {};
    
    // Group by category
    for (const transaction of transactions) {
      const category = transaction.category || 'Other';
      categoryTotals[category] = (categoryTotals[category] || 0) + (transaction.total_amount || 0);
    }

    // Convert to breakdown array with percentages
    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category: category,
        amount: amount,
        percentage: Math.round((amount / total) * 100)
      }))
      .sort((a, b) => b.amount - a.amount); // Sort by amount descending
  }
}

export default CommandHandler;