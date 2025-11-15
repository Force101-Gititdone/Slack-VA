-- Verification Script for Supabase Setup
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check Extensions
SELECT 
    'Extensions' as check_type,
    extname as name,
    extversion as version
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'vector')
ORDER BY extname;

-- 2. Check Tables
SELECT 
    'Tables' as check_type,
    table_name as name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_name = t.table_name 
     AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. Check Vector Columns
SELECT 
    'Vector Columns' as check_type,
    table_name as name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND (column_name LIKE '%embedding%' OR data_type LIKE '%vector%')
ORDER BY table_name, column_name;

-- 4. Check Indexes (including vector indexes)
SELECT 
    'Indexes' as check_type,
    tablename as table_name,
    indexname as index_name,
    CASE 
        WHEN indexdef LIKE '%vector%' THEN 'Vector Index'
        WHEN indexdef LIKE '%UNIQUE%' THEN 'Unique Index'
        ELSE 'Standard Index'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 5. Check Row Counts (should be 0 initially)
SELECT 
    'Row Counts' as check_type,
    'contacts' as table_name,
    COUNT(*) as row_count
FROM contacts
UNION ALL
SELECT 
    'Row Counts',
    'emails',
    COUNT(*)
FROM emails
UNION ALL
SELECT 
    'Row Counts',
    'calendar_events',
    COUNT(*)
FROM calendar_events
UNION ALL
SELECT 
    'Row Counts',
    'interactions',
    COUNT(*)
FROM interactions
UNION ALL
SELECT 
    'Row Counts',
    'conversation_threads',
    COUNT(*)
FROM conversation_threads
UNION ALL
SELECT 
    'Row Counts',
    'contact_insights',
    COUNT(*)
FROM contact_insights
UNION ALL
SELECT 
    'Row Counts',
    'oauth_tokens',
    COUNT(*)
FROM oauth_tokens;

-- Summary
SELECT 
    'SUMMARY' as check_type,
    'Total Tables' as name,
    COUNT(*)::text as value
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'SUMMARY',
    'Total Indexes',
    COUNT(*)::text
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'SUMMARY',
    'Vector Extensions',
    COUNT(*)::text
FROM pg_extension
WHERE extname = 'vector';

