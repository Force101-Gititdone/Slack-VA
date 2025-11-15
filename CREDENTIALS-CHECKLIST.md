# Credentials Setup Checklist

Use this checklist to track your progress. Check off each item as you complete it.

## 🔐 Required Credentials

### 1. Supabase Project "pos" ⏳ (Waiting for Clark)
- [ ] Project created by Clark
- [ ] Get Project URL from Supabase dashboard
- [ ] Get Service Role Key (Settings → API → service_role key)
- [ ] Get Database URL (Settings → Database → Connection string)
- [ ] Store in 1Password: `Force101` vault → `slack-va-supabase-pos`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `SUPABASE_DATABASE_URL`

**Status:** ⏳ Waiting for Clark to create project

---

### 2. Slack App ✅ (You can do this now)
- [ ] Go to https://api.slack.com/apps
- [ ] Click "Create New App" → "From scratch"
- [ ] App name: `Slack VA` or `POS`
- [ ] Select your workspace
- [ ] **Add Slash Commands:**
  - [ ] Features → Slash Commands → Create New Command
  - [ ] Command: `/gmail` → Description: "Gmail commands"
  - [ ] Command: `/calendar` → Description: "Calendar commands"
  - [ ] Command: `/crm` → Description: "CRM commands"
- [ ] **OAuth & Permissions:**
  - [ ] Scopes → Bot Token Scopes → Add:
    - [ ] `chat:write`
    - [ ] `chat:write.public`
    - [ ] `commands`
    - [ ] `channels:read`
    - [ ] `users:read`
- [ ] **Install App:**
  - [ ] Install to Workspace
  - [ ] Copy Bot User OAuth Token (starts with `xoxb-`)
  - [ ] Copy Signing Secret (from Basic Information)
  - [ ] Copy App ID (from Basic Information)
  - [ ] Copy Client Secret (from Basic Information → App Credentials)
- [ ] Store in 1Password: `Force101` vault → `slack-va-slack-app`
  - [ ] `SLACK_BOT_TOKEN`
  - [ ] `SLACK_SIGNING_SECRET`
  - [ ] `SLACK_CLIENT_ID`
  - [ ] `SLACK_CLIENT_SECRET`

**Estimated Time:** 10 minutes

---

### 3. Google OAuth (Gmail & Calendar) ✅ (You can do this now)
- [ ] Go to https://console.cloud.google.com/
- [ ] Create new project (or select existing): `Slack VA` or `POS`
- [ ] **Enable APIs:**
  - [ ] APIs & Services → Library
  - [ ] Search "Gmail API" → Enable
  - [ ] Search "Google Calendar API" → Enable
- [ ] **OAuth Consent Screen:**
  - [ ] APIs & Services → OAuth consent screen
  - [ ] User type: External (or Internal if workspace)
  - [ ] Fill in required fields (App name, support email, etc.)
  - [ ] Add scopes:
    - [ ] `https://www.googleapis.com/auth/gmail.readonly`
    - [ ] `https://www.googleapis.com/auth/gmail.modify`
    - [ ] `https://www.googleapis.com/auth/calendar`
    - [ ] `https://www.googleapis.com/auth/calendar.events`
- [ ] **Create OAuth Credentials:**
  - [ ] APIs & Services → Credentials
  - [ ] Create Credentials → OAuth client ID
  - [ ] Application type: Web application
  - [ ] Name: `Slack VA`
  - [ ] Authorized redirect URIs:
    - [ ] `http://localhost:3001/auth/google/callback`
    - [ ] (Add production URL later if needed)
  - [ ] Copy Client ID
  - [ ] Copy Client Secret
- [ ] Store in 1Password: `Force101` vault → `slack-va-google-oauth`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`

**Estimated Time:** 10-15 minutes

---

### 4. OpenAI API Key ✅ (You can do this now)
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Sign in (or create account)
- [ ] Click "Create new secret key"
- [ ] Name: `Slack VA` (optional)
- [ ] Copy key (starts with `sk-`) - **Save immediately, can't view again!**
- [ ] Store in 1Password: `Force101` vault → `slack-va-openai`
  - [ ] `OPENAI_API_KEY`

**Estimated Time:** 2 minutes

---

### 5. Encryption Key ✅ (You can do this now)
- [ ] Open terminal
- [ ] Run: `openssl rand -hex 32`
- [ ] Copy the output (64 character hex string)
- [ ] Store in 1Password: `Force101` vault → `slack-va-encryption`
  - [ ] `ENCRYPTION_KEY`

**Estimated Time:** 1 minute

---

## 📝 After All Credentials Are Stored

### 6. Create .env File
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all `op://` references
- [ ] Verify all variables are set

**Estimated Time:** 5 minutes

---

## ✅ Quick Status

- **Supabase:** ⏳ Waiting for Clark
- **Slack:** ✅ Ready to set up
- **Google OAuth:** ✅ Ready to set up
- **OpenAI:** ✅ Ready to set up
- **Encryption Key:** ✅ Ready to generate

**Total Time (excluding Supabase):** ~25-30 minutes

---

## 🎯 Next Steps After Credentials

1. Test server startup
2. Test OAuth flow
3. Test Slack commands
4. Deploy to Zeus (optional)

