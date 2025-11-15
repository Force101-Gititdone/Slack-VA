# Clark Handoff - Supabase Setup for Slack VA

## Task: Create New Supabase Project "pos" (Personal Operating System)

### Objective
Create a new Supabase project specifically for Slack VA with the name "pos" and set up the complete database schema with pgvector support.

### Steps for Clark

1. **Create Supabase Project**
   - Project Name: `pos` (Personal Operating System)
   - Region: Choose appropriate (us-east-2 recommended for consistency)
   - Database Password: Generate secure password, store in 1Password
   - Wait for project provisioning (2-3 minutes)

2. **Enable pgvector Extension**
   - Go to SQL Editor in Supabase dashboard
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
   - Verify: `SELECT * FROM pg_extension WHERE extname = 'vector';`

3. **Run Database Schema**
   - Use schema from: `docs/database-schema.sql`
   - Execute entire SQL file in Supabase SQL Editor
   - Verify all tables created: Check for 7 tables (contacts, emails, calendar_events, interactions, conversation_threads, contact_insights, oauth_tokens)

4. **Verify Indexes**
   - Check vector indexes are created
   - Verify standard indexes on frequently queried columns
   - Test: `SELECT * FROM pg_indexes WHERE tablename IN ('emails', 'contacts');`

5. **Get Connection Details**
   - Project URL: `https://[project-id].supabase.co`
   - Service Role Key: From Settings → API
   - Database URL: From Settings → Database → Connection string (URI format)

6. **Document Credentials Location**
   - Store in 1Password: `Force101` vault
   - Item name: `slack-va-supabase-pos`
   - Fields:
     - `SUPABASE_URL`: Project URL
     - `SUPABASE_SERVICE_ROLE_KEY`: Service role key
     - `SUPABASE_DATABASE_URL`: Connection string
   - Document location in: `SUPABASE-CREDENTIALS.md`

7. **Create Verification Script**
   - Script to test connection
   - Verify tables exist
   - Verify pgvector extension enabled
   - Verify indexes created

### Files to Create/Update

- `SUPABASE-CREDENTIALS.md` - Credential locations and connection details
- `scripts/verify-supabase-setup.sh` - Verification script
- Update `SETUP-NEXT-STEPS.md` with Supabase project details

### Success Criteria

- ✅ Supabase project "pos" created and active
- ✅ pgvector extension enabled
- ✅ All 7 tables created with correct schema
- ✅ Vector indexes created (HNSW indexes)
- ✅ Standard indexes created
- ✅ Credentials documented in 1Password
- ✅ Verification script passes

### Notes

- Use existing Social Content Generator project as reference for structure
- Follow BCOS security practices (1Password, op run)
- Document everything in Markdown
- Test connection before marking complete
- make backups and ask questions as multiple choice before proceeding

---

**Status:** Ready for Clark to execute
**Priority:** High (blocks environment setup)
**Estimated Time:** 15-20 minutes

