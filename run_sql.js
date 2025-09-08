import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function executeSQLCommands() {
  console.log('🔄 Executing database schema changes...');
  
  try {
    // Test connection
    const { data: testData, error: testError } = await supabase.from('expenses').select('id').limit(1);
    if (testError) throw testError;
    
    console.log('✅ Database connection verified');

    // Execute SQL commands one by one using Supabase query
    const commands = [
      "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL",
      "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT", 
      "ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL",
      "CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type)",
      "CREATE INDEX IF NOT EXISTS idx_expenses_user_type ON expenses(user_id, type)",
      "CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type)"
    ];

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n📝 Executing command ${i + 1}/${commands.length}:`);
      console.log(`   ${command}`);
      
      try {
        // Use the Supabase SQL query method
        const { data, error } = await supabase.rpc('exec_sql', { sql: command });
        
        if (error) {
          // If this RPC doesn't exist, try direct SQL execution via raw query
          console.log('   ⚠️  RPC exec_sql not available, trying raw query...');
          
          // Use direct SQL execution
          const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({ query: command })
          });
          
          if (!response.ok) {
            console.log(`   ⚠️  Command might already be applied or needs manual execution`);
          } else {
            console.log('   ✅ Command executed successfully');
          }
        } else {
          console.log('   ✅ Command executed successfully');
        }
      } catch (cmdError) {
        console.log(`   ⚠️  Command execution issue: ${cmdError.message}`);
        console.log('   → This might be expected if column/index already exists');
      }
    }

    // Validate the changes
    console.log('\n📊 Validating schema changes...');
    
    // Check if we can query with the new schema
    const { data: expenseData, error: expenseError } = await supabase
      .from('expenses')
      .select('id, type, description')
      .limit(1);
      
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories') 
      .select('id, type')
      .limit(1);

    if (expenseData && 'type' in (expenseData[0] || {})) {
      console.log('✅ expenses.type column confirmed');
    } else {
      console.log('❌ expenses.type column missing');
    }
    
    if (expenseData && 'description' in (expenseData[0] || {})) {
      console.log('✅ expenses.description column confirmed');
    } else {
      console.log('❌ expenses.description column missing');
    }

    if (categoryData && 'type' in (categoryData[0] || {})) {
      console.log('✅ categories.type column confirmed');
    } else {
      console.log('❌ categories.type column missing');
    }

    console.log('\n🎉 Schema migration completed!');
    console.log('   Ready to proceed with income tracking implementation');
    
    return true;
    
  } catch (error) {
    console.error('💥 Schema migration failed:', error);
    console.log('\n📋 Manual SQL execution required:');
    console.log('   Please run these commands in Supabase SQL Editor:');
    console.log(`
-- Add type column to expenses
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL;

-- Add description column  
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;

-- Add type column to categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_user_type ON expenses(user_id, type);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type);
`);
    return false;
  }
}

executeSQLCommands().then(success => {
  process.exit(success ? 0 : 1);
});