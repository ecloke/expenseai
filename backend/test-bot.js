import TelegramBot from 'node-telegram-bot-api';

const token = '***REMOVED***';
const chatId = '7867480884'; // Your chat ID from the error log

const bot = new TelegramBot(token);

async function testBot() {
  try {
    console.log('🤖 Testing Telegram bot...');
    
    // Test 1: Simple message
    console.log('📤 Sending test message...');
    await bot.sendMessage(chatId, 'Test message from Claude - bot is working! 🚀');
    console.log('✅ Simple message sent successfully');
    
    // Test 2: Summary command simulation
    console.log('📤 Testing summary format...');
    const testSummary = `📊 *Test Summary*
💰 Total: $645.90
📋 Transactions: 4

🥧 *Category Breakdown:*
🍽️ Dining: $610.1 (94.5%)
🛒 Groceries: $35.8 (5.5%)

🏪 *Top 5 Stores:*
1. Peng Chu: $295.8 (1 visits)
2. Peng Chu Mid Valley: $295.8 (1 visits)
3. Tesco Express: $35.8 (1 visits)
4. Starbucks Coffee: $18.5 (1 visits)`;
    
    await bot.sendMessage(chatId, testSummary, { parse_mode: 'Markdown' });
    console.log('✅ Summary format sent successfully');
    
    console.log('🎉 All tests passed! Bot is working correctly.');
    
  } catch (error) {
    console.error('❌ Bot test failed:', error.message);
    console.error('Full error:', error);
  }
}

testBot();