/**
 * Direct constraint removal using Supabase Edge Functions approach
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function removeConstraintDirect() {
  const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('🔧 Attempting direct constraint removal...\n');

  try {
    // Method 1: Try using rpc to execute raw SQL
    console.log('Method 1: Using RPC to execute SQL...');
    
    const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check'
    });

    console.log('RPC Result:', { rpcData, rpcError });

    // Method 2: Check current constraints
    console.log('\nMethod 2: Checking current constraints...');
    
    const { data: constraints, error: constraintError } = await supabase
      .from('information_schema.table_constraints')
      .select('*')
      .eq('table_name', 'expenses')
      .like('constraint_name', '%category%');

    console.log('Current constraints:', constraints);

    // Method 3: Try creating a simple function to drop constraint
    console.log('\nMethod 3: Creating function to drop constraint...');
    
    const dropFunction = `
      CREATE OR REPLACE FUNCTION drop_expenses_category_constraint() 
      RETURNS text AS $$
      BEGIN
        EXECUTE 'ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check';
        RETURN 'Constraint dropped successfully';
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: dropFunction
    });

    if (!funcError) {
      console.log('Function created, now executing...');
      const { data: execData, error: execError } = await supabase.rpc('drop_expenses_category_constraint');
      console.log('Function execution result:', { execData, execError });
    }

  } catch (error) {
    console.error('All methods failed:', error.message);
  }

  console.log('\n📋 If all automated methods failed, please run this manually in Supabase SQL Editor:');
  console.log('ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;');
}

removeConstraintDirect();