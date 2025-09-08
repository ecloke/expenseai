# 🔧 Google OAuth Setup Guide

## 🎯 **Step-by-Step Google Cloud Console Setup**

### **1. Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "New Project" or select existing
3. Name it "ExpenseAI" or similar
4. Click "Create"

### **2. Enable Required APIs**
1. Go to **APIs & Services** → **Library**
2. Search and enable:
   - **Google Sheets API**
   - **Google Drive API** (for file access)

### **3. Create OAuth 2.0 Credentials**
1. Go to **APIs & Services** → **Credentials**
2. Click **"+ CREATE CREDENTIALS"** → **OAuth 2.0 Client ID**
3. If prompted, configure OAuth consent screen first:
   - **User Type**: External
   - **App Name**: ExpenseAI
   - **User Support Email**: Your email
   - **Scopes**: Add `https://www.googleapis.com/auth/spreadsheets`
   - **Test Users**: Add your Gmail address

### **4. Configure OAuth Client**
1. **Application Type**: Web application
2. **Name**: ExpenseAI Web Client
3. **Authorized Redirect URIs**: Add these URLs:

```
# For local testing
http://localhost:3000/api/auth/google/callback
http://localhost:3001/api/auth/google/callback

# For production (we'll update these after deployment)
https://your-domain.vercel.app/api/auth/google/callback
```

### **5. Copy Your Credentials**
After creating, copy:
- **Client ID**: `123456-abc.apps.googleusercontent.com`
- **Client Secret**: `GOCSPX-abcdef123456`

## 🔄 **Flexible Approach: Multiple Redirect URIs**

I'll configure the system to handle multiple environments automatically.

### **Current Setup Strategy:**
1. **Start with localhost** for testing with real APIs
2. **Deploy to Vercel** and get the domain
3. **Update redirect URIs** in Google Console
4. **Test production** end-to-end

## 🎯 **What You Need to Do Right Now**

### **In Google Cloud Console:**
Add these redirect URIs to your OAuth client:
```
http://localhost:3000/api/auth/google/callback
http://localhost:3001/api/auth/google/callback
https://expenseai.vercel.app/api/auth/google/callback
https://expense-tracker.vercel.app/api/auth/google/callback
```

### **In your .env.production file:**
For now, let's use a placeholder that I'll update after deployment:
```
GOOGLE_REDIRECT_URI=https://DEPLOYMENT_DOMAIN/api/auth/google/callback
```

## 🚀 **Deployment Plan**

1. **Test locally** with real APIs (localhost redirect)
2. **Deploy to Vercel** (get actual domain)
3. **Update Google OAuth** redirect URIs
4. **Test production** workflow

This way you can start testing with real Google Sheets integration immediately!

---

## 💡 **Quick Start**

Just put your Google credentials in the env file and I'll:
1. Set up dynamic redirect URI handling
2. Test locally with real APIs
3. Deploy and update the redirect URIs automatically