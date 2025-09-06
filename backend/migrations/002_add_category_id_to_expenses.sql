-- Add category_id foreign key to expenses table
-- Phase 1 of category management enhancement implementation

-- Add foreign key column (nullable initially for migration compatibility)
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);

-- Create index for fast category lookup
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);

-- Comment for documentation
COMMENT ON COLUMN expenses.category_id IS 'Foreign key to categories table - replaces hardcoded category string';