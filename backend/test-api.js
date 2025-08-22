#!/usr/bin/env node

/**
 * Simple API testing script for the expense tracker backend
 * Run with: node test-api.js
 */

const baseUrl = 'http://localhost:3001'

async function testAPI(endpoint, options = {}) {
  try {
    console.log(`\n🧪 Testing ${options.method || 'GET'} ${endpoint}`)
    
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      ...options
    })
    
    const data = await response.json()
    
    if (response.ok) {
      console.log(`✅ Success:`, data)
    } else {
      console.log(`❌ Failed:`, data)
    }
    
    return { success: response.ok, data }
  } catch (error) {
    console.log(`💥 Error:`, error.message)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🚀 Starting API Tests...')
  console.log('Make sure backend is running on http://localhost:3000')
  
  // Test 1: Health check
  await testAPI('/health')
  
  // Test 2: Bot token validation (with dummy token)
  await testAPI('/api/bot/validate-token', {
    method: 'POST',
    body: JSON.stringify({
      bot_token: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
    })
  })
  
  // Test 3: User config endpoint
  await testAPI('/api/user/config/test-user-id')
  
  // Test 4: Setup status
  await testAPI('/api/user/setup-status/test-user-id')
  
  console.log('\n🎯 Tests completed!')
  console.log('\nNext steps:')
  console.log('1. Set up real Telegram bot token')
  console.log('2. Configure Supabase database')
  console.log('3. Test the frontend at http://localhost:3001')
}

runTests().catch(console.error)