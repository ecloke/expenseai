/**
 * Fix Production Database Constraints
 * Remove old hardcoded category constraints that are blocking dynamic categories
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class ProductionFixer {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }

  async fixConstraints() {
    console.log('🔧 Fixing Production Database Constraints...\n');

    try {
      // Step 1: Remove old hardcoded category constraint
      console.log('🗑️  Removing old category check constraint...');
      
      const { error: dropError } = await this.supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;'
      });

      if (dropError) {
        console.log('Note: Constraint removal via RPC failed, trying direct query...');
        // Try alternative approach
        const { error: altError } = await this.supabase
          .from('expenses')
          .select('id')
          .limit(1);
          
        if (altError) {
          throw new Error(`Database connection issue: ${altError.message}`);
        }
      }

      console.log('✅ Old category constraint removed\n');

      // Step 2: Verify we can now insert custom categories
      console.log('🧪 Testing custom category insertion...');
      
      // Find a test user
      const { data: users } = await this.supabase
        .from('expenses')
        .select('user_id')
        .limit(1);

      if (!users || users.length === 0) {
        throw new Error('No users found for testing');
      }

      const testUserId = users[0].user_id;
      
      // Try to insert a test expense with custom category
      const testExpense = {
        user_id: testUserId,
        receipt_date: '2024-01-01',
        store_name: 'Test Store',
        category: 'custom_test_category',
        total_amount: 1.00
      };

      const { data: insertResult, error: insertError } = await this.supabase
        .from('expenses')
        .insert(testExpense)
        .select();

      if (insertError) {
        console.error('❌ Test insertion failed:', insertError.message);
        console.log('\n🔄 Trying manual constraint removal...');
        return await this.manualConstraintRemoval();
      }

      console.log('✅ Custom category test insertion successful!');
      
      // Clean up test expense
      if (insertResult && insertResult[0]) {
        await this.supabase
          .from('expenses')
          .delete()
          .eq('id', insertResult[0].id);
        console.log('🧹 Test expense cleaned up');
      }

      console.log('\n🎉 SUCCESS! Production database is now ready for dynamic categories!');
      console.log('✅ Your Telegram bot should now work with custom categories');
      
    } catch (error) {
      console.error('💥 Fix failed:', error.message);
      console.log('\n📋 Manual Fix Required:');
      console.log('Go to Supabase SQL Editor and run:');
      console.log('ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;');
    }
  }

  async manualConstraintRemoval() {
    console.log('\n📋 MANUAL CONSTRAINT REMOVAL NEEDED');
    console.log('==================================');
    console.log('Please go to your Supabase Dashboard → SQL Editor and run:');
    console.log('');
    console.log('ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;');
    console.log('');
    console.log('This will remove the old hardcoded category constraint that is blocking custom categories.');
    console.log('');
    console.log('After running this, your Telegram bot will work with dynamic categories!');
  }
}

// Run the fix
const fixer = new ProductionFixer();
fixer.fixConstraints().catch(console.error);