#!/usr/bin/env node

/**
 * Emergency cleanup script for receipt_logs table
 * Removes logs older than specified days to prevent database bloat
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupReceiptLogs(retentionDays = 14) {
  try {
    console.log(`🧹 Starting cleanup of receipt_logs older than ${retentionDays} days...`);
    
    // First, get count of records to be deleted
    const { count: totalCount, error: countError } = await supabase
      .from('receipt_logs')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    console.log(`📊 Total receipt_logs records: ${totalCount}`);
    
    const { count: oldCount, error: oldCountError } = await supabase
      .from('receipt_logs')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString());
    
    if (oldCountError) {
      throw oldCountError;
    }
    
    console.log(`🗑️  Records older than ${retentionDays} days: ${oldCount}`);
    
    if (oldCount === 0) {
      console.log('✅ No old records to clean up!');
      return;
    }
    
    // Perform the cleanup
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
    const { error: deleteError } = await supabase
      .from('receipt_logs')
      .delete()
      .lt('created_at', cutoffDate);
    
    if (deleteError) {
      throw deleteError;
    }
    
    // Get final count
    const { count: finalCount, error: finalCountError } = await supabase
      .from('receipt_logs')
      .select('*', { count: 'exact', head: true });
    
    if (finalCountError) {
      throw finalCountError;
    }
    
    console.log(`✅ Cleanup completed!`);
    console.log(`   - Deleted: ${oldCount} records`);
    console.log(`   - Remaining: ${finalCount} records`);
    console.log(`   - Space freed: ${((oldCount / totalCount) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup with command line argument or default to 14 days
const retentionDays = parseInt(process.argv[2]) || 14;
cleanupReceiptLogs(retentionDays)
  .then(() => {
    console.log('🎉 Cleanup script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Cleanup script failed:', error);
    process.exit(1);
  });