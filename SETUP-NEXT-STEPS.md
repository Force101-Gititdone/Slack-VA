# Slack VA - Next Steps Setup Guide

## Current Status ✅

- ✅ Project structure created
- ✅ All code files in place
- ✅ Database schema ready
- ✅ Documentation complete
- ⚠️ Dependencies need installation (npm cache permission issue)
- ⚠️ Environment variables need configuration
- ⚠️ Supabase project needs setup
- ⚠️ OAuth credentials need setup

## Step-by-Step Setup

### Step 1: Fix npm Cache Permissions (One-time)

```bash
sudo chown -R 501:20 "/Users/bc/.npm"
```

Then install dependencies:
```bash
cd "/Users/bc/Cursor Projects/BCOS/Projects/Slack VA"
npm install
```

### Step 2: Set Up Supabase Database

**Option A: Use Existing Supabase Project**
- If you have the Social Content Generator Supabase project, we can use that
- Just need to run the schema SQL to create new tables

**Option B: Create New Supabase Project**
1. Go to https://supabase.com
2. Create new project
3. Note your project URL and service role key
4. Enable pgvector extension in SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. Run the schema from `docs/database-schema.sql`

**Questions for you:**
- Do you want to use existing Supabase project or create new one?
- Do you have Supabase credentials already?

### Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in values (use 1Password `op://` references where possible)

3. Required credentials:
   - Supabase URL and keys
   - Slack app credentials
   - Google OAuth credentials
   - OpenAI API key
   - Encryption key (generate with `openssl rand -hex 32`)

### Step 4: Set Up Slack App

1. Go to https://api.slack.com/apps
2. Create new app
3. Add slash commands: `/gmail`, `/calendar`, `/crm`
4. Set up OAuth scopes
5. Install to workspace
6. Copy Bot Token and Signing Secret

### Step 5: Set Up Google OAuth

Follow the guide in `scripts/setup-gmail-oauth.sh`:
1. Create Google Cloud Project
2. Enable Gmail API and Calendar API
3. Create OAuth 2.0 credentials
4. Set redirect URI

### Step 6: Test Basic Server

```bash
npm run dev
```

Should start on port 3001. Test health endpoint:
```bash
curl http://localhost:3001/health
```

## What I Need From You

Before proceeding, please let me know:

1. **npm permissions**: Should I fix the npm cache permissions?
2. **Supabase**: Do you have an existing project or want to create new?
3. **Credentials**: Which credentials do you already have?
4. **Priority**: What should we tackle first?

## Backup Created ✅

Backup location: `Infrastrcture/backups/backup-slack-va-[timestamp]`

