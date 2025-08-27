import express from 'express';
import crypto from 'crypto';
const router = express.Router();

// SECURE: Unique webhook endpoint per user - NO MESSAGE CROSS-CONTAMINATION
router.post('/telegram/:userId', async (req, res) => {
  try {
    const { message } = req.body;
    const { userId } = req.params;

    if (!message) {
      return res.status(400).json({ error: 'No message' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'No user ID provided' });
    }

    // CRITICAL: Validate that this user exists and has webhook configured
    const botManager = req.app.get('botManager');
    const botData = botManager.bots.get(userId);
    
    if (!botData || !botData.webhookMode) {
      return res.status(403).json({ error: 'User not configured for webhooks' });
    }

    // SECURE: Process message for ONLY this specific user
    if (message.photo) {
      await botManager.handleWebhookPhoto(message, userId);
    } else {
      await botManager.handleWebhookMessage(message, userId);
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error(`🚨 Webhook error for user ${req.params.userId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy endpoint for backward compatibility (will be removed)
router.post('/telegram', (req, res) => {
  console.log('⚠️ Legacy webhook endpoint called - this should not happen');
  res.status(404).json({ error: 'Use user-specific webhook endpoint' });
});

export default router;