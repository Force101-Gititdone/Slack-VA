import { GmailService } from '../services/gmail.js';
import { AIService } from '../services/ai.js';
import { db } from '../db/client.js';
import { emails } from '../db/schema.js';
import { eq, and, gte, lte, like, or } from 'drizzle-orm';
export class GmailCommands {
    /**
     * Handle categorize command
     */
    static async handleCategorize() {
        try {
            const gmail = await GmailService.create();
            const recentEmails = await gmail.fetchRecentEmails(10);
            const results = [];
            for (const email of recentEmails) {
                const parsed = gmail.parseEmail(email);
                // Categorize using AI
                const categorization = await AIService.categorizeEmail(parsed.subject, parsed.body, parsed.sender);
                // Store email in database
                await gmail.storeEmail(parsed);
                // Update email with categorization
                await db
                    .update(emails)
                    .set({
                    category: categorization.category,
                    intent: categorization.intent,
                    updatedAt: new Date(),
                })
                    .where(eq(emails.messageId, parsed.messageId));
                // Apply labels
                for (const labelName of categorization.suggestedLabels) {
                    try {
                        const labelId = await gmail.getOrCreateLabel(labelName);
                        await gmail.applyLabel(parsed.messageId, labelId);
                    }
                    catch (error) {
                        console.error(`Failed to apply label ${labelName}:`, error);
                    }
                }
                results.push({
                    subject: parsed.subject,
                    sender: parsed.sender,
                    category: categorization.category,
                    intent: categorization.intent,
                    urgency: categorization.urgency,
                    labels: categorization.suggestedLabels,
                });
            }
            return {
                text: `✅ Categorized ${results.length} emails`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `📧 Categorized ${results.length} Emails`,
                        },
                    },
                    {
                        type: 'divider',
                    },
                    ...results.map((result) => ({
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Subject:* ${result.subject}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*From:* ${result.sender}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Category:* ${result.category}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Urgency:* ${result.urgency}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Intent:* ${result.intent}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Labels:* ${result.labels.join(', ') || 'None'}`,
                            },
                        ],
                    })),
                ],
            };
        }
        catch (error) {
            console.error('Categorize error:', error);
            return {
                text: `❌ Error categorizing emails: ${error.message}`,
                response_type: 'ephemeral',
            };
        }
    }
    /**
     * Handle query command
     */
    static async handleQuery(queryText) {
        try {
            // Understand query using AI
            const queryUnderstanding = await AIService.understandQuery(queryText);
            // Build database query conditions
            const conditions = [];
            if (queryUnderstanding.filters.dateRange) {
                conditions.push(gte(emails.receivedAt, queryUnderstanding.filters.dateRange.start), lte(emails.receivedAt, queryUnderstanding.filters.dateRange.end));
            }
            if (queryUnderstanding.filters.sender) {
                conditions.push(like(emails.sender, `%${queryUnderstanding.filters.sender}%`));
            }
            if (queryUnderstanding.filters.category) {
                conditions.push(eq(emails.category, queryUnderstanding.filters.category));
            }
            if (queryUnderstanding.filters.keywords && queryUnderstanding.filters.keywords.length > 0) {
                const keywordConditions = queryUnderstanding.filters.keywords.map((keyword) => or(like(emails.subject, `%${keyword}%`), like(emails.body, `%${keyword}%`)));
                conditions.push(or(...keywordConditions));
            }
            // Build database query with conditions
            const baseQuery = db.select().from(emails);
            const finalQuery = conditions.length > 0
                ? baseQuery.where(and(...conditions)).limit(20)
                : baseQuery.limit(20);
            const matchingEmails = await finalQuery;
            if (matchingEmails.length === 0) {
                return {
                    text: `No emails found matching: "${queryText}"`,
                    response_type: 'ephemeral',
                };
            }
            return {
                text: `Found ${matchingEmails.length} emails matching your query`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `📧 Found ${matchingEmails.length} Emails`,
                        },
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: `Query: "${queryText}"`,
                            },
                        ],
                    },
                    {
                        type: 'divider',
                    },
                    ...matchingEmails.map((email) => ({
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Subject:* ${email.subject || 'No subject'}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*From:* ${email.sender}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Date:* ${email.receivedAt.toLocaleDateString()}`,
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Category:* ${email.category || 'Uncategorized'}`,
                            },
                        ],
                        accessory: {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'View',
                            },
                            action_id: 'view_email',
                            value: email.id,
                        },
                    })),
                ],
            };
        }
        catch (error) {
            console.error('Query error:', error);
            return {
                text: `❌ Error querying emails: ${error.message}`,
                response_type: 'ephemeral',
            };
        }
    }
}
//# sourceMappingURL=gmail.js.map