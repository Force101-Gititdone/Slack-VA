# Your Tasks - Slack VA Setup

## Quick Summary

**Agents are handling:** Code, Supabase setup, deployment config  
**You need to handle:** Credentials, npm fix, testing, deployment

**Estimated time:** 30-60 minutes (mostly credential setup)

---

## 🔧 Immediate Action Required

### 1. Fix npm Permissions (2 minutes)

Run this command in your terminal:
```bash
sudo chown -R 501:20 "/Users/bc/.npm"
```

Then install dependencies:
```bash
cd "/Users/bc/Cursor Projects/BCOS/Projects/Slack VA"
npm install
```

**Why:** npm cache has permission issues preventing dependency installation.

---

## 🔐 Credential Setup (20-40 minutes)

### 2. Supabase Project "pos" (5 minutes)

**After Clark creates the project:**

1. Go to Supabase dashboard: https://supabase.com/dashboard
2. Find project "pos"
3. Get credentials:
   - **Project URL**: Settings → API → Project URL
   - **Service Role Key**: Settings → API → service_role key (secret)
   - **Database URL**: Settings → Database → Connection string (URI)
4. Store in 1Password:
   - Vault: `Force101`
   - Item: `slack-va-supabase-pos`
   - Fields:
     - `SUPABASE_URL` = Project URL
     - `SUPABASE_SERVICE_ROLE_KEY` = Service role key
     - `SUPABASE_DATABASE_URL` = Database connection string

### 3. Slack App Setup (10 minutes)

1. Go to: https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. App name: `Slack VA` or `POS`
4. Workspace: Select your workspace
5. **Add Slash Commands:**
   - Features → Slash Commands → Create New Command
   - Command: `/gmail` → Description: "Gmail commands"
   - Command: `/calendar` → Description: "Calendar commands"
   - Command: `/crm` → Description: "CRM commands"
6. **OAuth & Permissions:**
   - Scopes → Bot Token Scopes → Add:
     - `chat:write`
     - `chat:write.public`
     - `commands`
     - `channels:read`
     - `users:read`
7. **Install App:**
   - Install to Workspace
   - Copy **Bot User OAuth Token** (starts with `xoxb-`)
   - Copy **Signing Secret** (from Basic Information)
8. **Store in 1Password:**
   - Vault: `Force101`
   - Item: `slack-va-slack-app`
   - Fields:
     - `SLACK_BOT_TOKEN` = Bot User OAuth Token
     - `SLACK_SIGNING_SECRET` = Signing Secret
     - `SLACK_CLIENT_ID` = App ID (from Basic Information)
     - `SLACK_CLIENT_SECRET` = Client Secret (from Basic Information)

### 4. Google OAuth Setup (10-15 minutes)

1. Go to: https://console.cloud.google.com/
2. Create new project (or select existing): `Slack VA` or `POS`
3. **Enable APIs:**
   - APIs & Services → Library
   - Enable: "Gmail API"
   - Enable: "Google Calendar API"
4. **Create OAuth Credentials:**
   - APIs & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Name: `Slack VA`
   - Authorized redirect URIs:
     - `http://localhost:3001/auth/google/callback`
     - (Add production URL later if needed)
   - Copy **Client ID** and **Client Secret**
5. **OAuth Consent Screen:**
   - APIs & Services → OAuth consent screen
   - User type: External (or Internal if workspace)
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.modify`
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
6. **Store in 1Password:**
   - Vault: `Force101`
   - Item: `slack-va-google-oauth`
   - Fields:
     - `GOOGLE_CLIENT_ID` = Client ID
     - `GOOGLE_CLIENT_SECRET` = Client Secret

### 5. OpenAI API Key (2 minutes)

1. Go to: https://platform.openai.com/api-keys
2. Create new API key
3. Copy key (starts with `sk-`)
4. **Store in 1Password:**
   - Vault: `Force101`
   - Item: `slack-va-openai`
   - Field: `OPENAI_API_KEY` = API key

### 6. Generate Encryption Key (1 minute)

Run in terminal:
```bash
openssl rand -hex 32
```

Copy the output (64 character hex string)

**Store in 1Password:**
- Vault: `Force101`
- Item: `slack-va-encryption`
- Field: `ENCRYPTION_KEY` = Generated key

---

## 📝 Environment File Setup (5 minutes)

### 7. Create .env File

```bash
cd "/Users/bc/Cursor Projects/BCOS/Projects/Slack VA"
cp .env.example .env
```

### 8. Fill in .env with 1Password References

Edit `.env` file and replace values with `op://` references:

```bash
# Supabase (from step 2)
SUPABASE_URL=op://Force101/slack-va-supabase-pos/SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=op://Force101/slack-va-supabase-pos/SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DATABASE_URL=op://Force101/slack-va-supabase-pos/SUPABASE_DATABASE_URL

# Slack (from step 3)
SLACK_BOT_TOKEN=op://Force101/slack-va-slack-app/SLACK_BOT_TOKEN
SLACK_SIGNING_SECRET=op://Force101/slack-va-slack-app/SLACK_SIGNING_SECRET
SLACK_CLIENT_ID=op://Force101/slack-va-slack-app/SLACK_CLIENT_ID
SLACK_CLIENT_SECRET=op://Force101/slack-va-slack-app/SLACK_CLIENT_SECRET

# Google OAuth (from step 4)
GOOGLE_CLIENT_ID=op://Force101/slack-va-google-oauth/GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=op://Force101/slack-va-google-oauth/GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# OpenAI (from step 5)
OPENAI_API_KEY=op://Force101/slack-va-openai/OPENAI_API_KEY

# Encryption (from step 6)
ENCRYPTION_KEY=op://Force101/slack-va-encryption/ENCRYPTION_KEY
```

---

## 🧪 Testing (10-15 minutes)

### 9. Test Server Startup

```bash
cd "/Users/bc/Cursor Projects/BCOS/Projects/Slack VA"
npm run dev
```

Should see:
```
🚀 Slack VA server listening on port 3001
✅ Slack Bolt app started
```

### 10. Test OAuth Flow

1. Open browser: `http://localhost:3001/auth/google`
2. Sign in with Google
3. Grant permissions
4. Should see: "✅ Authentication successful!"

### 11. Test Slack Commands

In Slack, try:
- `/gmail categorize` - Should categorize recent emails
- `/gmail query "test"` - Should query emails
- `/calendar query` - Should show upcoming events
- `/crm who-next` - Should show contacts (may be empty initially)

---

## 🚀 Deployment (After Testing - Optional)

### 12. Deploy to Zeus

Follow guide: `docs/zeus-deployment-guide.md` (Linus will create this)

Or use deployment script:
```bash
./Infrastructure/Zeus/scripts/deploy-to-zeus.sh
```

---

## ✅ Checklist

- [ ] Fix npm permissions
- [ ] Install dependencies
- [ ] Get Supabase credentials (after Clark creates project)
- [ ] Set up Slack app
- [ ] Set up Google OAuth
- [ ] Get OpenAI API key
- [ ] Generate encryption key
- [ ] Store all in 1Password
- [ ] Create .env file with op:// references
- [ ] Test server startup
- [ ] Test OAuth flow
- [ ] Test Slack commands
- [ ] Deploy to Zeus (optional)

---

## 📞 Need Help?

- Check `SETUP-NEXT-STEPS.md` for detailed guides
- Check `AGENT-TASKS.md` to see what agents are doing
- Check `CLARK-HANDOFF.md` for Supabase status
- Check `LINUS-HANDOFF.md` for deployment status

---

**Priority Order:**
1. Fix npm (blocks everything)
2. Credentials (blocks testing)
3. Testing (validates setup)
4. Deployment (when ready)

