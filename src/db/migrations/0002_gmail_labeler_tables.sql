-- Migration: Add Gmail Labeler tables
-- Created: 2025-01-27

-- Processed Emails table (tracks emails processed by Gmail labeler to avoid duplicates)
CREATE TABLE IF NOT EXISTS processed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  label_name TEXT,
  label_id TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_processed_emails_user_id ON processed_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_message_id ON processed_emails(message_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_user_message ON processed_emails(user_id, message_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_processed_at ON processed_emails(processed_at DESC);

-- Unique constraint to prevent duplicate processing
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_emails_unique ON processed_emails(user_id, message_id);

