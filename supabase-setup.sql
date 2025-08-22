-- 🗄️ ExpenseAI Production Database Schema
-- Run this in your Supabase SQL Editor

-- Note: JWT secret is automatically managed by Supabase

-- User configurations table
CREATE TABLE IF NOT EXISTS user_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    email TEXT,
    telegram_bot_token TEXT,
    telegram_bot_username TEXT,
    gemini_api_key TEXT,
    google_refresh_token TEXT,
    google_access_token TEXT,
    google_sheet_id TEXT,
    sheet_name TEXT DEFAULT 'Expenses',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot sessions for tracking active bots
CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT UNIQUE NOT NULL,
    bot_username TEXT,
    is_active BOOLEAN DEFAULT false,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Receipt processing logs
CREATE TABLE IF NOT EXISTS receipt_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    file_id TEXT,
    processing_status TEXT DEFAULT 'pending',
    store_name TEXT,
    total_amount DECIMAL(10,2),
    items JSONB,
    category TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat conversation logs
CREATE TABLE IF NOT EXISTS chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    response_text TEXT,
    query_type TEXT,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper function to get current user ID (from JWT or session)
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
    -- Extract user_id from JWT token or use authenticated user
    RETURN COALESCE(
        current_setting('request.jwt.claims', true)::json->>'sub',
        auth.uid()::text,
        current_user
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY "Users can access their own config" ON user_configs
    FOR ALL USING (user_id = current_user_id());

CREATE POLICY "Users can access their own bot sessions" ON bot_sessions
    FOR ALL USING (user_id = current_user_id());

CREATE POLICY "Users can access their own receipt logs" ON receipt_logs
    FOR ALL USING (user_id = current_user_id());

CREATE POLICY "Users can access their own chat logs" ON chat_logs
    FOR ALL USING (user_id = current_user_id());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_user_id ON bot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_user_id ON receipt_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_receipt_logs_created_at ON receipt_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON chat_logs(created_at);

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;