import { GmailService } from './gmail.js';
import { AIService } from './ai.js';
import { db } from '../db/client.js';
import { processedEmails, emails } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { slackApp } from './slack.js';
import { gmail_v1 } from 'googleapis';

/**
 * Gmail Auto-Labeler Service
 * Ports the n8n workflow logic to TypeScript
 * Automatically labels incoming emails using AI classification
 */
export class GmailLabelerService {
  /**
   * Process and label unprocessed emails
   */
  static async processUnprocessedEmails(
    userId: string = 'default',
    maxEmails: number = 50,
    notifySlack: boolean = true
  ): Promise<{ processed: number; labeled: number; errors: number }> {
    logger.info('Starting Gmail auto-labeling', { userId, maxEmails });

    const gmail = await GmailService.create(userId);
    const stats = { processed: 0, labeled: 0, errors: 0 };

    try {
      // Fetch unprocessed emails
      const unprocessedMessages = await gmail.fetchUnprocessedEmails(undefined, maxEmails);

      logger.info(`Found ${unprocessedMessages.length} unprocessed emails`);

      for (const message of unprocessedMessages) {
        try {
          // Check if already processed
          const messageId = message.id!;
          const alreadyProcessed = await db
            .select()
            .from(processedEmails)
            .where(eq(processedEmails.messageId, messageId))
            .limit(1);

          if (alreadyProcessed.length > 0) {
            logger.debug('Email already processed', { messageId });
            continue;
          }

          // Parse email
          const parsedEmail = gmail.parseEmail(message);

          // Classify email using AI (pass recipient email for account-specific labels)
          const classification = await AIService.classifyEmailForLabeling(
            parsedEmail.subject,
            parsedEmail.body,
            parsedEmail.recipient
          );

          logger.info('Email classified', {
            messageId,
            label: classification.label,
            subject: parsedEmail.subject,
          });

          // Get or create label
          const labelId = await gmail.getOrCreateLabel(classification.label);

          // Apply label to email
          await gmail.applyLabel(messageId, labelId);

          // Store email in database
          await gmail.storeEmail(parsedEmail);

          // Update email with label
          await db
            .update(emails)
            .set({
              category: classification.label,
              labels: [classification.label] as any,
              updatedAt: new Date(),
            })
            .where(eq(emails.messageId, messageId));

          // Mark as processed
          await db.insert(processedEmails).values({
            userId,
            messageId,
            labelName: classification.label,
            labelId,
            processedAt: new Date(),
          });

          stats.processed++;
          stats.labeled++;

          // Notify Slack if enabled and label is important
          if (notifySlack && this.shouldNotifySlack(classification.label)) {
            try {
              await this.notifySlack(parsedEmail, classification.label);
            } catch (error) {
              logger.error('Failed to notify Slack', { messageId }, error instanceof Error ? error : undefined);
              // Don't fail the whole process if Slack notification fails
            }
          }
        } catch (error) {
          logger.error('Error processing email', { messageId: message.id }, error instanceof Error ? error : undefined);
          stats.errors++;
        }
      }

      logger.info('Gmail auto-labeling complete', stats);
      return stats;
    } catch (error) {
      logger.error('Gmail auto-labeling failed', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Process a single email by message ID
   */
  static async processEmail(
    userId: string,
    messageId: string,
    notifySlack: boolean = true
  ): Promise<{ labeled: boolean; labelName?: string }> {
    logger.info('Processing single email', { userId, messageId });

    const gmail = await GmailService.create(userId);

    try {
      // Check if already processed
      const alreadyProcessed = await db
        .select()
        .from(processedEmails)
        .where(eq(processedEmails.messageId, messageId))
        .limit(1);

      if (alreadyProcessed.length > 0) {
        return {
          labeled: true,
          labelName: alreadyProcessed[0].labelName || undefined,
        };
      }

      // Fetch email from Gmail
      const gmailClient = (gmail as any).gmail as gmail_v1.Gmail;
      const messageResponse = await gmailClient.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = messageResponse.data;
      if (!message) {
        throw new Error('Message not found');
      }

      // Parse email
      const parsedEmail = gmail.parseEmail(message);

      // Classify email using AI (pass recipient email for account-specific labels)
      const classification = await AIService.classifyEmailForLabeling(
        parsedEmail.subject,
        parsedEmail.body,
        parsedEmail.recipient
      );

      // Get or create label
      const labelId = await gmail.getOrCreateLabel(classification.label);

      // Apply label to email
      await gmail.applyLabel(messageId, labelId);

      // Store email in database
      await gmail.storeEmail(parsedEmail);

      // Update email with label
      await db
        .update(emails)
        .set({
          category: classification.label,
          labels: [classification.label] as any,
          updatedAt: new Date(),
        })
        .where(eq(emails.messageId, messageId));

      // Mark as processed
      await db.insert(processedEmails).values({
        userId,
        messageId,
        labelName: classification.label,
        labelId,
        processedAt: new Date(),
      });

      // Notify Slack if enabled
      if (notifySlack && this.shouldNotifySlack(classification.label)) {
        try {
          await this.notifySlack(parsedEmail, classification.label);
        } catch (error) {
          logger.error('Failed to notify Slack', { messageId }, error instanceof Error ? error : undefined);
        }
      }

      return {
        labeled: true,
        labelName: classification.label,
      };
    } catch (error) {
      logger.error('Error processing email', { messageId }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Determine if we should notify Slack for this label
   */
  private static shouldNotifySlack(label: string): boolean {
    // Important labels that should trigger Slack notifications
    const importantLabels = [
      // Force101 labels
      'GTM',
      'CSX',
      'LinkedIn-Interesting-Post',
      'LinkedIn-Message',
      // ColoradoCollins labels
      'Friends',
    ];
    return importantLabels.includes(label);
  }

  /**
   * Notify Slack about labeled email
   */
  private static async notifySlack(
    parsedEmail: { subject: string; sender: string; body: string },
    label: string
  ): Promise<void> {
    try {
      const channelId = process.env.SLACK_APPROVAL_CHANNEL || 'C09LA7MQA66'; // bc-central

      const message = `📧 *New Email Labeled: ${label}*\n\n` +
        `*From:* ${parsedEmail.sender}\n` +
        `*Subject:* ${parsedEmail.subject}\n` +
        `*Preview:* ${parsedEmail.body.substring(0, 200)}${parsedEmail.body.length > 200 ? '...' : ''}`;

      await slackApp.client.chat.postMessage({
        channel: channelId,
        text: message,
        icon_emoji: ':b1:',
        username: 'Gmail Labeler',
      });
    } catch (error) {
      logger.error('Failed to notify Slack', {}, error instanceof Error ? error : undefined);
      // Don't throw - Slack notification failure shouldn't break email processing
    }
  }
}
