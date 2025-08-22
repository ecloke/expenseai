-- Telegram Receipt Expense Tracker Database Schema
-- Supabase PostgreSQL with Row Level Security

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User configurations with encrypted sensitive data
CREATE TABLE user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_bot_token TEXT, -- encrypted
  telegram_bot_username TEXT,
  google_sheet_id TEXT,
  google_access_token TEXT, -- encrypted
  google_refresh_token TEXT, -- encrypted  
  gemini_api_key TEXT, -- encrypted
  sheet_name TEXT DEFAULT 'Expenses',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Bot session tracking
CREATE TABLE bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_username TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Receipt processing logs for debugging and analytics
CREATE TABLE receipt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name TEXT,
  total_amount DECIMAL(10,2),
  items_count INTEGER,
  processing_status TEXT CHECK (processing_status IN ('success', 'error', 'partial')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat query logs for improving natural language processing
CREATE TABLE chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_query TEXT NOT NULL,
  sql_generated TEXT,
  ai_response TEXT,
  processing_status TEXT CHECK (processing_status IN ('success', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX idx_bot_sessions_user_id ON bot_sessions(user_id);
CREATE INDEX idx_bot_sessions_is_active ON bot_sessions(is_active);
CREATE INDEX idx_receipt_logs_user_id ON receipt_logs(user_id);
CREATE INDEX idx_receipt_logs_created_at ON receipt_logs(created_at DESC);
CREATE INDEX idx_receipt_logs_processing_status ON receipt_logs(processing_status);
CREATE INDEX idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX idx_chat_logs_created_at ON chat_logs(created_at DESC);

-- Row Level Security policies
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_configs
CREATE POLICY "Users can view own configs" ON user_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own configs" ON user_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own configs" ON user_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own configs" ON user_configs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for bot_sessions
CREATE POLICY "Users can view own sessions" ON bot_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON bot_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON bot_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON bot_sessions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for receipt_logs (read-only for users)
CREATE POLICY "Users can view own receipt logs" ON receipt_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert receipt logs" ON receipt_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update receipt logs" ON receipt_logs FOR UPDATE USING (true);

-- RLS Policies for chat_logs (read-only for users)
CREATE POLICY "Users can view own chat logs" ON chat_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert chat logs" ON chat_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update chat logs" ON chat_logs FOR UPDATE USING (true);

-- Functions for automated timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_configs_updated_at BEFORE UPDATE ON user_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for analytics (optional)
CREATE VIEW user_stats AS
SELECT 
  uc.user_id,
  uc.telegram_bot_username,
  bs.is_active as bot_active,
  bs.last_activity,
  COUNT(DISTINCT rl.id) as total_receipts,
  COUNT(DISTINCT CASE WHEN rl.processing_status = 'success' THEN rl.id END) as successful_receipts,
  COALESCE(SUM(rl.total_amount), 0) as total_spent,
  COUNT(DISTINCT cl.id) as total_queries,
  COUNT(DISTINCT CASE WHEN cl.processing_status = 'success' THEN cl.id END) as successful_queries
FROM user_configs uc
LEFT JOIN bot_sessions bs ON uc.user_id = bs.user_id
LEFT JOIN receipt_logs rl ON uc.user_id = rl.user_id AND rl.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN chat_logs cl ON uc.user_id = cl.user_id AND cl.created_at >= NOW() - INTERVAL '30 days'
GROUP BY uc.user_id, uc.telegram_bot_username, bs.is_active, bs.last_activity;

-- Grant permissions to authenticated users
GRANT SELECT ON user_stats TO authenticated;

-- Comments for documentation
COMMENT ON TABLE user_configs IS 'User configuration including encrypted API keys and tokens';
COMMENT ON TABLE bot_sessions IS 'Active Telegram bot sessions for users';
COMMENT ON TABLE receipt_logs IS 'Logs of receipt processing attempts for analytics';
COMMENT ON TABLE chat_logs IS 'Logs of chat queries for improving NLP';
COMMENT ON VIEW user_stats IS 'Aggregated user statistics for the last 30 days';

-- Sample data for testing (remove in production)
-- INSERT INTO auth.users (id, email) VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com');
-- INSERT INTO user_configs (user_id, telegram_bot_username, sheet_name) 
-- VALUES ('00000000-0000-0000-0000-000000000001', 'test_expense_bot', 'Test Expenses');