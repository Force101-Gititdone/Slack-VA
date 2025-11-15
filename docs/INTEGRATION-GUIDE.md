# Slack VA Integration Guide

Complete guide for integrating Gmail-Context, CMA(Comps), and Relationship OS into Slack VA.

## Overview

This guide covers the 13-day integration plan implementation, including:
- Gmail-Context auto-labeling integration
- CMA(Comps) public records data source
- Relationship OS CRM connection
- Shared database schema
- API contracts

## Day 1-3: Foundation & Deployment

### SSL Certificate Setup

**Script:** `scripts/setup-ssl-certificate.sh`

**Usage:**
```bash
# On Zeus server
sudo bash scripts/setup-ssl-certificate.sh
```

**Requirements:**
- DNS configured (slackva.force101.com → 72.60.170.161)
- Hostinger firewall opened (ports 80, 443)
- nginx configured (see `scripts/setup-nginx-production.sh`)

### Slack App Configuration

After SSL certificate is obtained:
1. Update Slack app Request URL to: `https://slackva.force101.com/slack/events`
2. Enable Event Subscriptions
3. Subscribe to bot events: `app_mention`, `message.channels`
4. Configure slash commands: `/gmail`, `/calendar`, `/crm`, `/cma`

## Day 4-6: CMA Integration

### Public Records Data Source

**File:** `src/services/data-sources/public-records-data-source.ts`

**Implementation:**
- Placeholder implementation ready for real API integration
- Returns mock data structured like public records
- Validates ZIP code extraction
- Simulates 30-180 day data delay (typical for public records)

**To Implement Real Public Records:**
1. Identify county assessor API for target ZIP codes
2. Implement API client in `PublicRecordsDataSource.fetchComps()`
3. Add authentication/API keys to environment variables
4. Update `validateAccess()` to check API availability

### PDF Generation

**File:** `src/services/cma-pdf.ts`

**Current Implementation:**
- Generates HTML file (can be converted to PDF)
- Includes all CMA data: comps, estimated values, disclaimers
- Styled with CSS for professional appearance

**To Add Real PDF Generation:**
1. Install PDF library: `npm install pdfkit` or `npm install puppeteer`
2. Update `CMAPDFService.generatePDF()` to use library
3. Upload PDFs to S3/storage and return URLs
4. Update `cmaRequests.pdfUrl` with storage URL

## Day 7-9: Gmail-Context Integration

### Auto-Labeling Service

**File:** `src/services/gmail-labeler.ts`

**Features:**
- Ports n8n workflow logic to TypeScript
- Uses same label classification as n8n workflow
- Processes unprocessed emails automatically
- Notifies Slack for important labels

**Slack Command:**
```
/gmail auto-label [maxEmails]
```

**Configuration:**
- Account-specific labels:
  - **bc@force101.com**: Calendar, CSX, GTM, LinkedIn-Interesting-Post, LinkedIn-Message, Other
  - **bc@coloradocollins.com**: Ads, Friends, Other, Social Media
- Important labels (GTM, CSX, LinkedIn-Interesting-Post, LinkedIn-Message, Friends) trigger Slack notifications
- Processes emails in batches (default: 50)

**Database:**
- Tracks processed emails in `processedEmails` table
- Prevents duplicate processing
- Stores label name and ID for reference

## Day 10-12: Relationship OS Connection

### Integration Service

**File:** `src/services/relationship-os.ts`

**Features:**
- API-based integration with Relationship OS
- Graceful fallback to local database
- Bi-directional contact sync
- Email context sharing

**Configuration:**
- Set `RELATIONSHIP_OS_API_URL` environment variable
- If not set, uses local database only

**Methods:**
- `syncContactFromROS()` - Import contact from Relationship OS
- `syncContactToROS()` - Export contact to Relationship OS
- `getPrioritizedContacts()` - Get "who-next" list
- `shareEmailContext()` - Share email data

**CRM Commands:**
- `/crm who-next` - Uses Relationship OS if available
- `/crm what-to-say <contact>` - Gets suggested message
- `/crm status <contact>` - Shows contact status

## Database Schema Updates

### New Tables

**processedEmails** - Tracks Gmail-Context processed emails
```sql
CREATE TABLE processed_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  label_name TEXT,
  label_id TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**cmaRequests** - Already exists, updated with:
- `dataSource` field (public_records, mock, etc.)
- `pdfUrl` field for PDF reports

**cmaComps** - Already exists, no changes needed

### Shared Data Model

**contacts** - Shared between Slack VA and Relationship OS
- Syncs bi-directionally
- Used for CRM features

**contactInsights** - AI-generated insights
- Used for "who-next" prioritization
- Shared with Relationship OS

## Testing

### Gmail-Context
```bash
# Test auto-labeling
npm run dev
# In Slack: /gmail auto-label
```

### CMA(Comps)
```bash
# Test CMA generation
npm run dev
# In Slack: /cma 123 Main St, Denver, CO 80202
```

### Relationship OS
```bash
# Test Relationship OS connection
npm run dev
# In Slack: /crm who-next
```

## Deployment

### Local Development
```bash
cd "/Users/bc/Cursor Projects/BCOS/Projects/Slack VA"
npm install
npm run build
npm run dev
```

### Production Deployment
```bash
# Deploy to Zeus
./Infrastructure/Zeus/scripts/deploy-to-zeus.sh

# Setup SSL (on Zeus)
sudo bash scripts/setup-ssl-certificate.sh

# Update Slack app URLs
# https://api.slack.com/apps
```

## Troubleshooting

### Gmail-Context Issues
- **No emails processed**: Check Gmail OAuth authentication
- **Labels not applied**: Verify Gmail API permissions
- **Slack notifications not sent**: Check `SLACK_APPROVAL_CHANNEL` environment variable

### CMA Issues
- **No comps found**: Check public records data source implementation
- **PDF generation fails**: Verify file system permissions for output directory
- **Slow generation**: Public records APIs can be slow, consider caching

### Relationship OS Issues
- **Falls back to local database**: Check `RELATIONSHIP_OS_API_URL` environment variable
- **Sync fails**: Verify Relationship OS API is accessible
- **Data conflicts**: Implement conflict resolution in sync methods

## Next Steps

1. **Complete Public Records Integration**
   - Implement real county assessor API clients
   - Add authentication and rate limiting
   - Test with real property addresses

2. **Enhance PDF Generation**
   - Add real PDF library (pdfkit or puppeteer)
   - Upload to cloud storage (S3, etc.)
   - Add download links in Slack responses

3. **Complete Relationship OS Integration**
   - Implement real API calls
   - Add conflict resolution
   - Test bi-directional sync

4. **Add Monitoring**
   - Track integration health
   - Monitor API usage
   - Alert on failures

## References

- API Contracts: `docs/API-CONTRACTS.md`
- CMA Discovery: `Projects/AskEarlAI/CMA(Comps)/CMA-DISCOVERY.md`
- Gmail-Context n8n Workflow: `Projects/Gmail-Context/Gmail (CC) → GPT4o Labeler.json`
- Relationship OS: `Infrastructure/Relationship-OS/`

