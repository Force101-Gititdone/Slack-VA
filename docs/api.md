# API Documentation

## Slack Commands

### Gmail Commands

- `/gmail categorize` - Categorize recent emails and apply labels
- `/gmail query <query>` - Query emails using natural language

### Calendar Commands

- `/calendar schedule <description>` - Schedule a new event
- `/calendar query <query>` - Query calendar events
- `/calendar availability` - Check availability

### CRM Commands

- `/crm who-next` - Get prioritized list of contacts to reach out to
- `/crm what-to-say <contact>` - Get suggested message for a contact
- `/crm status <contact>` - Get interaction status with a contact

## REST API Endpoints

### Health Check

- `GET /health` - Health check endpoint

### Slack Webhooks

- `POST /slack/events` - Slack event webhook

## Authentication

All API endpoints require proper authentication:
- Slack commands use Slack signing secret verification
- OAuth flows for Google APIs
- Service-to-service uses API keys stored in 1Password

