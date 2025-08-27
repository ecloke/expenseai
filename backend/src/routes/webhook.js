import express from 'express';
import crypto from 'crypto';
const router = express.Router();

// Webhook endpoint for ALL users
router.post('/telegram', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'No message' });
    }

    // Get user ID from the message
    const userId = await getUserIdFromMessage(req, message);
    
    if (!userId) {
      console.log('🔍 Webhook received but could not determine user ID');
      return res.status(200).json({ ok: true }); // Still return OK to Telegram
    }

    console.log(`🔗 Processing webhook for user ${userId}`);
    
    const botManager = req.app.get('botManager');
    
    if (message.photo) {
      await botManager.handleWebhookPhoto(message, userId);
    } else {
      await botManager.handleWebhookMessage(message, userId);
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('🚨 Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to determine user ID from message
async function getUserIdFromMessage(req, message) {
  try {
    const botManager = req.app.get('botManager');
    const supabase = req.supabase;
    
    if (!supabase || !botManager) {
      console.error('Missing supabase or botManager instance');
      return null;
    }

    const chatId = message.chat.id;
    
    // Method 1: Check if we have this chat ID mapped to a user
    let userId = botManager.getUserIdFromChatId(chatId);
    if (userId) {
      return userId;
    }
    
    // Method 2: This is a new message, try to find the right user by bot username matching
    const messageBot = message.chat.username; // If available
    
    // Method 3: For seamless migration, we need to identify which user this message belongs to
    // Since all users are migrating to the same webhook endpoint, we'll use a smart routing approach
    
    // Get all users and try to match by checking recent interactions or user data
    const { data: configs, error } = await supabase
      .from('user_configs')
      .select('user_id, telegram_bot_token')
      .not('telegram_bot_token', 'is', null);
    
    if (error || !configs || configs.length === 0) {
      console.error('Error fetching user configs for webhook routing:', error);
      return null;
    }
    
    // For seamless migration: since each user has their own bot token and we're sharing
    // one webhook URL, we'll need to route based on the fact that each user's messages
    // will come through their specific bot. For now, register the first message from 
    // each chat to the first available user, and subsequent messages will use the mapping.
    
    // This is a simplified approach for the migration - in production you'd want
    // unique webhook URLs per user or a more sophisticated routing system
    
    for (const config of configs) {
      const botData = botManager.bots.get(config.user_id);
      if (botData && botData.webhookMode) {
        // Register this chat to this user and return
        botManager.registerChatId(chatId, config.user_id);
        return config.user_id;
      }
    }
    
    // Fallback: use first available user
    if (configs.length > 0) {
      userId = configs[0].user_id;
      botManager.registerChatId(chatId, userId);
      console.log(`🔄 Fallback: Assigned chat ${chatId} to user ${userId}`);
      return userId;
    }
    
    return null;
    
  } catch (error) {
    console.error('Error determining user ID from webhook:', error);
    return null;
  }
}

export default router;