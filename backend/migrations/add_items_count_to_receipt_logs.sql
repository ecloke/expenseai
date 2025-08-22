-- Add items_count column to receipt_logs table
ALTER TABLE receipt_logs 
ADD COLUMN items_count INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN receipt_logs.items_count IS 'Number of items found in the processed receipt';