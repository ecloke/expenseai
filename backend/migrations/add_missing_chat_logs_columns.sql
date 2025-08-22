-- Add missing columns to chat_logs table
ALTER TABLE chat_logs 
ADD COLUMN IF NOT EXISTS ai_response TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add comments for documentation
COMMENT ON COLUMN chat_logs.ai_response IS 'AI generated response to user query';
COMMENT ON COLUMN chat_logs.error_message IS 'Error message if processing failed';