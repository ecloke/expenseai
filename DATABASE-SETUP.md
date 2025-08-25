# Database Setup for Project Features

## ⚠️ CRITICAL: You must run these SQL commands in your Supabase dashboard

The projects feature requires two new database tables. Please run these SQL commands in your Supabase dashboard's SQL editor:

### 1. Create Projects Table

```sql
-- Create projects table for project-based expense tracking
-- This enables users to categorize expenses by projects (trips, events, etc.)

CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(20) NOT NULL,
    status VARCHAR(10) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying by user_id and status
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);

-- Add RLS (Row Level Security) policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own projects
CREATE POLICY "Users can view own projects" ON projects
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own projects
CREATE POLICY "Users can insert own projects" ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own projects
CREATE POLICY "Users can update own projects" ON projects
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
    FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE PROCEDURE update_projects_updated_at();

-- Comment for documentation
COMMENT ON TABLE projects IS 'Projects for categorizing expenses by trips, events, etc.';
COMMENT ON COLUMN projects.currency IS 'User-defined currency name (e.g., USD, RM, EUR)';
COMMENT ON COLUMN projects.status IS 'Project status: open (active) or closed (archived)';
```

### 2. Add Project ID to Expenses Table

```sql
-- Add project_id foreign key to expenses table
-- This links expenses to projects for project-based expense tracking

-- Add project_id column to expenses table (nullable for backward compatibility)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for efficient querying by project_id
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);

-- Create compound index for user_id and project_id queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_project ON expenses(user_id, project_id);

-- Comment for documentation
COMMENT ON COLUMN expenses.project_id IS 'Optional reference to projects table for project-based expenses. NULL means general expense.';
```

## ✅ After Running These Commands

1. **Check Tables Created**: Verify in your Supabase dashboard that you now have:
   - `projects` table with columns: id, user_id, name, currency, status, created_at, updated_at
   - `expenses` table now has an additional `project_id` column

2. **Test the Features**:
   - Visit `/projects` page - should no longer show error
   - Use Telegram bot `/new` command - should work without errors
   - Upload receipts - should show project selection if you have open projects

3. **Verify Policies**: Make sure RLS is enabled and users can only see their own projects

## 🚨 If You Get Errors

- Make sure you're running these in the Supabase SQL editor with your service role
- If `auth.users` doesn't exist, replace it with your users table name
- Check that the `expenses` table exists first

## 📱 Test Commands

After setup, test these Telegram commands:
- `/new` - Create a project
- `/list` - View projects  
- `/close` - Close a project
- Upload a receipt - Should show project selection

The web interface `/projects` should also work properly now.