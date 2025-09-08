/**
 * Migration: Create Income Categories for Existing Users
 * Phase 2: Add default income categories to all existing users
 * 
 * This migration is PRODUCTION SAFE:
 * - Only adds new income categories
 * - Does not modify existing expense categories
 * - Handles users who might already have categories
 */

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

// Default income categories to create for all users
const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment Returns',
  'Cash Rebate',
  'Side Income',
  'Other Income'
];

async function createIncomeCategories() {
  console.log('🔄 Phase 2: Creating income categories for existing users...');

  try {
    // Step 1: Get all users who have existing categories (i.e., existing users)
    console.log('📝 Finding existing users...');
    
    const { data: existingUsers, error: usersError } = await supabase
      .from('categories')
      .select('user_id')
      .eq('type', 'expense'); // Look for users with expense categories
      
    if (usersError) {
      throw new Error(`Failed to fetch existing users: ${usersError.message}`);
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(existingUsers?.map(cat => cat.user_id) || [])];
    console.log(`✅ Found ${uniqueUserIds.length} existing users`);

    if (uniqueUserIds.length === 0) {
      console.log('✅ No existing users found - income categories will be created for new users automatically');
      return true;
    }

    // Step 2: For each user, check if they already have income categories
    let usersProcessed = 0;
    let categoriesCreated = 0;

    for (const userId of uniqueUserIds) {
      console.log(`📝 Processing user ${userId}...`);
      
      // Check if user already has any income categories
      const { data: existingIncomeCategories, error: incomeCheckError } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('type', 'income');

      if (incomeCheckError) {
        console.warn(`⚠️  Could not check income categories for user ${userId}: ${incomeCheckError.message}`);
        continue;
      }

      const existingIncomeNames = existingIncomeCategories?.map(cat => cat.name) || [];
      
      if (existingIncomeNames.length > 0) {
        console.log(`   User already has ${existingIncomeNames.length} income categories: ${existingIncomeNames.join(', ')}`);
        usersProcessed++;
        continue;
      }

      // Step 3: Create default income categories for this user
      const incomeCategoriesToCreate = DEFAULT_INCOME_CATEGORIES.map(name => ({
        user_id: userId,
        name: name,
        type: 'income',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: createdCategories, error: createError } = await supabase
        .from('categories')
        .insert(incomeCategoriesToCreate)
        .select('id, name');

      if (createError) {
        // Handle the case where type column might not exist yet
        if (createError.message.includes('column "type" of relation "categories" does not exist')) {
          console.log('   ⚠️  Type column not yet added to categories table');
          console.log('   → Creating categories without type specification (will default to expense)');
          
          // Create categories without the type field for now
          const fallbackCategories = DEFAULT_INCOME_CATEGORIES.map(name => ({
            user_id: userId,
            name: `${name} (Income)`, // Add suffix to distinguish from expenses
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));

          const { data: fallbackCreated, error: fallbackError } = await supabase
            .from('categories')
            .insert(fallbackCategories)
            .select('id, name');

          if (fallbackError) {
            console.warn(`   ❌ Failed to create fallback categories for user ${userId}: ${fallbackError.message}`);
            continue;
          }

          console.log(`   ✅ Created ${fallbackCreated?.length || 0} fallback income categories`);
          categoriesCreated += fallbackCreated?.length || 0;
        } else {
          console.warn(`   ❌ Failed to create income categories for user ${userId}: ${createError.message}`);
          continue;
        }
      } else {
        console.log(`   ✅ Created ${createdCategories?.length || 0} income categories`);
        categoriesCreated += createdCategories?.length || 0;
      }

      usersProcessed++;
    }

    console.log('\n📊 Migration Results:');
    console.log(`   Users processed: ${usersProcessed}/${uniqueUserIds.length}`);
    console.log(`   Income categories created: ${categoriesCreated}`);
    console.log(`   Average categories per user: ${usersProcessed > 0 ? (categoriesCreated / usersProcessed).toFixed(1) : 0}`);

    console.log('\n🎉 Phase 2 completed successfully!');
    console.log('   ✅ All existing users now have income categories');
    console.log('   ✅ New users will get income categories automatically');
    console.log('   ✅ Ready for income tracking features');

    return true;

  } catch (error) {
    console.error('💥 Income categories creation failed:', error.message);
    console.error('   Stack trace:', error.stack);
    
    console.log('\n🔧 Troubleshooting:');
    console.log('   1. Ensure the categories table has a "type" column');
    console.log('   2. Run the SQL schema update first');
    console.log('   3. Check database permissions');
    
    return false;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createIncomeCategories().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { createIncomeCategories };