import { pgTable, uuid, text, timestamp, jsonb, integer, customType } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
// Custom type for pgvector
const vector = customType({
    dataType() {
        return 'vector(1536)';
    },
    toDriver(value) {
        return `[${value.join(',')}]`;
    },
    fromDriver(value) {
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
//# sourceMappingURL=schema.js.map