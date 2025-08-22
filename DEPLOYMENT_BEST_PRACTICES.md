# Multi-Service Deployment Best Practices Guide

**Purpose**: This document captures deployment best practices learned from building a multi-service application with Supabase, Railway, Netlify, Google APIs, and Telegram bots. Follow these practices to avoid common pitfalls and ensure smooth deployments.

## 🚨 Critical Security Principles

### 1. Secret Management
- **NEVER assume API keys exist** - always ask user to provide them explicitly
- **NEVER commit secrets** to repositories, even temporarily
- **NEVER put secrets in .gitignore** for "temporary storage" - GitHub scans all commits
- **Always use environment variables** for all sensitive data
- **Test secret cleanup** thoroughly before any git operations
- **Use .env.example files** with placeholder values, never real keys

### 2. Repository Security
- Set up `.gitignore` with comprehensive patterns BEFORE any commits
- Use GitHub's secret scanning and push protection
- If secrets are accidentally committed:
  1. Remove them immediately
  2. Force push clean history
  3. Rotate all exposed credentials
  4. Enable branch protection rules

## 🏗️ Service Setup Order

### Phase 1: Database First (Supabase)
1. **Create Supabase project** and note the project ID
2. **Get the real URL format**: `https://[project-id].supabase.co`
3. **Copy both keys**: anon (public) and service_role (secret)
4. **Set up database schema IMMEDIATELY** - don't deploy backend without it
5. **Test connection** with a simple query before proceeding
6. **Verify RLS policies** are properly configured

### Phase 2: Backend Preparation
1. **Create database schema script** and test it locally
2. **Design environment variable structure** with all required keys
3. **Implement graceful fallbacks** for missing environment variables
4. **Add connection testing** with detailed error messages
5. **Never assume services are configured** - always validate first

### Phase 3: Backend Deployment (Railway)
1. **Don't assume Railway URLs** - let user find their actual domain first
2. **Deploy without health checks initially** to avoid chicken-and-egg problems
3. **Set ALL environment variables** before first deployment attempt
4. **Test each environment variable** is properly set (not truncated)
5. **Use Railway's variable validation** - check for truncation issues
6. **Update redirect URIs** only after getting real Railway domain
7. **Test database connection** before enabling advanced features

### Phase 4: Frontend Deployment (Netlify)
1. **Configure build settings** for the specific framework (Next.js export mode)
2. **Set frontend environment variables** with backend URLs
3. **Test static generation** works with your framework configuration
4. **Update CORS settings** on backend with real frontend domain

## 🔧 Environment Variable Management

### Backend Environment Variables Checklist
```bash
# Database
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[complete-jwt-token]
SUPABASE_SERVICE_ROLE_KEY=[complete-jwt-token]

# External APIs
GOOGLE_CLIENT_ID=[client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[secret]
GOOGLE_REDIRECT_URI=https://[actual-backend-domain]/api/auth/google/callback
GEMINI_API_KEY=AIzaSy[key]

# Service Configuration
FRONTEND_URL=https://[actual-frontend-domain]
NODE_ENV=production
PORT=3000
ENCRYPTION_KEY=[32-character-string]
LOG_LEVEL=info
```

### Frontend Environment Variables Checklist
```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key-only]
NEXT_PUBLIC_API_URL=https://[actual-backend-domain]
```

### Common Environment Variable Mistakes
- **Truncated keys**: Always verify full JWT tokens are copied
- **Placeholder URLs**: Never use example.com or placeholder domains
- **Wrong variable names**: Double-check exact naming (underscores vs dashes)
- **Missing quotes**: Some platforms require quotes around values with special characters
- **Case sensitivity**: Environment variable names are case-sensitive

## 🏥 Database Schema Best Practices

### Setup Process
1. **Always run schema setup FIRST** before any backend deployment
2. **Use IF NOT EXISTS** clauses to make schema scripts idempotent
3. **Test locally** with a test Supabase project first
4. **Include comprehensive RLS policies** from the start
5. **Add proper indexes** for expected query patterns
6. **Include comments and documentation** in schema

### Error Handling
- **Design for missing tables** - provide clear error messages
- **Test connection before complex queries** - validate basic connectivity
- **Handle RLS policy conflicts** gracefully
- **Log schema validation failures** with actionable error messages

## 🚀 Railway-Specific Best Practices

### Configuration
- **Use railway.json** for consistent build configuration
- **Start simple**: No health checks, minimal configuration
- **Let Railway auto-detect** Node.js projects when possible
- **Avoid custom nixpacks.toml** unless absolutely necessary
- **Use Procfile** for simple start commands

### Environment Variables
- **Check for truncation** - Railway UI sometimes cuts off long values
- **Use Railway CLI** for bulk environment variable setting
- **Test variable injection** with debug logging
- **Update redirect URIs** after deployment, not before

### Deployment Process
1. Deploy without health checks first
2. Verify environment variables are properly injected
3. Check logs for connection errors
4. Add health checks only after basic functionality works
5. Update any service URLs in other platforms

## 🌐 Netlify-Specific Best Practices

### Next.js Configuration
- **Use `output: 'export'`** for static hosting
- **Set `trailingSlash: true`** for proper routing
- **Disable image optimization** with `unoptimized: true`
- **Test build locally** before deploying

### Environment Variables
- **Prefix with NEXT_PUBLIC_** for client-side access
- **Never expose secret keys** to frontend
- **Update after backend deployment** with real URLs

## 🔌 Google APIs Setup

### OAuth Configuration
1. **Create credentials FIRST** in Google Cloud Console
2. **Set authorized redirect URIs** after getting real backend URL
3. **Test OAuth flow** in development before production
4. **Enable required APIs** (Sheets, Drive) before first use
5. **Store refresh tokens securely** with encryption

### Common Mistakes
- **Wrong redirect URI format**: Must match exactly including https://
- **Missing API enablement**: Enable Google Sheets and Drive APIs
- **Incorrect scope requests**: Request minimum necessary scopes
- **Hardcoded localhost URLs**: Update for production domains

## 🤖 Telegram Bot Integration

### Bot Setup Process
1. **Create bot with @BotFather** and save token immediately
2. **Test bot responds** to basic commands before integration
3. **Set webhook URLs** only after backend is fully deployed
4. **Handle bot token encryption** in database storage
5. **Implement graceful bot initialization** with error handling

### Multi-Bot Management
- **Design for multiple users** from the start
- **Isolate bot instances** by user ID
- **Handle bot initialization failures** gracefully
- **Implement bot shutdown procedures** for clean restarts

## 📝 Deployment Checklist Template

### Pre-Deployment
- [ ] All secrets collected and validated
- [ ] Database schema tested locally
- [ ] Environment variables documented
- [ ] .gitignore configured with comprehensive patterns
- [ ] No secrets in any committed files

### Database Setup (Supabase)
- [ ] Project created and URL noted
- [ ] Database schema executed successfully
- [ ] RLS policies tested
- [ ] Connection tested with service role key
- [ ] Tables and indexes created

### Backend Deployment (Railway)
- [ ] Repository connected
- [ ] All environment variables set (check for truncation)
- [ ] First deployment successful
- [ ] Database connection verified
- [ ] Railway domain noted for other services
- [ ] Health endpoint accessible

### Frontend Deployment (Netlify)
- [ ] Build configuration tested locally
- [ ] Environment variables set with real backend URL
- [ ] Deployment successful
- [ ] CORS working with backend
- [ ] Frontend domain noted for CORS configuration

### Integration Testing
- [ ] Backend-to-database connection working
- [ ] Frontend-to-backend API calls working
- [ ] OAuth flows functional (if applicable)
- [ ] External API integrations tested
- [ ] End-to-end user flows verified

## 🐛 Common Error Patterns & Solutions

### "Invalid API key" Errors
- **Usually means**: Missing database tables, not actually invalid keys
- **Solution**: Set up database schema first
- **Prevention**: Always test database connection with simple query

### "CORS" Errors
- **Usually means**: Frontend and backend URLs don't match CORS configuration
- **Solution**: Update CORS settings with actual deployed domains
- **Prevention**: Use environment variables for CORS origins

### Railway Build Failures
- **Usually means**: Wrong build configuration or missing dependencies
- **Solution**: Start with minimal configuration, add complexity gradually
- **Prevention**: Test build process locally first

### Environment Variable Issues
- **Usually means**: Truncated values or wrong variable names
- **Solution**: Verify complete values and exact naming
- **Prevention**: Use environment variable validation in application code

## 🎯 Success Metrics

A successful deployment should have:
- ✅ All services responding to health checks
- ✅ Database connections established
- ✅ No secrets in version control
- ✅ All environment variables properly set
- ✅ Frontend-backend communication working
- ✅ External API integrations functional
- ✅ Proper error handling and logging
- ✅ Clear documentation of all service URLs and configurations

## 📚 Documentation Requirements

Always document:
- **Service URLs and domains** (actual, not placeholders)
- **Environment variable schemas** with examples
- **Setup order and dependencies** between services
- **Common error scenarios** and their solutions
- **Testing procedures** for each integration
- **Rollback procedures** if deployment fails

---

**Remember**: The goal is predictable, repeatable deployments with clear error handling and comprehensive documentation. When in doubt, be explicit rather than making assumptions.