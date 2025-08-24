import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  '***REMOVED***',
  '***REMOVED***'
);

async function analyzeStores() {
  console.log('🔍 Analyzing store names for fuzzy matching patterns...');
  
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('store_name, total_amount')
    .order('store_name');
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('📊 Store names found:');
  const storeStats = {};
  expenses.forEach(expense => {
    const store = expense.store_name;
    if (!storeStats[store]) {
      storeStats[store] = { count: 0, total: 0 };
    }
    storeStats[store].count++;
    storeStats[store].total += parseFloat(expense.total_amount);
  });
  
  Object.entries(storeStats).forEach(([store, stats]) => {
    console.log(`  - ${store}: ${stats.count} visits, $${stats.total.toFixed(2)}`);
  });
  
  // Find potential matches
  console.log('\n🔍 Potential fuzzy matches:');
  const stores = Object.keys(storeStats);
  for (let i = 0; i < stores.length; i++) {
    for (let j = i + 1; j < stores.length; j++) {
      const store1 = stores[i].toLowerCase();
      const store2 = stores[j].toLowerCase();
      
      // Simple similarity check
      if (store1.includes(store2) || store2.includes(store1) || 
          levenshteinDistance(store1, store2) <= 3) {
        console.log(`  - '${stores[i]}' <-> '${stores[j]}'`);
      }
    }
  }
}

// Simple Levenshtein distance function
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill().map(() => Array(str1.length + 1).fill(0));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

analyzeStores().catch(console.error);