# AI Expense Tracker Enhancement - Product Requirements Document

## 1. Overview

### 1.1 Current State
The AI Expense Tracker currently processes receipt images using Gemini AI and stores data in Google Sheets. Users interact through a Telegram bot for both receipt submission and natural language queries. The system has become overly complex with Google Sheets integration causing frequent issues.

### 1.2 Enhancement Goals
- **Simplify Architecture**: Remove Google Sheets dependency while preserving code
- **Reduce AI Costs**: Implement command-based interactions to minimize Gemini token usage
- **Improve Data Management**: Store expense data directly in database
- **Enhanced Analytics**: Build comprehensive dashboard with charts and insights
- **Fix Date Issues**: Use actual receipt dates instead of submission dates

## 2. Technical Architecture Changes

### 2.1 Data Storage Migration
**Current**: Google Sheets API with complex OAuth flow
**New**: Direct PostgreSQL database storage via Supabase

#### Database Schema
```sql
-- New expenses table
CREATE TABLE expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES auth.users(id),
    receipt_date DATE NOT NULL,
    store_name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('groceries', 'dining', 'gas', 'pharmacy', 'retail', 'services', 'other')),
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_date ON expenses(user_id, receipt_date);
CREATE INDEX idx_expenses_category ON expenses(category);
```

### 2.2 Code Preservation Strategy
- Comment out Google Sheets service methods (don't delete)
- Add `// COMMENTED OUT - Google Sheets Integration` markers
- Preserve SheetsService.js with clear disable flags
- Keep OAuth Google Sheets scopes in comments

### 2.3 AI Usage Optimization
**Current**: All text messages processed by Gemini
**New**: Command-based system with AI only for images

#### Command Flow
1. User sends text → Check if it's a valid command
2. If valid command → Execute database query directly
3. If invalid → Send command help message
4. If image → Process with Gemini as before

## 3. Feature Specifications

### 3.1 Telegram Bot Commands

#### Basic Commands
- `/start` - Welcome message + command list
- `/help` - Show all available commands with descriptions

#### Statistics Commands
- `/stats` - Quick monthly overview (total spent, transaction count, top category)

#### Time-based Query Commands
- `/today` - Today's total expenses
- `/yesterday` - Yesterday's total expenses  
- `/week` - This week's total expenses
- `/month` - This month's total expenses

#### Command Response Format
```
📊 Today's Expenses
💰 Total: $45.67
📋 Transactions: 3
🏪 Stores: Coffee Bean, 7-Eleven, KFC

📈 Categories:
• Dining: $25.30 (55%)
• Retail: $20.37 (45%)
```

### 3.2 Receipt Processing Enhancements

#### Date Extraction Fix
**Problem**: Currently logs expenses with today's date regardless of receipt date
**Solution**: Extract and validate receipt date from image, use that as expense date

#### Processing Flow
1. Image received → Process with Gemini
2. Extract receipt_date, store_name, category, total_amount
3. Validate receipt_date format and reasonableness
4. Save to database with extracted receipt_date
5. No Google Sheets interaction

### 3.3 Dashboard Enhancements

#### Chart Requirements
1. **Daily Spending Bar Chart**
   - X-axis: Days
   - Y-axis: Total amount
   - Filter: Day/Week/Month view
   - Interactive hover with details

2. **Category Pie Chart**
   - Show spending distribution by category
   - Display percentages and amounts
   - Filter by time period

3. **Transaction List**
   - Paginated table of all transactions
   - Columns: Date, Store, Category, Amount
   - Sort by date (newest first)
   - Search/filter capabilities

#### Additional Dashboard Features
- Monthly spending trend line
- Average transaction amount
- Top spending categories
- Most frequent stores
- Spending patterns (weekday vs weekend)

## 4. Implementation Plan

### 4.1 Phase 1: Database Migration
1. Create expenses table schema
2. Update ReceiptProcessor to save to database instead of Sheets
3. Comment out Google Sheets integration
4. Test receipt processing with database storage

### 4.2 Phase 2: Command System
1. Implement command parser in Telegram bot
2. Add database query functions for each command
3. Update message handler to use commands first
4. Test all command interactions

### 4.3 Phase 3: Date Fix
1. Enhance Gemini prompt for better date extraction
2. Add date validation and fallback logic
3. Update database saves to use receipt_date
4. Test with various receipt date formats

### 4.4 Phase 4: Dashboard Enhancement
1. Create chart components (bar, pie, line)
2. Implement pagination for transaction list
3. Add filtering and search functionality
4. Optimize database queries for dashboard

## 5. Data Migration Strategy

### 5.1 Existing Users
- No migration of existing Google Sheets data required
- New system starts fresh with database storage
- Users can continue using existing data in Sheets if needed

### 5.2 Configuration Updates
- Remove Google Sheets requirements from user_configs
- Keep Gemini API key requirement
- Simplify setup flow for new users

## 6. Error Handling & Fallbacks

### 6.1 Receipt Processing
- If date extraction fails → Use current date with warning
- If categorization fails → Default to 'other'
- If amount extraction fails → Reject with error message
- Maintain existing Gemini error handling

### 6.2 Command System
- Unknown commands → Show help message
- Database errors → Generic error message with logging
- No data found → Friendly "No expenses found" message

## 7. Testing Strategy

### 7.1 Unit Tests
- Database CRUD operations
- Command parsing logic
- Date extraction and validation
- Chart data aggregation

### 7.2 Integration Tests
- Full receipt processing flow
- Command execution flow
- Dashboard data loading
- Error scenarios

## 8. Performance Considerations

### 8.1 Database Optimization
- Proper indexes on user_id and receipt_date
- Efficient aggregation queries for commands
- Pagination for large datasets

### 8.2 AI Cost Optimization
- Reduce Gemini calls by 80%+ with command system
- Only process images, not text messages
- Maintain existing prompt optimization

## 9. User Experience Improvements

### 9.1 Simplified Onboarding
- Remove Google OAuth complexity
- Only require Telegram + Gemini API key
- Faster setup process

### 9.2 Better Feedback
- Immediate command responses
- Clear error messages
- Progress indicators for processing

## 10. Success Metrics

- 80%+ reduction in Gemini API calls
- Sub-1-second response time for commands
- Zero Google Sheets related errors
- Improved dashboard engagement
- Accurate receipt date extraction (95%+)

---

## Implementation Notes

This PRP serves as the complete implementation guide. All requirements are based on enhancement1.md specifications and current system analysis. The focus is on simplification while maintaining core functionality and improving user experience.