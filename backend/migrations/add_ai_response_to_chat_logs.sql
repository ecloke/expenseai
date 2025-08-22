-- Add ai_response column to chat_logs table
ALTER TABLE chat_logs 
ADD COLUMN ai_response TEXT;

-- Add comment for documentation
COMMENT ON COLUMN chat_logs.ai_response IS 'AI generated response to user query';