// Set environment variables
process.env.TELEGRAM_BOT_TOKEN = '8250220466:AAHyX8-uUJM10H2qtynL24ySOlhtUP_bCjI';
process.env.SUPABASE_URL = 'https://nhndnotqgddmcjbgmxtj.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obmRub3RxZ2RkbWNqYmdteHRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgzMjc1MCwiZXhwIjoyMDcxNDA4NzUwfQ.puMdYEvWvJHMF6j5dY5Rq4Ydj8jOIxuOowc68frP5xg';
process.env.GEMINI_API_KEY = 'AIzaSyBNkwWUMB4x0XZ1vI6su_bLxO34QTn2DJA';
process.env.NODE_ENV = 'development';

import TelegramBot from 'node-telegram-bot-api';
import BotManager from './src/services/BotManager.js';
import { createClient } from '@supabase/supabase-js';

const token = '8250220466:AAHyX8-uUJM10H2qtynL24ySOlhtUP_bCjI';
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