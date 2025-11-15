import { db } from '../db/client.js';
import { contacts, contactInsights, interactions, emails } from '../db/schema.js';
import { eq, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Relationship OS Integration Service
 * Connects Slack VA with Relationship OS for shared CRM data
 * 
 * This service provides:
 * - Shared contact/relationship data model
 * - Bi-directional sync or API calls
 * - CRM "who-next" prioritization
 * - Email/calendar context sharing
 */
export class RelationshipOSService {
  /**
   * Sync contact data from Relationship OS
   * In production, this would call Relationship OS API
   */
  static async syncContactFromROS(rosContactId: string): Promise<void> {
    logger.info('Syncing contact from Relationship OS', { rosContactId });

    // TODO: In production, call Relationship OS API to get contact data
    // For now, this is a placeholder that shows the integration pattern

    try {
      // Example API call (commented out until Relationship OS API is ready):
      // const response = await fetch(`${process.env.RELATIONSHIP_OS_API_URL}/contacts/${rosContactId}`);
      // const rosContact = await response.json();

      // Map Relationship OS contact to Slack VA contact format
      // const contact = {
      //   email: rosContact.email,
      //   name: rosContact.name,
      //   // ... map other fields
      // };

      // Upsert contact in Slack VA database
      // await db.insert(contacts).values(contact).onConflictDoUpdate(...);

      logger.info('Contact synced from Relationship OS', { rosContactId });
    } catch (error) {
      logger.error('Failed to sync contact from Relationship OS', { rosContactId }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Sync contact data to Relationship OS
   */
  static async syncContactToROS(contactId: string): Promise<void> {
    logger.info('Syncing contact to Relationship OS', { contactId });

    try {
      // Get contact from Slack VA database
      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .limit(1);

      if (!contact) {
        throw new Error(`Contact not found: ${contactId}`);
      }

      // Get contact insights
      const [insight] = await db
        .select()
        .from(contactInsights)
        .where(eq(contactInsights.contactId, contactId))
        .limit(1);

      // Get recent interactions
      const recentInteractions = await db
        .select()
        .from(interactions)
        .where(eq(interactions.contactId, contactId))
        .orderBy(desc(interactions.createdAt))
        .limit(10);

      // Map to Relationship OS format
      const rosContact = {
        email: contact.email,
        name: contact.name,
        firstInteraction: contact.firstInteraction,
        lastInteraction: contact.lastInteraction,
        relationshipStage: insight?.relationshipStage,
        nextAction: insight?.nextAction,
        suggestedMessage: insight?.suggestedMessage,
        priority: insight?.priority,
        recentInteractions: recentInteractions.map((i) => ({
          type: i.interactionType,
          status: i.status,
          summary: i.summary,
          createdAt: i.createdAt,
        })),
      };

      // TODO: In production, call Relationship OS API to sync
      // await fetch(`${process.env.RELATIONSHIP_OS_API_URL}/contacts`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(rosContact),
      // });

      logger.info('Contact synced to Relationship OS', { contactId });
    } catch (error) {
      logger.error('Failed to sync contact to Relationship OS', { contactId }, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get prioritized contacts from Relationship OS
   * Falls back to local database if Relationship OS is unavailable
   */
  static async getPrioritizedContacts(limit: number = 10): Promise<any[]> {
    logger.info('Getting prioritized contacts from Relationship OS', { limit });

    try {
      // TODO: In production, call Relationship OS API
      // const response = await fetch(`${process.env.RELATIONSHIP_OS_API_URL}/contacts/prioritized?limit=${limit}`);
      // const rosContacts = await response.json();
      // return rosContacts;

      // Fallback to local database
      const contactsWithInsights = await db
        .select({
          contact: contacts,
          insight: contactInsights,
        })
        .from(contacts)
        .leftJoin(contactInsights, eq(contacts.id, contactInsights.contactId))
        .orderBy(desc(contactInsights.priority))
        .limit(limit);

      return contactsWithInsights.map((item) => ({
        id: item.contact.id,
        email: item.contact.email,
        name: item.contact.name,
        relationshipStage: item.insight?.relationshipStage,
        nextAction: item.insight?.nextAction,
        suggestedMessage: item.insight?.suggestedMessage,
        priority: item.insight?.priority || 0,
        lastInteraction: item.contact.lastInteraction,
      }));
    } catch (error) {
      logger.error('Failed to get prioritized contacts from Relationship OS', {}, error instanceof Error ? error : undefined);
      // Return empty array on error
      return [];
    }
  }

  /**
   * Share email context with Relationship OS
   */
  static async shareEmailContext(emailId: string): Promise<void> {
    logger.info('Sharing email context with Relationship OS', { emailId });

    try {
      // Get email from database
      const [email] = await db
        .select()
        .from(emails)
        .where(eq(emails.id, emailId))
        .limit(1);

      if (!email) {
        throw new Error(`Email not found: ${emailId}`);
      }

      // Map to Relationship OS format
      const emailContext = {
        messageId: email.messageId,
        subject: email.subject,
        sender: email.sender,
        receivedAt: email.receivedAt,
        category: email.category,
        intent: email.intent,
        labels: email.labels,
      };

      // TODO: In production, call Relationship OS API
      // await fetch(`${process.env.RELATIONSHIP_OS_API_URL}/emails/context`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailContext),
      // });

      logger.info('Email context shared with Relationship OS', { emailId });
    } catch (error) {
      logger.error('Failed to share email context with Relationship OS', { emailId }, error instanceof Error ? error : undefined);
      // Don't throw - sharing context is not critical
    }
  }

  /**
   * Check if Relationship OS is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // TODO: In production, ping Relationship OS health endpoint
      // const response = await fetch(`${process.env.RELATIONSHIP_OS_API_URL}/health`);
      // return response.ok;

      // For now, check if API URL is configured
      return !!process.env.RELATIONSHIP_OS_API_URL;
    } catch (error) {
      return false;
    }
  }
}

