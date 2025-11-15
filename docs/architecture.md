# Slack VA Architecture

## Overview

Slack VA is built as a TypeScript/Node.js Express application that integrates with Gmail, Google Calendar, and Slack APIs to provide intelligent email and calendar management through Slack commands.

## System Architecture

### Components

1. **Express Server** - Main application server
2. **Slack Bolt App** - Handles Slack interactions and commands
3. **Gmail Service** - Integrates with Gmail API for email operations
4. **Calendar Service** - Integrates with Google Calendar API
5. **AI Service** - OpenAI integration for categorization and intent understanding
6. **Embeddings Service** - Vector embedding generation and similarity search
7. **Database Layer** - Supabase PostgreSQL with pgvector

### Data Flow

```
Slack Command → Slack Bolt → Command Handler → Service Layer → API/Database → Response → Slack
```

## Technology Stack

- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL with pgvector)
- **ORM:** Drizzle ORM
- **AI:** OpenAI (GPT-4o-mini, GPT-4o, text-embedding-3-small)
- **APIs:** Gmail API, Google Calendar API, Slack API

## Security

- OAuth tokens encrypted before storage
- All secrets managed via 1Password `op run`
- Service binds to localhost only (127.0.0.1)
- Access via SSH tunnel on Zeus server

## Deployment

- **Environment:** Zeus server (VPS)
- **Service:** systemd service
- **Access:** SSH tunnel to localhost:3001
- **Logs:** journald

