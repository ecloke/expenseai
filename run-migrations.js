import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get Supabase credentials from environment or prompt user
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || SUPABASE_URL.includes('YOUR_') || SUPABASE_SERVICE_ROLE_KEY.includes('YOUR_')) {
  console.error('❌ Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('Or edit this file directly with your credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigrations() {
  console.log('🚀 Running database migrations...');
  
  const migrationsDir = path.join(__dirname, 'backend/migrations');
  
  // List of migrations to run in order
  const migrationFiles = [
    'create_projects_table.sql',
    'add_project_id_to_expenses.sql'
  ];
  
  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} - file not found`);
      continue;
    }
    
    try {
      console.log(`📝 Running ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const { error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        console.error(`❌ Error running ${file}:`, error);
        // Try direct query as fallback
        const { error: directError } = await supabase.from('_migrations').select().limit(1);
        if (directError) {
          console.log('📋 Attempting direct SQL execution...');
          // For now, just log the SQL that needs to be run manually
          console.log(`\n--- SQL for ${file} ---`);
          console.log(sql);
          console.log('--- End SQL ---\n');
        }
      } else {
        console.log(`✅ Successfully ran ${file}`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${file}:`, err);
      console.log(`\n--- Please run this SQL manually in your Supabase dashboard ---`);
      console.log(fs.readFileSync(filePath, 'utf8'));
      console.log('--- End SQL ---\n');
    }
  }
  
  console.log('✅ Migration process completed!');
  console.log('\n📋 Next steps:');
  console.log('1. Check your Supabase dashboard to verify tables were created');
  console.log('2. If any migrations failed, run the SQL manually in the SQL editor');
  console.log('3. Test the /projects page and Telegram bot /new command');
}

runMigrations().catch(console.error);