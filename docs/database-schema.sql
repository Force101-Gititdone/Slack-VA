-- Slack VA Database Schema
-- Run this SQL in Supabase SQL Editor to create all required tables
-- Make sure pgvector extension is enabled first: CREATE EXTENSION IF NOT EXISTS vector;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  first_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  profile_embedding vector(1536), -- Vector embedding for similarity search
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Emails table
CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT NOT NULL UNIQUE, -- Gmail message ID
  thread_id TEXT, -- Gmail thread ID
  subject TEXT,
  body TEXT,
  sender TEXT NOT NULL,
  recipient TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  category TEXT, -- AI-categorized category
  intent TEXT, -- AI-detected intent
  labels JSONB, -- Gmail labels applied
  content_embedding vector(1536), -- Vector embedding for similarity search
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE, -- Google Calendar event ID
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  attendees JSONB, -- Array of attendee emails
  status TEXT DEFAULT 'confirmed', -- confirmed, tentative, cancelled
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id),
  email_id UUID REFERENCES emails(id),
  calendar_event_id UUID REFERENCES calendar_events(id),
  interaction_type TEXT NOT NULL, -- email, call, meeting, etc.
  status TEXT DEFAULT 'pending', -- pending, completed, archived
  summary TEXT, -- AI-generated summary
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Conversation threads table
CREATE TABLE IF NOT EXISTS conversation_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL UNIQUE, -- Gmail thread ID
  contact_id UUID REFERENCES contacts(id),
  subject TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL,
  message_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active', -- active, archived, resolved
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Contact insights table
CREATE TABLE IF NOT EXISTS contact_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) NOT NULL UNIQUE,
  next_action TEXT, -- Suggested next action
  suggested_message TEXT, -- AI-suggested message
  relationship_stage TEXT, -- new, developing, established, etc.
  priority INTEGER DEFAULT 0, -- Priority score for "who to talk to next"
  last_insight_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  insights JSONB, -- Additional insights data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- OAuth tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- google, slack
  user_id TEXT, -- User identifier
  access_token TEXT, -- Encrypted
  refresh_token TEXT NOT NULL, -- Encrypted
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT, -- OAuth scopes granted
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_sender ON emails(sender);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);
CREATE INDEX IF NOT EXISTS idx_emails_category ON emails(category);

CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts(last_interaction);

CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON interactions(status);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_status ON calendar_events(status);

CREATE INDEX IF NOT EXISTS idx_contact_insights_priority ON contact_insights(priority DESC);
CREATE INDEX IF NOT EXISTS idx_contact_insights_contact_id ON contact_insights(contact_id);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);

-- Create vector indexes for similarity search (using HNSW for performance)
CREATE INDEX IF NOT EXISTS idx_emails_content_embedding ON emails USING hnsw (content_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_profile_embedding ON contacts USING hnsw (profile_embedding vector_cosine_ops);

