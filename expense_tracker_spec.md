# Telegram Receipt Expense Tracker with AI Chat - Product Requirements Prompt

**Context is King**: Include ALL necessary documentation, examples, and caveats  
**Validation Loops**: Provide executable tests/lints the AI can run and fix  
**Information Dense**: Use keywords and patterns from the codebase  
**Progressive Success**: Start simple, validate, then enhance

## GOAL

Build a production-ready multi-tenant SaaS application where users can:

1. **Receipt Processing**: Photograph receipts via personal Telegram bot → AI extracts data → auto-populates Google Sheets
2. **Expense Conversations**: Chat with bot using natural language queries like "how much did I spend last week?" → AI analyzes request → queries Google Sheets → responds with insights

**Business Value**: Automates expense tracking and provides conversational analytics  
**Integration**: Telegram Bot API + Gemini Vision + Gemini Pro + Google Sheets OAuth + Supabase  
**Problems Solved**: Manual expense entry + difficult expense analysis

## WHY

- **Receipt scanning** eliminates manual data entry
- **Conversational queries** make expense analysis accessible to non-technical users
- **Multi-tenant** allows scaling to multiple users with isolated data
- **OAuth integration** keeps user data private and secure

## WHAT

Multi-tenant expense tracker with:

- **Setup wizard** for bot token, Gemini API key, Google Sheets OAuth
- **Receipt processing** via Gemini Vision API
- **Natural language chat** for expense queries via Gemini Pro
- **Sheet integration** for data storage and retrieval
- **Web dashboard** for configuration and status monitoring

### SUCCESS CRITERIA

- [ ] User completes setup in under 10 minutes
- [ ] Receipt photos processed with 90%+ accuracy
- [ ] Natural language queries work for common expense questions
- [ ] Data correctly syncs to user's Google Sheet
- [ ] Supports 10+ concurrent users on free hosting tiers
- [ ] Mobile-optimized for photo capture and chat

## ALL NEEDED CONTEXT

### DOCUMENTATION & REFERENCES

- **url**: https://core.telegram.org/bots/api  
  **why**: Telegram Bot API for message handling and photo downloads  
  **critical**: Use getFile and file download patterns for images

- **url**: https://ai.google.dev/gemini-api/docs/vision  
  **why**: Gemini Vision API for receipt OCR and data extraction  
  **critical**: Image format requirements and prompt engineering for structured output

- **url**: https://ai.google.dev/gemini-api/docs/text-generation  
  **why**: Gemini Pro for natural language query understanding  
  **critical**: Function calling patterns for SQL generation

- **url**: https://developers.google.com/sheets/api/guides/authorizing  
  **why**: Google Sheets OAuth flow and API operations  
  **critical**: Refresh token handling and scope requirements

- **url**: https://supabase.com/docs/guides/auth  
  **why**: Supabase authentication and RLS policies  
  **critical**: Row Level Security setup for multi-tenant data isolation

- **url**: https://ui.shadcn.com/docs/installation/next  
  **why**: shadcn/ui component library setup and usage patterns  
  **critical**: Proper form handling and validation patterns

### KNOWN GOTCHAS

**CRITICAL**: Gemini Vision requires base64 image encoding with proper MIME types  
**CRITICAL**: Google Sheets OAuth needs offline access for refresh tokens  
**CRITICAL**: Telegram file downloads expire, process images immediately  
**CRITICAL**: Supabase RLS policies must isolate user data completely  
**CRITICAL**: Natural language SQL generation needs sanitization to prevent injection

### FILE STRUCTURE TARGET

```
project/
├── frontend/ (Next.js + shadcn/ui)
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── login/page.tsx              # Authentication
│   │   ├── setup/page.tsx              # 3-step wizard
│   │   ├── dashboard/page.tsx          # Main dashboard
│   │   └── api/auth/callback/route.ts  # OAuth callback
│   ├── components/
│   │   ├── setup/
│   │   │   ├── telegram-bot-step.tsx   # Bot token setup
│   │   │   ├── gemini-key-step.tsx     # API key setup
│   │   │   └── google-sheets-step.tsx  # OAuth flow
│   │   ├── dashboard/
│   │   │   ├── bot-status-card.tsx     # Status monitoring
│   │   │   ├── expense-summary.tsx     # Monthly totals
│   │   │   └── recent-activity.tsx     # Receipt history
│   │   └── ui/ (shadcn components)
│   └── lib/
│       ├── supabase.ts                 # Supabase client
│       └── utils.ts                    # Utility functions
├── backend/ (Express.js API)
│   ├── src/
│   │   ├── index.js                    # Main server
│   │   ├── services/
│   │   │   ├── BotManager.js          # Multi-bot orchestration
│   │   │   ├── ReceiptProcessor.js    # Gemini Vision integration
│   │   │   ├── ChatProcessor.js       # Natural language queries
│   │   │   └── SheetsService.js       # Google Sheets operations
│   │   ├── routes/
│   │   │   ├── auth.js                # Google OAuth routes
│   │   │   ├── bot.js                 # Bot management
│   │   │   └── user.js                # User configuration
│   │   └── utils/
│   │       ├── encryption.js          # Token encryption
│   │       └── validation.js          # Input validation
│   ├── package.json
│   └── .env.example
└── docs/
    ├── setup-guide.md                  # Post-build setup instructions
    └── api-documentation.md            # API endpoint docs
```

## IMPLEMENTATION BLUEPRINT

### PHASE 1: Core Infrastructure Setup

#### Task 1: Database Schema (Supabase)

CREATE tables with RLS policies:

```sql
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
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot session tracking
CREATE TABLE bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_username TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
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

-- Row Level Security policies
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own configs" ON user_configs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own sessions" ON bot_sessions FOR ALL USING (auth.uid() = user_id);  
CREATE POLICY "Users view own logs" ON receipt_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own chats" ON chat_logs FOR SELECT USING (auth.uid() = user_id);
```

#### Task 2: Backend Multi-Bot Manager

CREATE src/services/BotManager.js:

- **PATTERN**: Singleton manager maintaining Map<userId, botInstance>
- **INITIALIZE**: Load all user configs on startup, create bot instances
- **HANDLE**: Photo messages → ReceiptProcessor, text messages → ChatProcessor
- **ERROR HANDLING**: Graceful bot restart on failures, logging to database

#### Task 3: Receipt Processing Service

CREATE src/services/ReceiptProcessor.js:

- **PATTERN**: Async function taking image buffer, returning structured data
- **GEMINI VISION**: Base64 encode image, structured JSON prompt for extraction
- **VALIDATION**: Sanitize extracted data, handle partial OCR results
- **SHEETS UPDATE**: Append expense data to user's Google Sheet

#### Task 4: Natural Language Chat Service

CREATE src/services/ChatProcessor.js:

- **PATTERN**: Function calling with Gemini Pro for query understanding
- **SQL GENERATION**: Convert natural language to safe Google Sheets API calls
- **QUERY TYPES**: Support spending totals, category breakdowns, time ranges, comparisons
- **RESPONSE FORMATTING**: Human-friendly responses with expense insights

### PHASE 2: Frontend Setup Wizard

#### Task 5: Setup Wizard with shadcn/ui

CREATE app/setup/page.tsx:

- **COMPONENT**: Multi-step form with progress indicator
- **VALIDATION**: Real-time validation with loading states and error handling
- **PERSISTENCE**: Save progress between steps in localStorage
- **NAVIGATION**: Back/next buttons with form state preservation

#### Task 6: Telegram Bot Setup Step

CREATE components/setup/telegram-bot-step.tsx:

- **INSTRUCTIONS**: Detailed @BotFather guide with copy-paste examples
- **VALIDATION**: Test bot token via Telegram API getMe endpoint
- **ERROR HANDLING**: Specific error messages for common token issues
- **SUCCESS STATE**: Display bot username and connection confirmation

#### Task 7: Google Sheets OAuth Integration

CREATE app/api/auth/callback/route.ts:

- **OAUTH FLOW**: Handle Google OAuth callback with proper error handling
- **SHEET CREATION**: Auto-create expense sheet with headers if needed
- **TOKEN STORAGE**: Encrypt and store access/refresh tokens in Supabase
- **REDIRECT**: Return to setup wizard with success/error status

### PHASE 3: Telegram Bot Intelligence

#### Task 8: Receipt Photo Processing

IMPLEMENT photo message handler:

- **DOWNLOAD**: Get highest resolution photo from Telegram
- **PROCESS**: Extract expense data using Gemini Vision with structured prompt:

```
Analyze this receipt image and return JSON:
{
  "store_name": "string",
  "date": "YYYY-MM-DD",
  "total": number,
  "items": [
    {
      "name": "string", 
      "price": number,
      "quantity": number,
      "category": "groceries|dining|gas|pharmacy|retail|services|other"
    }
  ]
}
Use logical categorization. If unclear, use reasonable defaults.
```

- **UPDATE**: Append data to Google Sheets via OAuth
- **RESPOND**: Send formatted confirmation to user

#### Task 9: Natural Language Query Processing

IMPLEMENT text message handler for expense queries:

- **UNDERSTAND**: Use Gemini Pro function calling to parse user intent
- **SUPPORTED QUERIES**:
  - "How much did I spend last week?"
  - "What did I spend on groceries this month?"
  - "Show me my biggest expenses"
  - "Compare this month to last month"
- **GENERATE**: Convert to Google Sheets API calls (safe, no SQL injection)
- **RESPOND**: Format results in conversational, helpful responses

### PHASE 4: Dashboard and Monitoring

#### Task 10: User Dashboard

CREATE app/dashboard/page.tsx:

- **LAYOUT**: Responsive 3-column grid with shadcn/ui cards
- **STATUS**: Real-time bot status, connection health
- **ANALYTICS**: Monthly spending, category breakdowns, recent activity
- **ACTIONS**: Test receipt button, settings link, sheet access

#### Task 11: Error Monitoring and Health Checks

IMPLEMENT comprehensive error handling:

- **BOT FAILURES**: Auto-restart bots, notify users via dashboard
- **API LIMITS**: Graceful degradation with user-friendly messages
- **OAUTH EXPIRY**: Automatic token refresh with fallback to re-auth
- **VALIDATION**: Input sanitization and rate limiting

## VALIDATION LOOPS

### Level 1: Syntax & Dependencies

```bash
# Frontend validation
cd frontend && npm run build && npm run lint
# Backend validation  
cd backend && npm test && npm run lint
```

### Level 2: Integration Testing

```bash
# Test receipt processing flow
curl -X POST http://localhost:3000/api/test/receipt-processing
# Test natural language query
curl -X POST http://localhost:3000/api/test/chat-query  
# Test OAuth flow
curl -X GET http://localhost:3000/api/auth/google
```

### Level 3: End-to-End Validation

- [ ] User signup → setup wizard → bot creation → receipt test
- [ ] Photo upload → Gemini processing → Sheet update → confirmation
- [ ] Natural language query → SQL generation → response formatting
- [ ] Error scenarios → graceful handling → user notification

## TECHNOLOGY CONSTRAINTS

### Frontend Stack

- **Next.js 14** with App Router (not Pages Router)
- **shadcn/ui** components with Tailwind CSS
- **Supabase Auth** for authentication (not custom auth)
- **React Hook Form** for form validation
- **Deployment**: Vercel (optimized for Next.js)

### Backend Stack

- **Node.js Express** (not Fastify or other frameworks)
- **Supabase SDK** for database operations
- **Google APIs** for Sheets and OAuth (official client libraries)
- **Gemini AI SDK** for vision and language processing
- **Deployment**: Railway (supports persistent websockets for Telegram)

### API Integrations

- **Telegram Bot API**: Long polling (not webhooks for easier development)
- **Gemini Vision API**: Direct integration (not through proxy)
- **Google Sheets API**: OAuth 2.0 with offline access
- **Supabase**: Row Level Security for multi-tenant isolation

## ENVIRONMENT SETUP

### Required Environment Variables

```bash
# Backend (.env)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_CLIENT_ID=123...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=https://your-backend.railway.app/api/auth/google/callback
FRONTEND_URL=https://your-frontend.vercel.app
ENCRYPTION_KEY=32-char-random-string-for-token-encryption
NODE_ENV=production
PORT=3000

# Frontend (.env.local) 
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

### Package Dependencies

```json
// Backend package.json
{
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.39.0", 
    "node-telegram-bot-api": "^0.64.0",
    "googleapis": "^126.0.1",
    "@google/generative-ai": "^0.2.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "crypto": "^1.0.1"
  }
}

// Frontend package.json  
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.7",
    "react-hook-form": "^7.48.2",
    "@hookform/resolvers": "^3.3.2",
    "zod": "^3.22.4"
  }
}
```

## EXAMPLES TO FOLLOW

### Natural Language Query Processing Pattern

```javascript
// Example query understanding with Gemini Pro
const functions = [
  {
    name: "get_expense_data",
    description: "Query user's expense data from Google Sheets",
    parameters: {
      type: "object", 
      properties: {
        query_type: {
          type: "string",
          enum: ["total_spending", "category_breakdown", "date_range", "comparison"]
        },
        time_period: {
          type: "string", 
          description: "Time period like 'last week', 'this month', 'last 30 days'"
        },
        category: {
          type: "string",
          description: "Expense category if filtering by category"
        }
      }
    }
  }
];

// Use function calling to understand user intent
const result = await model.generateContent({
  contents: [{ role: "user", parts: [{ text: userQuery }] }],
  tools: { function_declarations: functions }
});
```

### Google Sheets Query Pattern

```javascript
// Safe querying without SQL injection
async function queryExpenseData(params, sheetsService, sheetId) {
  const range = `Expenses!A:F`; // Date, Store, Item, Category, Quantity, Price
  
  const response = await sheetsService.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: range
  });
  
  // Filter and aggregate in memory (safe from injection)
  const data = response.data.values;
  return processExpenseQuery(data, params);
}
```

### Error Recovery Pattern

```javascript
// Bot auto-restart on failures
class BotManager {
  async handleBotError(userId, error) {
    console.error(`Bot error for user ${userId}:`, error);
    
    // Log error for debugging
    await this.logError(userId, error);
    
    // Attempt bot restart
    try {
      await this.restartUserBot(userId);
      console.log(`Successfully restarted bot for user ${userId}`);
    } catch (restartError) {
      // Notify user via dashboard about persistent issues
      await this.notifyUserOfBotIssue(userId, restartError);
    }
  }
}
```

## OTHER CONSIDERATIONS

### Security Requirements

- **Encrypt sensitive data** in database (bot tokens, API keys, OAuth tokens)
- **Validate all inputs** to prevent injection attacks
- **Use HTTPS** for all communications
- **Implement rate limiting** to prevent abuse
- **Audit user actions** for debugging and compliance

### Performance Optimization

- **Cache OAuth tokens** to minimize API calls
- **Implement request queuing** for Gemini API rate limits
- **Use connection pooling** for database operations
- **Optimize image processing** to handle large receipt photos

### Scalability Considerations

- **Stateless bot handlers** for horizontal scaling
- **Database connection limits** awareness on free tiers
- **API quota management** across multiple users
- **Graceful degradation** when hitting service limits

### User Experience

- **Mobile-first design** for primary Telegram interface
- **Clear error messages** with actionable next steps
- **Progressive enhancement** with offline capabilities where possible
- **Accessibility compliance** for web dashboard

Remember: **Context is King** - this PRP provides Claude Code with everything needed for one-pass implementation success through comprehensive requirements, examples, and validation loops.