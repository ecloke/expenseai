import express from 'express';
import { google } from 'googleapis';
import { encrypt } from '../utils/encryption.js';

const router = express.Router();

/**
 * Google OAuth routes for Sheets integration
 */

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

/**
 * GET /api/auth/google
 * Start Google OAuth flow
 */
router.get('/google', async (req, res) => {
  try {
    const { user_id } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Generate OAuth URL with required scopes
    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.file'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: user_id, // Pass user_id in state for callback
      prompt: 'consent' // Force consent to get refresh token
    });

    res.json({ 
      authUrl,
      message: 'Redirect user to this URL for Google authorization'
    });

  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ 
      error: 'Failed to generate authorization URL',
      message: error.message 
    });
  }
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state: userId, error } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/setup?error=oauth_denied`);
    }

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/setup?error=no_code`);
    }

    if (!userId) {
      return res.redirect(`${process.env.FRONTEND_URL}/setup?error=no_user_id`);
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain required tokens');
    }

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    // Store tokens in user config
    const { error: updateError } = await req.supabase
      .from('user_configs')
      .update({
        google_access_token: encryptedAccessToken,
        google_refresh_token: encryptedRefreshToken,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to store tokens: ${updateError.message}`);
    }

    console.log(`✅ Google OAuth completed for user ${userId}`);

    // Redirect back to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/setup?step=3&success=google_connected`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/setup?error=oauth_failed`);
  }
});

/**
 * POST /api/auth/google/test
 * Test Google Sheets access for a user
 */
router.post('/google/test', async (req, res) => {
  try {
    const { user_id, sheet_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user config with tokens
    const { data: userConfig, error } = await req.supabase
      .from('user_configs')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (error || !userConfig) {
      return res.status(404).json({ error: 'User configuration not found' });
    }

    if (!userConfig.google_access_token || !userConfig.google_refresh_token) {
      return res.status(400).json({ error: 'Google authentication required' });
    }

    // Test sheet access
    const SheetsService = (await import('../services/SheetsService.js')).default;
    const sheetsService = new SheetsService(req.supabase);
    
    await sheetsService.initializeForUser(userConfig);
    
    let testResult;
    if (sheet_id) {
      // Test specific sheet
      testResult = await sheetsService.testSheetAccess(sheet_id);
    } else {
      // Just test authentication
      testResult = {
        success: true,
        message: 'Google authentication successful'
      };
    }

    res.json({
      success: testResult.success,
      message: testResult.message,
      sheetInfo: testResult.sheetTitle ? {
        title: testResult.sheetTitle,
        url: testResult.url
      } : null
    });

  } catch (error) {
    console.error('Google auth test error:', error);
    res.status(500).json({ 
      error: 'Authentication test failed',
      message: error.message 
    });
  }
});

/**
 * POST /api/auth/google/create-sheet
 * Create a new expense tracking sheet for user
 */
router.post('/google/create-sheet', async (req, res) => {
  try {
    const { user_id, sheet_name } = req.body;

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

    // Initialize sheets service
    const SheetsService = (await import('../services/SheetsService.js')).default;
    const sheetsService = new SheetsService(req.supabase);
    await sheetsService.initializeForUser(userConfig);

    // Create new spreadsheet
    const drive = google.drive({ version: 'v3', auth: sheetsService.auth });
    
    const response = await drive.files.create({
      requestBody: {
        name: sheet_name || 'Expense Tracker',
        mimeType: 'application/vnd.google-apps.spreadsheet'
      }
    });

    const sheetId = response.data.id;

    // Set up expense sheet with headers
    await sheetsService.createExpenseSheet(sheetId, 'Expenses');

    // Update user config with sheet ID
    const { error: updateError } = await req.supabase
      .from('user_configs')
      .update({
        google_sheet_id: sheetId,
        sheet_name: sheet_name || 'Expense Tracker',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (updateError) {
      throw new Error(`Failed to update user config: ${updateError.message}`);
    }

    res.json({
      success: true,
      sheet_id: sheetId,
      sheet_url: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      message: 'Expense tracking sheet created successfully'
    });

  } catch (error) {
    console.error('Error creating sheet:', error);
    res.status(500).json({ 
      error: 'Failed to create expense sheet',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/auth/google/disconnect
 * Disconnect Google OAuth for a user
 */
router.delete('/google/disconnect', async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Clear Google tokens from user config
    const { error } = await req.supabase
      .from('user_configs')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_sheet_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user_id);

    if (error) {
      throw new Error(`Failed to disconnect Google: ${error.message}`);
    }

    res.json({
      success: true,
      message: 'Google account disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting Google:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect Google account',
      message: error.message 
    });
  }
});

export default router;