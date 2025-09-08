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

async function runMigration() {
  console.log('🔄 Running database migration for income tracking...');

  try {
    // Test connection first
    const { data: testData, error: testError } = await supabase
      .from('expenses')
      .select('id')
      .limit(1);

    if (testError) {
      throw new Error(`Connection failed: ${testError.message}`);
    }
    console.log('✅ Database connection successful');

    // Check current schema
    const { data: expenseColumns, error: expenseSchemaError } = await supabase
      .from('expenses')
      .select('*')
      .limit(1)
      .single();

    if (!expenseSchemaError && expenseColumns) {
      console.log('📊 Current expense table columns:', Object.keys(expenseColumns));
      
      // Check if type column exists
      if ('type' in expenseColumns) {
        console.log('✅ Type column already exists in expenses table');
      } else {
        console.log('❌ Type column missing from expenses table');
      }
    }

    // Check categories table
    const { data: categoryColumns, error: categorySchemaError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)
      .single();

    if (!categorySchemaError && categoryColumns) {
      console.log('📊 Current categories table columns:', Object.keys(categoryColumns));
      
      if ('type' in categoryColumns) {
        console.log('✅ Type column already exists in categories table');
      } else {
        console.log('❌ Type column missing from categories table');
      }
    }

    console.log('\n🎉 Migration analysis completed successfully!');
    console.log('   ✅ Database is accessible');
    console.log('   ✅ Current schema analyzed');
    console.log('   📝 Ready to proceed with manual SQL execution');
    
    return true;

  } catch (error) {
    console.error('💥 Migration analysis failed:', error.message);
    return false;
  }
}

runMigration().then(success => {
  process.exit(success ? 0 : 1);
});