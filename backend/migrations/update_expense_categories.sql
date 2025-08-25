-- Update expense categories to include 'entertainment' category
-- This fixes the database constraint violation error

-- Remove the old constraint
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Add the new constraint with 'entertainment' included
ALTER TABLE expenses ADD CONSTRAINT expenses_category_check 
CHECK (category IN ('groceries', 'dining', 'gas', 'pharmacy', 'retail', 'services', 'entertainment', 'other'));

-- Comment for documentation
COMMENT ON CONSTRAINT expenses_category_check ON expenses IS 'Updated to include entertainment category';