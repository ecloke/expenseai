import TelegramBot from 'node-telegram-bot-api';
import { decrypt } from '../utils/encryption.js';
import { checkRateLimit } from '../utils/validation.js';
import ReceiptProcessor from './ReceiptProcessor.js';
import ChatProcessor from './ChatProcessor.js';
import ExpenseService from './ExpenseService.js';
import ConversationStateManager from '../utils/conversationState.js';
import { parseMonthRange, isValidDateFormat, isValidAmount, formatDateRange } from '../utils/dateUtils.js';
import { generateCategoryPieChart } from '../utils/chartGenerator.js';
import https from 'https';

/**
 * Multi-bot manager that maintains separate bot instances for each user
 * Implements singleton pattern with Map<userId, botInstance>
 */
class BotManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.bots = new Map(); // userId -> { bot, config, lastActivity }
    this.receiptProcessor = new ReceiptProcessor(supabase);
    this.chatProcessor = new ChatProcessor(supabase);
    this.expenseService = new ExpenseService(supabase);
    this.conversationManager = new ConversationStateManager();
    this.rateLimitMap = new Map(); // For rate limiting per user
    this.errorLogCache = new Map(); // For error log rate limiting: userId_errorHash -> lastLogTime
    this.ERROR_LOG_RATE_LIMIT_MS = 60000; // 1 minute between identical error logs
    this.isShuttingDown = false;
    
    // Bind methods to maintain context
    this.handleMessage = this.handleMessage.bind(this);
    this.handlePhoto = this.handlePhoto.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  /**
   * Initialize bot manager by loading all user configurations
   */
  async initialize() {
    console.log('🤖 Initializing Bot Manager...');
    console.log('🔄 Clearing any cached bot instances to prevent stale user ID issues...');
    
    // Force clear any existing bots to prevent user ID cache issues
    this.bots.clear();
    
    try {
      // Test Supabase connection first
      console.log('🔍 Testing Supabase connection...');
      console.log(`📡 Supabase URL: ${process.env.SUPABASE_URL}`);
      
      // Try a simple query to test connection
      const { data: testData, error: testError } = await this.supabase
        .from('user_configs')
        .select('count')
        .limit(1);

      if (testError) {
        console.error(`❌ Supabase connection failed: ${testError.message}`);
        console.error('🔧 This usually means:');
        console.error('   1. Database schema not set up');
        console.error('   2. Wrong Supabase URL/keys');
        console.error('   3. RLS policies blocking access');
        console.log('📝 Running in fallback mode without database');
        console.log(`✅ Bot Manager initialized in fallback mode`);
        return;
      }

      console.log('✅ Supabase connection successful');

      // In development/test mode, skip bot initialization
      if (process.env.NODE_ENV === 'development' || !process.env.SUPABASE_URL?.includes('supabase.co')) {
        console.log('📝 Running in development mode - skipping bot initialization');
        console.log(`✅ Bot Manager initialized in development mode`);
        return;
      }

      // Load all active user configurations
      const { data: configs, error } = await this.supabase
        .from('user_configs')
        .select('*')
        .not('telegram_bot_token', 'is', null);

      if (error) {
        throw new Error(`Failed to load user configs: ${error.message}`);
      }

      console.log(`📊 Found ${configs?.length || 0} user configurations`);

      // Initialize bot for each user
      for (const config of configs || []) {
        try {
          await this.createUserBot(config);
        } catch (error) {
          console.error(`Failed to create bot for user ${config.user_id}:`, error.message);
          await this.logError(config.user_id, error);
        }
      }

      console.log(`✅ Bot Manager initialized with ${this.bots.size} active bots`);
    } catch (error) {
      console.error('❌ Failed to initialize Bot Manager:', error);
      throw error;
    }
  }

  /**
   * Create a new bot instance for a user
   */
  async createUserBot(config) {
    const userId = config.user_id;
    
    console.log(`🔍 DEBUG: Creating bot for user ID: ${userId}`);
    console.log(`🔍 DEBUG: Config details:`, {
      user_id: config.user_id,
      created_at: config.created_at,
      has_token: !!config.telegram_bot_token
    });
    
    try {
      // Decrypt bot token
      const botToken = decrypt(config.telegram_bot_token);
      if (!botToken) {
        throw new Error('Failed to decrypt bot token');
      }

      // Create bot instance with long polling
      const bot = new TelegramBot(botToken, { 
        polling: {
          interval: 300,
          autoStart: false
        }
      });

      // Set up message handlers
      bot.on('message', (msg) => this.handleMessage(msg, userId, config));
      bot.on('photo', (msg) => this.handlePhoto(msg, userId, config));
      bot.on('polling_error', (error) => this.handleError(userId, error));

      // Start polling
      await bot.startPolling();

      // Store bot instance
      this.bots.set(userId, {
        bot,
        config,
        lastActivity: new Date(),
        isActive: true
      });

      // Update session status
      await this.updateBotSession(userId, config.telegram_bot_username, true);

      console.log(`✅ Bot created for user ${userId} (@${config.telegram_bot_username})`);
      
    } catch (error) {
      console.error(`❌ Failed to create bot for user ${userId}:`, error.message);
      await this.logError(userId, error);
      throw error;
    }
  }

  /**
   * Handle incoming text messages
   */
  async handleMessage(msg, userId, config) {
    if (this.isShuttingDown) return;

    try {
      // Rate limiting check
      if (!checkRateLimit(this.rateLimitMap, userId, 60000, 20)) {
        const bot = this.bots.get(userId)?.bot;
        if (bot) {
          await bot.sendMessage(msg.chat.id, '⏰ Too many requests. Please wait a moment before sending another message.');
        }
        return;
      }

      // Update last activity
      this.updateLastActivity(userId);

      // Skip photo messages (handled separately)
      if (msg.photo) return;

      // Process text message as command (replaces AI chat processing)
      const response = await this.handleTextCommand(msg.text, userId);
      
      const bot = this.bots.get(userId)?.bot;
      if (bot && response) {
        await bot.sendMessage(msg.chat.id, response, {
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
      }

    } catch (error) {
      console.error(`Error handling message for user ${userId}:`, error);
      await this.logError(userId, error);
      
      // Send error message to user
      const bot = this.bots.get(userId)?.bot;
      if (bot) {
        await bot.sendMessage(msg.chat.id, '❌ Sorry, I encountered an error processing your message. Please try again.');
      }
    }
  }

  /**
   * Handle incoming photo messages (receipts)
   */
  async handlePhoto(msg, userId, config) {
    if (this.isShuttingDown) return;

    // DEBUG: Log user ID being used
    console.log(`🔍 DEBUG: handlePhoto called with userId: ${userId}`);
    console.log(`🔍 DEBUG: Chat ID: ${msg.chat.id}`);
    console.log(`🔍 DEBUG: Config user_id: ${config?.user_id}`);

    try {
      // Rate limiting check
      if (!checkRateLimit(this.rateLimitMap, userId, 60000, 5)) {
        const bot = this.bots.get(userId)?.bot;
        if (bot) {
          await bot.sendMessage(msg.chat.id, '⏰ Too many photo uploads. Please wait a moment.');
        }
        return;
      }

      // Check for multiple photos in quick succession (prevent AI token waste)
      const now = Date.now();
      const lastPhotoTime = this.rateLimitMap.get(`photo_${userId}`) || 0;
      const timeSinceLastPhoto = now - lastPhotoTime;
      
      if (timeSinceLastPhoto < 10000) { // Less than 10 seconds since last photo
        const bot = this.bots.get(userId)?.bot;
        if (bot) {
          await bot.sendMessage(msg.chat.id, `⚠️ *Multiple Photos Detected*

Please wait ${Math.ceil((10000 - timeSinceLastPhoto) / 1000)} seconds before sending another receipt.

💡 *Tip:* Send one receipt photo at a time for best AI processing results.`, {
            parse_mode: 'Markdown'
          });
        }
        return;
      }

      // Update last photo time
      this.rateLimitMap.set(`photo_${userId}`, now);

      // Update last activity
      this.updateLastActivity(userId);

      const bot = this.bots.get(userId)?.bot;
      if (!bot) return;

      // Validate single photo message
      if (!msg.photo || msg.photo.length === 0) {
        await bot.sendMessage(msg.chat.id, '❌ No photo detected. Please send a clear receipt photo.');
        return;
      }

      // Check for media group (multiple photos sent at once)
      if (msg.media_group_id) {
        await bot.sendMessage(msg.chat.id, `⚠️ *Multiple Photos Not Allowed*

I can only process **one receipt photo at a time** to ensure accurate AI analysis and control processing costs.

📋 *Please:*
• Send individual receipt photos one by one
• Wait for processing to complete before sending the next
• Ensure each photo shows a complete receipt

💡 *Tip:* Single photos get better AI recognition results!`, {
          parse_mode: 'Markdown'
        });
        return;
      }

      // Send step-by-step processing messages
      const statusMsg = await bot.sendMessage(msg.chat.id, '📸 Receipt received! Starting analysis...');

      try {
        // Step 1: Download photo
        await bot.editMessageText('📥 Downloading photo...', {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id
        });

        const photos = msg.photo;
        const largestPhoto = photos[photos.length - 1];
        const file = await bot.getFile(largestPhoto.file_id);
        
        // Download file as buffer instead of saving to disk
        const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
        
        const photoBuffer = await new Promise((resolve, reject) => {
          https.get(fileUrl, (response) => {
            if (response.statusCode !== 200) {
              reject(new Error(`Failed to download photo: ${response.statusCode}`));
              return;
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
          }).on('error', reject);
        });

        // Step 2: Check Gemini API
        if (!config.gemini_api_key) {
          await bot.editMessageText('⚠️ Gemini AI not configured. Please complete setup to process receipts.', {
            chat_id: msg.chat.id,
            message_id: statusMsg.message_id
          });
          return;
        }

        // Step 3: Process with AI
        await bot.editMessageText('🤖 Analyzing receipt with AI...', {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id
        });

        const receiptData = await this.receiptProcessor.processReceipt(photoBuffer, userId, config);
        
        if (!receiptData) {
          throw new Error('AI failed to extract receipt data');
        }

        // Step 4: Check for open projects and show selection
        const hasOpenProjects = await this.hasOpenProjects(userId);
        
        if (hasOpenProjects) {
          const projectSelectionMessage = await this.showProjectSelection(userId, receiptData);
          await bot.editMessageText(projectSelectionMessage, {
            chat_id: msg.chat.id,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
          });
        } else {
          // No open projects, save directly as general expense
          await this.saveReceiptAsExpense(userId, receiptData, null);
          await bot.editMessageText('✅ Receipt processed successfully!\n\n' + this.formatReceiptConfirmation(receiptData, null), {
            chat_id: msg.chat.id,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
          });
        }
        return;

        // Step 5: Save to sheets
        await bot.editMessageText('📊 Saving to Google Sheets...', {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id
        });

        // Complete success
        const confirmationText = this.formatReceiptConfirmation(receiptData);
        await bot.editMessageText(confirmationText, {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        });

      } catch (processingError) {
        // Update message with error
        await bot.editMessageText(`❌ Error: ${processingError.message}`, {
          chat_id: msg.chat.id,
          message_id: statusMsg.message_id
        });
        throw processingError;
      }

    } catch (error) {
      console.error(`Error handling photo for user ${userId}:`, error);
      await this.logError(userId, error);
      
      const bot = this.bots.get(userId)?.bot;
      if (bot) {
        await bot.sendMessage(msg.chat.id, '❌ Sorry, I couldn\'t process this receipt. Please try again with a clearer photo.');
      }
    }
  }

  /**
   * Handle text commands (replaces AI chat processing to save tokens)
   */
  async handleTextCommand(text, userId) {
    const trimmedText = text.trim();
    const parts = trimmedText.split(' ');
    const command = parts[0].toLowerCase();
    const params = parts.slice(1);

    try {
      // Check if user is in conversation
      const conversation = this.conversationManager.getConversation(userId);
      if (conversation) {
        return this.handleConversationInput(userId, trimmedText, conversation);
      }

      // Handle regular commands
      switch (command) {
        case '/start':
          return this.getStartMessage();
        
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
        
        case '/new':
          return this.handleNewProjectCommand(userId);
        
        case '/list':
          return this.handleListProjectsCommand(userId);
        
        case '/close':
          return this.handleCloseProjectCommand(userId);
        
        case '/open':
          return this.handleOpenProjectCommand(userId);
        
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
   */
  async handleSummaryCommand(userId, params) {
    if (params.length === 0) {
      return this.getSummaryUsageMessage();
    }

    const period = params.join(' ').toLowerCase();
    let expenses = [];
    let title = '';

    try {
      switch (period) {
        case 'day':
          expenses = await this.expenseService.getTodayExpensesWithProjects(userId);
          title = "Today's Summary";
          break;
        
        case 'week':
          expenses = await this.expenseService.getWeekExpensesWithProjects(userId);
          title = "This Week's Summary";
          break;
        
        case 'month':
          expenses = await this.expenseService.getMonthExpensesWithProjects(userId);
          title = "This Month's Summary";
          break;
        
        default:
          // Try to parse as month range
          const range = parseMonthRange(period);
          if (range) {
            expenses = await this.expenseService.getCustomRangeExpensesWithProjects(userId, range.startDate, range.endDate);
            title = `${formatDateRange(range)} Summary`;
          } else {
            return this.getSummaryUsageMessage();
          }
      }

      return await this.formatEnhancedSummary(expenses, title, userId);
    } catch (error) {
      console.error('Error in summary command:', error);
      return '❌ Sorry, I encountered an error generating your summary. Please try again.';
    }
  }

  /**
   * Handle /create command - start expense creation flow
   */
  async handleCreateCommand(userId) {
    this.conversationManager.startConversation(userId, 'create_expense');
    return `💰 *Create New Expense*

Please enter the receipt date in YYYY-MM-DD format.

📅 *Examples:*
• 2025-01-15
• 2025-08-24

Type the date or /cancel to stop:`;
  }

  /**
   * Handle conversation input for multi-step commands
   */
  async handleConversationInput(userId, input, conversation) {
    if (input.toLowerCase() === '/cancel') {
      this.conversationManager.endConversation(userId);
      return '❌ Operation cancelled.';
    }

    switch (conversation.type) {
      case 'create_expense':
        return this.handleCreateExpenseFlow(userId, input, conversation);
      case 'create_project':
        return this.handleCreateProjectFlow(userId, input, conversation);
      case 'close_project':
        return this.handleCloseProjectFlow(userId, input, conversation);
      case 'open_project':
        return this.handleOpenProjectFlow(userId, input, conversation);
      case 'project_selection':
        return this.handleProjectSelectionFlow(userId, input, conversation);
      default:
        this.conversationManager.endConversation(userId);
        return '❌ Unknown conversation type. Please try again.';
    }
  }

  /**
   * Handle create expense conversation flow
   */
  async handleCreateExpenseFlow(userId, input, conversation) {
    switch (conversation.step) {
      case 0: // Waiting for receipt date
        if (!isValidDateFormat(input)) {
          return `❌ Invalid date format. Please use YYYY-MM-DD format.

📅 *Examples:*
• 2025-01-15
• 2025-08-24

Please enter the receipt date or /cancel to stop:`;
        }
        
        this.conversationManager.updateStep(userId, 1, { receiptDate: input });
        return `✅ Date set: ${input}

🏪 Please enter the store name:

*Examples:* Walmart, Target, Starbucks, etc.`;

      case 1: // Waiting for store name
        if (!input || input.trim().length < 1) {
          return `❌ Store name cannot be empty.

🏪 Please enter the store name:`;
        }

        this.conversationManager.updateStep(userId, 2, { storeName: input.trim() });
        const categories = this.expenseService.getAvailableCategories();
        let categoryMessage = `✅ Store: ${input.trim()}

📋 Please select a category by typing the number:

`;
        categories.forEach((cat, index) => {
          categoryMessage += `${index + 1}. ${cat.label}\n`;
        });

        return categoryMessage;

      case 2: // Waiting for category selection
        const categoryIndex = parseInt(input) - 1;
        const availableCategories = this.expenseService.getAvailableCategories();
        
        if (isNaN(categoryIndex) || categoryIndex < 0 || categoryIndex >= availableCategories.length) {
          return `❌ Invalid selection. Please choose a number from 1 to ${availableCategories.length}:

${availableCategories.map((cat, index) => `${index + 1}. ${cat.label}`).join('\n')}`;
        }

        const selectedCategory = availableCategories[categoryIndex];
        this.conversationManager.updateStep(userId, 3, { category: selectedCategory.value });
        return `✅ Category: ${selectedCategory.label}

💵 Please enter the total amount (numbers only):

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
            
            const categoryEmoji = this.expenseService.getCategoryEmoji(expenseData.category);
            return `✅ *Expense Created Successfully!*

📊 *Summary:*
📅 Date: ${expenseData.receipt_date}
🏪 Store: ${expenseData.store_name}
📋 Category: ${categoryEmoji} ${this.expenseService.capitalizeFirst(expenseData.category)}
💰 Amount: $${amount}
📁 Project: General expenses

The expense has been saved to your account.`;

          } catch (error) {
            console.error('Error creating expense:', error);
            this.conversationManager.endConversation(userId);
            return '❌ Sorry, there was an error saving your expense. Please try again with /create command.';
          }
        }
    }
  }

  /**
   * Handle create project conversation flow
   */
  async handleCreateProjectFlow(userId, input, conversation) {
    switch (conversation.data.step) {
      case 'name': // Waiting for project name
        if (!input || input.trim().length < 1) {
          return `❌ Project name cannot be empty.

🆕 Please enter a name for your project:`;
        }

        if (input.trim().length > 255) {
          return `❌ Project name is too long (max 255 characters).

🆕 Please enter a shorter name for your project:`;
        }

        this.conversationManager.updateData(userId, { step: 'currency', name: input.trim() });
        return `✅ Project name: ${input.trim()}

💱 What currency will this project use?

*Examples:*
• USD (US Dollars)
• RM (Malaysian Ringgit)  
• EUR (Euros)
• GBP (British Pounds)

💡 Type any currency name you prefer (e.g., "USD", "RM", "Baht")`;

      case 'currency': // Waiting for currency
        if (!input || input.trim().length < 1) {
          return `❌ Currency cannot be empty.

💱 Please enter the currency for this project:`;
        }

        if (input.trim().length > 20) {
          return `❌ Currency name is too long (max 20 characters).

💱 Please enter a shorter currency name:`;
        }

        const projectData = {
          name: conversation.data.name,
          currency: input.trim(),
          user_id: userId
        };

        try {
          // Create project directly using Supabase instead of API call
          const { data: project, error } = await this.supabase
            .from('projects')
            .insert([projectData])
            .select()
            .single();

          if (error) {
            throw new Error(error.message || 'Failed to create project');
          }

          this.conversationManager.endConversation(userId);
          return `✅ *Project Created Successfully!*

📊 *Project Details:*
📝 Name: ${projectData.name}
💱 Currency: ${projectData.currency}
🔓 Status: Open

🎉 Your project is ready! Now you can:
• Upload receipt photos to add expenses to this project
• Use **/list** to view all your open projects
• Use **/close** to close the project when finished`;

        } catch (error) {
          console.error('Error creating project:', error);
          this.conversationManager.endConversation(userId);
          return '❌ Sorry, there was an error creating your project. Please try again with /new command.';
        }
    }
  }

  /**
   * Handle close project conversation flow
   */
  async handleCloseProjectFlow(userId, input, conversation) {
    const projectIndex = parseInt(input) - 1;
    const projects = conversation.data.projects;

    if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= projects.length) {
      return `❌ Invalid selection. Please choose a number from 1 to ${projects.length}:

${projects.map((project, index) => `${index + 1}. ${project.name}`).join('\n')}`;
    }

    const selectedProject = projects[projectIndex];

    try {
      const { error } = await this.supabase
        .from('projects')
        .update({ status: 'closed' })
        .eq('id', selectedProject.id)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message || 'Failed to close project');
      }

      this.conversationManager.endConversation(userId);
      return `🔒 *Project Closed Successfully!*

📝 Project: ${selectedProject.name}
🔓 Status: Closed

💡 This project will no longer appear in expense selection menus.
🔓 Use **/open** to reopen it later if needed.`;

    } catch (error) {
      console.error('Error closing project:', error);
      this.conversationManager.endConversation(userId);
      return '❌ Sorry, there was an error closing the project. Please try again.';
    }
  }

  /**
   * Handle open project conversation flow
   */
  async handleOpenProjectFlow(userId, input, conversation) {
    const projectIndex = parseInt(input) - 1;
    const projects = conversation.data.projects;

    if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= projects.length) {
      return `❌ Invalid selection. Please choose a number from 1 to ${projects.length}:

${projects.map((project, index) => `${index + 1}. ${project.name}`).join('\n')}`;
    }

    const selectedProject = projects[projectIndex];

    try {
      const { error } = await this.supabase
        .from('projects')
        .update({ status: 'open' })
        .eq('id', selectedProject.id)
        .eq('user_id', userId);

      if (error) {
        throw new Error(error.message || 'Failed to open project');
      }

      this.conversationManager.endConversation(userId);
      return `🔓 *Project Reopened Successfully!*

📝 Project: ${selectedProject.name}
🔓 Status: Open

✅ This project will now appear in expense selection menus again.
📸 Upload receipts to start adding expenses to this project!`;

    } catch (error) {
      console.error('Error opening project:', error);
      this.conversationManager.endConversation(userId);
      return '❌ Sorry, there was an error opening the project. Please try again.';
    }
  }

  /**
   * Handle project selection for expenses
   */
  async handleProjectSelectionFlow(userId, input, conversation) {
    const selectionIndex = parseInt(input) - 1;
    const options = conversation.data.options;
    const expenseData = conversation.data.expenseData;

    if (isNaN(selectionIndex) || selectionIndex < 0 || selectionIndex >= options.length) {
      return `❌ Invalid selection. Please choose a number from 1 to ${options.length}:

${options.map((option, index) => `${index + 1}. ${option.label}`).join('\n')}`;
    }

    const selectedOption = options[selectionIndex];
    
    try {
      // Create expense with project_id (null for general expenses)
      // Transform field names to match database schema - handle both formats defensively
      const finalExpenseData = {
        user_id: userId,
        project_id: selectedOption.project_id,
        receipt_date: expenseData.receipt_date || expenseData.date,
        store_name: expenseData.store_name,
        category: expenseData.category,
        total_amount: expenseData.total_amount || expenseData.total
      };

      const { data: expense, error } = await this.supabase
        .from('expenses')
        .insert([finalExpenseData])
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to create expense');
      }

      this.conversationManager.endConversation(userId);

      const currency = selectedOption.project_id ? selectedOption.currency : '$';
      const projectInfo = selectedOption.project_id ? `\n📁 Project: ${selectedOption.label}` : '\n📁 Project: General expenses';

      return `✅ *Expense Saved Successfully!*

📊 *Summary:*
📅 Date: ${expenseData.receipt_date || expenseData.date || 'N/A'}
🏪 Store: ${expenseData.store_name || 'N/A'}
🏷️ Category: ${expenseData.category || 'N/A'}
💰 Total: ${currency}${(expenseData.total_amount || expenseData.total || 0).toFixed(2)}${projectInfo}

Your expense has been saved to the database! 💾`;

    } catch (error) {
      console.error('Error saving expense to project:', error);
      this.conversationManager.endConversation(userId);
      return '❌ Sorry, there was an error saving your expense. Please try again.';
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
   * Show project selection menu for expense
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
   * Save receipt data as expense
   */
async saveReceiptAsExpense(userId, receiptData, projectId) {
  try {
    // Since ReceiptProcessor.saveToDatabase already inserted the expense,
    // we just fetch the latest one for this user
    const { data: expense, error } = await this.supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to fetch saved expense');
    }

    return expense;
  } catch (error) {
    console.error('Error fetching saved expense:', error);
    throw error;
  }
}

  /**
   * Format enhanced summary with chart and top stores
   */
  async formatEnhancedSummary(data, title, userId) {
    // Check if it's the new project-separated structure
    if (data && typeof data === 'object' && ('general' in data || 'projects' in data)) {
      return this.formatEnhancedSummaryWithProjects(data, title);
    }

    // Fallback for old structure (array of expenses)
    const expenses = data;
    if (!expenses || expenses.length === 0) {
      return `📊 *${title}*\n💰 Total: $0.00\n📋 No expenses found`;
    }

    const total = expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
    const categories = this.expenseService.getCategoryBreakdown(expenses);
    const topStores = this.expenseService.getTopStores(expenses);

    let message = `📊 *${title}*\n`;
    message += `💰 Total: $${total.toFixed(2)}\n`;
    message += `📋 Transactions: ${expenses.length}\n\n`;

    // Category breakdown
    if (categories.length > 0) {
      message += `🥧 *Category Breakdown:*\n`;
      categories.forEach(cat => {
        const emoji = this.expenseService.getCategoryEmoji(cat.category);
        message += `${emoji} ${this.expenseService.capitalizeFirst(cat.category)}: $${cat.amount} (${cat.percentage}%)\n`;
      });
      message += '\n';
    }

    // Top stores
    if (topStores.length > 0) {
      message += `🏪 *Top 5 Stores:*\n`;
      topStores.forEach((store, index) => {
        message += `${index + 1}. ${store.store}: $${store.total} (${store.count} visits)\n`;
      });
    }

    return message;
  }

  /**
   * Format enhanced summary with project separation
   */
  formatEnhancedSummaryWithProjects(data, title) {
    const { general, projects } = data;
    let message = `📊 *${title}*\n\n`;

    // General expenses section
    if (general && general.length > 0) {
      const generalTotal = general.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
      const generalCategories = this.expenseService.getCategoryBreakdown(general);
      const generalStores = this.expenseService.getTopStores(general, 3); // Limit to 3 for space

      message += `💰 **General Expenses:** $${generalTotal.toFixed(2)}\n`;
      message += `📋 ${general.length} transaction${general.length !== 1 ? 's' : ''}\n`;
      
      if (generalCategories.length > 0) {
        message += `🥧 Categories: `;
        message += generalCategories.slice(0, 3).map(cat => {
          const emoji = this.expenseService.getCategoryEmoji(cat.category);
          return `${emoji} ${cat.percentage}%`;
        }).join(', ') + '\n';
      }

      if (generalStores.length > 0) {
        message += `🏪 Top stores: `;
        message += generalStores.slice(0, 2).map(store => `${store.store} $${store.total}`).join(', ') + '\n';
      }
      message += '\n';
    }

    // Project expenses sections
    if (projects && projects.length > 0) {
      projects.forEach(projectGroup => {
        const { project, expenses } = projectGroup;
        const projectTotal = expenses.reduce((sum, expense) => sum + parseFloat(expense.total_amount), 0);
        const currency = project?.currency || '$';
        const projectCategories = this.expenseService.getCategoryBreakdown(expenses);
        const projectStores = this.expenseService.getTopStores(expenses, 3);
        
        message += `📁 **${project?.name || 'Unknown Project'}:** ${currency}${projectTotal.toFixed(2)}\n`;
        message += `📋 ${expenses.length} transaction${expenses.length !== 1 ? 's' : ''}\n`;
        
        if (projectCategories.length > 0) {
          message += `🥧 Categories: `;
          message += projectCategories.slice(0, 3).map(cat => {
            const emoji = this.expenseService.getCategoryEmoji(cat.category);
            return `${emoji} ${cat.percentage}%`;
          }).join(', ') + '\n';
        }

        if (projectStores.length > 0) {
          message += `🏪 Top stores: `;
          message += projectStores.slice(0, 2).map(store => `${store.store} ${currency}${store.total}`).join(', ') + '\n';
        }
        message += '\n';
      });
    }

    // No expenses found
    if ((!general || general.length === 0) && (!projects || projects.length === 0)) {
      message += `💰 Total: $0.00\n📋 No expenses found`;
    }

    return message.trim();
  }

  /**
   * Get summary usage message
   */
  getSummaryUsageMessage() {
    return `📊 *Summary Command Usage*

Usage: \`/summary <period>\`

*Available periods:*
• \`day\` - Today's summary
• \`week\` - This week's summary  
• \`month\` - This month's summary
• \`jan-aug\` - January to August
• \`january-march\` - January to March
• \`1-6\` - January to June

*Examples:*
• \`/summary day\`
• \`/summary week\`
• \`/summary jan-aug\`
• \`/summary january-march\``;
  }

  /**
   * Get start message with welcome and command list
   */
  getStartMessage() {
    return `🎉 *Welcome to AI Expense Tracker!*

I help you track expenses by processing receipt photos and organizing them by projects.

📸 *Send me a photo* of your receipt for automatic expense tracking!

📋 *Available Commands:*

*📁 Project Management:*
• /new - Create a new project (trips, events, etc.)
• /list - View all open projects
• /close - Close a project when finished
• /open - Reopen a previously closed project

*📊 Analytics:*
• /summary day - Today's detailed summary
• /summary week - This week's summary  
• /summary month - This month's summary
• /summary jan-aug - Custom month range
• /stats - Quick monthly overview
• /today, /yesterday, /week, /month - Quick expense totals

*💰 Manual Entry:*
• /create - Add expense manually (step-by-step)

*📚 Help:*
• /help - Detailed command guide

💡 *Quick Start:*
1. Create a project with /new (optional)
2. Send receipt photos for auto-tracking
3. Use \`/summary week\` for weekly analysis

Type /help for detailed usage examples!`;
  }

  /**
   * Get help message
   */
  getHelpMessage() {
    return `🤖 *AI Expense Tracker - Complete Guide*

📁 *Project Management:*
• \`/new\` - Create new project (trips, events, etc.)
  → Enter project name
  → Set currency (USD, RM, EUR, etc.)
• \`/list\` - View all open projects
• \`/close\` - Close a project (removes from selection menu)
• \`/open\` - Reopen a previously closed project

*Project Features:*
• Organize expenses by purpose (Thailand Trip, Birthday Party)
• Each project has its own currency
• Expenses can be general (no project) or project-specific

📸 *Photo Processing:*
• Send **one receipt photo at a time** for automatic tracking
• AI extracts store name, date, amount, and category
• If you have open projects, you'll choose where to save the expense
• Wait for processing to complete before sending next photo
• Multiple photos in one message will be rejected

📊 *Summary Commands (Enhanced Analytics):*
• \`/summary day\` - Today's detailed breakdown
• \`/summary week\` - This week's summary
• \`/summary month\` - This month's summary
• \`/summary jan-aug\` - January to August
• \`/summary january-march\` - January to March  
• \`/summary 1-6\` - January to June (numeric)

*Summary includes:* Total spend, category breakdown with percentages, top 5 stores

📈 *Quick Expense Queries:*
• /stats - Quick monthly overview
• /today - Today's total expenses
• /yesterday - Yesterday's total expenses
• /week - This week's total expenses
• /month - This month's total expenses

💰 *Manual Expense Entry:*
• \`/create\` - Add expense step-by-step
  → Date (YYYY-MM-DD)
  → Store name
  → Category selection
  → Amount
  → Project selection (if you have open projects)

💡 *Pro Tips:*
• Create projects for trips, events, or any specific spending category
• Use month ranges: jan-dec, february-august, 3-9
• Type /cancel during conversations to stop
• Send **single, clear receipt photos** for best AI results
• Wait 10 seconds between photos to avoid rate limiting
• Date format must be YYYY-MM-DD (e.g., 2025-01-15)

❓ Type any unknown command to see available options.`;
  }

  /**
   * Get message for unknown commands
   */
  getUnknownCommandMessage() {
    return `❓ *Unknown Command*

I only understand specific commands to save AI processing costs.

📋 *Available Commands:*

*📁 Projects:*
• /new, /list, /close, /open - Manage projects

*📊 Detailed Analytics:*
• /summary day, /summary week, /summary month
• /summary jan-aug, /summary january-march

*📈 Quick Queries:*
• /stats, /today, /yesterday, /week, /month

*💰 Manual Entry:*
• /create - Step-by-step expense entry

*📚 Help:*
• /start - Welcome & quick start
• /help - Complete command guide

💡 *Try:*
• \`/new\` - Create a project for your trip/event
• \`/summary week\` - This week's detailed summary
• \`/create\` - Add an expense manually
• \`/help\` - See all features

📸 Or send me a *receipt photo* for automatic expense tracking!`;
  }

  /**
   * Handle /new project command - start project creation conversation
   */
  async handleNewProjectCommand(userId) {
    this.conversationManager.startConversation(userId, 'create_project', { step: 'name' });
    return `🆕 *Create New Project*

What would you like to name your project?

*Examples:*
• Thailand Trip
• Birthday Party
• Office Renovation
• Wedding Expenses

💡 Choose a descriptive name to easily identify expenses for this project.`;
  }

  /**
   * Handle /list projects command - show all open projects
   */
  async handleListProjectsCommand(userId) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name, currency, created_at')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('name');

      if (error) {
        console.error('Error fetching open projects:', error);
        return '❌ Sorry, I encountered an error fetching your projects. Please try again.';
      }

      if (!projects || projects.length === 0) {
        return `📝 *No Open Projects*

You currently have no open projects.

🆕 To create a new project, type **/new**

💡 Projects help you organize expenses for specific events, trips, or purposes.`;
      }

      let message = `📋 *Your Open Projects*\n\n`;
      
      projects.forEach((project, index) => {
        const createdDate = new Date(project.created_at).toLocaleDateString();
        message += `${index + 1}. **${project.name}**\n`;
        message += `   💱 Currency: ${project.currency}\n`;
        message += `   📅 Created: ${createdDate}\n\n`;
      });

      message += `💡 *Tips:*
• Upload receipts to add expenses to these projects
• Use **/close** to close a project when finished
• Use **/new** to create another project`;

      return message;

    } catch (error) {
      console.error('Error in handleListProjectsCommand:', error);
      return '❌ Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Handle /close project command - close an open project
   */
  async handleCloseProjectCommand(userId) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('name');

      if (error) {
        console.error('Error fetching open projects:', error);
        return '❌ Sorry, I encountered an error fetching your projects. Please try again.';
      }

      if (!projects || projects.length === 0) {
        return `📝 *No Open Projects*

You currently have no open projects to close.

🆕 To create a new project, type **/new**`;
      }

      // Start close project conversation
      this.conversationManager.startConversation(userId, 'close_project', { 
        step: 'select',
        projects: projects
      });

      let message = `🔒 *Close Project*

Select which project you want to close:

`;
      
      projects.forEach((project, index) => {
        message += `${index + 1}. ${project.name}\n`;
      });

      message += `\n💡 Reply with the number of the project you want to close.
⚠️ Closed projects won't appear in expense selection menus.`;

      return message;

    } catch (error) {
      console.error('Error in handleCloseProjectCommand:', error);
      return '❌ Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Handle /open project command - reopen a closed project
   */
  async handleOpenProjectCommand(userId) {
    try {
      const { data: projects, error } = await this.supabase
        .from('projects')
        .select('id, name')
        .eq('user_id', userId)
        .eq('status', 'closed')
        .order('name');

      if (error) {
        console.error('Error fetching closed projects:', error);
        return '❌ Sorry, I encountered an error fetching your projects. Please try again.';
      }

      if (!projects || projects.length === 0) {
        return `📝 *No Closed Projects*

You currently have no closed projects to reopen.

🔒 Use **/close** to close an open project first.`;
      }

      // Start open project conversation
      this.conversationManager.startConversation(userId, 'open_project', { 
        step: 'select',
        projects: projects
      });

      let message = `🔓 *Reopen Project*

Select which project you want to reopen:

`;
      
      projects.forEach((project, index) => {
        message += `${index + 1}. ${project.name}\n`;
      });

      message += `\n💡 Reply with the number of the project you want to reopen.
✅ Reopened projects will appear in expense selection menus again.`;

      return message;

    } catch (error) {
      console.error('Error in handleOpenProjectCommand:', error);
      return '❌ Sorry, I encountered an error. Please try again.';
    }
  }

  /**
   * Handle bot errors and attempt recovery
   */
  async handleError(userId, error) {
    console.error(`Bot error for user ${userId}:`, error);
    
    // Log error for debugging
    await this.logError(userId, error);
    
    // Attempt bot restart
    try {
      await this.restartUserBot(userId);
      console.log(`✅ Successfully restarted bot for user ${userId}`);
    } catch (restartError) {
      console.error(`❌ Failed to restart bot for user ${userId}:`, restartError);
      // Mark bot as inactive
      await this.updateBotSession(userId, null, false);
    }
  }

  /**
   * Restart a specific user's bot
   */
  async restartUserBot(userId) {
    // Stop existing bot
    const existingBot = this.bots.get(userId);
    if (existingBot?.bot) {
      try {
        await existingBot.bot.stopPolling();
      } catch (error) {
        console.warn(`Warning stopping bot for user ${userId}:`, error.message);
      }
    }

    // Remove from active bots
    this.bots.delete(userId);

    // Get fresh config
    const { data: config } = await this.supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (config && config.telegram_bot_token) {
      await this.createUserBot(config);
    }
  }

  /**
   * Add a new bot for a user (called when user completes setup)
   */
  async addUserBot(userId) {
    console.log(`🔄 Adding/restarting bot for user ${userId}`);
    
    const { data: config } = await this.supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (config && config.telegram_bot_token) {
      // Force remove any existing bot first
      await this.removeUserBot(userId);
      
      // Wait a moment before creating new bot
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.createUserBot(config);
      console.log(`✅ Bot restarted successfully for user ${userId}`);
    } else {
      console.log(`❌ No valid config found for user ${userId}`);
    }
  }

  /**
   * Remove a user's bot (called when user disconnects)
   */
  async removeUserBot(userId) {
    const botData = this.bots.get(userId);
    if (botData?.bot) {
      try {
        await botData.bot.stopPolling();
      } catch (error) {
        console.warn(`Warning stopping bot for user ${userId}:`, error.message);
      }
    }
    
    this.bots.delete(userId);
    await this.updateBotSession(userId, null, false);
  }

  /**
   * Update bot session status in database
   */
  async updateBotSession(userId, botUsername, isActive) {
    try {
      const { error } = await this.supabase
        .from('bot_sessions')
        .upsert({
          user_id: userId,
          bot_username: botUsername,
          is_active: isActive,
          last_activity: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Failed to update bot session:', error);
      }
    } catch (error) {
      console.error('Error updating bot session:', error);
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(userId) {
    const botData = this.bots.get(userId);
    if (botData) {
      botData.lastActivity = new Date();
    }
  }

  /**
   * Log errors to database for debugging with rate limiting to prevent spam
   */
  async logError(userId, error) {
    try {
      const errorMessage = error.message || error.toString();
      
      // Create unique cache key for deduplication
      const errorHash = this.hashString(errorMessage.substring(0, 100));
      const cacheKey = `${userId}_${errorHash}`;
      const now = Date.now();
      
      // Check if we recently logged the same error for this user
      const lastLogTime = this.errorLogCache.get(cacheKey);
      if (lastLogTime && (now - lastLogTime) < this.ERROR_LOG_RATE_LIMIT_MS) {
        // Skip logging - too frequent
        console.log(`Skipping duplicate error log for user ${userId} (rate limited)`);
        return;
      }
      
      // Update cache with current timestamp
      this.errorLogCache.set(cacheKey, now);
      
      // Clean old cache entries periodically (prevent memory leak)
      if (this.errorLogCache.size > 1000) {
        this.cleanErrorLogCache();
      }

      await this.supabase
        .from('receipt_logs')
        .insert({
          user_id: userId,
          processing_status: 'error',
          error_message: errorMessage,
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Simple hash function for error message deduplication
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Clean old entries from error log cache to prevent memory leaks
   */
  cleanErrorLogCache() {
    const now = Date.now();
    const cutoff = now - (this.ERROR_LOG_RATE_LIMIT_MS * 2); // Clean entries older than 2x rate limit
    
    for (const [key, timestamp] of this.errorLogCache.entries()) {
      if (timestamp < cutoff) {
        this.errorLogCache.delete(key);
      }
    }
    
    console.log(`Cleaned error log cache, ${this.errorLogCache.size} entries remaining`);
  }

  /**
   * Format receipt confirmation message
   */
  formatReceiptConfirmation(receiptData, projectData = null) {
    // Escape special markdown characters
    const escapeMarkdown = (text) => {
      if (!text) return 'N/A';
      return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    // Determine category for the receipt 
    const category = this.receiptProcessor.categorizeReceipt(receiptData);
    
    // Format currency and project info
    const currency = projectData ? projectData.currency : '$';
    const projectInfo = projectData ? 
      `\n📁 *Project:* ${escapeMarkdown(projectData.name)}` : 
      '\n📁 *Project:* General expenses';

    return `✅ *Receipt processed successfully\\!*

🏪 *Store:* ${escapeMarkdown(receiptData.store_name)}
📅 *Date:* ${escapeMarkdown(receiptData.date)}
🏷️ *Category:* ${escapeMarkdown(category)}
💰 *Total:* ${currency}${receiptData.total.toFixed(2)}${projectInfo}

Your expense has been saved to the database\\! 💾`;
  }

  /**
   * Get bot statistics
   */
  getStats() {
    const activeBots = Array.from(this.bots.values()).filter(bot => bot.isActive).length;
    return {
      totalBots: this.bots.size,
      activeBots,
      uptime: process.uptime()
    };
  }


  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Bot Manager...');
    this.isShuttingDown = true;

    // Stop all bots
    const shutdownPromises = Array.from(this.bots.entries()).map(async ([userId, botData]) => {
      try {
        await botData.bot.stopPolling();
        await this.updateBotSession(userId, null, false);
      } catch (error) {
        console.warn(`Warning stopping bot for user ${userId}:`, error.message);
      }
    });

    await Promise.allSettled(shutdownPromises);
    this.bots.clear();
    
    console.log('✅ Bot Manager shutdown complete');
  }
}

export default BotManager;