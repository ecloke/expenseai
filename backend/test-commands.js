import TelegramBot from 'node-telegram-bot-api';
import BotManager from './src/services/BotManager.js';
import { createClient } from '@supabase/supabase-js';

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const bot = new TelegramBot(token);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCommands() {
  try {
    console.log('🤖 Testing BotManager commands...');
    
    const botManager = new BotManager();
    await botManager.initialize();
    console.log('✅ BotManager initialized');
    
    // Test /summary month command
    console.log('📤 Testing /summary month command...');
    const summaryResult = await botManager.handleSummaryCommand(chatId, 'month');
    console.log('📊 Summary result:', summaryResult);
    
    if (summaryResult && typeof summaryResult === 'string' && summaryResult.length > 0) {
      console.log('✅ Summary command returned valid string');
      
      // Send the actual result to Telegram
      await bot.sendMessage(chatId, summaryResult, { parse_mode: 'Markdown' });
      console.log('✅ Summary sent to Telegram successfully');
    } else {
      console.error('❌ Summary command returned invalid result:', summaryResult);
    }
    
    // Test /help command
    console.log('📤 Testing help message...');
    const helpMessage = botManager.getHelpMessage();
    console.log('✅ Help message generated');
    
    await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
    console.log('✅ Help message sent successfully');
    
    console.log('🎉 All command tests completed!');
    
  } catch (error) {
    console.error('❌ Command test failed:', error);
    
    // Send error to Telegram for debugging
    await bot.sendMessage(chatId, `❌ Test failed: ${error.message}`);
  }
}

testCommands();