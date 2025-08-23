-- Add expenses table for direct database storage
-- This replaces Google Sheets integration per enhancement requirements

-- Create the update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL,
    store_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('groceries', 'dining', 'gas', 'pharmacy', 'retail', 'services', 'other')),
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_expenses_user_date ON expenses(user_id, receipt_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_user_created ON expenses(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expenses
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert expenses" ON expenses FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update expenses" ON expenses FOR UPDATE USING (true);
CREATE POLICY "Service can delete expenses" ON expenses FOR DELETE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment for documentation
COMMENT ON TABLE expenses IS 'Direct database storage for expense data - replaces Google Sheets integration';