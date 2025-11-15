import { GmailService } from '../services/gmail.js';
import { AIService } from '../services/ai.js';
import { GmailLabelerService } from '../services/gmail-labeler.js';
import { formatEmailMessage } from '../utils/formatting.js';
import { db } from '../db/client.js';
import { emails } from '../db/schema.js';
import { eq, and, gte, lte, like, or } from 'drizzle-orm';
import { handleError, AuthenticationError, ExternalAPIError, DatabaseError, ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { validateQuery } from '../utils/validation.js';
import { withRetry } from '../utils/retry.js';

export class GmailCommands {
  /**
   * Handle categorize command
   */
  static async handleCategorize(): Promise<any> {
    try {
      logger.info('Starting email categorization', { command: 'gmail categorize' });
      
      const gmail = await GmailService.create();
      const recentEmails = await gmail.fetchRecentEmails(10);

      if (recentEmails.length === 0) {
        logger.info('No recent emails found');
        return {
          text: '📭 No recent emails found to categorize.',
          response_type: 'ephemeral',
        };
      }

      logger.info(`Processing ${recentEmails.length} emails`);
      const results = [];

      for (const email of recentEmails) {
        try {
          const parsed = gmail.parseEmail(email);
          
          // Categorize using AI (with retry for API calls)
          const categorization = await withRetry(
            () => AIService.categorizeEmail(
              parsed.subject,
              parsed.body,
              parsed.sender
            ),
            { maxRetries: 2, initialDelay: 500 }
          );

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
            } catch (error) {
              logger.warn(`Failed to apply label ${labelName}`, { messageId: parsed.messageId }, error instanceof Error ? error : undefined);
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
        } catch (error) {
          logger.warn('Error processing individual email', { email: email.id }, error instanceof Error ? error : undefined);
          // Continue with other emails even if one fails
        }
      }

      logger.info(`Successfully categorized ${results.length} emails`);
      
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
                text: `*Subject:* ${result.subject || 'No subject'}`,
              },
              {
                type: 'mrkdwn',
                text: `*From:* ${result.sender}`,
              },
              {
                type: 'mrkdwn',
                text: `*Category:* ${result.category || 'Uncategorized'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Urgency:* ${result.urgency || 'medium'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Intent:* ${result.intent || 'Unknown'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Labels:* ${result.labels?.join(', ') || 'None'}`,
              },
            ],
          })),
        ],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('authentication')) {
        throw new AuthenticationError('Gmail authentication required');
      }
      if (error instanceof Error && error.message.includes('API')) {
        throw new ExternalAPIError('Gmail API error', 'gmail', true);
      }
      throw error;
    }
  }

  /**
   * Handle query command
   */
  static async handleQuery(queryText: string): Promise<any> {
    try {
      // Validate input
      const validatedQuery = validateQuery(queryText);

      logger.info('Processing email query', { query: validatedQuery });
      
      // Understand query using AI (with retry for API calls)
      const queryUnderstanding = await withRetry(
        () => AIService.understandQuery(validatedQuery),
        { maxRetries: 2, initialDelay: 500 }
      );

      // Build database query conditions
      const conditions = [];

      if (queryUnderstanding.filters.dateRange) {
        conditions.push(
          gte(emails.receivedAt, queryUnderstanding.filters.dateRange.start),
          lte(emails.receivedAt, queryUnderstanding.filters.dateRange.end)
        );
      }

      if (queryUnderstanding.filters.sender) {
        conditions.push(like(emails.sender, `%${queryUnderstanding.filters.sender}%`));
      }

      if (queryUnderstanding.filters.category) {
        conditions.push(eq(emails.category, queryUnderstanding.filters.category));
      }

      if (queryUnderstanding.filters.keywords && queryUnderstanding.filters.keywords.length > 0) {
        const keywordConditions = queryUnderstanding.filters.keywords.map((keyword) =>
          or(
            like(emails.subject, `%${keyword}%`),
            like(emails.body, `%${keyword}%`)
          )
        );
        conditions.push(or(...keywordConditions)!);
      }

      // Build database query with conditions
      const baseQuery = db.select().from(emails);
      const finalQuery = conditions.length > 0 
        ? baseQuery.where(and(...conditions)).limit(20)
        : baseQuery.limit(20);

      const matchingEmails = await finalQuery;

      logger.info(`Found ${matchingEmails.length} matching emails`, { query: queryText });

      if (matchingEmails.length === 0) {
        return {
          text: `📭 No emails found matching: "${queryText}"`,
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
    } catch (error) {
      if (error instanceof Error && error.message.includes('authentication')) {
        throw new AuthenticationError('Gmail authentication required');
      }
      if (error instanceof Error && error.message.includes('API')) {
        throw new ExternalAPIError('Gmail API error', 'gmail', true);
      }
      throw error;
    }
  }

  /**
   * Handle auto-label command - Process and label unprocessed emails
   */
  static async handleAutoLabel(maxEmails: number = 50): Promise<any> {
    try {
      logger.info('Starting Gmail auto-labeling', { maxEmails });

      const stats = await GmailLabelerService.processUnprocessedEmails(
        'default',
        maxEmails,
        true // notify Slack
      );

      return {
        text: `✅ Auto-labeled ${stats.labeled} emails`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📧 Gmail Auto-Labeling Complete`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Processed:* ${stats.processed}`,
              },
              {
                type: 'mrkdwn',
                text: `*Labeled:* ${stats.labeled}`,
              },
              {
                type: 'mrkdwn',
                text: `*Errors:* ${stats.errors}`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('authentication')) {
        throw new AuthenticationError('Gmail authentication required');
      }
      throw error;
    }
  }
}
