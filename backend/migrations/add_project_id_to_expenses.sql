-- Add project_id foreign key to expenses table
-- This links expenses to projects for project-based expense tracking

-- Add project_id column to expenses table (nullable for backward compatibility)
ALTER TABLE expenses 
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;

-- Create index for efficient querying by project_id
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);

-- Create compound index for user_id and project_id queries
CREATE INDEX IF NOT EXISTS idx_expenses_user_project ON expenses(user_id, project_id);

-- Comment for documentation
COMMENT ON COLUMN expenses.project_id IS 'Optional reference to projects table for project-based expenses. NULL means general expense.';