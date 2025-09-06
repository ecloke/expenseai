-- Fix Production Issues - Remove Old Category Constraints
-- Run this in your Supabase SQL Editor

-- Issue 1: Remove old hardcoded category check constraint
-- This constraint was preventing new categories from being used
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_category_check;

-- Optional: Add a simple constraint to ensure category is not empty
-- (This is more flexible and works with dynamic categories)
ALTER TABLE expenses ADD CONSTRAINT expenses_category_not_empty 
CHECK (category IS NOT NULL AND length(category) > 0);

-- Verify the constraint was removed
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'expenses'::regclass 
AND conname LIKE '%category%';

-- Test: This should now work (replace with actual values)
-- INSERT INTO expenses (user_id, receipt_date, store_name, category, total_amount) 
-- VALUES ('your-user-id', '2024-01-01', 'Test Store', 'custom_category', 10.00);