// Set environment variables
// Environment variables should be set in your .env file
// process.env.TELEGRAM_BOT_TOKEN = 'your_telegram_bot_token';
// process.env.SUPABASE_URL = 'your_supabase_url';
// process.env.SUPABASE_ANON_KEY = 'your_supabase_anon_key';
// process.env.GEMINI_API_KEY = 'your_gemini_api_key';
process.env.NODE_ENV = 'development';

import TelegramBot from 'node-telegram-bot-api';
import BotManager from './src/services/BotManager.js';
import { createClient } from '@supabase/supabase-js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = '7867480884';
// Use the actual UUID from your database
const actualUserId = 'e14e9872-50ad-4510-8379-18fa022a598e';

const bot = new TelegramBot(token);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testWithCorrectUUID() {
  try {
    console.log('🧪 Testing with correct UUID from database...');
    console.log('📧 User ID:', actualUserId);
    
    const botManager = new BotManager(supabase);
    await botManager.initialize();
    console.log('✅ BotManager initialized successfully');
    
    // Test /summary month command with the correct UUID
    console.log('📤 Testing /summary month command with correct UUID...');
    const summaryResult = await botManager.handleSummaryCommand(actualUserId, ['month']);
    console.log('📊 Summary result type:', typeof summaryResult);
    console.log('📊 Summary result length:', summaryResult?.length);
    
    if (summaryResult && typeof summaryResult === 'string' && summaryResult.length > 0) {
      console.log('✅ Summary command returned valid string');
      
      // Show first 300 characters
      console.log('📄 Summary preview:', summaryResult.substring(0, 300) + '...');
      
      // Send the actual result to Telegram
      await bot.sendMessage(chatId, summaryResult, { parse_mode: 'Markdown' });
      console.log('✅ Summary sent to Telegram successfully');
    } else {
      console.error('❌ Summary command returned invalid result:', summaryResult);
    }
    
    console.log('🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error stack:', error.stack);
    
    // Send error to Telegram
    await bot.sendMessage(chatId, `❌ Test with UUID failed: ${error.message}`);
  }
}

testWithCorrectUUID();