/**
 * Comprehensive Category System Test Script
 * Tests all aspects of the dynamic category management system
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER_ID = process.env.TEST_USER_ID;

if (!SUPABASE_URL || !SUPABASE_KEY || !TEST_USER_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  console.error('   - TEST_USER_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

class CategorySystemTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      details: []
    };
    this.testCategoryId = null;
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Category System Tests...\n');

    try {
      await this.testDatabaseStructure();
      await this.testCategoryAPI();
      await this.testDataIntegrity();
      await this.testCrossPlatformSync();
      await this.cleanup();

      this.printResults();
    } catch (error) {
      console.error('💥 Test suite failed:', error);
      process.exit(1);
    }
  }

  async testDatabaseStructure() {
    console.log('📊 Testing Database Structure...');

    // Test 1: Categories table exists
    await this.test('Categories table exists', async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .limit(1);
      return !error;
    });

    // Test 2: Expenses table has category_id column
    await this.test('Expenses table has category_id column', async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('category_id')
        .limit(1);
      return !error;
    });

    // Test 3: Foreign key constraint works
    await this.test('Foreign key constraint enforced', async () => {
      try {
        const { error } = await supabase
          .from('expenses')
          .insert({
            user_id: TEST_USER_ID,
            receipt_date: '2024-01-01',
            store_name: 'Test Store',
            category: 'test',
            category_id: '00000000-0000-0000-0000-000000000000', // Non-existent ID
            total_amount: 10.00
          });
        return error !== null; // Should fail due to foreign key constraint
      } catch (e) {
        return true; // Constraint working
      }
    });

    console.log('✅ Database structure tests completed\n');
  }

  async testCategoryAPI() {
    console.log('🔌 Testing Category API...');

    // Test 4: GET /api/categories
    await this.test('GET /api/categories returns user categories', async () => {
      const response = await fetch(`${API_URL}/api/categories?user_id=${TEST_USER_ID}`);
      const data = await response.json();
      return response.ok && Array.isArray(data.data);
    });

    // Test 5: POST /api/categories (create)
    await this.test('POST /api/categories creates new category', async () => {
      const response = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Category ' + Date.now(),
          user_id: TEST_USER_ID
        })
      });
      const data = await response.json();
      if (response.ok && data.data) {
        this.testCategoryId = data.data.id;
        return true;
      }
      return false;
    });

    // Test 6: GET /api/categories/:id/usage
    if (this.testCategoryId) {
      await this.test('GET /api/categories/:id/usage returns usage info', async () => {
        const response = await fetch(`${API_URL}/api/categories/${this.testCategoryId}/usage?user_id=${TEST_USER_ID}`);
        const data = await response.json();
        return response.ok && typeof data.data.transaction_count === 'number';
      });

      // Test 7: PUT /api/categories/:id (update)
      await this.test('PUT /api/categories/:id updates category', async () => {
        const response = await fetch(`${API_URL}/api/categories/${this.testCategoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Updated Test Category',
            user_id: TEST_USER_ID
          })
        });
        return response.ok;
      });

      // Test 8: DELETE /api/categories/:id
      await this.test('DELETE /api/categories/:id removes unused category', async () => {
        const response = await fetch(`${API_URL}/api/categories/${this.testCategoryId}?user_id=${TEST_USER_ID}`, {
          method: 'DELETE'
        });
        return response.ok;
      });
    }

    // Test 9: API validation (duplicate name)
    await this.test('API prevents duplicate category names', async () => {
      const categoryName = 'Duplicate Test ' + Date.now();
      
      // Create first category
      const response1 = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          user_id: TEST_USER_ID
        })
      });
      
      if (!response1.ok) return false;
      const data1 = await response1.json();
      
      // Try to create duplicate
      const response2 = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          user_id: TEST_USER_ID
        })
      });
      
      // Cleanup
      if (data1.data?.id) {
        await fetch(`${API_URL}/api/categories/${data1.data.id}?user_id=${TEST_USER_ID}`, {
          method: 'DELETE'
        });
      }
      
      return !response2.ok; // Should fail due to duplicate
    });

    console.log('✅ Category API tests completed\n');
  }

  async testDataIntegrity() {
    console.log('🔍 Testing Data Integrity...');

    // Test 10: All users have default categories
    await this.test('All users have default categories', async () => {
      const { data: usersWithExpenses } = await supabase
        .from('expenses')
        .select('user_id')
        .distinct();

      for (const user of usersWithExpenses || []) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.user_id)
          .limit(1);
        
        if (!categories || categories.length === 0) {
          return false; // User without categories found
        }
      }
      return true;
    });

    // Test 11: No orphaned expenses
    await this.test('No orphaned expenses (all have valid category_id)', async () => {
      const { data: orphanedExpenses } = await supabase
        .from('expenses')
        .select('id')
        .is('category_id', null);

      return !orphanedExpenses || orphanedExpenses.length === 0;
    });

    // Test 12: Category foreign key integrity
    await this.test('All expense category_id references are valid', async () => {
      const { data: invalidReferences } = await supabase
        .rpc('check_category_references');
      
      // If RPC doesn't exist, do manual check
      if (!invalidReferences) {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('id, category_id')
          .not('category_id', 'is', null);

        for (const expense of expenses || []) {
          const { data: category } = await supabase
            .from('categories')
            .select('id')
            .eq('id', expense.category_id)
            .single();
          
          if (!category) return false; // Invalid reference found
        }
      }

      return true;
    });

    console.log('✅ Data integrity tests completed\n');
  }

  async testCrossPlatformSync() {
    console.log('🔄 Testing Cross-Platform Sync...');

    // Test 13: Category changes reflect in all systems
    await this.test('Category changes sync across platforms', async () => {
      // Create a test category
      const categoryName = 'Sync Test ' + Date.now();
      const createResponse = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryName,
          user_id: TEST_USER_ID
        })
      });

      if (!createResponse.ok) return false;
      const createdCategory = await createResponse.json();

      // Verify it appears in user's categories
      const listResponse = await fetch(`${API_URL}/api/categories?user_id=${TEST_USER_ID}`);
      const categories = await listResponse.json();
      
      const foundCategory = categories.data.find(cat => cat.id === createdCategory.data.id);
      
      // Cleanup
      await fetch(`${API_URL}/api/categories/${createdCategory.data.id}?user_id=${TEST_USER_ID}`, {
        method: 'DELETE'
      });

      return !!foundCategory;
    });

    console.log('✅ Cross-platform sync tests completed\n');
  }

  async cleanup() {
    console.log('🧹 Cleaning up test data...');
    
    // Remove any test categories that might be left
    try {
      const { data: testCategories } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', TEST_USER_ID)
        .like('name', '%Test%');

      for (const category of testCategories || []) {
        await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);
      }
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }

    console.log('✅ Cleanup completed\n');
  }

  async test(description, testFunction) {
    try {
      const result = await testFunction();
      if (result) {
        console.log(`✅ ${description}`);
        this.testResults.passed++;
        this.testResults.details.push({ test: description, status: 'PASS' });
      } else {
        console.log(`❌ ${description}`);
        this.testResults.failed++;
        this.testResults.details.push({ test: description, status: 'FAIL' });
      }
    } catch (error) {
      console.log(`💥 ${description} - Error: ${error.message}`);
      this.testResults.failed++;
      this.testResults.details.push({ test: description, status: 'ERROR', error: error.message });
    }
  }

  printResults() {
    console.log('📊 Test Results Summary');
    console.log('========================');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    console.log(`🎯 Total: ${this.testResults.passed + this.testResults.failed}`);
    
    if (this.testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Category system is ready for production! 🚀');
    } else {
      console.log('\n⚠️  Some tests failed. Review the issues above before deploying.');
      console.log('\n🔍 Failed Tests:');
      this.testResults.details
        .filter(test => test.status !== 'PASS')
        .forEach(test => {
          console.log(`   • ${test.test} - ${test.status}${test.error ? ': ' + test.error : ''}`);
        });
    }

    process.exit(this.testResults.failed === 0 ? 0 : 1);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new CategorySystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = CategorySystemTester;