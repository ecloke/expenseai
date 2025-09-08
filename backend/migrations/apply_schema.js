import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applySchema() {
  console.log('🔄 Applying schema changes for income tracking...');

  try {
    // Use raw SQL query through the PostgREST API
    const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        sql: "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL;"
      })
    });

    if (response.ok) {
      console.log('✅ First ALTER executed successfully');
    } else {
      console.log('⚠️  First ALTER might have failed, continuing...');
    }

    // Continue with other operations...
    console.log('🔧 Since direct SQL execution is challenging, I will proceed');
    console.log('   with application-level changes that will work with existing schema');
    console.log('   and handle the missing columns gracefully.');

    // For now, let's validate we can still access the data
    const { data: expenses, error: expenseError } = await supabase
      .from('expenses')
      .select('id, user_id, category_id')
      .limit(5);

    if (expenseError) {
      throw new Error(`Cannot access expenses: ${expenseError.message}`);
    }

    const { data: categories, error: categoryError } = await supabase
      .from('categories')
      .select('id, user_id, name')
      .limit(5);

    if (categoryError) {
      throw new Error(`Cannot access categories: ${categoryError.message}`);
    }

    console.log(`✅ Validated access to ${expenses?.length || 0} expenses and ${categories?.length || 0} categories`);
    
    console.log('\n🎯 MANUAL STEP REQUIRED:');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('----------------------------------------------');
    console.log(`
-- Phase 1: Add type support to existing tables
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL;

-- Phase 2: Add constraints
ALTER TABLE expenses ADD CONSTRAINT IF NOT EXISTS chk_transaction_type CHECK (type IN ('expense', 'income'));
ALTER TABLE categories ADD CONSTRAINT IF NOT EXISTS chk_category_type CHECK (type IN ('expense', 'income'));

-- Phase 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_expenses_type ON expenses(type);
CREATE INDEX IF NOT EXISTS idx_expenses_user_type ON expenses(user_id, type);
CREATE INDEX IF NOT EXISTS idx_categories_user_type ON categories(user_id, type);
`);
    console.log('----------------------------------------------');

    return true;

  } catch (error) {
    console.error('💥 Schema application failed:', error.message);
    return false;
  }
}

applySchema().then(success => {
  if (success) {
    console.log('\n✅ Ready to proceed with application code changes');
    console.log('   After running the SQL manually, the system will support income tracking');
  }
  process.exit(success ? 0 : 1);
});