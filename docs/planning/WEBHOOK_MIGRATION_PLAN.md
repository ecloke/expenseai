# 🚀 TELEGRAM WEBHOOK MIGRATION PLAN
## Single-User Pilot Test: Polling → Webhook Architecture

**Mission:** Test webhook functionality with SINGLE user (149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498) while keeping all other users on polling. Zero risk to production.

**Critical Success Criteria:**
- ✅ Only target user affected during testing
- ✅ All other users continue polling normally
- ✅ 100% feature parity for test user
- ✅ Easy rollback for test user only
- ✅ **Simple, precise, 0 errors to production**

---

## 📊 CURRENT STATE ANALYSIS

### **Current Architecture:**
```
Server Startup → BotManager.initializeBots() → For each user:
  ├── Decrypt bot token
  ├── new TelegramBot(token, {polling: true})  
  ├── bot.on('message', handleMessage)
  ├── bot.on('photo', handlePhoto)
  └── bot.startPolling()

Result: 5-10 minute cold start, no responses during initialization
```

### **Current Dependencies:**
- **File:** `backend/src/services/BotManager.js`
- **Methods:** `initializeBots()`, `initializeBot()`, `handleMessage()`, `handlePhoto()`
- **Routes:** No webhook routes exist
- **Database:** `user_configs` table (has bot tokens)
- **Environment:** Railway with HTTPS support

---

## 🎯 TARGET ARCHITECTURE (PILOT)

### **Hybrid Architecture (During Pilot):**
```
Server Startup → BotManager.initializeBots() → For each user:
  ├── If user = "149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498":
  │   └── Setup webhook for this user only
  └── Else: Continue with polling (existing code)

Test User: Message → Telegram → Webhook → handleMessage() → Response
Other Users: Message → Telegram → Polling Bot → handleMessage() → Response
```

### **Key Benefits:**
- **Zero risk** - Only 1 user affected
- **Real production testing** - Live environment validation
- **Easy rollback** - Just revert test user to polling
- **Gradual confidence** - Prove it works before full migration

---

## 🎯 COMMAND FUNCTIONALITY GUARANTEE

### **✅ 100% Command Compatibility (Same Code)**

**All existing Telegram commands will work identically for test user:**

#### **Commands to Test:**
- `/start` - Welcome message
- `/help` - Command guide  
- `/stats` - Monthly statistics  
- `/today` - Today's expenses
- `/yesterday` - Yesterday's expenses
- `/week` - This week's expenses
- `/month` - This month's expenses
- `/create` - Manual expense creation (multi-step)
- `/summary` - Custom summaries
- `/new` - New project creation
- `/list` - List projects
- 📸 **Photo receipt processing** with project selection

#### **Why Commands Are 100% Compatible:**
```javascript
// Same handleMessage() method for both:
// Polling: bot.on('message', (msg) => handleMessage(msg, userId, config))
// Webhook: POST /webhook → handleMessage(msg, userId, config)
// IDENTICAL business logic, database queries, responses
```

---

## 📋 PILOT IMPLEMENTATION PLAN

## **PHASE 1: INFRASTRUCTURE SETUP** 
*Duration: 2 hours | Risk: ZERO | Rollback: N/A*

### **1.1 Create Webhook Route**
**File:** `backend/src/routes/webhook.js` (NEW FILE)
```javascript
import express from 'express';
import crypto from 'crypto';
const router = express.Router();

// Webhook endpoint for pilot user
router.post('/telegram', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'No message' });
    }

    // Get user ID from bot token (via message)
    const userId = await getUserIdFromBotToken(message);
    
    // Only process if this is our test user
    if (userId !== '149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498') {
      return res.status(200).json({ ok: true }); // Ignore other users
    }

    const botManager = req.app.get('botManager');
    
    if (message.photo) {
      await botManager.handlePhoto(message, userId, await botManager.getUserConfig(userId));
    } else {
      await botManager.handleMessage(message, userId, await botManager.getUserConfig(userId));
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get user ID from bot token
async function getUserIdFromBotToken(message) {
  // Extract bot token from webhook request context
  // Map to user ID via database lookup
  // Implementation details in Phase 1.2
}

export default router;
```

### **1.2 Update BotManager for Hybrid Mode**
**File:** `backend/src/services/BotManager.js`
**Modification:** Add webhook support for single user
```javascript
// Add to constructor:
constructor(supabase) {
  this.supabase = supabase;
  this.bots = new Map();
  this.PILOT_USER_ID = '149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498'; // Test user
}

// Update initializeBots method:
async initializeBots() {
  const { data: configs, error } = await this.supabase
    .from('user_configs')
    .select('user_id, telegram_bot_token')
    .not('telegram_bot_token', 'is', null);
    
  if (error) throw error;

  for (const config of configs) {
    if (config.user_id === this.PILOT_USER_ID) {
      // Setup webhook for pilot user
      await this.setupWebhookForUser(config.user_id, config.telegram_bot_token);
    } else {
      // Keep polling for all other users (existing code)
      await this.initializeBot(config.user_id, config);
    }
  }
}

// New webhook setup method (pilot user only)
async setupWebhookForUser(userId, encryptedToken) {
  try {
    const botToken = decrypt(encryptedToken);
    const webhookUrl = `${process.env.RAILWAY_DOMAIN}/api/webhook/telegram`;
    
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: process.env.WEBHOOK_SECRET,
        allowed_updates: ['message', 'photo']
      })
    });
    
    const result = await response.json();
    if (!result.ok) {
      throw new Error(`Webhook failed: ${result.description}`);
    }
    
    console.log(`🧪 PILOT: User ${userId} webhook ready`);
  } catch (error) {
    console.error(`❌ PILOT: User ${userId} webhook failed:`, error);
    // Fallback to polling for pilot user if webhook fails
    const config = await this.getUserConfig(userId);
    await this.initializeBot(userId, config);
  }
}

// Rollback method (revert pilot user to polling)
async rollbackPilotUser() {
  const config = await this.getUserConfig(this.PILOT_USER_ID);
  const botToken = decrypt(config.telegram_bot_token);
  
  // Remove webhook
  await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: '' }) // Empty URL removes webhook
  });
  
  // Start polling for pilot user
  await this.initializeBot(this.PILOT_USER_ID, config);
  console.log(`🔄 PILOT: User ${this.PILOT_USER_ID} reverted to polling`);
}
```

### **1.3 Add Webhook Route to Express**
**File:** `backend/src/index.js`
**Modification:** Single import + route addition
```javascript
// Add after existing route imports:
import webhookRoutes from './routes/webhook.js';

// Add with other route registrations:
app.use('/api/webhook', webhookRoutes);
```

### **1.4 Environment Variables**
**File:** `backend/.env`
**Addition:** Add webhook secret
```env
# Webhook Configuration
WEBHOOK_SECRET=pilot-test-secret-key-2024
RAILWAY_DOMAIN=your-actual-domain.up.railway.app
```

---

## **PHASE 2: DEPLOYMENT & TESTING**
*Duration: 30 minutes | Risk: MINIMAL | Rollback: Individual user only*

### **2.1 Deploy Pilot Code**
```bash
# Create pilot branch
git checkout -b webhook-pilot-test

# Commit changes
git add .
git commit -m "Add webhook support for pilot user 149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498"

# Push to production
git push origin webhook-pilot-test
git checkout main
git merge webhook-pilot-test
git push origin main
```

### **2.2 Validation After Deployment**
**Immediate checks (first 5 minutes):**
- ✅ Server starts successfully
- ✅ All OTHER users still on polling (check logs)
- ✅ Pilot user webhook setup attempt (check logs)
- ✅ No errors in Railway logs

### **2.3 Pilot User Testing**
**Test with your Telegram bot (149a0ccd-3dd7-44a4-ad2e-42cc2c7e4498):**

**Basic Commands:**
- Send `/start` → Verify welcome message
- Send `/help` → Verify command list
- Send `/today` → Verify expense summary

**Advanced Features:**
- Send receipt photo → Verify AI processing + project selection
- Use `/create` → Verify multi-step conversation
- Test project workflows

**Success Criteria:**
- All responses identical to polling behavior
- Response time <2 seconds
- No errors or timeouts

---

## **PHASE 3: MONITORING & ROLLBACK**
*Duration: 1-2 weeks | Risk: ISOLATED | Rollback: Simple*

### **3.1 Pilot Monitoring**
**Daily checks:**
- ✅ Pilot user interactions working normally
- ✅ No impact on other users
- ✅ Server performance stable
- ✅ Error rates normal

### **3.2 Easy Rollback (If Needed)**
If ANY issues with pilot user:
```javascript
// Add to BotManager (emergency method):
async emergencyRollbackPilot() {
  await this.rollbackPilotUser();
}

// Or via API endpoint:
POST /api/bot/rollback-pilot
```

### **3.3 Success Metrics**
After 1-2 weeks of successful pilot:
- ✅ 100% command functionality working
- ✅ Receipt processing working perfectly
- ✅ Multi-step conversations completing
- ✅ No user experience degradation
- ✅ Performance equal or better than polling

---

## **PHASE 4: FULL MIGRATION (Future)**
*Only after pilot success*

### **4.1 Confidence Achieved**
When pilot proves webhooks work perfectly:
- Update `initializeBots()` to use webhooks for ALL users
- Remove polling code entirely
- Deploy with confidence

### **4.2 Implementation**
```javascript
// Replace the pilot condition with:
async initializeBots() {
  // Setup webhooks for ALL users (no pilot condition)
  for (const config of configs) {
    await this.setupWebhookForUser(config.user_id, config.telegram_bot_token);
  }
}
```

---

## 🛡️ SAFETY MEASURES

### **Pilot-Specific Rollback**
```bash
# If pilot has issues, rollback just the pilot user:
curl -X POST https://domain.up.railway.app/api/bot/rollback-pilot

# Or revert entire deployment:
git revert HEAD --no-edit
git push origin main
```

### **Risk Assessment**
- **Impact:** 1 user only (you)
- **Rollback time:** <1 minute
- **Other users:** Completely unaffected
- **Data loss:** None
- **Production stability:** Maintained

### **Monitoring**
- Monitor pilot user interactions
- Track server performance
- Watch for any errors in logs
- Verify other users unaffected

---

## 📋 IMPLEMENTATION CHECKLIST

### **Phase 1 - Infrastructure**
- [ ] Create `webhook.js` route with pilot user filtering
- [ ] Update `BotManager.js` with hybrid mode (webhook for pilot, polling for others)
- [ ] Add webhook route to Express app
- [ ] Add environment variables
- [ ] Test locally if possible

### **Phase 2 - Deployment**
- [ ] Create pilot branch
- [ ] Deploy to production
- [ ] Verify server starts successfully
- [ ] Confirm other users unaffected
- [ ] Validate pilot user webhook setup

### **Phase 3 - Testing**
- [ ] Test all commands with pilot user
- [ ] Verify receipt photo processing
- [ ] Test multi-step conversations
- [ ] Monitor for 1-2 weeks
- [ ] Document any issues

### **Phase 4 - Decision**
- [ ] Evaluate pilot success
- [ ] If successful: Plan full migration
- [ ] If issues: Rollback and investigate

---

## 🎯 SUCCESS CRITERIA

**Pilot Success Indicators:**
- ✅ Pilot user bot responds immediately (no cold start)
- ✅ All commands work identically to polling
- ✅ Receipt processing works perfectly
- ✅ Multi-step conversations complete successfully
- ✅ No errors or timeouts
- ✅ Other users completely unaffected

**Ready for Full Migration When:**
- ✅ 2+ weeks of perfect pilot operation
- ✅ 100% command compatibility proven
- ✅ Performance equal or better than polling
- ✅ Zero user experience issues
- ✅ Complete confidence in webhook architecture

---

**This pilot approach provides:**

1. **Zero Risk:** Only 1 user affected during testing
2. **Real Validation:** Live production environment testing
3. **Simple Implementation:** Minimal code changes, clear logic
4. **Easy Rollback:** Individual user rollback in <1 minute
5. **Gradual Confidence:** Prove it works before full commitment
6. **Production Safety:** All other users continue normal operation

**The pilot either works perfectly (proceed to full migration) or has issues (quick rollback with no impact on production).**