/**
 * Diagnose Category Count Mismatch
 * Check if new expenses from Telegram bot have category_id set
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function diagnoseCategoryMismatch() {
  const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔍 Diagnosing Category Count Mismatch...\n');

  try {
    // Check recent expenses created via bot
    console.log('1️⃣ Checking recent expenses...');
    
    const { data: recentExpenses, error: expenseError } = await supabase
      .from('expenses')
      .select('id, category, category_id, store_name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (expenseError) {
      throw new Error(`Error fetching expenses: ${expenseError.message}`);
    }

    console.log('Recent expenses:');
    recentExpenses.forEach(expense => {
      console.log(`  • ${expense.store_name} | category: "${expense.category}" | category_id: ${expense.category_id || 'NULL'}`);
    });

    // Count expenses with missing category_id
    const expensesWithoutCategoryId = recentExpenses.filter(exp => !exp.category_id);
    console.log(`\n📊 Found ${expensesWithoutCategoryId.length} expenses without category_id`);

    if (expensesWithoutCategoryId.length > 0) {
      console.log('\n🔧 Fixing expenses without category_id...');

      for (const expense of expensesWithoutCategoryId) {
        // Find the matching category for this expense
        const { data: matchingCategory } = await supabase
          .from('categories')
          .select('id, user_id')
          .eq('name', expense.category)
          .single();

        if (matchingCategory) {
          // Update the expense with category_id
          const { error: updateError } = await supabase
            .from('expenses')
            .update({ category_id: matchingCategory.id })
            .eq('id', expense.id);

          if (!updateError) {
            console.log(`  ✅ Fixed expense ${expense.id}: "${expense.category}"`);
          } else {
            console.log(`  ❌ Failed to fix expense ${expense.id}: ${updateError.message}`);
          }
        } else {
          console.log(`  ⚠️ No matching category found for "${expense.category}"`);
        }
      }
    }

    // Final verification
    console.log('\n3️⃣ Verifying category counts...');
    
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .limit(5);

    for (const category of categories || []) {
      const { count } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id);

      console.log(`  • "${category.name}": ${count || 0} transactions`);
    }

    console.log('\n✅ Diagnosis complete!');
    console.log('🔄 Refresh your /categories page - transaction counts should now be accurate');

  } catch (error) {
    console.error('💥 Diagnosis failed:', error.message);
  }
}

diagnoseCategoryMismatch();