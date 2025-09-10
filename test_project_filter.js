const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProjectFiltering() {
  const userId = '149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498'
  
  console.log('=== TESTING PROJECT FILTERING ===')
  
  try {
    // Get all August transactions
    const { data: allTransactions, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('receipt_date', '2025-08-01')
      .lte('receipt_date', '2025-08-31')
      .order('receipt_date', { ascending: false })
    
    if (error) {
      console.error('Error:', error)
      return
    }
    
    console.log('📊 Total August transactions:', allTransactions.length)
    
    // Test different project filters
    console.log('\n🔹 GENERAL PROJECT FILTER (project_id = null):')
    const generalTransactions = allTransactions.filter(tx => !tx.project_id)
    console.log('Count:', generalTransactions.length)
    generalTransactions.forEach(tx => {
      console.log(`- ${tx.receipt_date} - ${tx.store_name} - $${tx.total_amount}`)
    })
    
    console.log('\n🔹 SPECIFIC PROJECT FILTER (project_id = "b0f17bf7-93e2-4fe8-b6c8-0e81d4323a60"):')
    const projectTransactions = allTransactions.filter(tx => tx.project_id === 'b0f17bf7-93e2-4fe8-b6c8-0e81d4323a60')
    console.log('Count:', projectTransactions.length)
    projectTransactions.forEach(tx => {
      console.log(`- ${tx.receipt_date} - ${tx.store_name} - $${tx.total_amount}`)
    })
    
    console.log('\n🎯 ANALYSIS:')
    console.log('General transactions:', generalTransactions.length)
    console.log('Project transactions:', projectTransactions.length)
    console.log('Total:', generalTransactions.length + projectTransactions.length)
    
    if (generalTransactions.length === 8) {
      console.log('🚨 FOUND THE ISSUE! Dashboard is showing ONLY general project transactions (8)')
      console.log('❌ Dashboard should show ALL transactions (11) but is filtering by project')
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

testProjectFiltering()