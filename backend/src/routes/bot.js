import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { validateInput, telegramBotTokenSchema } from '../utils/validation.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = express.Router();

/**
 * Bot management routes
 */

/**
 * POST /api/bot/validate-token
 * Validate Telegram bot token
 */
router.post('/validate-token', async (req, res) => {
  try {
    const { bot_token } = req.body;

    // Validate token format
    const validation = telegramBotTokenSchema.validate(bot_token);
    if (validation.error) {
      return res.status(400).json({ 
        error: 'Invalid token format',
        message: validation.error.details[0].message 
      });
    }

    // Test token with Telegram API
    try {
      const bot = new TelegramBot(bot_token, { polling: false });
      const botInfo = await bot.getMe();
      
      res.json({
        success: true,
        bot_info: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
          is_bot: botInfo.is_bot
        },
        message: 'Bot token is valid'
      });

    } catch (telegramError) {
      console.error('Telegram API error:', telegramError);
      
      if (telegramError.code === 'ETELEGRAM') {
        return res.status(400).json({
          error: 'Invalid bot token',
          message: 'Token was rejected by Telegram API'
        });
      }
      
      throw telegramError;
    }

  } catch (error) {
    console.error('Bot token validation error:', error);
    res.status(500).json({ 
      error: 'Token validation failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/bot/setup
 * Set up bot configuration for a user
 */
router.post('/setup', async (req, res) => {
  try {
    const { user_id, bot_token, bot_username } = req.body;

    if (!user_id || !bot_token) {
      return res.status(400).json({ error: 'User ID and bot token are required' });
    }

    // Validate bot token
    const validation = telegramBotTokenSchema.validate(bot_token);
    if (validation.error) {
      return res.status(400).json({ 
        error: 'Invalid token format',
        message: validation.error.details[0].message 
      });
    }

    // Test bot token one more time
    const bot = new TelegramBot(bot_token, { polling: false });
    const botInfo = await bot.getMe();

    if (!botInfo.is_bot) {
      return res.status(400).json({ error: 'Token does not belong to a bot' });
    }

    // Encrypt token before storing
    const encryptedToken = encrypt(bot_token);

    // Update or insert user config
    const { data, error } = await req.supabase
      .from('user_configs')
      .upsert({
        user_id,
        telegram_bot_token: encryptedToken,
        telegram_bot_username: bot_username || botInfo.username,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save bot configuration: ${error.message}`);
    }

    console.log(`✅ Bot configured for user ${user_id}: @${botInfo.username}`);

    res.json({
      success: true,
      bot_info: {
        id: botInfo.id,
        username: botInfo.username,
        first_name: botInfo.first_name
      },
      message: 'Bot configuration saved successfully'
    });

  } catch (error) {
    console.error('Bot setup error:', error);
    res.status(500).json({ 
      error: 'Bot setup failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/bot/start
 * Start bot for a user (add to BotManager)
 */
router.post('/start', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user config
    const { data: userConfig, error } = await req.supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error || !userConfig) {
      return res.status(404).json({ error: 'User configuration not found' });
    }

    if (!userConfig.telegram_bot_token) {
      return res.status(400).json({ error: 'Bot token not configured' });
    }

    // Check if all required configurations are present
    const missingConfigs = [];
    if (!userConfig.gemini_api_key) missingConfigs.push('Gemini API key');
    if (!userConfig.google_access_token) missingConfigs.push('Google Sheets access');

    if (missingConfigs.length > 0) {
      return res.status(400).json({ 
        error: 'Incomplete configuration',
        missing: missingConfigs,
        message: `Please complete setup: ${missingConfigs.join(', ')}`
      });
    }

    // Add bot to BotManager (this would require access to the global BotManager instance)
    // For now, we'll just update the session status
    const { error: sessionError } = await req.supabase
      .from('bot_sessions')
      .upsert({
        user_id,
        bot_username: userConfig.telegram_bot_username,
        is_active: true,
        last_activity: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (sessionError) {
      console.error('Failed to update bot session:', sessionError);
    }

    res.json({
      success: true,
      bot_username: userConfig.telegram_bot_username,
      message: 'Bot started successfully. You can now send messages to your bot on Telegram!'
    });

  } catch (error) {
    console.error('Bot start error:', error);
    res.status(500).json({ 
      error: 'Failed to start bot',
      message: error.message 
    });
  }
});

/**
 * POST /api/bot/stop
 * Stop bot for a user
 */
router.post('/stop', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Update session status
    const { error } = await req.supabase
      .from('bot_sessions')
      .update({
        is_active: false,
        last_activity: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (error) {
      console.error('Failed to update bot session:', error);
    }

    res.json({
      success: true,
      message: 'Bot stopped successfully'
    });

  } catch (error) {
    console.error('Bot stop error:', error);
    res.status(500).json({ 
      error: 'Failed to stop bot',
      message: error.message 
    });
  }
});

/**
 * GET /api/bot/status/:user_id
 * Get bot status for a user
 */
router.get('/status/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    // Get user config and session
    const { data: userConfig, error: configError } = await req.supabase
      .from('user_configs')
      .select('telegram_bot_username, telegram_bot_token, gemini_api_key, google_access_token')
      .eq('user_id', user_id)
      .single();

    const { data: session, error: sessionError } = await req.supabase
      .from('bot_sessions')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Check configuration completeness
    const hasBot = !!(userConfig?.telegram_bot_token);
    const hasGemini = !!(userConfig?.gemini_api_key);
    const hasGoogleSheets = !!(userConfig?.google_access_token);
    const isComplete = hasBot && hasGemini && hasGoogleSheets;

    const status = {
      is_configured: isComplete,
      is_active: session?.is_active || false,
      bot_username: userConfig?.telegram_bot_username,
      last_activity: session?.last_activity,
      configuration: {
        telegram_bot: hasBot,
        gemini_api: hasGemini,
        google_sheets: hasGoogleSheets
      }
    };

    res.json(status);

  } catch (error) {
    console.error('Bot status error:', error);
    res.status(500).json({ 
      error: 'Failed to get bot status',
      message: error.message 
    });
  }
});

/**
 * GET /api/bot/stats/:user_id
 * Get bot usage statistics for a user
 */
router.get('/stats/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get receipt processing stats
    const { data: receiptStats, error: receiptError } = await req.supabase
      .from('receipt_logs')
      .select('processing_status, total_amount, items_count')
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString());

    // Get chat query stats
    const { data: chatStats, error: chatError } = await req.supabase
      .from('chat_logs')
      .select('processing_status')
      .eq('user_id', user_id)
      .gte('created_at', startDate.toISOString());

    if (receiptError || chatError) {
      throw new Error('Failed to retrieve statistics');
    }

    const stats = {
      period_days: parseInt(days),
      receipts: {
        total: receiptStats.length,
        successful: receiptStats.filter(r => r.processing_status === 'success').length,
        failed: receiptStats.filter(r => r.processing_status === 'error').length,
        total_amount: receiptStats
          .filter(r => r.total_amount)
          .reduce((sum, r) => sum + parseFloat(r.total_amount), 0),
        total_items: receiptStats
          .filter(r => r.items_count)
          .reduce((sum, r) => sum + r.items_count, 0)
      },
      chat_queries: {
        total: chatStats.length,
        successful: chatStats.filter(c => c.processing_status === 'success').length,
        failed: chatStats.filter(c => c.processing_status === 'error').length
      }
    };

    // Calculate success rates
    stats.receipts.success_rate = stats.receipts.total > 0 ? 
      (stats.receipts.successful / stats.receipts.total * 100).toFixed(1) : 0;
    
    stats.chat_queries.success_rate = stats.chat_queries.total > 0 ? 
      (stats.chat_queries.successful / stats.chat_queries.total * 100).toFixed(1) : 0;

    res.json(stats);

  } catch (error) {
    console.error('Bot stats error:', error);
    res.status(500).json({ 
      error: 'Failed to get bot statistics',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/bot/config/:user_id
 * Delete bot configuration for a user
 */
router.delete('/config/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    // Clear bot configuration
    const { error } = await req.supabase
      .from('user_configs')
      .update({
        telegram_bot_token: null,
        telegram_bot_username: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (error) {
      throw new Error(`Failed to delete bot configuration: ${error.message}`);
    }

    // Update session status
    await req.supabase
      .from('bot_sessions')
      .update({
        is_active: false,
        last_activity: new Date().toISOString()
      })
      .eq('user_id', user_id);

    res.json({
      success: true,
      message: 'Bot configuration deleted successfully'
    });

  } catch (error) {
    console.error('Bot config deletion error:', error);
    res.status(500).json({ 
      error: 'Failed to delete bot configuration',
      message: error.message 
    });
  }
});

/**
 * GET /api/bot/debug/:user_id
 * Debug endpoint to check user config in database
 */
router.get('/debug/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await req.supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Database query failed: ${error.message}`);
    }

    res.json({
      success: true,
      user_id,
      config: data || null,
      exists: !!data
    });

  } catch (error) {
    console.error('Debug query error:', error);
    res.status(500).json({ 
      error: 'Debug query failed',
      message: error.message 
    });
  }
});

export default router;