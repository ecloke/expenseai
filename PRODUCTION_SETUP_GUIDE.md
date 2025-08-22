# 🚀 ExpenseAI Production Setup Guide

## 📋 **Step-by-Step Production Deployment**

This guide will help you deploy the real, working ExpenseAI system to a public domain with all integrations.

---

## 🛠️ **Phase 1: External Service Setup**

### 1️⃣ **Supabase Database (Real Production)**

**What you need to do:**
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to you)
3. Go to Project Settings → API → Copy your:
   - `Project URL` 
   - `anon public key`
   - `service_role secret key`

**Database will be automatically set up with our existing schema**

### 2️⃣ **Google Gemini API (Real AI Processing)**

**What you need to do:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key
3. Copy the key (starts with `AIza...`)

**This enables real receipt OCR and natural language processing**

### 3️⃣ **Google Cloud Console (Real Sheets Integration)**

**What you need to do:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Go to APIs & Services → Credentials → Create OAuth 2.0 Client ID
5. Set authorized redirect URIs to your domain (we'll provide this)
6. Copy `Client ID` and `Client Secret`

**This enables real Google Sheets integration**

### 4️⃣ **Telegram Bot (Real Bot Creation)**

**What you need to do:**
1. Open Telegram and message @BotFather
2. Send `/newbot`
3. Choose a name (e.g., "My Expense Tracker")
4. Choose a username (e.g., "my_expense_bot")
5. Copy the bot token (looks like `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

**This creates your personal expense tracking bot**

---

## 🌐 **Phase 2: Domain & Hosting Setup**

### 🚀 **Frontend Hosting (Vercel)**
- **Free tier**: Perfect for our Next.js app
- **Custom domain**: Connect your domain or use vercel.app subdomain
- **SSL**: Automatic HTTPS certificate
- **Global CDN**: Fast loading worldwide

### 🖥️ **Backend Hosting (Railway/Render)**
- **Free tier**: Sufficient for initial usage
- **PostgreSQL**: Automatic database backups
- **Environment variables**: Secure config management
- **Automatic deployments**: Git-based CI/CD

---

## 🔒 **Phase 3: Security & Configuration**

### **Environment Variables Setup**
```bash
# Backend Production Environment
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
GEMINI_API_KEY=your-gemini-key
ENCRYPTION_KEY=your-256-bit-encryption-key
FRONTEND_URL=https://yourdomain.com

# Frontend Production Environment
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## 📱 **Phase 4: Real User Workflow**

### **What users will be able to do:**

1. **🌐 Visit your public website** (e.g., `https://expenseai.com`)
2. **⚙️ Complete setup wizard**:
   - Enter their Telegram bot token
   - Enter their Gemini API key  
   - Connect their Google account (OAuth)
3. **📸 Start using their bot**:
   - Send receipt photos to their personal bot
   - Ask questions like "How much did I spend on food?"
   - Get automatic Google Sheets updates
4. **📊 Monitor via dashboard**:
   - View expense analytics
   - Check bot status
   - See processing logs

---

## 🎯 **Deployment Steps**

### **Ready to deploy?** Here's what we'll do:

1. **✅ Set up your external accounts** (above)
2. **🔧 Configure production environment** variables
3. **🗄️ Deploy database** schema to Supabase
4. **🌐 Deploy frontend** to Vercel
5. **🖥️ Deploy backend** to Railway
6. **🔗 Connect your domain**
7. **🧪 Test end-to-end** workflow
8. **🚀 Go live!**

---

## 💰 **Cost Breakdown (All Free Tiers)**

- **Supabase**: Free (up to 2 projects, 500MB DB)
- **Vercel**: Free (personal projects, custom domain)
- **Railway/Render**: Free (750 hours/month)
- **Google Gemini**: Free tier (60 requests/minute)
- **Telegram Bot**: Always free
- **Google Sheets API**: Free (100 requests/100 seconds)

**Total monthly cost: $0** for moderate usage!

---

## 🎉 **Ready to Start?**

Let me know when you have the external accounts set up and I'll:
1. Configure the production environment
2. Deploy everything to live servers
3. Connect your domain
4. Walk you through testing your real bot!

The end result will be a **fully functional, public expense tracking system** that you (and others) can actually use daily.