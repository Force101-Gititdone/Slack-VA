# Slack VA (Virtual Assistant)

Intelligent Slack bot that interprets Gmail messages, manages Google Calendar, maintains a vector-capable CRM database, and generates Comparative Market Analysis (CMA) reports.

## Commands

### CMA (Comparative Market Analysis)

Generate CMA reports for real estate properties.

#### Generate CMA
```
/cma <address>
/cma generate <address> [beds] [baths] [sqft]
```

**Examples:**
- `/cma 123 Main St, Denver, CO 80202`
- `/cma 456 Oak Ave, Denver, CO 80203 3 2 1800`
- `/cma generate 789 Elm St, Denver, CO 80204 4 3 2200`

**Description:**
Generates a Comparative Market Analysis report for the specified property address. Optionally include property details (beds, baths, square footage) for more accurate comparable property matching.

**Response includes:**
- Estimated value range (low, mid, high)
- Top comparable properties with details
- Property information and CMA ID

#### Check CMA Status
```
/cma status <cma-id>
```

**Example:**
- `/cma status abc123-def456-ghi789`

**Description:**
Check the status of a CMA generation request. Useful for tracking progress of long-running requests.

#### View CMA History
```
/cma history
```

**Description:**
View your last 10 CMA requests with status, estimated values, and property addresses.

### Gmail

Categorize and query Gmail messages.

- `/gmail categorize` - Categorize recent emails
- `/gmail query <query>` - Search emails using natural language

### Calendar

Manage Google Calendar events.

- `/calendar schedule <description>` - Schedule a new event
- `/calendar query` - Query calendar events

### CRM

Manage contacts and relationships.

- `/crm who-next` - Get prioritized list of contacts to reach out to
- `/crm what-to-say <contact>` - Get suggested message for a contact
- `/crm status <contact>` - Get contact status and interaction history

## Setup

See [QUICK-START.md](./QUICK-START.md) for setup instructions.

## Deployment

See [DEPLOYMENT-STATUS.md](./DEPLOYMENT-STATUS.md) for deployment information.
