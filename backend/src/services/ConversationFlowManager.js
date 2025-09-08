import { isValidDateFormat, isValidAmount } from '../utils/dateUtils.js';

/**
 * Manages all conversation flows for bot interactions
 * Extracted from BotManager.js to improve maintainability and debugging
 */
class ConversationFlowManager {
  constructor(supabase, expenseService, conversationManager) {
    this.supabase = supabase;
    this.expenseService = expenseService;
    this.conversationManager = conversationManager;
  }

  /**
   * Route conversation input to appropriate flow handler
   */
  async handleConversationInput(userId, input, conversation) {
    switch (conversation.type) {
      case 'create_expense':
        return this.handleCreateExpenseFlow(userId, input, conversation);
      case 'create_income':
        return this.handleCreateIncomeFlow(userId, input, conversation);
      case 'create_project':
        return this.handleCreateProjectFlow(userId, input, conversation);
      case 'close_project':
        return this.handleCloseProjectFlow(userId, input, conversation);
      case 'open_project':
        return this.handleOpenProjectFlow(userId, input, conversation);
      case 'project_selection':
        return this.handleProjectSelectionFlow(userId, input, conversation);
      case 'income_project_selection':
        return this.handleIncomeProjectSelectionFlow(userId, input, conversation);
      case 'multi_receipt_confirmation':
        return this.handleMultiReceiptConfirmation(userId, input, conversation);
      case 'multi_receipt_project_selection':
        return this.handleMultiReceiptProjectSelection(userId, input, conversation);
      default:
        this.conversationManager.endConversation(userId);
        return '❌ Unknown conversation type. Please start over.';
    }
  }

  /**
   * Handle create expense conversation flow
   */
  async handleCreateExpenseFlow(userId, input, conversation) {
    switch (conversation.step) {
      case 0: // Waiting for expense date
        if (!isValidDateFormat(input)) {
          return `❌ Invalid date format. Please use YYYY-MM-DD format.

📅 *Examples:*
• 2025-01-15
• 2025-08-24

Please enter the expense date or /cancel to stop:`;
        }
        
        this.conversationManager.updateStep(userId, 1, { receiptDate: input });
        return `✅ Date set: ${input}

🏪 Please enter the store name:

*Examples:* Walmart, Amazon, Starbucks, etc.`;

      case 1: // Waiting for store name
        if (!input || input.trim().length < 1) {
          return `❌ Store name cannot be empty.

🏪 Please enter the store name:`;
        }

        this.conversationManager.updateStep(userId, 2, { storeName: input.trim() });
        const categories = await this.expenseService.getAvailableCategoriesByType(userId, 'expense');
        let categoryMessage = `✅ Store: ${input.trim()}

📋 Please select a category by typing the number:

`;
        categories.forEach((cat, index) => {
          categoryMessage += `${index + 1}. ${cat.label}\n`;
        });

        return categoryMessage;

      case 2: // Waiting for category selection
        const categoryIndex = parseInt(input) - 1;
        const availableCategories = await this.expenseService.getAvailableCategoriesByType(userId, 'expense');
        
        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= availableCategories.length) {
          return `❌ Invalid selection. Please choose a number from 1 to ${availableCategories.length}:

${availableCategories.map((cat, index) => `${index + 1}. ${cat.label}`).join('\n')}`;
        }

        const selectedCategory = availableCategories[categoryIndex];
        this.conversationManager.updateStep(userId, 3, { 
          category: selectedCategory.value,
          categoryId: selectedCategory.id 
        });
        return `✅ Category: ${selectedCategory.label}

💰 Please enter the total amount (numbers only):

*Examples:* 25.99, 100, 15.50`;

      case 3: // Waiting for amount
        if (!isValidAmount(input)) {
          return `❌ Invalid amount. Please enter a positive number.

💵 *Examples:* 25.99, 100, 15.50

Please enter the total amount:`;
        }

        const amount = parseFloat(input).toFixed(2);
        const expenseData = {
          receipt_date: conversation.data.receiptDate,
          store_name: conversation.data.storeName,
          category: conversation.data.category,
          category_id: conversation.data.categoryId,
          total_amount: parseFloat(amount)
        };

        // Check for open projects
        const hasOpenProjects = await this.hasOpenProjects(userId);
        
        if (hasOpenProjects) {
          // Show project selection
          this.conversationManager.endConversation(userId);
          return await this.showProjectSelection(userId, expenseData);
        } else {
          // No open projects, save directly as general expense
          try {
            await this.saveReceiptAsExpense(userId, expenseData, null);
            this.conversationManager.endConversation(userId);
            
            return `✅ *Expense Created Successfully!*

📊 *Summary:*
📅 Date: ${expenseData.receipt_date}
🏪 Store: ${expenseData.store_name}
📋 Category: ${this.expenseService.capitalizeFirst(expenseData.category)}
💰 Amount: $${amount}
📁 Project: General expenses

The expense has been saved to your account.`;

          } catch (error) {
            console.error('Error creating expense:', error);
            this.conversationManager.endConversation(userId);
            return '❌ Sorry, there was an error saving your expense. Please try again with /create command.';
          }
        }
        break;
    }
  }

  /**
   * Handle create income conversation flow
   */
  async handleCreateIncomeFlow(userId, input, conversation) {
    switch (conversation.step) {
      case 0: // Waiting for income date
        if (!isValidDateFormat(input)) {
          return `❌ Invalid date format. Please use YYYY-MM-DD format.

📅 *Examples:*
• 2025-01-15
• 2025-08-24

Please enter the income date or /cancel to stop:`;
        }
        
        this.conversationManager.updateStep(userId, 1, { incomeDate: input });
        return `✅ Date set: ${input}

📝 Please enter a description for this income:

*Examples:* Monthly salary, Freelance payment, Investment return, etc.`;

      case 1: // Waiting for description
        if (!input || input.trim().length < 1) {
          return `❌ Description cannot be empty.

📝 Please enter a description for this income:`;
        }

        this.conversationManager.updateStep(userId, 2, { description: input.trim() });
        const incomeCategories = await this.expenseService.getAvailableCategoriesByType(userId, 'income');
        let categoryMessage = `✅ Description: ${input.trim()}

📋 Please select an income category by typing the number:

`;
        incomeCategories.forEach((cat, index) => {
          categoryMessage += `${index + 1}. ${cat.label}\n`;
        });

        return categoryMessage;

      case 2: // Waiting for category selection
        const categoryIndex = parseInt(input) - 1;
        const availableIncomeCategories = await this.expenseService.getAvailableCategoriesByType(userId, 'income');
        
        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= availableIncomeCategories.length) {
          return `❌ Invalid selection. Please choose a number from 1 to ${availableIncomeCategories.length}:

${availableIncomeCategories.map((cat, index) => `${index + 1}. ${cat.label}`).join('\n')}`;
        }

        const selectedIncomeCategory = availableIncomeCategories[categoryIndex];
        this.conversationManager.updateStep(userId, 3, { 
          category: selectedIncomeCategory.value,
          categoryId: selectedIncomeCategory.id 
        });
        return `✅ Category: ${selectedIncomeCategory.label}

💰 Please enter the income amount (numbers only):

*Examples:* 2500.00, 500, 1000.50`;

      case 3: // Waiting for amount
        if (!isValidAmount(input)) {
          return `❌ Invalid amount. Please enter a positive number.

💰 *Examples:* 2500.00, 500, 1000.50

Please enter the income amount:`;
        }

        const amount = parseFloat(input).toFixed(2);
        const incomeData = {
          receipt_date: conversation.data.incomeDate,
          store_name: conversation.data.description, // Use description as store_name for compatibility
          source: conversation.data.description, // Store description as source
          description: conversation.data.description,
          category: conversation.data.category,
          category_id: conversation.data.categoryId,
          total_amount: parseFloat(amount)
        };

        // Check for open projects (same logic as expense)
        const hasOpenProjects = await this.hasOpenProjects(userId);
        
        if (hasOpenProjects) {
          // Show project selection
          this.conversationManager.endConversation(userId);
          return await this.showProjectSelectionForIncome(userId, incomeData);
        } else {
          // No open projects, save directly as general income
          try {
            await this.expenseService.createIncomeTransaction(userId, incomeData);
            this.conversationManager.endConversation(userId);
            
            return `✅ *Income Created Successfully!*

📊 *Summary:*
📅 Date: ${incomeData.receipt_date}
📝 Description: ${incomeData.description}
📋 Category: ${this.expenseService.capitalizeFirst(incomeData.category)}
💰 Amount: +$${amount}
📈 Type: Income
📁 Project: General

The income has been saved to your account.`;

          } catch (error) {
            console.error('Error creating income:', error);
            this.conversationManager.endConversation(userId);
            return '❌ Sorry, there was an error saving your income. Please try again with /income command.';
          }
        }
        break;
    }
  }

  /**
   * Check if user has open projects
   */
  async hasOpenProjects(userId) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'open')
        .limit(1);

      return !error && projects && projects.length > 0;
    } catch (error) {
      console.error('Error checking open projects:', error);
      return false;
    }
  }

  /**
   * Show project selection for expense transactions
   */
  async showProjectSelection(userId, expenseData) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name, currency')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('name');

      if (error || !projects) {
        console.error('Error fetching projects for selection:', error);
        return '❌ Error fetching projects. Saving as general expense.';
      }

      // Build selection options
      const options = [
        { label: 'General expenses', project_id: null, currency: '$' }
      ];

      projects.forEach(project => {
        options.push({
          label: project.name,
          project_id: project.id,
          currency: project.currency
        });
      });

      // Start project selection conversation
      this.conversationManager.startConversation(userId, 'project_selection', {
        options: options,
        expenseData: expenseData
      });

      let message = `✅ *Receipt Processed Successfully!*

📊 *Extracted Data:*
📅 Date: ${expenseData.date || expenseData.receipt_date || 'N/A'}
🏪 Store: ${expenseData.store_name || 'N/A'}
🏷️ Category: ${expenseData.category || 'N/A'}
💰 Total: ${(expenseData.total || expenseData.total_amount || 0).toFixed(2)}

📁 *Where would you like to save this expense?*

`;

      options.forEach((option, index) => {
        const currencyInfo = option.project_id ? ` (${option.currency})` : '';
        message += `${index + 1}. ${option.label}${currencyInfo}\n`;
      });

      message += `\n💡 Reply with the number of your choice.`;

      return message;

    } catch (error) {
      console.error('Error in showProjectSelection:', error);
      return '❌ Error showing project selection. Please try again.';
    }
  }

  /**
   * Show project selection for income transactions
   */
  async showProjectSelectionForIncome(userId, incomeData) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name, currency')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('name');

      if (error || !projects) {
        console.error('Error fetching projects for income selection:', error);
        return '❌ Error fetching projects. Saving as general income.';
      }

      // Build selection options
      const options = [
        { label: 'General income', project_id: null, currency: '$' }
      ];

      projects.forEach(project => {
        options.push({
          label: project.name,
          project_id: project.id,
          currency: project.currency
        });
      });

      // Start project selection conversation for income
      this.conversationManager.startConversation(userId, 'income_project_selection', {
        options: options,
        incomeData: incomeData
      });

      let message = `✅ *Income Transaction Ready!*

📊 *Summary:*
📅 Date: ${incomeData.receipt_date || 'N/A'}
📝 Description: ${incomeData.description || 'N/A'}
🏷️ Category: ${incomeData.category || 'N/A'}
💰 Amount: +$${(incomeData.total_amount || 0).toFixed(2)}

📁 *Which project should this income be assigned to?*

`;

      options.forEach((option, index) => {
        const currencyInfo = option.project_id ? ` (${option.currency})` : '';
        message += `${index + 1}. ${option.label}${currencyInfo}\n`;
      });

      message += `\n💡 Reply with the number of your choice.`;

      return message;

    } catch (error) {
      console.error('Error in showProjectSelectionForIncome:', error);
      return '❌ Error showing project selection. Please try again.';
    }
  }

  /**
   * Save receipt data as expense
   */
  async saveReceiptAsExpense(userId, receiptData, projectId) {
    try {
      // Auto-resolve category_id if missing but category name exists
      let categoryId = receiptData.category_id;
      
      if (!categoryId && receiptData.category) {
        const categories = await this.expenseService.getAvailableCategoriesByType(userId, 'expense');
        const matchingCategory = categories.find(cat => cat.value === receiptData.category);
        if (matchingCategory) {
          categoryId = matchingCategory.id;
        }
      }

      const expenseRecord = {
        user_id: userId,
        project_id: projectId,
        receipt_date: receiptData.receipt_date || receiptData.date,
        store_name: receiptData.store_name,
        category: receiptData.category,
        category_id: categoryId,
        total_amount: receiptData.total_amount || receiptData.total,
        type: 'expense'
      };

      const { data, error } = await this.supabase
        .from('expenses')
        .insert([expenseRecord])
        .select()
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      console.log(`✅ Saved expense: $${expenseRecord.total_amount} at ${expenseRecord.store_name}`);
      return data;

    } catch (error) {
      console.error('Error saving expense:', error);
      throw error;
    }
  }

  // Additional flow methods will be added in next step
  async handleCreateProjectFlow(userId, input, conversation) {
    throw new Error('Method will be implemented in next step');
  }

  async handleProjectSelectionFlow(userId, input, conversation) {
    throw new Error('Method will be implemented in next step');
  }

  async handleIncomeProjectSelectionFlow(userId, input, conversation) {
    throw new Error('Method will be implemented in next step');
  }

  async handleMultiReceiptConfirmation(userId, input, conversation) {
    throw new Error('Method will be implemented in next step');
  }

  async handleMultiReceiptProjectSelection(userId, input, conversation) {
    throw new Error('Method will be implemented in next step');
  }

  async handleCloseProjectFlow(userId, input, conversation) {
    throw new Error('Method will be implemented in next step');
  }

  async handleOpenProjectFlow(userId, input, conversation) {
    throw new Error('Method will be implemented in next step');
  }
}

export default ConversationFlowManager;