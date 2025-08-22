# 🤖 ExpenseAI - AI-Powered Expense Tracking

## 🚀 Production Live System

**Frontend**: https://expenseai.netlify.app  
**Backend**: https://expenseai-backend.railway.app  
**Database**: Supabase PostgreSQL

## ✨ Features

- 📸 **Receipt Processing**: Send photos to Telegram bot → AI extracts data
- 🤖 **Natural Language Queries**: Ask "How much did I spend on food?" 
- 📊 **Google Sheets Integration**: Automatic expense tracking
- 📈 **Real-time Dashboard**: Analytics and monitoring
- 🔒 **Multi-tenant Security**: Complete data isolation

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 + shadcn/ui + Tailwind CSS
- **Backend**: Express.js + Node.js
- **Database**: Supabase PostgreSQL with RLS
- **AI**: Google Gemini Vision + Pro
- **Integration**: Telegram Bot API + Google Sheets API
- **Hosting**: Netlify + Railway

## 🎯 User Flow

1. **Setup**: Complete 3-step wizard (Bot token, AI key, Google OAuth)
2. **Use**: Send receipt photos to personal Telegram bot
3. **Query**: Ask natural language questions about expenses
4. **Monitor**: View analytics on web dashboard

## 🔧 Development

```bash
# Backend
cd backend
npm install
npm start

# Frontend  
cd frontend
npm install
npm run dev
```

## 📊 Architecture

- **Multi-tenant SaaS** with user isolation
- **Real-time AI processing** with Gemini Vision
- **Secure token encryption** with AES-256-GCM
- **Comprehensive error handling** and recovery
- **Production monitoring** and health checks

## 🎉 Status

✅ **Production Ready**  
✅ **Real API Integration**  
✅ **Live Deployment**  
✅ **Security Compliant**
