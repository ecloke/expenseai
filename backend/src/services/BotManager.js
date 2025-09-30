import TelegramBot from 'node-telegram-bot-api';
import { decrypt } from '../utils/encryption.js';
import { checkRateLimit } from '../utils/validation.js';
import ReceiptProcessor from './ReceiptProcessor.js';
import ChatProcessor from './ChatProcessor.js';
import ExpenseService from './ExpenseService.js';
import ConversationStateManager from '../utils/conversationState.js';
import ConversationFlowManager from './ConversationFlowManager.js';
import CommandHandler from './CommandHandler.js';
import { parseMonthRange, isValidDateFormat, isValidAmount, formatDateRange } from '../utils/dateUtils.js';
import { generateCategoryPieChart } from '../utils/chartGenerator.js';
import https from 'https';
import fetch from 'node-fetch';

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
    this.conversationFlowManager = new ConversationFlowManager(supabase, this.expenseService, this.conversationManager);
    this.commandHandler = new CommandHandler(supabase, this.expenseService, this.conversationManager);
    this.rateLimitMap = new Map(); // For rate limiting per user
    this.errorLogCache = new Map(); // For error log rate limiting: userId_errorHash -> lastLogTime
    this.ERROR_LOG_RATE_LIMIT_MS = 60000; // 1 minute between identical error logs
    this.isShuttingDown = false;
    this.PILOT_USER_ID = '149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498'; // Test user
    
    // Media group collection for batch processing
    this.mediaGroups = new Map(); // media_group_id -> { photos: [], userId: string, timeout: NodeJS.Timeout }
    this.MEDIA_GROUP_TIMEOUT = 3000; // 3 seconds to collect all photos in a group
    
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

      // AUTO-SETUP webhooks for ALL existing users on server startup
      let successCount = 0;
      let failCount = 0;
      
      for (const config of configs || []) {
        try {
          await this.setupWebhookForUser(config.user_id, config.telegram_bot_token);
          successCount++;
        } catch (error) {
          console.error(`❌ User ${config.user_id} webhook failed: ${error.message}`);
          // No fallback to polling - webhook failures should be debugged and fixed
          failCount++;
        }
      }
      
      console.log(`✅ Bots ready: ${successCount} webhook, ${failCount} failed`);

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

      // Update last activity and capture chat_id
      this.updateLastActivity(userId);
      
      // Update bot session with chat_id for future message sending (only if changed)
      await this.updateBotSessionIfNeeded(userId, config.telegram_bot_username, true, msg.chat.id);

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

      // Update last activity and capture chat_id
      this.updateLastActivity(userId);
      
      // Update bot session with chat_id for future message sending (only if changed)
      await this.updateBotSessionIfNeeded(userId, config.telegram_bot_username, true, msg.chat.id);

      const bot = this.bots.get(userId)?.bot;
      if (!bot) return;

      // Validate photo message
      if (!msg.photo || msg.photo.length === 0) {
        await bot.sendMessage(msg.chat.id, '❌ No photo detected. Please send a clear receipt photo.');
        return;
      }

      // Handle media group (multiple photos) - Skip rate limiting for media groups
      if (msg.media_group_id) {
        await this.handleMediaGroup(msg, userId, config);
        return;
      }

      // Check for multiple photos in quick succession (prevent AI token waste) - Only for single photos
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
   * Handle media group (multiple photos) with batch processing
   */
  async handleMediaGroup(msg, userId, config) {
    const { media_group_id } = msg;
    const bot = this.bots.get(userId)?.bot;
    if (!bot) return;

    // Initialize or update media group collection
    if (!this.mediaGroups.has(media_group_id)) {
      this.mediaGroups.set(media_group_id, {
        photos: [],
        userId: userId,
        config: config,
        chatId: msg.chat.id,
        timeout: null,
        rejected: false
      });
    }

    const mediaGroup = this.mediaGroups.get(media_group_id);

    // If this media group was already rejected, silently ignore remaining photos
    if (mediaGroup.rejected) {
      return;
    }

    mediaGroup.photos.push(msg);

    // Check immediately if more than 5 photos - reject without waiting
    if (mediaGroup.photos.length > 5) {
      // Clear any existing timeout
      if (mediaGroup.timeout) {
        clearTimeout(mediaGroup.timeout);
      }

      await bot.sendMessage(msg.chat.id, `📸 **More than 5 photos detected!**

I can only process up to 5 receipt photos at once.

📋 **Please:**
• Choose your 5 most important receipts
• Upload them again (up to 5 photos)
• I'll process all 5 together

💡 *This ensures accurate AI processing and manages costs effectively.*`, {
        parse_mode: 'Markdown'
      });
      
      // Mark as rejected instead of deleting - let timeout clean it up naturally
      mediaGroup.rejected = true;
      return;
    }

    // Clear existing timeout and set new one
    if (mediaGroup.timeout) {
      clearTimeout(mediaGroup.timeout);
    }

    mediaGroup.timeout = setTimeout(async () => {
      await this.processMediaGroup(media_group_id);
    }, this.MEDIA_GROUP_TIMEOUT);
  }

  /**
   * Process collected media group photos
   */
  async processMediaGroup(mediaGroupId) {
    const mediaGroup = this.mediaGroups.get(mediaGroupId);
    if (!mediaGroup) return;

    const { photos, userId, config, chatId } = mediaGroup;
    const bot = this.bots.get(userId)?.bot;
    if (!bot) return;

    try {
      const photoCount = photos.length;

      // Ask user for confirmation to proceed
      const confirmationMsg = await bot.sendMessage(chatId, `📸 **${photoCount} Receipt Photos Detected!**

Process all ${photoCount} receipts together?

1️⃣ **Yes** - Process all ${photoCount} receipts
2️⃣ **No** - Cancel processing

⏱️ *I'll wait for your choice...*`, {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            [{ text: '1' }, { text: '2' }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      });

      // Set up conversation state for confirmation
      this.conversationManager.startConversation(userId, 'multi_receipt_confirmation', {
        mediaGroupId: mediaGroupId,
        photoCount: photoCount,
        confirmationMessageId: confirmationMsg.message_id
      });

    } catch (error) {
      console.error(`Error processing media group ${mediaGroupId}:`, error);
      await bot.sendMessage(chatId, '❌ Error processing multiple photos. Please try uploading them again.');
      
      // Clean up
      this.mediaGroups.delete(mediaGroupId);
    }
  }

  /**
   * Process multiple receipts after user confirmation
   */
  async processBatchReceipts(mediaGroupId, userId) {
    const mediaGroup = this.mediaGroups.get(mediaGroupId);
    if (!mediaGroup) return;

    const { photos, config, chatId } = mediaGroup;
    const bot = this.bots.get(userId)?.bot;
    if (!bot) return;

    const photoCount = photos.length;
    const results = [];
    let successCount = 0;

    try {
      // Remove keyboard from confirmation message
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
        chat_id: chatId,
        message_id: mediaGroup.confirmationMessageId
      });

      // Processing status message
      const statusMsg = await bot.sendMessage(chatId, `🤖 **Processing ${photoCount} receipts...** 

Please wait while I analyze all photos with AI...`, {
        parse_mode: 'Markdown'
      });

      // Process each photo
      for (let i = 0; i < photos.length; i++) {
        const photoMsg = photos[i];
        const photoNumber = i + 1;

        try {
          // Update status
          await bot.editMessageText(`🤖 **Processing Receipt ${photoNumber} of ${photoCount}...**

📥 Analyzing with AI...`, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
          });

          // Download photo
          const photoData = photoMsg.photo;
          const largestPhoto = photoData[photoData.length - 1];
          const file = await bot.getFile(largestPhoto.file_id);
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
            });
          });

          // Process with AI
          const receiptData = await this.receiptProcessor.processReceipt(photoBuffer, userId, config);
          
          if (receiptData && receiptData.store_name) {
            results.push({
              success: true,
              data: receiptData,
              index: photoNumber
            });
            successCount++;
          } else {
            results.push({
              success: false,
              error: 'Failed to extract receipt data',
              index: photoNumber
            });
          }

        } catch (error) {
          console.error(`Error processing receipt ${photoNumber}:`, error);
          results.push({
            success: false,
            error: error.message || 'Unknown error',
            index: photoNumber
          });
        }
      }

      // Show results to user
      if (successCount === 0) {
        await bot.editMessageText(`❌ **Processing Failed**

Sorry, I couldn't process any of the ${photoCount} receipt photos. Please try again with clearer images.`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        });
        return;
      }

      // Display successful receipts
      let resultText = `✅ **Processed ${successCount} of ${photoCount} receipts:**\n\n`;
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.success) {
          const data = result.data;
          const date = new Date(data.date).toLocaleDateString();
          resultText += `${result.index}. ${date} ${data.store_name} $${data.total.toFixed(2)}\n`;
        }
      }

      if (successCount < photoCount) {
        const failedCount = photoCount - successCount;
        resultText += `\n⚠️ ${failedCount} receipt${failedCount > 1 ? 's' : ''} failed to process - please try uploading clearer images.`;
      }

      // Check for open projects
      const hasOpenProjects = await this.hasOpenProjects(userId);
      
      if (hasOpenProjects) {
        // Get projects for selection - reuse existing logic from showProjectSelection
        const { data: projects, error } = await this.supabase
          .from('projects')
          .select('id, name, currency')
          .eq('user_id', userId)
          .eq('status', 'open')
          .order('name');

        if (error || !projects) {
          console.error('Error fetching projects for batch selection:', error);
          // Fall back to saving as general expenses
          await this.saveBatchReceipts(results.filter(r => r.success), userId, null);
          await bot.editMessageText(resultText + `\n\n✅ **All receipts saved to General Expenses!**`, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
          });
        } else {
          // Show project selection
          resultText += `\n\n**Where should I save ${successCount === 1 ? 'this receipt' : 'these receipts'}?**`;
          
          await bot.editMessageText(resultText, {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
          });

          // Create project selection keyboard
          const projectKeyboard = [];
          projects.forEach((project, index) => {
            projectKeyboard.push([{ text: `${index + 1}️⃣ ${project.name}` }]);
          });
          projectKeyboard.push([{ text: `${projects.length + 1}️⃣ General Expenses (no project)` }]);

          await bot.sendMessage(chatId, `**Choose project for all ${successCount} receipts:**`, {
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: projectKeyboard,
              one_time_keyboard: true,
              resize_keyboard: true
            }
          });

          // Set up conversation for project selection
          this.conversationManager.startConversation(userId, 'multi_receipt_project_selection', {
            results: results.filter(r => r.success),
            openProjects: projects,
            mediaGroupId: mediaGroupId
          });
        }

      } else {
        // No projects, save all to general expenses
        await this.saveBatchReceipts(results.filter(r => r.success), userId, null);
        
        await bot.editMessageText(resultText + `\n\n✅ **All receipts saved to General Expenses!**`, {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        });

        // Clean up
        this.mediaGroups.delete(mediaGroupId);
      }

    } catch (error) {
      console.error(`Error in batch processing for user ${userId}:`, error);
      await bot.sendMessage(chatId, '❌ Error processing receipts. Please try again.');
    }
  }

  /**
   * Save batch of receipts to database (using same pattern as single receipt processing)
   */
  async saveBatchReceipts(successfulResults, userId, projectId) {
    try {
      for (const result of successfulResults) {
        const receiptData = result.data;
        
        // Use same field names as single receipt processing (line 1180-1187)
        const finalExpenseData = {
          user_id: userId,
          project_id: projectId,
          receipt_date: receiptData.date,
          store_name: receiptData.store_name,
          category: receiptData.category || 'other',
          total_amount: receiptData.total
        };

        // Use same direct Supabase insertion as single receipt processing (line 1189-1193)
        const { data: expense, error } = await this.supabase
          .from('expenses')
          .insert([finalExpenseData])
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to save receipt ${result.index}: ${error.message}`);
        }

        console.log(`✅ Saved batch receipt ${result.index}: $${finalExpenseData.total_amount} at ${finalExpenseData.store_name}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error saving batch receipts:', error);
      return false;
    }
  }

  /**
   * Handle text commands (replaces AI chat processing to save tokens)
   */
  async handleTextCommand(text, userId) {
    const trimmedText = text.trim();

    try {
      // Check if user is in conversation - handle locally for flow management
      const conversation = this.conversationManager.getConversation(userId);
      if (conversation) {
        return this.conversationFlowManager.handleConversationInput(userId, trimmedText, conversation);
      }

      // Delegate command handling to CommandHandler
      return await this.commandHandler.handleTextCommand(trimmedText, userId);

    } catch (error) {
      console.error('Error handling command:', error);
      return '❌ Sorry, I encountered an error processing your request. Please try again.';
    }
  }


  /**
   * Handle conversation input for multi-step commands
   * All conversation flows now handled by ConversationFlowManager
   */
  async handleConversationInput(userId, input, conversation) {
    if (input.toLowerCase() === '/cancel') {
      this.conversationManager.endConversation(userId);
      return '❌ Operation cancelled.';
    }

    // Delegate ALL conversation flows to ConversationFlowManager
    return this.conversationFlowManager.handleConversationInput(userId, input, conversation);
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
        const categories = await this.expenseService.getAvailableCategories(userId);
        let categoryMessage = `✅ Store: ${input.trim()}

📋 Please select a category by typing the number:

`;
        categories.forEach((cat, index) => {
          categoryMessage += `${index + 1}. ${cat.label}\n`;
        });

        return categoryMessage;

      case 2: // Waiting for category selection
        const categoryIndex = parseInt(input) - 1;
        const availableCategories = await this.expenseService.getAvailableCategories(userId);
        
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
      try {
        const { data: category } = await this.supabase
          .from('categories')
          .select('id')
          .eq('user_id', userId)
          .eq('name', receiptData.category)
          .single();
        categoryId = category?.id;
      } catch (error) {
        console.log('Could not auto-resolve category_id for:', receiptData.category);
      }
    }

    // Create expense record (now that ReceiptProcessor doesn't save automatically)
    const expenseData = {
      user_id: userId,
      project_id: projectId,
      receipt_date: receiptData.receipt_date || receiptData.date,
      store_name: receiptData.store_name,
      category: receiptData.category,
      category_id: categoryId,
      total_amount: receiptData.total_amount || receiptData.total
    };

    const { data: expense, error } = await this.supabase
      .from('expenses')
      .insert([expenseData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to save expense');
    }

    console.log(`✅ Saved expense: $${expenseData.total_amount} at ${expenseData.store_name}`);
    
    // Log successful save to database
    await this.receiptProcessor.logReceiptProcessing(userId, receiptData, 'success');
    
    return expense;
  } catch (error) {
    console.error('Error saving expense:', error);
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
        message += `• ${this.expenseService.capitalizeFirst(cat.category)}: $${cat.amount} (${cat.percentage}%)\n`;
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
          return `${this.expenseService.capitalizeFirst(cat.category)} ${cat.percentage}%`;
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
            return `${this.expenseService.capitalizeFirst(cat.category)} ${cat.percentage}%`;
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
• /income - Add income manually (step-by-step)

*📚 Help:*
• /help - Detailed command guide

💡 *Quick Start:*
1. Upload a receipt to try it out! 
2. Use /create to manually create an expense
3. Use \`/summary week\` for weekly analysis

Type /help for detailed usage examples!`;
  }

  /**
   * Get help message
   */
  getHelpMessage() {
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
• /income - Add income manually (step-by-step)

*📚 Help:*
• /help - Detailed command guide

💡 *Quick Start:*
1. Upload a receipt to try it out! 
2. Use /create to manually create an expense
3. Use \`/summary week\` for weekly analysis

Type /help for detailed usage examples!`;
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
• /income - Step-by-step income entry

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
    console.log(`🔄 Starting bot for user ${userId}`);
    
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
      
      // NEW: Setup webhook instead of polling
      try {
        await this.setupWebhookForUser(userId, config.telegram_bot_token);
      } catch (error) {
        console.error(`❌ Webhook setup failed for user ${userId}:`, error);
        // No fallback to polling - webhook failures should be debugged and fixed
        throw error;
      }
    } else {
      console.log(`❌ No valid config found for user ${userId}`);
    }
  }

  /**
   * Remove a user's bot (called when user disconnects)
   */
  async removeUserBot(userId) {
    const botData = this.bots.get(userId);
    
    if (botData?.webhookMode) {
      // Webhook mode: remove webhook
      try {
        console.log(`🔗 Removing webhook for user ${userId}`);
        const config = await this.getUserConfig(userId);
        if (config && config.telegram_bot_token) {
          const botToken = decrypt(config.telegram_bot_token);
          await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: '' }) // Empty URL removes webhook
          });
        }
      } catch (error) {
        console.warn(`Warning removing webhook for user ${userId}:`, error.message);
      }
    } else if (botData?.bot) {
      // Polling mode: stop polling
      try {
        await botData.bot.stopPolling();
      } catch (error) {
        console.warn(`Warning stopping polling for user ${userId}:`, error.message);
      }
    }
    
    this.bots.delete(userId);
    await this.updateBotSession(userId, null, false);
  }

  /**
   * Update bot session only if chat_id has changed (to reduce database spam)
   */
  async updateBotSessionIfNeeded(userId, botUsername, isActive, chatId = null) {
    try {
      // First check current session to see if update is needed
      const { data: currentSession } = await this.supabase
        .from('bot_sessions')
        .select('chat_id, active, bot_username')
        .eq('user_id', userId)
        .single();

      // Only update if something actually changed
      if (currentSession) {
        const chatIdChanged = chatId !== null && currentSession.chat_id !== chatId;
        const activeChanged = currentSession.active !== isActive;
        const botUsernameChanged = currentSession.bot_username !== botUsername;

        if (!chatIdChanged && !activeChanged && !botUsernameChanged) {
          return; // No update needed - everything is the same
        }
      }

      // Something changed or first time, proceed with update
      await this.updateBotSession(userId, botUsername, isActive, chatId);
    } catch (error) {
      // Only log error, don't retry to avoid duplicate logs
      console.error('Error in updateBotSessionIfNeeded:', error);
    }
  }

  /**
   * Update bot session status in database
   */
  async updateBotSession(userId, botUsername, isActive, chatId = null) {
    try {
      const updateData = {
        user_id: userId,
        bot_username: botUsername,
        is_active: isActive,
        last_activity: new Date().toISOString()
      };

      // Only update chat_id if it's provided (preserve existing value if not)
      if (chatId !== null) {
        updateData.chat_id = chatId;
      }

      const { error } = await this.supabase
        .from('bot_sessions')
        .upsert(updateData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Failed to update bot session:', error);
      } else {
        const chatInfo = chatId ? ` (chat_id: ${chatId})` : '';
        console.log(`✅ Updated bot session for user ${userId}: active=${isActive}${chatInfo}`);
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
   * Handle webhook message for pilot user
   */
  async handleWebhookMessage(message, userId) {
    if (this.isShuttingDown) return;

    try {
      // Removed verbose logging
      
      // Rate limiting check
      if (!checkRateLimit(this.rateLimitMap, userId, 60000, 20)) {
        await this.sendWebhookResponse(userId, message.chat.id, '⏰ Too many requests. Please wait a moment before sending another message.');
        return;
      }

      // Update last activity
      this.updateLastActivity(userId);

      // Get user config (needed for bot username)
      const config = await this.getUserConfig(userId);
      if (!config) {
        console.error(`No config found for webhook user ${userId}`);
        return;
      }

      // Update bot session with chat_id for future message sending
      await this.updateBotSession(userId, config.telegram_bot_username, true, message.chat.id);

      // Process text message as command
      const response = await this.handleTextCommand(message.text, userId);
      
      if (response) {
        await this.sendWebhookResponse(userId, message.chat.id, response);
      }

    } catch (error) {
      console.error(`Error handling webhook message for user ${userId}:`, error);
      await this.logError(userId, error);
      
      // Send error message to user
      await this.sendWebhookResponse(userId, message.chat.id, '❌ Sorry, I encountered an error processing your message. Please try again.');
    }
  }

  /**
   * Handle webhook photo for pilot user
   */
  async handleWebhookPhoto(message, userId) {
    if (this.isShuttingDown) return;

    // Processing receipt photo

    try {
      // Update last activity
      this.updateLastActivity(userId);

      // Get user config
      const config = await this.getUserConfig(userId);
      if (!config) {
        console.error(`No config found for webhook user ${userId}`);
        return;
      }

      // Update bot session with chat_id for future message sending
      await this.updateBotSession(userId, config.telegram_bot_username, true, message.chat.id);

      // Validate photo message
      if (!message.photo || message.photo.length === 0) {
        await this.sendWebhookResponse(userId, message.chat.id, '❌ No photo detected. Please send a clear receipt photo.');
        return;
      }

      // Handle media group (multiple photos) - Skip rate limiting for media groups
      if (message.media_group_id) {
        await this.handleWebhookMediaGroup(message, userId, config);
        return;
      }

      // Rate limiting check - Only for single photos
      if (!checkRateLimit(this.rateLimitMap, userId, 60000, 5)) {
        await this.sendWebhookResponse(userId, message.chat.id, '⏰ Too many photo uploads. Please wait a moment.');
        return;
      }

      // Send step-by-step processing messages
      const statusMsg = await this.sendWebhookResponse(userId, message.chat.id, '📸 Receipt received! Starting analysis...');

      try {
        // Step 1: Download photo
        await this.editWebhookMessage(userId, message.chat.id, statusMsg.message_id, '📥 Downloading photo...');

        const photos = message.photo;
        const largestPhoto = photos[photos.length - 1];
        
        // Get bot token for file download
        const botToken = decrypt(config.telegram_bot_token);
        const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${largestPhoto.file_id}`);
        const fileData = await fileResponse.json();
        
        if (!fileData.ok) {
          throw new Error('Failed to get file info');
        }
        
        // Download file as buffer
        const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
        const photoResponse = await fetch(fileUrl);
        const photoBuffer = await photoResponse.buffer();

        // Step 2: Check Gemini API
        if (!config.gemini_api_key) {
          await this.editWebhookMessage(userId, message.chat.id, statusMsg.message_id, '⚠️ Gemini AI not configured. Please complete setup to process receipts.');
          return;
        }

        // Step 3: Process with AI
        await this.editWebhookMessage(userId, message.chat.id, statusMsg.message_id, '🤖 Analyzing receipt with AI...');

        const receiptData = await this.receiptProcessor.processReceipt(photoBuffer, userId, config);
        
        if (!receiptData) {
          throw new Error('AI failed to extract receipt data');
        }

        // Step 4: Check for open projects and show selection
        const hasOpenProjects = await this.hasOpenProjects(userId);
        
        if (hasOpenProjects) {
          const projectSelectionMessage = await this.showProjectSelection(userId, receiptData);
          await this.editWebhookMessage(userId, message.chat.id, statusMsg.message_id, projectSelectionMessage);
        } else {
          // No open projects, save directly as general expense
          await this.saveReceiptAsExpense(userId, receiptData, null);
          await this.editWebhookMessage(userId, message.chat.id, statusMsg.message_id, '✅ Receipt processed successfully!\n\n' + this.formatReceiptConfirmation(receiptData, null));
        }

      } catch (processingError) {
        // Update message with error
        await this.editWebhookMessage(userId, message.chat.id, statusMsg.message_id, `❌ Error: ${processingError.message}`);
        throw processingError;
      }

    } catch (error) {
      console.error(`Error handling webhook photo for user ${userId}:`, error);
      await this.logError(userId, error);
      
      await this.sendWebhookResponse(userId, message.chat.id, '❌ Sorry, I couldn\'t process this receipt. Please try again with a clearer photo.');
    }
  }

  /**
   * Handle webhook media group (multiple photos) with batch processing
   */
  async handleWebhookMediaGroup(message, userId, config) {
    const { media_group_id } = message;

    // Initialize or update media group collection
    if (!this.mediaGroups.has(media_group_id)) {
      this.mediaGroups.set(media_group_id, {
        photos: [],
        userId: userId,
        config: config,
        chatId: message.chat.id,
        timeout: null,
        rejected: false,
        isWebhook: true // Flag to identify webhook processing
      });
    }

    const mediaGroup = this.mediaGroups.get(media_group_id);
    
    // Check for already rejected groups - silently ignore remaining photos
    if (mediaGroup.rejected) {
      return;
    }
    
    mediaGroup.photos.push(message);

    // Check immediately if more than 5 photos - reject without waiting
    if (mediaGroup.photos.length > 5) {
      // Clear any existing timeout
      if (mediaGroup.timeout) {
        clearTimeout(mediaGroup.timeout);
      }

      await this.sendWebhookResponse(userId, message.chat.id, `📸 **More than 5 photos detected!**

I can only process up to 5 receipt photos at once.

📋 **Please:**
• Choose your 5 most important receipts
• Upload them again (up to 5 photos)
• I'll process all 5 together

💡 *This ensures accurate AI processing and manages costs effectively.*`);
      
      // Mark as rejected instead of deleting
      mediaGroup.rejected = true;
      return;
    }

    // Clear existing timeout and set new one
    if (mediaGroup.timeout) {
      clearTimeout(mediaGroup.timeout);
    }

    mediaGroup.timeout = setTimeout(async () => {
      await this.processWebhookMediaGroup(media_group_id);
    }, this.MEDIA_GROUP_TIMEOUT);
  }

  /**
   * Process collected webhook media group photos
   */
  async processWebhookMediaGroup(mediaGroupId) {
    const mediaGroup = this.mediaGroups.get(mediaGroupId);
    if (!mediaGroup) return;

    const { photos, userId, config, chatId } = mediaGroup;

    try {
      const photoCount = photos.length;

      // Ask user for confirmation to proceed
      const confirmationMsg = await this.sendWebhookResponse(userId, chatId, `📸 **${photoCount} Receipt Photos Detected!**

Process all ${photoCount} receipts together?

1️⃣ **Yes** - Process all ${photoCount} receipts
2️⃣ **No** - Cancel processing

⏱️ *I'll wait for your choice...*`);

      // Set up conversation state for confirmation
      this.conversationManager.startConversation(userId, 'multi_receipt_confirmation', {
        mediaGroupId: mediaGroupId,
        photoCount: photoCount,
        confirmationMessageId: confirmationMsg.message_id,
        chatId: chatId,
        isWebhook: true
      });

    } catch (error) {
      console.error(`Error processing webhook media group ${mediaGroupId}:`, error);
      await this.sendWebhookResponse(userId, chatId, '❌ Error processing multiple photos. Please try uploading them again.');
      
      // Clean up
      this.mediaGroups.delete(mediaGroupId);
    }
  }

  /**
   * Process webhook batch receipts (similar to regular batch processing but uses webhook responses)
   */
  async processWebhookBatchReceipts(mediaGroupId, userId) {
    const mediaGroup = this.mediaGroups.get(mediaGroupId);
    if (!mediaGroup) return;

    const { photos, config, chatId } = mediaGroup;
    const photoCount = photos.length;
    const results = [];
    let successCount = 0;

    try {
      // Processing status message
      const statusMsg = await this.sendWebhookResponse(userId, chatId, `🤖 **Processing ${photoCount} receipts...** 

Please wait while I analyze all photos with AI...`);

      // Process each photo
      for (let i = 0; i < photos.length; i++) {
        const photoMsg = photos[i];
        const photoNumber = i + 1;

        try {
          // Update status
          await this.editWebhookMessage(userId, chatId, statusMsg.message_id, `🤖 **Processing Receipt ${photoNumber} of ${photoCount}...**

📥 Analyzing with AI...`);

          // Download photo
          const photoData = photoMsg.photo;
          const largestPhoto = photoData[photoData.length - 1];
          
          // Get bot token for file download
          const botToken = decrypt(config.telegram_bot_token);
          const fileResponse = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${largestPhoto.file_id}`);
          const fileData = await fileResponse.json();
          
          if (!fileData.ok) {
            throw new Error('Failed to get file info');
          }
          
          // Download file as buffer
          const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
          const photoResponse = await fetch(fileUrl);
          const photoBuffer = await photoResponse.buffer();

          // Process with AI
          const receiptData = await this.receiptProcessor.processReceipt(photoBuffer, userId, config);
          
          if (receiptData && receiptData.store_name) {
            results.push({
              success: true,
              data: receiptData,
              index: photoNumber
            });
            successCount++;
          } else {
            results.push({
              success: false,
              error: 'Failed to extract receipt data',
              index: photoNumber
            });
          }

        } catch (error) {
          console.error(`Error processing webhook receipt ${photoNumber}:`, error);
          results.push({
            success: false,
            error: error.message || 'Unknown error',
            index: photoNumber
          });
        }
      }

      // Show results to user
      if (successCount === 0) {
        await this.editWebhookMessage(userId, chatId, statusMsg.message_id, `❌ **Processing Failed**

Sorry, I couldn't process any of the ${photoCount} receipt photos. Please try again with clearer images.`);
        return;
      }

      // Display successful receipts
      let resultText = `✅ **Processed ${successCount} of ${photoCount} receipts:**\n\n`;
      
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.success) {
          const data = result.data;
          const date = new Date(data.date).toLocaleDateString();
          resultText += `${result.index}. ${date} ${data.store_name} $${data.total.toFixed(2)}\n`;
        }
      }

      if (successCount < photoCount) {
        const failedCount = photoCount - successCount;
        resultText += `\n⚠️ ${failedCount} receipt${failedCount > 1 ? 's' : ''} failed to process - please try uploading clearer images.`;
      }

      // Check for open projects
      const hasOpenProjects = await this.hasOpenProjects(userId);
      
      if (hasOpenProjects) {
        // Get projects for selection - reuse existing logic from showProjectSelection
        const { data: projects, error } = await this.supabase
          .from('projects')
          .select('id, name, currency')
          .eq('user_id', userId)
          .eq('status', 'open')
          .order('name');

        if (error || !projects) {
          console.error('Error fetching projects for webhook batch selection:', error);
          // Fall back to saving as general expenses
          await this.saveBatchReceipts(results.filter(r => r.success), userId, null);
          await this.editWebhookMessage(userId, chatId, statusMsg.message_id, resultText + `\n\n✅ **All receipts saved to General Expenses!**`);
        } else {
          // Show project selection
          resultText += `\n\n**Where should I save ${successCount === 1 ? 'this receipt' : 'these receipts'}?**`;
          
          await this.editWebhookMessage(userId, chatId, statusMsg.message_id, resultText);

          // Create project selection response
          let projectText = `**Choose project for all ${successCount} receipts:**\n\n`;
          projects.forEach((project, index) => {
            projectText += `${index + 1}️⃣ ${project.name}\n`;
          });
          projectText += `${projects.length + 1}️⃣ General Expenses (no project)`;

          await this.sendWebhookResponse(userId, chatId, projectText);

          // Set up conversation for project selection
          this.conversationManager.startConversation(userId, 'multi_receipt_project_selection', {
            results: results.filter(r => r.success),
            openProjects: projects,
            mediaGroupId: mediaGroupId,
            isWebhook: true
          });
        }

      } else {
        // No projects, save all to general expenses
        await this.saveBatchReceipts(results.filter(r => r.success), userId, null);
        
        await this.editWebhookMessage(userId, chatId, statusMsg.message_id, resultText + `\n\n✅ **All receipts saved to General Expenses!**`);

        // Clean up
        this.mediaGroups.delete(mediaGroupId);
      }

    } catch (error) {
      console.error(`Error in webhook batch processing for user ${userId}:`, error);
      await this.sendWebhookResponse(userId, chatId, '❌ Error processing receipts. Please try again.');
    }
  }

  /**
   * Send response via webhook (HTTP API) with retry logic
   */
  async sendWebhookResponse(userId, chatId, text, options = {}) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = await this.getUserConfig(userId);
        if (!config) {
          throw new Error('No config found for user');
        }

        const botToken = decrypt(config.telegram_bot_token);
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            ...options
          }),
          timeout: 10000 // 10 second timeout
        });

        const result = await response.json();
        if (!result.ok) {
          throw new Error(`Failed to send message: ${result.description}`);
        }

        return result.result;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`❌ Failed to send message after ${maxRetries} attempts for user ${userId}:`, error.message);
          throw error;
        }
        
        // Only retry on network errors, not API errors
        if (error.code === 'ETIMEDOUT' || error.type === 'system' || error.name === 'FetchError') {
          console.warn(`⚠️ Retry ${attempt}/${maxRetries} for user ${userId}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        } else {
          // Don't retry API errors (bad requests, etc.)
          throw error;
        }
      }
    }
  }

  /**
   * Edit message via webhook (HTTP API) with retry logic
   */
  async editWebhookMessage(userId, chatId, messageId, text, options = {}) {
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const config = await this.getUserConfig(userId);
        if (!config) {
          throw new Error('No config found for user');
        }

        const botToken = decrypt(config.telegram_bot_token);
        
        const response = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            text: text,
            parse_mode: 'Markdown',
            disable_web_page_preview: true,
            ...options
          }),
          timeout: 10000 // 10 second timeout
        });

        const result = await response.json();
        if (!result.ok) {
          throw new Error(`Failed to edit message: ${result.description}`);
        }

        return result.result;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(`❌ Failed to edit message after ${maxRetries} attempts for user ${userId}:`, error.message);
          // Don't throw on edit failures - just log and continue
          return null;
        }
        
        // Only retry on network errors, not API errors
        if (error.code === 'ETIMEDOUT' || error.type === 'system' || error.name === 'FetchError') {
          console.warn(`⚠️ Edit retry ${attempt}/${maxRetries} for user ${userId}: ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          continue;
        } else {
          // Don't retry API errors, but don't crash either
          console.warn(`⚠️ Edit message API error for user ${userId}: ${error.message}`);
          return null;
        }
      }
    }
  }

  /**
   * Setup webhook for pilot user only
   */
  async setupWebhookForUser(userId, encryptedToken) {
    try {
      const botToken = decrypt(encryptedToken);
      // SECURE: Each user gets their own unique webhook URL
      const webhookUrl = `https://${process.env.RAILWAY_DOMAIN}/api/webhook/telegram/${userId}`;
      
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: process.env.WEBHOOK_SECRET,
          allowed_updates: ['message', 'photo']
        })
      });
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(`Webhook failed: ${result.description}`);
      }
      
      // Webhook ready (logged in startup summary)
      
      // Get actual bot info for proper username storage
      const botInfo = await this.getBotInfo(botToken);
      const botUsername = botInfo?.username || 'unknown';
      
      // Store webhook config with proper bot username
      this.bots.set(userId, {
        webhookMode: true,
        config: await this.getUserConfig(userId),
        lastActivity: new Date(),
        isActive: true,
        botUsername: botUsername
      });
      
      // Update session status with ACTUAL bot username
      await this.updateBotSession(userId, botUsername, true);
      
    } catch (error) {
      console.error(`❌ User ${userId} webhook setup failed:`, error);
      // No fallback to polling - webhook failures should be debugged and fixed
      throw error;
    }
  }

  /**
   * Rollback method (revert pilot user to polling)
   */
  async rollbackPilotUser() {
    try {
      const config = await this.getUserConfig(this.PILOT_USER_ID);
      if (!config) {
        throw new Error('No config found for pilot user');
      }
      
      const botToken = decrypt(config.telegram_bot_token);
      
      // Remove webhook
      await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '' }) // Empty URL removes webhook
      });
      
      // Remove webhook config from memory
      this.bots.delete(this.PILOT_USER_ID);
      
      // Start polling for pilot user
      await this.createUserBot(config);
      console.log(`🔄 PILOT: User ${this.PILOT_USER_ID} reverted to polling`);
      
    } catch (error) {
      console.error(`❌ PILOT: Failed to rollback user ${this.PILOT_USER_ID}:`, error);
      throw error;
    }
  }

  /**
   * Get bot info from Telegram API
   */
  async getBotInfo(botToken) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const result = await response.json();
      
      if (result.ok) {
        return result.result; // Contains username, first_name, etc.
      } else {
        console.error('Failed to get bot info:', result.description);
        return null;
      }
    } catch (error) {
      console.error('Error getting bot info:', error);
      return null;
    }
  }

  /**
   * Get user config helper method
   */
  async getUserConfig(userId) {
    try {
      const { data: config, error } = await this.supabase
        .from('user_configs')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        throw error;
      }
      
      return config;
    } catch (error) {
      console.error(`Error fetching config for user ${userId}:`, error);
      return null;
    }
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
        if (botData.webhookMode) {
          // Handle webhook cleanup for pilot user
          console.log(`🧪 PILOT: Cleaning up webhook for user ${userId}`);
          await this.updateBotSession(userId, null, false);
        } else {
          // Handle polling bot cleanup
          await botData.bot.stopPolling();
          await this.updateBotSession(userId, null, false);
        }
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