// Set environment variables
process.env.TELEGRAM_BOT_TOKEN = '***REMOVED***';
process.env.SUPABASE_URL = '***REMOVED***';
process.env.SUPABASE_ANON_KEY = '***REMOVED***';
process.env.GEMINI_API_KEY = '***REMOVED***';
process.env.NODE_ENV = 'development';

import TelegramBot from 'node-telegram-bot-api';
import BotManager from './src/services/BotManager.js';
import { createClient } from '@supabase/supabase-js';

const token = '***REMOVED***';
const chatId = '7867480884';
// Use the ACTUAL user_id from expenses table
const correctUserId = 'b7ca3422-ae4e-45ea-a561-df1a8ed81edb';

const bot = new TelegramBot(token);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testWithRealUser() {
  try {
    console.log('🧪 Testing with REAL user_id from expenses table...');
    console.log('📧 User ID:', correctUserId);
    
    const botManager = new BotManager(supabase);
    await botManager.initialize();
    console.log('✅ BotManager initialized successfully');
    
    // Test /summary month command with the correct user_id
    console.log('📤 Testing /summary month command with REAL user_id...');
    const summaryResult = await botManager.handleSummaryCommand(correctUserId, ['month']);
    console.log('📊 Summary result type:', typeof summaryResult);
    console.log('📊 Summary result length:', summaryResult?.length);
    
    if (summaryResult && typeof summaryResult === 'string' && summaryResult.length > 0) {
      console.log('✅ Summary command returned valid string');
      
      // Show the full summary
      console.log('📄 Full Summary:');
      console.log(summaryResult);
      
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
    await bot.sendMessage(chatId, `❌ Test with real user failed: ${error.message}`);
  }
}

testWithRealUser();