# Supabase Setup Guide - Project "pos"

## Overview

This guide walks you through creating the Supabase project "pos" (Personal Operating System) for Slack VA.

**Project Name:** `pos`  
**Purpose:** Personal Operating System - CRM database for Slack VA

---

## Step 1: Create Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in (or create account)

2. **Create New Project**
   - Click "New Project"
   - **Organization:** Select your organization (or create one)
   - **Name:** `pos`
   - **Database Password:** 
     - Generate a strong password (save it securely!)
     - Or use 1Password password generator
     - **Important:** You'll need this for the database connection string
   - **Region:** Choose closest to you (us-east-2 recommended for consistency)
   - **Pricing Plan:** Free tier is fine to start

3. **Wait for Provisioning**
   - Takes 2-3 minutes
   - You'll see "Setting up your project..." message
   - Wait until status shows "Active"

---

## Step 2: Enable pgvector Extension

1. **Open SQL Editor**
   - In Supabase dashboard, click "SQL Editor" in left sidebar
   - Click "New query"

2. **Run This SQL:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Verify Extension:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'vector';
   ```
   - Should return 1 row showing vector extension

---

## Step 3: Run Database Schema

1. **Open SQL Editor** (if not already open)
   - Click "New query"

2. **Copy and Paste Schema**
   - Open file: `docs/database-schema.sql`
   - Copy entire contents
   - Paste into SQL Editor

3. **Run the Query**
   - Click "Run" (or press Cmd/Ctrl + Enter)
   - Should see "Success. No rows returned" or similar

4. **Verify Tables Created:**
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```
   - Should see 7 tables:
     - calendar_events
     - contacts
     - contact_insights
     - conversation_threads
     - emails
     - interactions
     - oauth_tokens

5. **Verify Indexes:**
   ```sql
   SELECT indexname, tablename 
   FROM pg_indexes 
   WHERE schemaname = 'public' 
   ORDER BY tablename, indexname;
   ```
   - Should see multiple indexes including vector indexes

---

## Step 4: Get Connection Details

1. **Project URL**
   - Go to: Settings → API
   - Copy "Project URL" (looks like: `https://xxxxx.supabase.co`)
   - This is your `SUPABASE_URL`

2. **Service Role Key**
   - Still in Settings → API
   - Find "service_role" key (under "Project API keys")
   - Click "Reveal" and copy the key
   - **⚠️ Keep this secret!** This is your `SUPABASE_SERVICE_ROLE_KEY`

3. **Database Connection String**
   - Go to: Settings → Database
   - Scroll to "Connection string"
   - Select "URI" tab
   - Copy the connection string
   - **Replace `[YOUR-PASSWORD]` with the database password you set in Step 1**
   - This is your `SUPABASE_DATABASE_URL`
   - Format: `postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres`

---

## Step 5: Store Credentials in 1Password

1. **Create New Item in 1Password**
   - Vault: `Force101`
   - Item name: `slack-va-supabase-pos`
   - Item type: "Password" or "Secure Note"

2. **Add Fields:**
   - Field 1:
     - Label: `SUPABASE_URL`
     - Value: Your Project URL (from Step 4.1)
     - Type: Text
   - Field 2:
     - Label: `SUPABASE_SERVICE_ROLE_KEY`
     - Value: Your service role key (from Step 4.2)
     - Type: Password (concealed)
   - Field 3:
     - Label: `SUPABASE_DATABASE_URL`
     - Value: Your database connection string (from Step 4.3)
     - Type: Password (concealed)

3. **Save the Item**

---

## Step 6: Verify Setup

Run this SQL to verify everything is set up correctly:

```sql
-- Check extensions
SELECT extname, extversion FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector');

-- Check tables
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Check vector indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE indexdef LIKE '%vector%' AND schemaname = 'public';

-- Check sample data (should be empty initially)
SELECT COUNT(*) FROM contacts;
SELECT COUNT(*) FROM emails;
```

**Expected Results:**
- 2 extensions (uuid-ossp and vector)
- 7 tables
- 2 vector indexes (on emails and contacts)
- 0 rows in contacts and emails (empty initially)

---

## ✅ Setup Complete!

Once you've completed all steps:

1. ✅ Project "pos" created
2. ✅ pgvector extension enabled
3. ✅ All tables created
4. ✅ Indexes created
5. ✅ Credentials stored in 1Password

**Next Steps:**
- Update your `.env` file with op:// references
- Run `./scripts/verify-env.sh` to check setup
- Test server: `npm run dev`

---

## 🆘 Troubleshooting

### Extension Not Found
- Make sure you're running SQL in the correct project
- Try: `CREATE EXTENSION vector;` (without IF NOT EXISTS)

### Tables Not Created
- Check for SQL errors in the SQL Editor
- Make sure you copied the entire schema file
- Try running sections one at a time

### Connection String Issues
- Make sure you replaced `[YOUR-PASSWORD]` with actual password
- Verify password is correct (try connecting with psql)
- Check that database is in "Active" status

### Vector Indexes Not Created
- Vector extension must be enabled first
- Check: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- If missing, enable it and recreate indexes

---

## 📚 Reference

- Schema file: `docs/database-schema.sql`
- Schema documentation: `docs/database-schema.md`
- Credentials checklist: `CREDENTIALS-CHECKLIST.md`

