const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// Simulate the exact dashboard logic
async function testDashboardDateRangeLogic() {
  const userId = '149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498'
  const projectId = undefined // Testing without project filter
  
  console.log('=== TESTING DASHBOARD DATE RANGE LOGIC ===')
  console.log('User ID:', userId)
  console.log('Project ID:', projectId || 'undefined (General Expenses)')
  console.log('Date Range: Custom Aug 1 - Aug 31, 2025')
  
  try {
    // Step 1: Query with date range (this is what my new dashboard logic does)
    console.log('\n📡 API Call Parameters:')
    console.log('user_id:', userId)
    console.log('start_date: 2025-08-01')
    console.log('end_date: 2025-08-31')
    console.log('limit: 1000')
    
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .gte('receipt_date', '2025-08-01')
      .lte('receipt_date', '2025-08-31')
      .order('receipt_date', { ascending: false })
      .limit(1000)
    
    const { data: rawData, error } = await query
    
    if (error) {
      console.error('❌ Database error:', error)
      return
    }
    
    console.log('\n📊 Raw database results:', rawData.length, 'transactions')
    
    // Step 2: Apply project filter (this is what dashboard does client-side)
    let filteredData = rawData
    
    if (projectId === 'general') {
      filteredData = rawData.filter(tx => !tx.project_id)
      console.log('🔹 Applied "general" project filter')
    } else if (projectId && projectId !== 'general') {
      filteredData = rawData.filter(tx => tx.project_id === projectId)
      console.log('🔹 Applied project filter for:', projectId)
    } else {
      console.log('🔹 No project filter applied (showing all projects)')
    }
    
    console.log('📊 After project filtering:', filteredData.length, 'transactions')
    
    // Step 3: Show the actual transactions
    console.log('\n📋 Final transactions list:')
    filteredData.forEach((tx, i) => {
      console.log(`${i+1}. ${tx.receipt_date} - ${tx.store_name} - $${tx.total_amount} - Project: ${tx.project_id || 'general'}`)
    })
    
    console.log('\n🎯 FINAL RESULT FOR DASHBOARD:', filteredData.length, 'transactions')
    
    // Step 4: Compare with what should show (all transactions)
    console.log('\n🔍 COMPARISON:')
    console.log('Expected (all Aug transactions):', rawData.length)
    console.log('Dashboard would show:', filteredData.length)
    console.log('Match:', rawData.length === filteredData.length ? '✅ YES' : '❌ NO')
    
    if (rawData.length !== filteredData.length) {
      console.log('\n⚠️ DISCREPANCY FOUND!')
      console.log('Filtered out transactions:')
      const filtered_out = rawData.filter(tx => !filteredData.includes(tx))
      filtered_out.forEach(tx => {
        console.log(`- ${tx.receipt_date} - ${tx.store_name} - Project: ${tx.project_id || 'general'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testDashboardDateRangeLogic()