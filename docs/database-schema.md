# Database Schema Documentation

## Overview

The POS (CRM) database uses Supabase PostgreSQL with pgvector extension for vector similarity search.

## Tables

### contacts

Stores contact information and metadata.

- `id` (uuid) - Primary key
- `email` (text) - Contact email (unique)
- `name` (text) - Contact name
- `first_interaction` (timestamp) - First interaction date
- `last_interaction` (timestamp) - Last interaction date
- `profile_embedding` (vector) - Vector embedding of contact profile (1536 dimensions)
- `metadata` (jsonb) - Additional contact information
- `created_at` (timestamp)
- `updated_at` (timestamp)

### emails

Stores email messages with vector embeddings.

- `id` (uuid) - Primary key
- `message_id` (text) - Gmail message ID (unique)
- `thread_id` (text) - Gmail thread ID
- `subject` (text) - Email subject
- `body` (text) - Email body
- `sender` (text) - Sender email
- `recipient` (text) - Recipient email
- `received_at` (timestamp) - When email was received
- `category` (text) - AI-categorized category
- `intent` (text) - AI-detected intent
- `labels` (jsonb) - Gmail labels applied
- `content_embedding` (vector) - Vector embedding of email content (1536 dimensions)
- `metadata` (jsonb) - Additional email metadata
- `created_at` (timestamp)
- `updated_at` (timestamp)

### calendar_events

Stores Google Calendar events.

- `id` (uuid) - Primary key
- `event_id` (text) - Google Calendar event ID (unique)
- `title` (text) - Event title
- `description` (text) - Event description
- `start_time` (timestamp) - Event start time
- `end_time` (timestamp) - Event end time
- `location` (text) - Event location
- `attendees` (jsonb) - Array of attendee emails
- `status` (text) - Event status (confirmed, tentative, cancelled)
- `metadata` (jsonb) - Additional event metadata
- `created_at` (timestamp)
- `updated_at` (timestamp)

### interactions

Tracks all interactions (emails, calls, meetings).

- `id` (uuid) - Primary key
- `contact_id` (uuid) - Foreign key to contacts
- `email_id` (uuid) - Foreign key to emails (optional)
- `calendar_event_id` (uuid) - Foreign key to calendar_events (optional)
- `interaction_type` (text) - Type of interaction (email, call, meeting, etc.)
- `status` (text) - Interaction status (pending, completed, archived)
- `summary` (text) - AI-generated summary
- `metadata` (jsonb) - Additional interaction metadata
- `created_at` (timestamp)
- `updated_at` (timestamp)

### conversation_threads

Groups related emails into conversation threads.

- `id` (uuid) - Primary key
- `thread_id` (text) - Gmail thread ID (unique)
- `contact_id` (uuid) - Foreign key to contacts
- `subject` (text) - Thread subject
- `last_message_at` (timestamp) - Last message timestamp
- `message_count` (integer) - Number of messages in thread
- `status` (text) - Thread status (active, archived, resolved)
- `metadata` (jsonb) - Additional thread metadata
- `created_at` (timestamp)
- `updated_at` (timestamp)

### contact_insights

AI-generated insights and recommendations for contacts.

- `id` (uuid) - Primary key
- `contact_id` (uuid) - Foreign key to contacts (unique)
- `next_action` (text) - Suggested next action
- `suggested_message` (text) - AI-suggested message
- `relationship_stage` (text) - Relationship stage (new, developing, established, etc.)
- `priority` (integer) - Priority score for "who to talk to next"
- `last_insight_at` (timestamp) - When insights were last generated
- `insights` (jsonb) - Additional insights data
- `created_at` (timestamp)
- `updated_at` (timestamp)

### oauth_tokens

Stores encrypted OAuth refresh tokens.

- `id` (uuid) - Primary key
- `provider` (text) - OAuth provider (google, slack)
- `user_id` (text) - User identifier
- `access_token` (text) - Encrypted access token
- `refresh_token` (text) - Encrypted refresh token
- `expires_at` (timestamp) - Token expiration
- `scope` (text) - OAuth scopes granted
- `metadata` (jsonb) - Additional token metadata
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Vector Search

The database uses pgvector for similarity search:
- Email content embeddings (1536 dimensions)
- Contact profile embeddings (1536 dimensions)
- Vector indexes for fast similarity queries

## Indexes

- Vector indexes on embedding columns for similarity search
- Indexes on frequently queried columns (email, message_id, thread_id, etc.)

