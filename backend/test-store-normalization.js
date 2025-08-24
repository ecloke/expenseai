import { createClient } from '@supabase/supabase-js';
import { getTopStoresNormalized, normalizeStoreName } from './src/utils/storeNormalizer.js';

const supabase = createClient(
  'https://nhndnotqgddmcjbgmxtj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5obmRub3RxZ2RkbWNqYmdteHRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgzMjc1MCwiZXhwIjoyMDcxNDA4NzUwfQ.puMdYEvWvJHMF6j5dY5Rq4Ydj8jOIxuOowc68frP5xg'
);

async function testStoreNormalization() {
  console.log('🧪 Testing Store Name Normalization...');
  
  // Get expense data
  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', 'b7ca3422-ae4e-45ea-a561-df1a8ed81edb');
  
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('\n📊 Before Normalization:');
  const beforeStats = {};
  expenses.forEach(expense => {
    const store = expense.store_name;
    if (!beforeStats[store]) {
      beforeStats[store] = { count: 0, total: 0 };
    }
    beforeStats[store].count++;
    beforeStats[store].total += parseFloat(expense.total_amount);
  });
  
  Object.entries(beforeStats)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([store, stats]) => {
      console.log(`  ${store}: ${stats.count} visits, $${stats.total.toFixed(2)}`);
    });
  
  console.log('\n✨ After Normalization:');
  const topStores = getTopStoresNormalized(expenses, 10);
  topStores.forEach((store, index) => {
    console.log(`  ${index + 1}. ${store.store}: ${store.count} visits, $${store.total}`);
    if (store.originalNames.length > 1) {
      console.log(`     📝 Grouped: ${store.originalNames.join(', ')}`);
    }
  });
  
  console.log('\n🔍 Individual Name Normalization Tests:');
  const testNames = [
    'Starbucks Coffee',
    'starbucks',
    'Peng Chu Mid Valley',
    'peng chu',
    'McDonald\'s',
    'GSC Cinema',
    'Tesco Express'
  ];
  
  testNames.forEach(name => {
    const normalized = normalizeStoreName(name);
    if (normalized !== name) {
      console.log(`  '${name}' → '${normalized}' ✅`);
    } else {
      console.log(`  '${name}' → '${normalized}' (no change)`);
    }
  });
}

testStoreNormalization().catch(console.error);