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

        // Step 4: Check Google Sheets
        if (!config.google_access_token) {
          await bot.editMessageText('⚠️ Google Sheets not configured. Receipt processed but not saved to sheets.\n\n' + this.formatReceiptConfirmation(receiptData), {
            chat_id: msg.chat.id,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
          });
          return;
        }

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
          const todayExpenses = await this.expenseService.getTodayExpenses(userId);
          return this.expenseService.formatExpenseSummary(todayExpenses, "Today's Expenses");
        
        case '/yesterday':
          const yesterdayExpenses = await this.expenseService.getYesterdayExpenses(userId);
          return this.expenseService.formatExpenseSummary(yesterdayExpenses, "Yesterday's Expenses");
        
        case '/week':
          const weekExpenses = await this.expenseService.getWeekExpenses(userId);
          return this.expenseService.formatExpenseSummary(weekExpenses, "This Week's Expenses");
        
        case '/month':
          const monthExpenses = await this.expenseService.getMonthExpenses(userId);
          return this.expenseService.formatExpenseSummary(monthExpenses, "This Month's Expenses");
        
        case '/summary':
          return this.handleSummaryCommand(userId, params);
        
        case '/create':
          return this.handleCreateCommand(userId);
        
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
          expenses = await this.expenseService.getTodayExpenses(userId);
          title = "Today's Summary";
          break;
        
        case 'week':
          expenses = await this.expenseService.getWeekExpenses(userId);
          title = "This Week's Summary";
          break;
        
        case 'month':
          expenses = await this.expenseService.getMonthExpenses(userId);
          title = "This Month's Summary";
          break;
        
        default:
          // Try to parse as month range
          const range = parseMonthRange(period);
          if (range) {
            expenses = await this.expenseService.getCustomRangeExpenses(userId, range.startDate, range.endDate);
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
          receiptDate: conversation.data.receiptDate,
          storeName: conversation.data.storeName,
          category: conversation.data.category,
          totalAmount: amount
        };

        try {
          const createdExpense = await this.expenseService.createExpense(userId, expenseData);
          this.conversationManager.endConversation(userId);
          
          const categoryEmoji = this.expenseService.getCategoryEmoji(expenseData.category);
          return `✅ *Expense Created Successfully!*

📊 *Summary:*
📅 Date: ${expenseData.receiptDate}
🏪 Store: ${expenseData.storeName}
📋 Category: ${categoryEmoji} ${this.expenseService.capitalizeFirst(expenseData.category)}
💰 Amount: $${amount}

The expense has been saved to your account.`;

        } catch (error) {
          console.error('Error creating expense:', error);
          this.conversationManager.endConversation(userId);
          return '❌ Sorry, there was an error saving your expense. Please try again with /create command.';
        }
    }
  }

  /**
   * Format enhanced summary with chart and top stores
   */
  async formatEnhancedSummary(expenses, title, userId) {
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

I help you track expenses by processing receipt photos and answering questions about your spending.

📸 *Send me a photo* of your receipt for automatic expense tracking!

📋 *Available Commands:*

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
1. Send receipt photos for auto-tracking
2. Use \`/summary week\` for weekly analysis
3. Use \`/create\` to add manual expenses

Type /help for detailed usage examples!`;
  }

  /**
   * Get help message
   */
  getHelpMessage() {
    return `🤖 *AI Expense Tracker - Complete Guide*

📸 *Photo Processing:*
• Send **one receipt photo at a time** for automatic tracking
• AI extracts store name, date, amount, and category
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
  → Asks for date (YYYY-MM-DD)
  → Store name
  → Category selection (numbered menu)
  → Amount

💡 *Pro Tips:*
• Use month ranges: jan-dec, february-august, 3-9
• Type /cancel during /create to stop
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
• \`/summary week\` - This week's detailed summary
• \`/create\` - Add an expense manually
• \`/help\` - See all features

📸 Or send me a *receipt photo* for automatic expense tracking!`;
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
   * Log errors to database for debugging
   */
  async logError(userId, error) {
    try {
      await this.supabase
        .from('receipt_logs')
        .insert({
          user_id: userId,
          processing_status: 'error',
          error_message: error.message || error.toString(),
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  /**
   * Format receipt confirmation message
   */
  formatReceiptConfirmation(receiptData) {
    // Escape special markdown characters
    const escapeMarkdown = (text) => {
      if (!text) return 'N/A';
      return text.toString().replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
    };

    const itemsList = receiptData.items
      .map(item => `• ${escapeMarkdown(item.name)}: $${(item.total || item.price || 0).toFixed(2)}`)
      .join('\n');

    return `✅ *Receipt processed successfully\\!*

🏪 *Store:* ${escapeMarkdown(receiptData.store_name)}
📅 *Date:* ${escapeMarkdown(receiptData.date)}
💰 *Total:* $${receiptData.total.toFixed(2)}

*Items:*
${itemsList}

Your expense has been added to your Google Sheet\\! 📊`;
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