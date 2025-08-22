import TelegramBot from 'node-telegram-bot-api';
import { decrypt } from '../utils/encryption.js';
import { checkRateLimit } from '../utils/validation.js';
import ReceiptProcessor from './ReceiptProcessor.js';
import ChatProcessor from './ChatProcessor.js';

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

      // Process text message as chat query
      const response = await this.chatProcessor.processQuery(msg.text, userId, config);
      
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

    try {
      // Rate limiting check
      if (!checkRateLimit(this.rateLimitMap, userId, 60000, 5)) {
        const bot = this.bots.get(userId)?.bot;
        if (bot) {
          await bot.sendMessage(msg.chat.id, '⏰ Too many photo uploads. Please wait a moment.');
        }
        return;
      }

      // Update last activity
      this.updateLastActivity(userId);

      const bot = this.bots.get(userId)?.bot;
      if (!bot) return;

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
        const photoBuffer = await bot.downloadFile(file.file_id, './temp/');

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
        const confirmationText = '✅ Receipt processed successfully!\n\n' + this.formatReceiptConfirmation(receiptData);
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
    const itemsList = receiptData.items
      .map(item => `• ${item.name}: $${item.price.toFixed(2)}`)
      .join('\n');

    return `✅ *Receipt processed successfully!*

🏪 **Store:** ${receiptData.store_name}
📅 **Date:** ${receiptData.date}
💰 **Total:** $${receiptData.total.toFixed(2)}

**Items:**
${itemsList}

Your expense has been added to your Google Sheet! 📊`;
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