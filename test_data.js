const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = '***REMOVED***'
const supabaseKey = '***REMOVED***'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testTransactionData() {
  const userId = '149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498'
  
  console.log('Testing transaction data for user:', userId)
  console.log('Date range: August 1-31, 2025')
  
  try {
    // Test dashboard logic (custom date range Aug 1-31)
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('receipt_date', '2025-08-01')
      .lte('receipt_date', '2025-08-31')
      .order('receipt_date', { ascending: false })
    
    if (dashboardError) {
      console.error('Dashboard query error:', dashboardError)
      return
    }
    
    console.log('\n=== DASHBOARD LOGIC RESULTS ===')
    console.log('Total transactions found:', dashboardData.length)
    console.log('Transactions:')
    dashboardData.forEach((tx, i) => {
      console.log(`${i+1}. ${tx.receipt_date} - ${tx.store_name} - $${tx.total_amount} (${tx.type || 'expense'})`)
    })
    
    // Test transactions page logic (should be same)
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('receipt_date', '2025-08-01')
      .lte('receipt_date', '2025-08-31')
      .order('receipt_date', { ascending: false })
    
    if (transactionsError) {
      console.error('Transactions query error:', transactionsError)
      return
    }
    
    console.log('\n=== TRANSACTIONS PAGE LOGIC RESULTS ===')
    console.log('Total transactions found:', transactionsData.length)
    console.log('Transactions:')
    transactionsData.forEach((tx, i) => {
      console.log(`${i+1}. ${tx.receipt_date} - ${tx.store_name} - $${tx.total_amount} (${tx.type || 'expense'})`)
    })
    
    console.log('\n=== COMPARISON ===')
    console.log('Dashboard count:', dashboardData.length)
    console.log('Transactions count:', transactionsData.length)
    console.log('Match:', dashboardData.length === transactionsData.length ? 'YES' : 'NO')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testTransactionData()