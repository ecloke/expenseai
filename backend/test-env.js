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

const bot = new TelegramBot(token);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function testCommands() {
  try {
    console.log('🤖 Testing BotManager with environment variables...');
    
    const botManager = new BotManager(supabase);
    await botManager.initialize();
    console.log('✅ BotManager initialized successfully');
    
    // Test /summary month command
    console.log('📤 Testing /summary month command...');
    const summaryResult = await botManager.handleSummaryCommand(chatId, ['month']);
    console.log('📊 Summary result type:', typeof summaryResult);
    console.log('📊 Summary result length:', summaryResult?.length);
    
    if (summaryResult && typeof summaryResult === 'string' && summaryResult.length > 0) {
      console.log('✅ Summary command returned valid string');
      
      // Show first 200 characters for debugging
      console.log('📄 Summary preview:', summaryResult.substring(0, 200) + '...');
      
      // Send the actual result to Telegram
      await bot.sendMessage(chatId, summaryResult, { parse_mode: 'Markdown' });
      console.log('✅ Summary sent to Telegram successfully');
    } else {
      console.error('❌ Summary command returned invalid result:', summaryResult);
    }
    
    // Test other periods
    console.log('📤 Testing /summary day command...');
    const dayResult = await botManager.handleSummaryCommand(chatId, ['day']);
    await bot.sendMessage(chatId, dayResult, { parse_mode: 'Markdown' });
    console.log('✅ Day summary sent');
    
    console.log('📤 Testing /summary week command...');
    const weekResult = await botManager.handleSummaryCommand(chatId, ['week']);
    await bot.sendMessage(chatId, weekResult, { parse_mode: 'Markdown' });
    console.log('✅ Week summary sent');
    
    console.log('🎉 All command tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Command test failed:', error);
    console.error('Error stack:', error.stack);
    
    // Send error to Telegram for debugging
    await bot.sendMessage(chatId, `❌ Test failed: ${error.message}`);
  }
}

testCommands();