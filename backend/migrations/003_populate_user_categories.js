/**
 * Populate default categories for all existing users
 * Phase 1 of category management enhancement implementation
 */

const { createClient } = require('@supabase/supabase-js');

// Default categories based on current system
const DEFAULT_CATEGORIES = [
  'groceries',
  'dining', 
  'gas',
  'pharmacy',
  'retail',
  'services',
  'entertainment',
  'other'
];

async function populateUserCategories() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🚀 Starting category migration...');

  try {
    // Get all users who have expenses
    console.log('📊 Finding users with expenses...');
    const { data: users, error: usersError } = await supabase
      .from('expenses')
      .select('user_id')
      .distinct();

    if (usersError) {
      throw new Error(`Error fetching users: ${usersError.message}`);
    }

    console.log(`👥 Found ${users.length} users with expenses`);

    let processedUsers = 0;
    let skippedUsers = 0;

    for (const user of users) {
      // Check if user already has categories
      const { data: existingCategories, error: checkError } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', user.user_id)
        .limit(1);

      if (checkError) {
        console.error(`❌ Error checking categories for user ${user.user_id}:`, checkError.message);
        continue;
      }

      if (existingCategories.length === 0) {
        // Create default categories for user
        const categories = DEFAULT_CATEGORIES.map(name => ({
          user_id: user.user_id,
          name: name,
          is_default: true
        }));

        const { error: insertError } = await supabase
          .from('categories')
          .insert(categories);

        if (insertError) {
          console.error(`❌ Error creating categories for user ${user.user_id}:`, insertError.message);
          continue;
        }

        console.log(`✅ Created ${DEFAULT_CATEGORIES.length} categories for user ${user.user_id}`);
        processedUsers++;
      } else {
        console.log(`⏭️  User ${user.user_id} already has categories, skipping`);
        skippedUsers++;
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log(`📈 Summary:`);
    console.log(`   • Users processed: ${processedUsers}`);
    console.log(`   • Users skipped: ${skippedUsers}`);
    console.log(`   • Total users: ${users.length}`);

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  populateUserCategories()
    .then(() => {
      console.log('✨ Category population completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Category population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateUserCategories, DEFAULT_CATEGORIES };