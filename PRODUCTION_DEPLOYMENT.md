# 🚀 ExpenseAI Production Deployment Guide

## 🌐 **Production Architecture**

- **Frontend**: Netlify (https://expenseai.netlify.app)
- **Backend**: Railway (https://expenseai-backend.railway.app)  
- **Database**: Supabase (already configured!)
- **Domain**: Custom domain or Netlify subdomain

---

## 🎯 **Deployment Steps**

### **1️⃣ Frontend → Netlify**

#### **Netlify Deployment:**
1. Push code to GitHub repository
2. Connect Netlify to your GitHub repo
3. Configure build settings:
   ```
   Build command: npm run build
   Publish directory: .next
   ```
4. Add environment variables in Netlify dashboard

#### **Netlify Environment Variables:**
```
NEXT_PUBLIC_SUPABASE_URL=***REMOVED***
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_API_URL=https://expenseai-backend.railway.app
```

### **2️⃣ Backend → Railway**

#### **Railway Deployment:**
1. Connect Railway to your GitHub repo
2. Railway auto-detects Node.js and deploys
3. Add environment variables in Railway dashboard

#### **Railway Environment Variables:**
```
NODE_ENV=production
PORT=3000
SUPABASE_URL=***REMOVED***
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIzaSyCh6bFPeUyzRfIbKYJ3LNt73U5zcRaaNb4
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://expenseai.netlify.app/api/auth/google/callback
ENCRYPTION_KEY=your-256-bit-encryption-key
FRONTEND_URL=https://expenseai.netlify.app
WEBHOOK_URL=https://expenseai-backend.railway.app/webhook
```

---

## 🔧 **Production Configuration Updates**

### **Google OAuth Redirect URIs:**
Update your Google Cloud Console with:
```
https://expenseai.netlify.app/api/auth/google/callback
```

### **Telegram Webhook:**
Set webhook to:
```
https://expenseai-backend.railway.app/webhook
```

---

## 🎯 **Let's Deploy Right Now!**

I see you already have:
- ✅ Supabase configured
- ✅ Gemini API key set

**Missing pieces:**
- Google OAuth credentials
- Encryption key

Let me create the deployment configuration and we'll go live!