# API Contracts - Slack VA Integration

This document defines the API contracts and integration points between Slack VA, Gmail-Context, CMA(Comps), and Relationship OS.

## Overview

Slack VA serves as the central hub that integrates:
- **Gmail-Context**: Auto-labeling service for Gmail emails
- **CMA(Comps)**: Comparative Market Analysis generation
- **Relationship OS**: CRM and relationship management

## Integration Architecture

```
┌─────────────┐
│  Slack VA   │ (Central Hub)
└──────┬──────┘
       │
       ├─── Gmail-Context (Auto-labeling)
       ├─── CMA(Comps) (Property Analysis)
       └─── Relationship OS (CRM)
```

## Gmail-Context Integration

### Service: `GmailLabelerService`

**Location:** `src/services/gmail-labeler.ts`

**Methods:**
- `processUnprocessedEmails(userId, maxEmails, notifySlack)` - Process and label emails
- `processEmail(userId, messageId, notifySlack)` - Process single email

**Integration Points:**
- Uses `AIService.classifyEmailForLabeling()` for email classification
- Uses `GmailService` for Gmail API operations
- Stores processed emails in `processedEmails` table
- Notifies Slack via `SlackService` for important labels

**Slack Command:**
- `/gmail auto-label [maxEmails]` - Trigger auto-labeling

**Data Flow:**
1. Fetch unprocessed emails from Gmail
2. Classify using AI with account-specific labels:
   - **bc@force101.com**: Calendar, CSX, GTM, LinkedIn-Interesting-Post, LinkedIn-Message, Other
   - **bc@coloradocollins.com**: Ads, Friends, Other, Social Media
3. Apply labels to Gmail
4. Store in database
5. Notify Slack (if important label: GTM, CSX, LinkedIn-Interesting-Post, LinkedIn-Message, Friends)

## CMA(Comps) Integration

### Service: `CMAService` + `PublicRecordsDataSource`

**Location:** 
- `src/services/cma.ts`
- `src/services/data-sources/public-records-data-source.ts`
- `src/services/cma-pdf.ts`

**Methods:**
- `CMAService.generateCMA()` - Generate CMA report
- `PublicRecordsDataSource.fetchComps()` - Fetch property comps
- `CMAPDFService.generatePDF()` - Generate PDF report

**Integration Points:**
- Uses public records as primary data source (safest, legal)
- Falls back to mock data if public records unavailable
- Generates PDF reports with comps and estimated values
- Stores CMA requests and comps in database

**Slack Command:**
- `/cma <address>` - Generate CMA
- `/cma status <cma-id>` - Check CMA status
- `/cma history` - View CMA history

**Data Flow:**
1. Parse property address and details
2. Fetch comps from public records (or mock)
3. Filter and rank comps by similarity
4. Calculate estimated value range
5. Generate PDF report
6. Store in database
7. Return results to Slack

## Relationship OS Integration

### Service: `RelationshipOSService`

**Location:** `src/services/relationship-os.ts`

**Methods:**
- `syncContactFromROS(rosContactId)` - Sync contact from Relationship OS
- `syncContactToROS(contactId)` - Sync contact to Relationship OS
- `getPrioritizedContacts(limit)` - Get prioritized contacts
- `shareEmailContext(emailId)` - Share email context
- `isAvailable()` - Check if Relationship OS is available

**Integration Points:**
- API-based integration (calls Relationship OS API)
- Falls back to local database if Relationship OS unavailable
- Shares contact, email, and interaction data
- Bi-directional sync for contacts

**Slack Commands:**
- `/crm who-next` - Get prioritized contacts (uses Relationship OS if available)
- `/crm what-to-say <contact>` - Get suggested message
- `/crm status <contact>` - Get contact status

**Data Flow:**
1. Check if Relationship OS is available
2. If available, call Relationship OS API
3. If unavailable, use local database
4. Sync contact data bi-directionally
5. Share email/calendar context

## Database Schema

### Shared Tables

**processedEmails** - Tracks emails processed by Gmail-Context
- `userId` - OAuth user ID
- `messageId` - Gmail message ID
- `labelName` - Applied label name
- `labelId` - Gmail label ID
- `processedAt` - Processing timestamp

**cmaRequests** - CMA generation requests
- `slackUserId` - Slack user ID (agent)
- `propertyAddress` - Property address
- `dataSource` - Data source used (public_records, mock, etc.)
- `estimatedValue` - Estimated value range (JSON)
- `pdfUrl` - PDF report URL

**cmaComps** - Comparable properties
- `cmaRequestId` - Reference to CMA request
- `address` - Comp property address
- `salePrice`, `listPrice` - Property prices
- `similarityScore` - Similarity to target property

**contacts** - Shared contact data
- Used by both Slack VA and Relationship OS
- Syncs bi-directionally

**contactInsights** - AI-generated insights
- Used for "who-next" prioritization
- Shared with Relationship OS

## Environment Variables

### Gmail-Context
- `SLACK_APPROVAL_CHANNEL` - Slack channel for notifications (optional)

### CMA(Comps)
- No additional environment variables required
- Public records data source is configured in code

### Relationship OS
- `RELATIONSHIP_OS_API_URL` - Relationship OS API endpoint (optional)
- If not set, falls back to local database

## Error Handling

All integrations use graceful degradation:
- **Gmail-Context**: Continues processing even if Slack notification fails
- **CMA**: Falls back to mock data if public records unavailable
- **Relationship OS**: Falls back to local database if API unavailable

## Future Enhancements

1. **Gmail-Context**:
   - Webhook-based real-time processing
   - Custom label configuration
   - Multi-account support

2. **CMA(Comps)**:
   - MLS integration (when agent has access)
   - Multiple data source aggregation
   - Advanced filtering and ranking

3. **Relationship OS**:
   - Real-time bi-directional sync
   - Conflict resolution
   - Batch sync operations

## Testing

### Gmail-Context
```bash
# Test auto-labeling
curl -X POST http://localhost:3001/test/gmail/auto-label
```

### CMA(Comps)
```bash
# Test CMA generation
curl -X POST http://localhost:3001/test/cma/generate \
  -d '{"address": "123 Main St, Denver, CO 80202"}'
```

### Relationship OS
```bash
# Test Relationship OS availability
curl http://localhost:3001/test/relationship-os/health
```

## Documentation

- Gmail-Context: See `src/services/gmail-labeler.ts`
- CMA(Comps): See `src/services/cma.ts` and `CMA-DISCOVERY.md`
- Relationship OS: See `src/services/relationship-os.ts`

