# Testing the Expense Tracker

## Prerequisites Setup

### 1. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Environment Variables

**Backend (.env):**
```env
# Supabase (create free account at supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google OAuth (get from Google Cloud Console)
GOOGLE_CLIENT_ID=123...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:3001

# Security
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Development
NODE_ENV=development
PORT=3000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 3. Database Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. In the SQL Editor, run the contents of `database-schema.sql`
3. Copy the URL and keys to your `.env` file

### 4. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Sheets API and Google Drive API
4. Create OAuth 2.0 credentials with redirect URI: `http://localhost:3000/api/auth/google/callback`
5. Add credentials to `.env`

## Running the Application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

## Testing Scenarios

### Scenario 1: API Health Check
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","timestamp":"...","uptime":...}
```

### Scenario 2: Bot Token Validation
```bash
curl -X POST http://localhost:3000/api/bot/validate-token \
  -H "Content-Type: application/json" \
  -d '{"bot_token": "YOUR_TELEGRAM_BOT_TOKEN"}'
```

### Scenario 3: Complete Setup Flow
1. Open http://localhost:3001
2. Click "Get Started"
3. Follow the 3-step setup wizard
4. Test each step with real credentials

### Scenario 4: Frontend Components
- Visit http://localhost:3001 (landing page)
- Visit http://localhost:3001/setup (setup wizard)
- Test responsive design on mobile

## Testing Without Full Setup

If you want to test quickly without setting up all external services:

### Mock Testing Mode

```bash
# Add to backend/.env
MOCK_MODE=true
```

This will bypass external API calls for initial testing.