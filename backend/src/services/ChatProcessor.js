import { GoogleGenerativeAI } from '@google/generative-ai';
import { decrypt } from '../utils/encryption.js';
import { validateInput, chatQuerySchema, sanitizeText } from '../utils/validation.js';
import SheetsService from './SheetsService.js';

/**
 * Chat processor for natural language expense queries
 * Uses Gemini Pro with function calling for query understanding
 */
class ChatProcessor {
  constructor(supabase) {
    this.supabase = supabase;
    this.sheetsService = new SheetsService(supabase);
    this.genAI = null;
  }

  /**
   * Process natural language query about expenses
   * @param {string} userQuery - User's natural language query
   * @param {string} userId - User ID
   * @param {Object} userConfig - User configuration with API keys
   * @returns {string} - AI-generated response
   */
  async processQuery(userQuery, userId, userConfig) {
    try {
      console.log(`💬 Processing chat query for user ${userId}: "${userQuery}"`);

      // Validate and sanitize input
      const validation = chatQuerySchema.validate({ query: userQuery, user_id: userId });
      if (validation.error) {
        return `❌ Invalid query: ${validation.error.details[0].message}`;
      }

      const sanitizedQuery = sanitizeText(userQuery);
      
      // Initialize Gemini with user's API key
      const geminiApiKey = decrypt(userConfig.gemini_api_key);
      if (!geminiApiKey) {
        throw new Error('Failed to decrypt Gemini API key');
      }

      this.genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.1,
          topP: 1,
          maxOutputTokens: 1000,
        }
      });

      // Initialize sheets service
      await this.sheetsService.initializeForUser(userConfig);

      // Get expense data from Google Sheets
      const expenseData = await this.getExpenseData(userConfig);

      // Define function tools for query understanding
      const tools = [{
        functionDeclarations: [
          {
            name: "get_expense_data",
            description: "Query user's expense data from Google Sheets",
            parameters: {
              type: "object",
              properties: {
                query_type: {
                  type: "string",
                  enum: ["total_spending", "category_breakdown", "date_range", "comparison", "biggest_expenses", "recent_activity"],
                  description: "Type of expense query"
                },
                time_period: {
                  type: "string",
                  description: "Time period like 'last week', 'this month', 'last 30 days', 'today'"
                },
                category: {
                  type: "string",
                  enum: ["groceries", "dining", "gas", "pharmacy", "retail", "services", "other"],
                  description: "Expense category if filtering by category"
                },
                limit: {
                  type: "number",
                  description: "Number of results to return for biggest expenses or recent activity"
                }
              },
              required: ["query_type"]
            }
          }
        ]
      }];

      // Create chat session with function calling
      const chat = model.startChat({
        tools,
        toolConfig: { functionCallingConfig: { mode: "ANY" } }
      });

      // Get current Malaysia time for context
      const malaysiaToday = new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Kuala_Lumpur"
      });

      // System prompt with expense data context
      const systemPrompt = `You are an AI assistant that helps users analyze their expense data. 

Current context:
- Today's date (Malaysia time): ${malaysiaToday}
- Total expenses: $${this.calculateTotal(expenseData)}
- Number of transactions: ${expenseData.length}
- Date range: ${this.getDateRange(expenseData)}
- Categories: ${this.getCategories(expenseData).join(', ')}

When users ask about "today" or "this week", use Malaysia timezone (${malaysiaToday}). Always provide helpful insights with specific numbers.

User query: "${sanitizedQuery}"`;

      // Send message and get response
      const result = await chat.sendMessage(systemPrompt);
      const response = await result.response;

      // Skip function calling for now - just return text response
      const functionCall = null; // response.functionCall() is not working
      
      if (functionCall) {
        // Process function call
        const queryResult = await this.executeExpenseQuery(functionCall.args, expenseData);
        
        // Send function result back to model
        const functionResponse = await chat.sendMessage([{
          functionResponse: {
            name: functionCall.name,
            response: queryResult
          }
        }]);

        const finalResponse = await functionResponse.response;
        const aiResponse = finalResponse.text();
        
        // Log successful query
        await this.logChatQuery(userId, sanitizedQuery, JSON.stringify(functionCall.args), aiResponse, 'success');
        
        return aiResponse;
      } else {
        // Direct response without function calling
        const aiResponse = response.text();
        
        // Log query
        await this.logChatQuery(userId, sanitizedQuery, null, aiResponse, 'success');
        
        return aiResponse;
      }

    } catch (error) {
      console.error(`❌ Chat processing failed for user ${userId}:`, error);
      
      // Log failed query
      await this.logChatQuery(userId, userQuery, null, null, 'error', error.message);
      
      // Return user-friendly error message
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return '⚠️ I\'ve reached my usage limit for now. Please try again later.';
      } else if (error.message.includes('API key')) {
        return '🔑 There seems to be an issue with your AI configuration. Please check your settings.';
      } else {
        return '❌ Sorry, I encountered an error processing your query. Please try rephrasing your question.';
      }
    }
  }

  /**
   * Get all expense data from user's Google Sheet
   */
  async getExpenseData(userConfig) {
    try {
      const sheetData = await this.sheetsService.getSheetData(
        userConfig.google_sheet_id,
        'AI Expense Tracker'  // Use the correct sheet name
      );

      // Parse and structure the data
      const expenses = [];
      
      // Skip header rows (row 1 has running totals, row 2 has headers, data starts from row 3)
      for (let i = 2; i < sheetData.length; i++) {
        const row = sheetData[i];
        if (row.length >= 6 && row[0] && row[5]) { // Date and Price required
          const itemTotal = parseFloat(row[6]) || 0;
          const serviceCharge = parseFloat(row[7]) || 0;
          const tax = parseFloat(row[8]) || 0;
          
          expenses.push({
            date: row[0],
            store: row[1] || '',
            item: row[2] || '',
            category: row[3] || 'other',
            quantity: parseFloat(row[4]) || 1,
            price: parseFloat(row[5]) || 0,
            total: itemTotal + serviceCharge + tax // Include service charge and tax in total
          });
        }
      }

      return expenses;
    } catch (error) {
      console.error('Failed to get expense data:', error);
      return [];
    }
  }

  /**
   * Execute expense query based on function call parameters
   */
  async executeExpenseQuery(params, expenseData) {
    const { query_type, time_period, category, limit } = params;

    try {
      // Filter data based on time period
      let filteredData = this.filterByTimePeriod(expenseData, time_period);
      
      // Filter by category if specified
      if (category) {
        filteredData = filteredData.filter(expense => expense.category === category);
      }

      switch (query_type) {
        case 'total_spending':
          return {
            total: this.calculateTotal(filteredData),
            count: filteredData.length,
            period: time_period || 'all time',
            category: category || 'all categories'
          };

        case 'category_breakdown':
          return this.getCategoryBreakdown(filteredData, time_period);

        case 'biggest_expenses':
          return this.getBiggestExpenses(filteredData, limit || 5);

        case 'recent_activity':
          return this.getRecentActivity(filteredData, limit || 10);

        case 'comparison':
          return this.getComparison(expenseData, time_period);

        case 'date_range':
          return this.getDateRangeAnalysis(filteredData, time_period);

        default:
          return { error: 'Unknown query type' };
      }
    } catch (error) {
      console.error('Error executing expense query:', error);
      return { error: 'Failed to process expense query' };
    }
  }

  /**
   * Filter expenses by time period
   */
  filterByTimePeriod(expenses, timePeriod) {
    if (!timePeriod) return expenses;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let startDate;
    
    switch (timePeriod.toLowerCase()) {
      case 'today':
        startDate = today;
        break;
      case 'yesterday':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'this week':
      case 'last week':
        const daysBack = timePeriod.includes('this') ? now.getDay() : 7 + now.getDay();
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - daysBack);
        break;
      case 'this month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        break;
      case 'last 30 days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'last 7 days':
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
        break;
      default:
        return expenses;
    }

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate;
    });
  }

  /**
   * Calculate total spending
   */
  calculateTotal(expenses) {
    return expenses.reduce((sum, expense) => sum + expense.total, 0).toFixed(2);
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown(expenses, timePeriod) {
    const breakdown = {};
    
    expenses.forEach(expense => {
      if (!breakdown[expense.category]) {
        breakdown[expense.category] = { total: 0, count: 0 };
      }
      breakdown[expense.category].total += expense.total;
      breakdown[expense.category].count += 1;
    });

    // Sort by total spending
    const sorted = Object.entries(breakdown)
      .map(([category, data]) => ({
        category,
        total: parseFloat(data.total.toFixed(2)),
        count: data.count,
        percentage: ((data.total / this.calculateTotal(expenses)) * 100).toFixed(1)
      }))
      .sort((a, b) => b.total - a.total);

    return {
      breakdown: sorted,
      period: timePeriod || 'all time',
      total: this.calculateTotal(expenses)
    };
  }

  /**
   * Get biggest expenses
   */
  getBiggestExpenses(expenses, limit) {
    const sorted = expenses
      .sort((a, b) => b.total - a.total)
      .slice(0, limit)
      .map(expense => ({
        date: expense.date,
        store: expense.store,
        item: expense.item,
        category: expense.category,
        amount: expense.total
      }));

    return {
      biggest_expenses: sorted,
      count: sorted.length
    };
  }

  /**
   * Get recent activity
   */
  getRecentActivity(expenses, limit) {
    const sorted = expenses
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)
      .map(expense => ({
        date: expense.date,
        store: expense.store,
        item: expense.item,
        category: expense.category,
        amount: expense.total
      }));

    return {
      recent_expenses: sorted,
      count: sorted.length
    };
  }

  /**
   * Get comparison data
   */
  getComparison(expenses, timePeriod) {
    // Implementation for comparing periods
    const currentPeriod = this.filterByTimePeriod(expenses, timePeriod);
    const previousPeriod = this.filterByTimePeriod(expenses, `previous ${timePeriod}`);

    return {
      current_total: this.calculateTotal(currentPeriod),
      previous_total: this.calculateTotal(previousPeriod),
      difference: (this.calculateTotal(currentPeriod) - this.calculateTotal(previousPeriod)).toFixed(2),
      period: timePeriod
    };
  }

  /**
   * Get date range analysis
   */
  getDateRangeAnalysis(expenses, timePeriod) {
    return {
      total: this.calculateTotal(expenses),
      count: expenses.length,
      period: timePeriod,
      date_range: this.getDateRange(expenses),
      average_per_transaction: (this.calculateTotal(expenses) / expenses.length).toFixed(2)
    };
  }

  /**
   * Helper methods
   */
  getDateRange(expenses) {
    if (expenses.length === 0) return 'No expenses';
    
    const validDates = expenses
      .map(e => {
        // Handle different date formats
        if (e.date && e.date !== 'Invalid Date') {
          return new Date(e.date);
        }
        return null;
      })
      .filter(date => date && !isNaN(date.getTime()))
      .sort();
    
    if (validDates.length === 0) return 'No valid dates';
    
    const earliest = validDates[0].toLocaleDateString();
    const latest = validDates[validDates.length - 1].toLocaleDateString();
    
    return `${earliest} to ${latest}`;
  }

  getCategories(expenses) {
    return [...new Set(expenses.map(e => e.category))];
  }

  /**
   * Log chat query for analytics
   */
  async logChatQuery(userId, userQuery, sqlGenerated, aiResponse, status, errorMessage = null) {
    try {
      const { error } = await this.supabase
        .from('chat_logs')
        .insert({
          user_id: userId,
          user_query: userQuery,
          sql_generated: sqlGenerated,
          // ai_response: aiResponse, // Column doesn't exist in chat_logs table
          processing_status: status
          // error_message: errorMessage // Column doesn't exist in chat_logs table
        });

      if (error) {
        console.error('Failed to log chat query:', error);
      }
    } catch (error) {
      console.error('Error logging chat query:', error);
    }
  }

  /**
   * Get chat statistics for a user
   */
  async getChatStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('chat_logs')
        .select('processing_status, created_at')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        total_queries: data.length,
        successful_queries: data.filter(log => log.processing_status === 'success').length,
        failed_queries: data.filter(log => log.processing_status === 'error').length,
        success_rate: data.length > 0 ? 
          (data.filter(log => log.processing_status === 'success').length / data.length * 100).toFixed(1) : 0
      };

    } catch (error) {
      console.error('Failed to get chat stats:', error);
      throw error;
    }
  }
}

export default ChatProcessor;