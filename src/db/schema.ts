import { pgTable, uuid, text, timestamp, jsonb, boolean, integer, customType, numeric, date } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Contacts table
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  firstInteraction: timestamp('first_interaction').defaultNow(),
  lastInteraction: timestamp('last_interaction').defaultNow(),
  profileEmbedding: vector('profile_embedding'), // For vector similarity search (1536 dimensions)
  metadata: jsonb('metadata'), // Additional contact information
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Emails table
export const emails = pgTable('emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  messageId: text('message_id').notNull().unique(), // Gmail message ID
  threadId: text('thread_id'), // Gmail thread ID
  subject: text('subject'),
  body: text('body'),
  sender: text('sender').notNull(),
  recipient: text('recipient'),
  receivedAt: timestamp('received_at').notNull(),
  category: text('category'), // AI-categorized category
  intent: text('intent'), // AI-detected intent
  labels: jsonb('labels'), // Gmail labels applied
  contentEmbedding: vector('content_embedding'), // Vector embedding for similarity search (1536 dimensions)
  metadata: jsonb('metadata'), // Additional email metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Calendar events table
export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: text('event_id').notNull().unique(), // Google Calendar event ID
  title: text('title').notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  location: text('location'),
  attendees: jsonb('attendees'), // Array of attendee emails
  status: text('status').default('confirmed'), // confirmed, tentative, cancelled
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Interactions table (tracks all interactions: emails, calls, meetings)
export const interactions = pgTable('interactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  emailId: uuid('email_id').references(() => emails.id),
  calendarEventId: uuid('calendar_event_id').references(() => calendarEvents.id),
  interactionType: text('interaction_type').notNull(), // email, call, meeting, etc.
  status: text('status').default('pending'), // pending, completed, archived
  summary: text('summary'), // AI-generated summary
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversation threads table (groups related emails)
export const conversationThreads = pgTable('conversation_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: text('thread_id').notNull().unique(), // Gmail thread ID
  contactId: uuid('contact_id').references(() => contacts.id),
  subject: text('subject'),
  lastMessageAt: timestamp('last_message_at').notNull(),
  messageCount: integer('message_count').default(1),
  status: text('status').default('active'), // active, archived, resolved
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Contact insights table (AI-generated insights and recommendations)
export const contactInsights = pgTable('contact_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id).notNull().unique(),
  nextAction: text('next_action'), // Suggested next action
  suggestedMessage: text('suggested_message'), // AI-suggested message
  relationshipStage: text('relationship_stage'), // new, developing, established, etc.
  priority: integer('priority').default(0), // Priority score for "who to talk to next"
  lastInsightAt: timestamp('last_insight_at').defaultNow(),
  insights: jsonb('insights'), // Additional insights data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OAuth tokens table (stores encrypted OAuth refresh tokens)
export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(), // google, slack
  userId: text('user_id'), // User identifier
  accessToken: text('access_token'), // Encrypted
  refreshToken: text('refresh_token').notNull(), // Encrypted
  expiresAt: timestamp('expires_at'),
  scope: text('scope'), // OAuth scopes granted
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CMA Requests table (tracks CMA generation requests)
export const cmaRequests = pgTable('cma_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  slackUserId: text('slack_user_id').notNull(), // Slack user ID (agent identifier)
  propertyAddress: text('property_address').notNull(),
  propertyZip: text('property_zip'),
  propertyDetails: jsonb('property_details'), // beds, baths, sqft, lot_size, year_built
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  status: text('status').default('pending'), // pending, processing, completed, failed
  dataSource: text('data_source'), // mls, public_records, mock, etc.
  compsCount: integer('comps_count'),
  estimatedValue: jsonb('estimated_value'), // { low, mid, high }
  generatedAt: timestamp('generated_at'),
  pdfUrl: text('pdf_url'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CMA Comps table (stores comparable properties)
export const cmaComps = pgTable('cma_comps', {
  id: uuid('id').primaryKey().defaultRandom(),
  cmaRequestId: uuid('cma_request_id').references(() => cmaRequests.id).notNull(),
  address: text('address').notNull(),
  salePrice: numeric('sale_price'),
  listPrice: numeric('list_price'),
  soldDate: date('sold_date'),
  listDate: date('list_date'),
  beds: integer('beds'),
  baths: numeric('baths'),
  sqft: integer('sqft'),
  lotSize: numeric('lot_size'),
  yearBuilt: integer('year_built'),
  dataSource: text('data_source'), // mls, public_records, etc.
  sourceUrl: text('source_url'),
  similarityScore: numeric('similarity_score'), // 0-1, how similar to target property
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// CMA Data Sources table (stores agent data source configurations)
export const cmaDataSources = pgTable('cma_data_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  slackUserId: text('slack_user_id').notNull(), // Slack user ID (agent identifier)
  sourceType: text('source_type').notNull(), // mls, public_records, api
  sourceName: text('source_name').notNull(), // "Denver MLS", "Denver County Assessor", etc.
  apiKey: text('api_key'), // Encrypted
  apiUrl: text('api_url'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Processed Emails table (tracks emails processed by Gmail labeler to avoid duplicates)
export const processedEmails = pgTable('processed_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(), // OAuth userId (e.g., 'force101', 'coloradocollins')
  messageId: text('message_id').notNull(), // Gmail message ID
  labelName: text('label_name'), // Label that was applied
  labelId: text('label_id'), // Gmail label ID that was applied
  processedAt: timestamp('processed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const contactsRelations = relations(contacts, ({ many }) => ({
  interactions: many(interactions),
  insights: many(contactInsights),
  threads: many(conversationThreads),
}));

export const emailsRelations = relations(emails, ({ one, many }) => ({
  interactions: many(interactions),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ many }) => ({
  interactions: many(interactions),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  contact: one(contacts, {
    fields: [interactions.contactId],
    references: [contacts.id],
  }),
  email: one(emails, {
    fields: [interactions.emailId],
    references: [emails.id],
  }),
  calendarEvent: one(calendarEvents, {
    fields: [interactions.calendarEventId],
    references: [calendarEvents.id],
  }),
}));

export const conversationThreadsRelations = relations(conversationThreads, ({ one }) => ({
  contact: one(contacts, {
    fields: [conversationThreads.contactId],
    references: [contacts.id],
  }),
}));

export const contactInsightsRelations = relations(contactInsights, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactInsights.contactId],
    references: [contacts.id],
  }),
}));

// CMA Relations
export const cmaRequestsRelations = relations(cmaRequests, ({ many }) => ({
  comps: many(cmaComps),
}));

export const cmaCompsRelations = relations(cmaComps, ({ one }) => ({
  cmaRequest: one(cmaRequests, {
    fields: [cmaComps.cmaRequestId],
    references: [cmaRequests.id],
  }),
}));

