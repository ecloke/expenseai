/**
 * Map existing expense categories to new category IDs
 * Phase 1 of category management enhancement implementation
 */

const { createClient } = require('@supabase/supabase-js');

async function mapExpenseCategories() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔄 Starting expense category mapping...');

  try {
    // Get all expenses that don't have category_id set
    console.log('📊 Finding expenses without category_id...');
    const { data: expenses, error: expensesError } = await supabase
      .from('expenses')
      .select('id, user_id, category')
      .is('category_id', null);

    if (expensesError) {
      throw new Error(`Error fetching expenses: ${expensesError.message}`);
    }

    console.log(`💳 Found ${expenses.length} expenses to map`);

    let mappedExpenses = 0;
    let orphanedExpenses = 0;
    const orphanedList = [];

    for (const expense of expenses) {
      try {
        // Find matching category for this user
        const { data: category, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', expense.user_id)
          .eq('name', expense.category)
          .single();

        if (categoryError || !category) {
          console.warn(`⚠️  No category found for expense ${expense.id} with category "${expense.category}" for user ${expense.user_id}`);
          orphanedList.push({
            expense_id: expense.id,
            user_id: expense.user_id,
            category: expense.category
          });
          orphanedExpenses++;
          continue;
        }

        // Update expense with category_id
        const { error: updateError } = await supabase
          .from('expenses')
          .update({ category_id: category.id })
          .eq('id', expense.id);

        if (updateError) {
          console.error(`❌ Error updating expense ${expense.id}:`, updateError.message);
          continue;
        }

        mappedExpenses++;

        // Log progress every 100 expenses
        if (mappedExpenses % 100 === 0) {
          console.log(`📈 Progress: ${mappedExpenses} expenses mapped...`);
        }

      } catch (error) {
        console.error(`💥 Error processing expense ${expense.id}:`, error.message);
        orphanedExpenses++;
      }
    }

    console.log('\n🎉 Expense mapping completed!');
    console.log(`📈 Summary:`);
    console.log(`   • Expenses mapped: ${mappedExpenses}`);
    console.log(`   • Orphaned expenses: ${orphanedExpenses}`);
    console.log(`   • Total expenses: ${expenses.length}`);

    if (orphanedList.length > 0) {
      console.log('\n⚠️  Orphaned expenses (need manual review):');
      orphanedList.slice(0, 10).forEach(orphan => {
        console.log(`   • Expense ${orphan.expense_id}: category "${orphan.category}" for user ${orphan.user_id}`);
      });
      
      if (orphanedList.length > 10) {
        console.log(`   • ... and ${orphanedList.length - 10} more`);
      }
      
      console.log('\n💡 Recommendation: Create missing categories for these users or update expense categories manually');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

async function validateMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\n🔍 Running migration validation...');

  try {
    // Check for orphaned expenses (no category_id)
    const { data: orphanedExpenses, error: orphanedError } = await supabase
      .from('expenses')
      .select('id, user_id, category')
      .is('category_id', null);

    if (orphanedError) {
      throw new Error(`Error checking orphaned expenses: ${orphanedError.message}`);
    }

    // Check for broken references (category_id points to non-existent category)
    const { data: brokenReferences, error: brokenError } = await supabase
      .from('expenses')
      .select(`
        id, 
        category_id,
        categories!inner(id)
      `)
      .not('category_id', 'is', null);

    if (brokenError) {
      console.warn('Could not validate broken references:', brokenError.message);
    }

    console.log('✅ Migration Validation Results:');
    console.log(`   • Orphaned expenses: ${orphanedExpenses?.length || 0}`);
    console.log(`   • Valid references: ${brokenReferences?.length || 0}`);

    if ((orphanedExpenses?.length || 0) === 0) {
      console.log('\n🎉 Migration successful - all expenses have valid category references!');
      console.log('✅ Ready for Phase 2: API implementation');
      return true;
    } else {
      console.log('\n⚠️  Migration incomplete - some expenses still lack category references');
      console.log('❌ Fix orphaned expenses before proceeding to Phase 2');
      return false;
    }

  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  mapExpenseCategories()
    .then(async () => {
      const isValid = await validateMigration();
      console.log('\n✨ Expense category mapping completed');
      process.exit(isValid ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Expense category mapping failed:', error);
      process.exit(1);
    });
}

module.exports = { mapExpenseCategories, validateMigration };