import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nhndnotqgddmcjbgmxtj.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obmRub3RxZ2RkbWNqYmdteHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzI3NTAsImV4cCI6MjA3MTQwODc1MH0.lEM77-de5z_TQi3Z8sqoXg5PIi7_sH5pJk-DT7PvyJ4'
);

async function debugDatabase() {
  console.log('🔍 Investigating database structure...');
  
  // Try to insert a test expense with Telegram chat ID
  console.log('🧪 Testing expense insertion with Telegram chat ID...');
  const { data: expenseTest, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      user_id: '7867480884',
      receipt_date: '2025-01-15',
      store_name: 'Test Store',
      category: 'groceries',
      total_amount: 25.50,
      created_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (expenseError) {
    console.error('❌ Expense insertion failed:', expenseError);
    
    // Try with a proper UUID
    console.log('🧪 Trying expense insertion with UUID...');
    const userId = crypto.randomUUID();
    const { data: uuidExpense, error: uuidError } = await supabase
      .from('expenses')
      .insert({
        user_id: userId,
        receipt_date: '2025-01-15',
        store_name: 'Test Store',
        category: 'groceries',
        total_amount: 25.50,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (uuidError) {
      console.error('❌ UUID expense insertion failed:', uuidError);
    } else {
      console.log('✅ Expense inserted with UUID:', uuidExpense);
      
      // Now test querying with this UUID
      console.log('🔎 Testing expense query with UUID...');
      const { data: queryResult, error: queryError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId);
        
      if (queryError) {
        console.error('❌ Query failed:', queryError);
      } else {
        console.log('✅ Query successful:', queryResult);
      }
    }
  } else {
    console.log('✅ Expense inserted with chat ID:', expenseTest);
  }
  
  // Test user_configs table
  console.log('👥 Testing user_configs table...');
  const { data: userTest, error: userError } = await supabase
    .from('user_configs')
    .insert({
      user_id: '7867480884',
      telegram_token: 'test-token',
      created_at: new Date().toISOString()
    })
    .select()
    .single();
    
  if (userError) {
    console.error('❌ User config insertion failed:', userError);
  } else {
    console.log('✅ User config inserted:', userTest);
  }
}

debugDatabase().catch(console.error);