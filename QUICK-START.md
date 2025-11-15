# Slack VA - Quick Start Guide

## 🚀 Current Status

✅ **Code:** Complete and compiled  
✅ **Dependencies:** Installed  
⏳ **Supabase:** Waiting for Clark to create project "pos"  
✅ **Ready for:** Credential setup (Slack, Google, OpenAI)

---

## 📋 What You Can Do Right Now

While waiting for Supabase, you can set up these credentials:

### 1. Generate Encryption Key (1 minute)
```bash
./scripts/generate-encryption-key.sh
```
Copy the output and store in 1Password: `Force101` → `slack-va-encryption` → `ENCRYPTION_KEY`

### 2. Set Up Slack App (10 minutes)
Follow the checklist in `CREDENTIALS-CHECKLIST.md` section 2

### 3. Set Up Google OAuth (10-15 minutes)
Follow the checklist in `CREDENTIALS-CHECKLIST.md` section 3

### 4. Get OpenAI API Key (2 minutes)
Follow the checklist in `CREDENTIALS-CHECKLIST.md` section 4

---

## ⏳ After Supabase Project is Ready

### 5. Get Supabase Credentials (5 minutes)
1. Go to Supabase dashboard
2. Find project "pos"
3. Get credentials (see `CREDENTIALS-CHECKLIST.md` section 1)
4. Store in 1Password

### 6. Create .env File (5 minutes)
```bash
cp .env.example .env
```
Then edit `.env` and fill in all `op://` references using your 1Password items.

### 7. Verify Setup
```bash
./scripts/verify-env.sh
```

### 8. Test Server
```bash
./scripts/test-server.sh
npm run dev
```

---

## 🧪 Testing Checklist

Once server is running:

- [ ] Health check: `curl http://localhost:3001/health`
- [ ] OAuth flow: Visit `http://localhost:3001/auth/google`
- [ ] Slack command: `/gmail categorize` in Slack
- [ ] Slack command: `/gmail query "test"`
- [ ] Slack command: `/calendar query`
- [ ] Slack command: `/crm who-next`

---

## 📚 Reference Documents

- `CREDENTIALS-CHECKLIST.md` - Complete credential setup guide
- `USER-TASKS-SUMMARY.md` - Your task list
- `WALKTHROUGH.md` - Step-by-step walkthrough
- `STATUS.md` - Current project status

---

## 🆘 Need Help?

- Check `CREDENTIALS-CHECKLIST.md` for detailed instructions
- Check `STATUS.md` to see what agents are working on
- All scripts are in `scripts/` directory

