import express from 'express';
import crypto from 'crypto';
const router = express.Router();

const PILOT_USER_ID = '149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498';

// Webhook endpoint for pilot user
router.post('/telegram', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'No message' });
    }

    // Get user ID from bot token hash
    const userId = await getUserIdFromBotToken(req);
    
    // Only process if this is our pilot user
    if (userId !== PILOT_USER_ID) {
      return res.status(200).json({ ok: true }); // Ignore other users
    }

    console.log(`🧪 PILOT: Processing webhook for user ${userId}`);
    
    const botManager = req.app.get('botManager');
    
    if (message.photo) {
      const config = await botManager.getUserConfig(userId);
      await botManager.handlePhoto(message, userId, config);
    } else {
      const config = await botManager.getUserConfig(userId);
      await botManager.handleMessage(message, userId, config);
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('🚨 PILOT: Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get user ID from bot token in webhook request
async function getUserIdFromBotToken(req) {
  try {
    // Since we only have one pilot user, and webhook is only called for that user,
    // we can safely return the pilot user ID
    return PILOT_USER_ID;
  } catch (error) {
    console.error('Error getting user ID from bot token:', error);
    return PILOT_USER_ID; // Fallback to pilot user
  }
}

export default router;