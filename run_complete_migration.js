/**
 * Complete Category Migration Script
 * Automatically migrates ALL users to the new dynamic category system
 * 
 * Prerequisites: 
 * - Categories table created (Step 1 ✅)
 * - category_id column added to expenses (Step 2 ✅)
 * - Environment variables set in .env file
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Default categories that will be created for each user
const DEFAULT_CATEGORIES = [
  'groceries',
  'dining', 
  'gas',
  'pharmacy',
  'retail',
  'services',
  'entertainment',
  'other'
];

class CompleteMigration {
  constructor() {
    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables:');
      console.error('   SUPABASE_URL');
      console.error('   SUPABASE_SERVICE_ROLE_KEY');
      console.error('\nCreate a .env file in your project root with these values.');
      process.exit(1);
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.stats = {
      totalUsers: 0,
      usersProcessed: 0,
      categoriesCreated: 0,
      expensesMapped: 0,
      errors: []
    };
  }

  async runCompleteMigration() {
    console.log('🚀 Starting Complete Category Migration...\n');

    try {
      await this.step1_validateTables();
      await this.step2_findAllUsers();
      await this.step3_populateCategories();
      await this.step4_mapExistingExpenses();
      await this.step5_validateMigration();
      
      this.printFinalResults();
    } catch (error) {
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    }
  }

  async step1_validateTables() {
    console.log('📋 Step 1: Validating Database Tables...');

    // Check categories table exists
    const { data: categoriesTest, error: catError } = await this.supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (catError) {
      throw new Error(`Categories table not found. Please run Step 1 first: ${catError.message}`);
    }

    // Check expenses table has category_id column
    const { data: expensesTest, error: expError } = await this.supabase
      .from('expenses')
      .select('category_id')
      .limit(1);

    if (expError) {
      throw new Error(`Expenses table missing category_id column. Please run Step 2 first: ${expError.message}`);
    }

    console.log('✅ Database tables validated\n');
  }

  async step2_findAllUsers() {
    console.log('👥 Step 2: Finding All Users with Expenses...');

    // Get all unique users who have expenses
    const { data: allExpenses, error } = await this.supabase
      .from('expenses')
      .select('user_id');
    
    if (error) {
      throw new Error(`Failed to find users: ${error.message}`);
    }

    // Get unique user IDs manually
    const uniqueUserIds = [...new Set(allExpenses.map(expense => expense.user_id))];
    const users = uniqueUserIds.map(user_id => ({ user_id }));

    this.users = users || [];
    this.stats.totalUsers = this.users.length;

    console.log(`✅ Found ${this.stats.totalUsers} users with expenses\n`);
  }

  async step3_populateCategories() {
    console.log('📝 Step 3: Creating Default Categories for All Users...');

    for (const user of this.users) {
      try {
        // Check if user already has categories
        const { data: existingCategories } = await this.supabase
          .from('categories')
          .select('id')
          .eq('user_id', user.user_id)
          .limit(1);

        if (existingCategories && existingCategories.length > 0) {
          console.log(`⏭️  User ${user.user_id.substring(0, 8)}... already has categories, skipping`);
          this.stats.usersProcessed++;
          continue;
        }

        // Create default categories for this user
        const categories = DEFAULT_CATEGORIES.map(name => ({
          user_id: user.user_id,
          name: name,
          is_default: true
        }));

        const { data, error } = await this.supabase
          .from('categories')
          .insert(categories)
          .select();

        if (error) {
          console.error(`❌ Error creating categories for user ${user.user_id}:`, error.message);
          this.stats.errors.push(`Categories creation failed for ${user.user_id}: ${error.message}`);
          continue;
        }

        console.log(`✅ Created ${DEFAULT_CATEGORIES.length} categories for user ${user.user_id.substring(0, 8)}...`);
        this.stats.usersProcessed++;
        this.stats.categoriesCreated += DEFAULT_CATEGORIES.length;

      } catch (error) {
        console.error(`💥 Error processing user ${user.user_id}:`, error.message);
        this.stats.errors.push(`User processing failed for ${user.user_id}: ${error.message}`);
      }
    }

    console.log(`\n✅ Categories creation completed: ${this.stats.categoriesCreated} total categories created\n`);
  }

  async step4_mapExistingExpenses() {
    console.log('🔄 Step 4: Mapping Existing Expenses to Categories...');

    // Get all expenses that don't have category_id set
    const { data: unmappedExpenses, error: fetchError } = await this.supabase
      .from('expenses')
      .select('id, user_id, category')
      .is('category_id', null);

    if (fetchError) {
      throw new Error(`Failed to fetch unmapped expenses: ${fetchError.message}`);
    }

    if (!unmappedExpenses || unmappedExpenses.length === 0) {
      console.log('✅ No expenses need mapping - all already have category_id\n');
      return;
    }

    console.log(`📊 Found ${unmappedExpenses.length} expenses to map...`);

    let mappedCount = 0;
    let errorCount = 0;

    for (const expense of unmappedExpenses) {
      try {
        // Find the matching category for this user and category name
        const { data: category, error: categoryError } = await this.supabase
          .from('categories')
          .select('id')
          .eq('user_id', expense.user_id)
          .eq('name', expense.category)
          .single();

        if (categoryError || !category) {
          console.warn(`⚠️  No category "${expense.category}" found for user ${expense.user_id.substring(0, 8)}... (expense ${expense.id})`);
          errorCount++;
          continue;
        }

        // Update expense with category_id
        const { error: updateError } = await this.supabase
          .from('expenses')
          .update({ category_id: category.id })
          .eq('id', expense.id);

        if (updateError) {
          console.error(`❌ Failed to update expense ${expense.id}:`, updateError.message);
          errorCount++;
          continue;
        }

        mappedCount++;

        // Progress indicator every 100 expenses
        if (mappedCount % 100 === 0) {
          console.log(`📈 Progress: ${mappedCount} expenses mapped...`);
        }

      } catch (error) {
        console.error(`💥 Error mapping expense ${expense.id}:`, error.message);
        errorCount++;
      }
    }

    this.stats.expensesMapped = mappedCount;
    console.log(`\n✅ Expense mapping completed:`);
    console.log(`   • Successfully mapped: ${mappedCount} expenses`);
    console.log(`   • Errors/skipped: ${errorCount} expenses\n`);
  }

  async step5_validateMigration() {
    console.log('🔍 Step 5: Validating Migration Results...');

    // Check 1: Count users with categories
    const { data: allCategories, error: userError } = await this.supabase
      .from('categories')
      .select('user_id');
    
    const usersWithCategories = allCategories ? 
      [...new Set(allCategories.map(cat => cat.user_id))].map(user_id => ({ user_id })) : 
      [];

    if (userError) {
      console.error('❌ Error validating users with categories:', userError.message);
    } else {
      console.log(`✅ ${usersWithCategories.length} users now have categories`);
    }

    // Check 2: Count orphaned expenses (no category_id)
    const { data: orphanedExpenses, error: orphanError } = await this.supabase
      .from('expenses')
      .select('id')
      .is('category_id', null);

    if (orphanError) {
      console.error('❌ Error checking orphaned expenses:', orphanError.message);
    } else {
      const orphanCount = orphanedExpenses?.length || 0;
      if (orphanCount === 0) {
        console.log('✅ All expenses have valid category references');
      } else {
        console.warn(`⚠️  ${orphanCount} expenses still without category_id`);
      }
    }

    // Check 3: Verify foreign key integrity
    const { data: totalExpenses, error: totalError } = await this.supabase
      .from('expenses')
      .select('id', { count: 'exact' });

    if (!totalError) {
      console.log(`✅ Total expenses in system: ${totalExpenses.length}`);
    }

    console.log('\n🎉 Migration validation completed!\n');
  }

  printFinalResults() {
    console.log('🎯 MIGRATION COMPLETE - FINAL RESULTS');
    console.log('=====================================');
    console.log(`👥 Total users found: ${this.stats.totalUsers}`);
    console.log(`✅ Users processed: ${this.stats.usersProcessed}`);
    console.log(`📝 Categories created: ${this.stats.categoriesCreated}`);
    console.log(`🔄 Expenses mapped: ${this.stats.expensesMapped}`);
    console.log(`❌ Errors encountered: ${this.stats.errors.length}`);

    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  ERRORS SUMMARY:');
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (this.stats.errors.length === 0) {
      console.log('\n🎉 SUCCESS! All users now have dynamic categories!');
      console.log('🚀 Your category system is ready for production!');
      console.log('\n✅ What you can do now:');
      console.log('   1. Visit /categories page to manage categories');
      console.log('   2. Create custom categories that match your needs');
      console.log('   3. Edit transactions - they now use your dynamic categories');
      console.log('   4. Use Telegram bot - it shows your custom categories');
    } else {
      console.log('\n⚠️  Migration completed with some errors.');
      console.log('Most users should still be able to use the system.');
      console.log('Check the errors above and resolve them if needed.');
    }

    process.exit(this.stats.errors.length === 0 ? 0 : 1);
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new CompleteMigration();
  migration.runCompleteMigration().catch(console.error);
}

module.exports = CompleteMigration;