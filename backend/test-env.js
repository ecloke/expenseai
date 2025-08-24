// Set environment variables
process.env.TELEGRAM_BOT_TOKEN = '8250220466:AAHyX8-uUJM10H2qtynL24ySOlhtUP_bCjI';
process.env.SUPABASE_URL = 'https://nhndnotqgddmcjbgmxtj.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obmRub3RxZ2RkbWNqYmdteHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI3NTAsImV4cCI6MjA3MTQwODc1MH0.lEM77-de5z_TQi3Z8sqoXg5PIi7_sH5pJk-DT7PvyJ4';
process.env.GEMINI_API_KEY = 'AIzaSyBNkwWUMB4x0XZ1vI6su_bLxO34QTn2DJA';
process.env.NODE_ENV = 'development';

import TelegramBot from 'node-telegram-bot-api';
import BotManager from './src/services/BotManager.js';
import { createClient } from '@supabase/supabase-js';

const token = '8250220466:AAHyX8-uUJM10H2qtynL24ySOlhtUP_bCjI';
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