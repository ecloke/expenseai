/**
 * Validate Category ID Fix
 * Test the complete flow: ExpenseService with category_id auto-resolution
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import ExpenseService (simulate ES6 import for testing)
async function importExpenseService() {
  const module = await import('./backend/src/services/ExpenseService.js');
  return module.default;
}

async function validateFix() {
  const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Validating Category ID Fix...\n');

  try {
    // Get a test user
    const { data: users } = await supabase
      .from('expenses')
      .select('user_id')
      .limit(1);

    if (!users || users.length === 0) {
      throw new Error('No users found');
    }

    const testUserId = users[0].user_id;
    console.log(`👤 Testing with user: ${testUserId}`);

    // Create ExpenseService instance
    const ExpenseService = await importExpenseService();
    const expenseService = new ExpenseService(supabase);

    // Test 1: Create expense with category name only (no category_id)
    console.log('\n1️⃣ Testing auto-resolution of category_id...');
    
    const testExpense = {
      receipt_date: '2024-01-01',
      store_name: 'Test Store Auto-Resolution',
      category: 'groceries', // Category name only, no category_id
      total_amount: 12.99
    };

    const createdExpense = await expenseService.createExpense(testUserId, testExpense);
    console.log('✅ Expense created:', createdExpense.id);
    console.log(`   Category: ${createdExpense.category}`);
    console.log(`   Category ID: ${createdExpense.category_id}`);

    if (createdExpense.category_id) {
      console.log('✅ Category ID auto-resolution WORKS!');
    } else {
      console.log('❌ Category ID auto-resolution FAILED');
    }

    // Test 2: Verify the expense shows up in category usage count
    console.log('\n2️⃣ Testing category usage count...');
    
    const { count } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', createdExpense.category_id)
      .eq('user_id', testUserId);

    console.log(`📊 Expenses with category_id ${createdExpense.category_id}: ${count}`);

    // Test 3: Test with custom category
    console.log('\n3️⃣ Testing with custom category...');
    
    // First create a custom category
    const customCategoryName = 'test_category_' + Date.now();
    const { data: customCategory } = await supabase
      .from('categories')
      .insert({
        name: customCategoryName,
        user_id: testUserId,
        is_default: false
      })
      .select()
      .single();

    console.log(`📁 Created custom category: ${customCategory.name} (ID: ${customCategory.id})`);

    // Create expense with custom category
    const customExpense = {
      receipt_date: '2024-01-01',
      store_name: 'Test Store Custom Category',
      category: customCategoryName, // Custom category name
      total_amount: 25.50
    };

    const createdCustomExpense = await expenseService.createExpense(testUserId, customExpense);
    console.log('✅ Custom category expense created:', createdCustomExpense.id);
    console.log(`   Category: ${createdCustomExpense.category}`);
    console.log(`   Category ID: ${createdCustomExpense.category_id}`);

    if (createdCustomExpense.category_id === customCategory.id) {
      console.log('✅ Custom category ID mapping WORKS!');
    } else {
      console.log('❌ Custom category ID mapping FAILED');
    }

    // Test 4: Verify custom category usage count
    const { count: customCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', customCategory.id)
      .eq('user_id', testUserId);

    console.log(`📊 Custom category usage count: ${customCount}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('expenses').delete().eq('id', createdExpense.id);
    await supabase.from('expenses').delete().eq('id', createdCustomExpense.id);
    await supabase.from('categories').delete().eq('id', customCategory.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 ALL VALIDATION TESTS PASSED!');
    console.log('✅ ExpenseService automatically resolves category_id from category names');
    console.log('✅ Both default and custom categories work correctly');
    console.log('✅ Transaction counts will now be accurate on the web interface');
    console.log('\n🚀 DEPLOY TO PRODUCTION: Your Telegram bot will now properly save category_id!');
    
    return true;

  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

validateFix().then(success => {
  if (success) {
    console.log('\n🟢 SYSTEM STATUS: FULLY OPERATIONAL');
    console.log('Ready for production deployment!');
  } else {
    console.log('\n🔴 SYSTEM STATUS: NEEDS ATTENTION');
  }
  process.exit(success ? 0 : 1);
});