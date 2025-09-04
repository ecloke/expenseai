# Category Management Enhancement - Project Requirements Document (PRD)

## 🎯 OVERVIEW
**Enhancement**: Dynamic Category Management System
**Objective**: Allow users to create, edit, and delete their own expense categories instead of using only pre-defined categories
**Critical Requirement**: Zero impact on existing production data

## 📋 CURRENT STATE ANALYSIS
### Existing Category System
- **Current Implementation**: Hardcoded category list (dining, gas, pharmacy, retail, etc.)
- **Limitation**: Users cannot customize categories to match their naming conventions or needs
- **Data Impact**: Existing expenses have category values stored as strings in database
- **Cross-Platform**: Categories used in both web app and Telegram bot

### Files That Use Categories (To Be Updated)
- Frontend expense forms (create/edit)
- Dashboard analytics and charts
- Telegram bot `/create` command category selection
- Database schema (expenses table category field)

## 🎯 SOLUTION REQUIREMENTS

### Core Features
1. **Category Management Page**
   - New sidebar menu item: "Categories"
   - List all user categories (alphabetically sorted)
   - Edit category names inline
   - Delete categories (with transaction validation)
   - Create new categories via dialog popup

2. **Category CRUD Operations**
   - **CREATE**: Dialog with name input field (required)
   - **READ**: List user's categories alphabetically
   - **UPDATE**: Edit category names inline
   - **DELETE**: Only allow if no associated transactions exist

3. **Default Category Setup**
   - New users automatically get current pre-defined categories
   - Existing users migrate their current category usage to new system

4. **Cross-Platform Sync**
   - Web app changes reflect immediately in Telegram bot
   - Telegram bot `/create` command uses user's custom categories
   - Dynamic category loading (no hardcoded lists)

## 🗄️ DATABASE DESIGN

### New Table: `categories`
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- Prevent duplicate category names per user
);

-- Index for fast user category lookups
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_name ON categories(user_id, name);
```

### Updated Table: `expenses`
```sql
-- Add foreign key to categories table
ALTER TABLE expenses ADD COLUMN category_id UUID REFERENCES categories(id);
-- Keep existing category column during migration, remove after verification
-- ALTER TABLE expenses DROP COLUMN category; -- Do this after migration verification
```

### Migration Strategy
1. **Phase 1**: Create categories table
2. **Phase 2**: Populate categories for all existing users from their expense data
3. **Phase 3**: Update expenses table to reference category IDs
4. **Phase 4**: Verify all expenses have valid category references
5. **Phase 5**: Remove old category string column (after verification)

## 🔧 API ENDPOINTS

### Backend Routes (`/api/categories`)
```javascript
GET    /api/categories           // List user's categories (alphabetically)
POST   /api/categories           // Create new category
PUT    /api/categories/:id       // Update category name  
DELETE /api/categories/:id       // Delete category (with validation)
GET    /api/categories/:id/usage // Check transaction count before delete
```

### Request/Response Schemas
```javascript
// GET /api/categories
Response: [
  { id: "uuid", name: "Dining", is_default: true, created_at: "...", updated_at: "..." },
  { id: "uuid", name: "Gas", is_default: true, created_at: "...", updated_at: "..." }
]

// POST /api/categories
Request: { name: "Custom Category Name" }
Response: { id: "uuid", name: "Custom Category Name", is_default: false, ... }

// PUT /api/categories/:id  
Request: { name: "Updated Category Name" }
Response: { id: "uuid", name: "Updated Category Name", ... }

// DELETE /api/categories/:id
Response: { success: true, message: "Category deleted successfully" }
Error: { error: "Cannot delete category with existing transactions", transaction_count: 5 }

// GET /api/categories/:id/usage
Response: { category_id: "uuid", transaction_count: 3, can_delete: false }
```

## 🎨 FRONTEND IMPLEMENTATION

### New Category Management Page
```
Location: frontend/src/app/categories/page.tsx

Layout:
┌─────────────────────────────────────────┐
│ Categories                    [+ Add]   │
├─────────────────────────────────────────┤
│ ○ Dining                    [Edit][Del] │
│ ○ Gas                       [Edit][Del] │  
│ ○ Grocery                   [Edit][Del] │
│ ○ Custom Category           [Edit][Del] │
└─────────────────────────────────────────┘

Features:
- Alphabetical sorting
- Inline editing for category names
- Delete confirmation dialog
- Add category popup dialog
- Transaction count validation before delete
```

### Updated Components
1. **Expense Create/Edit Forms**
   - Replace hardcoded category dropdown with dynamic API call
   - Load user's categories on component mount
   - Handle category changes in real-time

2. **Dashboard Analytics**
   - Update chart data queries to use dynamic categories
   - Handle empty categories gracefully
   - Remove any hardcoded category references

3. **Navigation (Sidebar.tsx)**
   - Add "Categories" to sidebar menu
   - Use appropriate icon (Tag or List icon)

## 🤖 TELEGRAM BOT UPDATES

### Updated Commands in BotManager.js
```javascript
// Update handleCreate method
async handleCreate(message, userId, config) {
  // OLD: const categories = ['dining', 'gas', 'pharmacy', 'retail', ...];
  // NEW: Fetch user's categories from database
  const categories = await this.getUserCategories(userId);
  
  const keyboard = categories.map(cat => [{ text: cat.name, callback_data: `cat_${cat.id}` }]);
  // ... rest of implementation
}

// New method to fetch user categories
async getUserCategories(userId) {
  try {
    const response = await fetch(`${process.env.API_URL}/api/categories`, {
      headers: { 'user-id': userId }
    });
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user categories:', error);
    // Fallback to default categories if API fails
    return this.getDefaultCategories();
  }
}

// Keep as fallback method
getDefaultCategories() {
  return [
    { id: 'default_dining', name: 'dining' },
    { id: 'default_gas', name: 'gas' },
    { id: 'default_pharmacy', name: 'pharmacy' },
    { id: 'default_retail', name: 'retail' },
    { id: 'default_grocery', name: 'grocery' },
    { id: 'default_entertainment', name: 'entertainment' }
  ];
}
```

## 📊 DATA MIGRATION PLAN

### Step-by-Step Migration Process

#### Step 1: Create Categories Table
```sql
-- Execute in Supabase SQL editor
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(user_id, name);
```

#### Step 2: Populate Default Categories for All Users
```javascript
// Migration script: populate_user_categories.js
const DEFAULT_CATEGORIES = [
  'dining', 'gas', 'pharmacy', 'retail', 'grocery', 
  'entertainment', 'utilities', 'transport', 'healthcare', 'other'
];

async function migrateUserCategories() {
  // Get all users who have expenses
  const { data: users } = await supabase
    .from('expenses')
    .select('user_id')
    .distinct();

  for (const user of users) {
    // Check if user already has categories
    const { data: existingCategories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', user.user_id)
      .limit(1);

    if (existingCategories.length === 0) {
      // Create default categories for each user
      const categories = DEFAULT_CATEGORIES.map(name => ({
        user_id: user.user_id,
        name: name,
        is_default: true
      }));
      
      await supabase.from('categories').insert(categories);
      console.log(`✅ Created categories for user ${user.user_id}`);
    }
  }
}
```

#### Step 3: Add category_id to expenses table
```sql
-- Add foreign key column (nullable initially)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
```

#### Step 4: Map existing expense categories to new category IDs
```javascript
// Migration script: map_expense_categories.js
async function mapExpenseCategories() {
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, user_id, category')
    .is('category_id', null);

  console.log(`Mapping ${expenses.length} expenses to new category system`);

  for (const expense of expenses) {
    // Find matching category for this user
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', expense.user_id)
      .eq('name', expense.category)
      .single();

    if (category) {
      // Update expense with category_id
      await supabase
        .from('expenses')
        .update({ category_id: category.id })
        .eq('id', expense.id);
    } else {
      console.warn(`No category found for expense ${expense.id} with category "${expense.category}"`);
    }
  }
}
```

#### Step 5: Verification and Cleanup
```javascript
// Verification script
async function validateMigration() {
  // Check for orphaned expenses
  const { data: orphanedExpenses } = await supabase
    .from('expenses')
    .select('id, user_id, category')
    .is('category_id', null);

  console.log('Migration Validation Results:');
  console.log(`Orphaned expenses: ${orphanedExpenses.length}`);

  if (orphanedExpenses.length === 0) {
    console.log('✅ Migration successful - ready to remove old category column');
    // ALTER TABLE expenses DROP COLUMN category; -- Execute manually after verification
  } else {
    console.log('❌ Migration incomplete - fix orphaned expenses first');
  }
}
```

## 🔒 PRODUCTION SAFETY MEASURES

### Pre-Deployment Checklist
- [ ] **Database Backup**: Full backup of expenses and users tables
- [ ] **Migration Testing**: Run migration on copy of production data
- [ ] **Rollback Plan**: Documented procedure to revert changes
- [ ] **Staged Deployment**: Test on staging environment first
- [ ] **Data Validation**: Verify migration preserves all existing data

### Rollback Procedure
```sql
-- If migration fails, rollback steps:
-- 1. Restore expenses table from backup
DROP TABLE IF EXISTS categories;
ALTER TABLE expenses DROP COLUMN IF EXISTS category_id;
-- 2. Verify frontend still works with old category field
```

### Data Integrity Checks
```javascript
// Run after each migration phase
async function runIntegrityChecks() {
  // Check 1: All expenses have either category OR category_id
  const { data: invalidExpenses } = await supabase
    .from('expenses')
    .select('id')
    .is('category', null)
    .is('category_id', null);

  // Check 2: All category_id references are valid
  const { data: brokenReferences } = await supabase
    .from('expenses')
    .select('id, category_id')
    .not('category_id', 'is', null)
    .not('category_id', 'in', 
      '(SELECT id FROM categories)'
    );

  console.log('Integrity Check Results:', {
    invalidExpenses: invalidExpenses.length,
    brokenReferences: brokenReferences.length
  });
}
```

## 🧪 TESTING STRATEGY

### Unit Tests
- Category CRUD API endpoints
- Category validation logic (unique names per user)
- Migration scripts (with test data)
- BotManager category loading

### Integration Tests
- Frontend category management flow
- Telegram bot category selection
- Cross-platform category sync
- Dashboard with dynamic categories

### User Acceptance Testing Scenarios
1. **New User Flow**
   - Sign up → Verify default categories created
   - Create expense → Categories appear in dropdown
   - Use Telegram bot → Categories available in /create

2. **Existing User Migration**
   - Existing expenses maintain categories
   - Old category names become user categories
   - Telegram bot shows user's categories

3. **Category Management**
   - Create new category → Appears in all interfaces
   - Edit category name → Updates everywhere
   - Delete category with transactions → Blocked with error
   - Delete unused category → Success

## 🚀 DEPLOYMENT SEQUENCE

### Phase 1: Database Migration (Zero-Downtime)
1. **Create categories table** (no impact on existing system)
2. **Populate default categories** for all users
3. **Add category_id column** to expenses (nullable)
4. **Map existing expenses** to new category system
5. **Verify migration** - all expenses have category_id

### Phase 2: Backend API Deployment
1. **Deploy category API endpoints** (`/api/categories`)
2. **Update BotManager.js** to use dynamic categories
3. **Test API endpoints** with production data
4. **Test Telegram bot** category loading

### Phase 3: Frontend Deployment
1. **Deploy categories page** (`/app/categories/page.tsx`)
2. **Update sidebar navigation** to include Categories link
3. **Update expense forms** to use category API
4. **Update dashboard analytics** for dynamic categories
5. **Test complete user flow**

### Phase 4: Verification & Cleanup
1. **Monitor system health** for 24-48 hours
2. **Verify no data inconsistencies**
3. **Remove old category column** (`ALTER TABLE expenses DROP COLUMN category`)
4. **Update any remaining hardcoded references**

## 🔍 MONITORING & ALERTS

### Key Metrics to Monitor
- **Category API response times** (should be <100ms)
- **Category creation/deletion rates** (track user adoption)
- **Migration completion status** (all expenses mapped)
- **Error rates** in category operations

### Critical Alerts
- **Orphaned expenses** without category_id
- **API failures** when loading categories
- **Database constraint violations** (duplicate categories)
- **Telegram bot failures** loading user categories

## 🚨 CRITICAL REQUIREMENTS FROM DEPLOYMENT_BEST_PRACTICES.md

### Database Safety
- **Use IF NOT EXISTS clauses** in all schema scripts
- **Test migration on copy** of production data first
- **Include proper indexes** for performance
- **Add comprehensive error handling**

### Code Quality
- **Fix TypeScript errors locally** before deployment (`npm run build`)
- **Validate all imports** exist and are correct
- **Test webhook endpoints** don't affect existing users
- **Use proper error boundaries** in React components

### Environment Variables
- **No new environment variables** required
- **Existing SUPABASE_URL and keys** sufficient
- **Test Railway deployment** doesn't truncate values

### Frontend Build Safety
- **Run local build test**:
  ```bash
  cd frontend && npm run build
  ```
- **Fix all TypeScript strict mode errors**
- **Ensure all icon imports** from lucide-react are complete
- **Test static export** works with Next.js config

## ✅ SUCCESS CRITERIA

### Functional Requirements Met
- [ ] Users can create, edit, delete custom categories
- [ ] New users get default categories automatically
- [ ] Existing expense data preserved and correctly mapped
- [ ] Telegram bot uses user's custom categories
- [ ] Dashboard analytics reflect custom categories
- [ ] No hardcoded category references remain
- [ ] Categories sorted alphabetically everywhere

### Technical Requirements Met
- [ ] Zero data loss during migration
- [ ] API performance <100ms for category operations
- [ ] Frontend builds and deploys without errors
- [ ] Telegram bot loads categories without failures
- [ ] All existing user workflows continue functioning
- [ ] Database constraints prevent duplicate categories

### Production Readiness
- [ ] Migration tested on production data copy
- [ ] All code passes local build tests
- [ ] Rollback procedures documented and tested
- [ ] Monitoring alerts configured
- [ ] No secrets committed to version control

## 📚 KEY FILES TO IMPLEMENT

### Backend Files
```
backend/src/routes/categories.js          (NEW)
backend/src/services/BotManager.js        (UPDATE - getUserCategories method)
backend/migrations/create_categories.sql   (NEW)
backend/migrations/migrate_categories.js   (NEW)
```

### Frontend Files  
```
frontend/src/app/categories/page.tsx      (NEW)
frontend/src/components/layout/Sidebar.tsx (UPDATE - add Categories link)
frontend/src/hooks/useCategories.ts       (NEW)
```

### Database Migrations
```
001_create_categories_table.sql
002_populate_user_categories.js
003_add_category_id_to_expenses.sql
004_map_expense_categories.js
005_validate_migration.js
```

---

## 🎯 EXECUTION READINESS

This PRD provides complete specifications for implementing category management with:

1. **Zero risk to existing data** through careful migration
2. **Compliance with deployment best practices** 
3. **Complete technical specifications** for flawless implementation
4. **Comprehensive testing strategy** to ensure quality
5. **Step-by-step deployment sequence**

**When ready to execute**: Follow deployment sequence exactly, test each phase thoroughly, and use this PRD as the complete reference for all implementation decisions.