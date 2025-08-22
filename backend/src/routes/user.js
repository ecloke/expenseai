import express from 'express';
import { validateInput, geminiApiKeySchema } from '../utils/validation.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = express.Router();

/**
 * User configuration routes
 */

/**
 * GET /api/user/config/:user_id
 * Get user configuration (without sensitive data)
 */
router.get('/config/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await req.supabase
      .from('user_configs')
      .select(`
        id,
        user_id,
        telegram_bot_username,
        google_sheet_id,
        sheet_name,
        created_at,
        updated_at
      `)
      .eq('user_id', user_id)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      throw error;
    }

    res.json({
      config: data || null,
      has_telegram_bot: !!(data?.telegram_bot_username),
      has_google_sheets: !!(data?.google_sheet_id),
      has_gemini_api: false // Don't expose this for security
    });

  } catch (error) {
    console.error('Get user config error:', error);
    res.status(500).json({ 
      error: 'Failed to get user configuration',
      message: error.message 
    });
  }
});

/**
 * POST /api/user/gemini-api-key
 * Set Gemini API key for a user
 */
router.post('/gemini-api-key', async (req, res) => {
  try {
    const { user_id, api_key } = req.body;

    if (!user_id || !api_key) {
      return res.status(400).json({ error: 'User ID and API key are required' });
    }

    // Validate API key format
    const validation = geminiApiKeySchema.validate(api_key);
    if (validation.error) {
      return res.status(400).json({ 
        error: 'Invalid API key format',
        message: validation.error.details[0].message 
      });
    }

    // Test API key with a simple request
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(api_key);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Test with a simple prompt
      const result = await model.generateContent("Say 'API key is working' and nothing else.");
      const response = await result.response;
      const text = response.text();
      
      if (!text.includes('working')) {
        throw new Error('Unexpected response from Gemini API');
      }
      
    } catch (geminiError) {
      console.error('Gemini API test error:', geminiError);
      return res.status(400).json({
        error: 'Invalid Gemini API key',
        message: 'API key was rejected by Gemini service'
      });
    }

    // Encrypt API key before storing
    const encryptedApiKey = encrypt(api_key);

    // Update user config
    const { error } = await req.supabase
      .from('user_configs')
      .upsert({
        user_id,
        gemini_api_key: encryptedApiKey,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw new Error(`Failed to save API key: ${error.message}`);
    }

    console.log(`✅ Gemini API key configured for user ${user_id}`);

    res.json({
      success: true,
      message: 'Gemini API key configured successfully'
    });

  } catch (error) {
    console.error('Gemini API key setup error:', error);
    res.status(500).json({ 
      error: 'Failed to configure Gemini API key',
      message: error.message 
    });
  }
});

/**
 * POST /api/user/test-gemini
 * Test Gemini API key for a user
 */
router.post('/test-gemini', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user config
    const { data: userConfig, error } = await req.supabase
      .from('user_configs')
      .select('gemini_api_key')
      .eq('user_id', user_id)
      .single();

    if (error || !userConfig) {
      return res.status(404).json({ error: 'User configuration not found' });
    }

    if (!userConfig.gemini_api_key) {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    // Decrypt and test API key
    const apiKey = decrypt(userConfig.gemini_api_key);
    if (!apiKey) {
      return res.status(500).json({ error: 'Failed to decrypt API key' });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const result = await model.generateContent("Respond with exactly: 'Gemini API test successful'");
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      response: text.trim(),
      message: 'Gemini API is working correctly'
    });

  } catch (error) {
    console.error('Gemini API test error:', error);
    res.status(500).json({ 
      error: 'Gemini API test failed',
      message: error.message 
    });
  }
});

/**
 * PUT /api/user/sheet-config
 * Update sheet configuration for a user
 */
router.put('/sheet-config', async (req, res) => {
  try {
    const { user_id, google_sheet_id, sheet_name } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (google_sheet_id) {
      updateData.google_sheet_id = google_sheet_id;
    }

    if (sheet_name) {
      updateData.sheet_name = sheet_name;
    }

    const { error } = await req.supabase
      .from('user_configs')
      .update(updateData)
      .eq('user_id', user_id);

    if (error) {
      throw new Error(`Failed to update sheet configuration: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Sheet configuration updated successfully'
    });

  } catch (error) {
    console.error('Sheet config update error:', error);
    res.status(500).json({ 
      error: 'Failed to update sheet configuration',
      message: error.message 
    });
  }
});

/**
 * GET /api/user/expenses/:user_id
 * Get expense summary for a user
 */
router.get('/expenses/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get receipt logs for summary
    const { data: receiptLogs, error } = await req.supabase
      .from('receipt_logs')
      .select('*')
      .eq('user_id', user_id)
      .eq('processing_status', 'success')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Calculate summary statistics
    const totalAmount = receiptLogs.reduce((sum, log) => sum + (parseFloat(log.total_amount) || 0), 0);
    const totalItems = receiptLogs.reduce((sum, log) => sum + (log.items_count || 0), 0);
    const totalReceipts = receiptLogs.length;

    // Group by store
    const storeBreakdown = {};
    receiptLogs.forEach(log => {
      if (log.store_name) {
        if (!storeBreakdown[log.store_name]) {
          storeBreakdown[log.store_name] = { total: 0, count: 0 };
        }
        storeBreakdown[log.store_name].total += parseFloat(log.total_amount) || 0;
        storeBreakdown[log.store_name].count += 1;
      }
    });

    // Sort stores by total spending
    const topStores = Object.entries(storeBreakdown)
      .map(([store, data]) => ({
        store,
        total: parseFloat(data.total.toFixed(2)),
        count: data.count
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Recent activity
    const recentActivity = receiptLogs.slice(0, 10).map(log => ({
      date: log.created_at.split('T')[0],
      store: log.store_name,
      amount: parseFloat(log.total_amount) || 0,
      items: log.items_count || 0
    }));

    const summary = {
      period_days: parseInt(days),
      total_amount: parseFloat(totalAmount.toFixed(2)),
      total_receipts: totalReceipts,
      total_items: totalItems,
      average_receipt: totalReceipts > 0 ? parseFloat((totalAmount / totalReceipts).toFixed(2)) : 0,
      top_stores: topStores,
      recent_activity: recentActivity
    };

    res.json(summary);

  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ 
      error: 'Failed to get expense summary',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/user/config/:user_id
 * Delete all user configuration and data
 */
router.delete('/config/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    // Delete user config (will cascade to related tables)
    const { error } = await req.supabase
      .from('user_configs')
      .delete()
      .eq('user_id', user_id);

    if (error) {
      throw new Error(`Failed to delete user configuration: ${error.message}`);
    }

    console.log(`🗑️ Deleted all configuration for user ${user_id}`);

    res.json({
      success: true,
      message: 'User configuration and data deleted successfully'
    });

  } catch (error) {
    console.error('Delete user config error:', error);
    res.status(500).json({ 
      error: 'Failed to delete user configuration',
      message: error.message 
    });
  }
});

/**
 * GET /api/user/setup-status/:user_id
 * Get setup completion status for a user
 */
router.get('/setup-status/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data: userConfig, error } = await req.supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const steps = {
      step1_telegram_bot: !!(userConfig?.telegram_bot_token),
      step2_gemini_api: !!(userConfig?.gemini_api_key),
      step3_google_sheets: !!(userConfig?.google_access_token && userConfig?.google_refresh_token)
    };

    const completedSteps = Object.values(steps).filter(Boolean).length;
    const isComplete = completedSteps === 3;

    res.json({
      steps,
      completed_steps: completedSteps,
      total_steps: 3,
      is_complete: isComplete,
      next_step: isComplete ? null : `step${completedSteps + 1}`
    });

  } catch (error) {
    console.error('Get setup status error:', error);
    res.status(500).json({ 
      error: 'Failed to get setup status',
      message: error.message 
    });
  }
});

export default router;