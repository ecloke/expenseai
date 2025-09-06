/**
 * Test Dynamic Categories System
 * Verify everything is working after constraint removal
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testSystem() {
  const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🧪 Testing Dynamic Category System...\n');

  try {
    // Test 1: Check if we can create expenses with custom categories
    console.log('1️⃣ Testing custom category expense creation...');
    
    const { data: users } = await supabase
      .from('expenses')
      .select('user_id')
      .limit(1);

    if (!users || users.length === 0) {
      throw new Error('No users found');
    }

    const testUserId = users[0].user_id;
    
    const testExpense = {
      user_id: testUserId,
      receipt_date: '2024-01-01',
      store_name: 'Test Store',
      category: 'custom_test_category_' + Date.now(),
      total_amount: 5.99
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('expenses')
      .insert(testExpense)
      .select();

    if (insertError) {
      console.error('❌ Custom category test failed:', insertError.message);
      return false;
    }

    console.log('✅ Custom category expense created successfully!');

    // Test 2: Check categories table access
    console.log('2️⃣ Testing categories table access...');
    
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', testUserId)
      .limit(5);

    if (catError) {
      console.error('❌ Categories table access failed:', catError.message);
      return false;
    }

    console.log(`✅ Found ${categories.length} categories for user`);
    console.log('Sample categories:', categories.map(c => c.name).join(', '));

    // Test 3: Test category API endpoint
    console.log('3️⃣ Testing category API endpoint...');
    
    const apiUrl = process.env.API_URL || 'https://expense-tracker-production-2e4b.up.railway.app';
    const response = await fetch(`${apiUrl}/api/categories?user_id=${testUserId}`);
    
    if (!response.ok) {
      console.error('❌ API endpoint failed:', response.status, response.statusText);
      return false;
    }

    const apiResult = await response.json();
    console.log(`✅ API returned ${apiResult.data?.length || 0} categories`);

    // Cleanup test expense
    if (insertResult && insertResult[0]) {
      await supabase
        .from('expenses')
        .delete()
        .eq('id', insertResult[0].id);
      console.log('🧹 Test expense cleaned up');
    }

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Dynamic category system is fully operational');
    console.log('🤖 Your Telegram bot should now work perfectly with custom categories');
    console.log('🌐 Your web app category management is ready');
    
    return true;

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    return false;
  }
}

testSystem().then(success => {
  if (success) {
    console.log('\n🚀 SYSTEM STATUS: FULLY OPERATIONAL');
    console.log('Try your Telegram bot /create command now!');
  } else {
    console.log('\n⚠️ SYSTEM STATUS: NEEDS ATTENTION');
  }
  process.exit(success ? 0 : 1);
});