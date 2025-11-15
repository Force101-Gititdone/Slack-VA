import { db } from '../db/client.js';
import { contacts, contactInsights, interactions, emails } from '../db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
import { AIService } from '../services/ai.js';
import { RelationshipOSService } from '../services/relationship-os.js';
import { validateContactIdentifier } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

export class CRMCommands {
  /**
   * Handle who-next command - Get prioritized list of contacts
   */
  static async handleWhoNext(): Promise<any> {
    try {
      logger.info('Getting prioritized contacts');
      
      // Try Relationship OS first, fallback to local database
      let prioritizedContacts: any[] = [];
      const rosAvailable = await RelationshipOSService.isAvailable();
      
      if (rosAvailable) {
        try {
          prioritizedContacts = await RelationshipOSService.getPrioritizedContacts(10);
          logger.info('Got prioritized contacts from Relationship OS', { count: prioritizedContacts.length });
        } catch (error) {
          logger.warn('Relationship OS unavailable, using local database', {}, error instanceof Error ? error : undefined);
        }
      }
      
      // Fallback to local database if Relationship OS is unavailable or returned empty
      if (prioritizedContacts.length === 0) {
        const contactsWithInsights = await db
          .select({
            contact: contacts,
            insight: contactInsights,
          })
          .from(contacts)
          .leftJoin(contactInsights, eq(contacts.id, contactInsights.contactId))
          .orderBy(desc(contactInsights.priority))
          .limit(10);
        
        prioritizedContacts = contactsWithInsights.map((item) => ({
          id: item.contact.id,
          email: item.contact.email,
          name: item.contact.name,
          relationshipStage: item.insight?.relationshipStage,
          nextAction: item.insight?.nextAction,
          suggestedMessage: item.insight?.suggestedMessage,
          priority: item.insight?.priority || 0,
          lastInteraction: item.contact.lastInteraction,
        }));
      }

      if (prioritizedContacts.length === 0) {
        return {
          text: 'No contacts found. Start by categorizing some emails!',
          response_type: 'ephemeral',
        };
      }

      return {
        text: `Top ${prioritizedContacts.length} contacts to reach out to`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `👥 Who to Talk to Next${rosAvailable ? ' (via Relationship OS)' : ''}`,
            },
          },
          {
            type: 'divider',
          },
          ...prioritizedContacts.map((contact, index) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${index + 1}. ${contact.name || contact.email}*\n${contact.nextAction || 'No action suggested'}\n\n*Suggested message:*\n${contact.suggestedMessage || 'No message suggested'}`,
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Details',
              },
              action_id: 'view_contact',
              value: contact.id,
            },
          })),
        ],
      };
    } catch (error) {
      logger.error('Error in who-next command', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Handle what-to-say command
   */
  static async handleWhatToSay(contactIdentifier: string): Promise<any> {
    try {
      // Validate input
      const validatedIdentifier = validateContactIdentifier(contactIdentifier);
      
      logger.info('Getting suggested message for contact', { identifier: validatedIdentifier });
      
      // Find contact by email or name
      const contact = await db
        .select()
        .from(contacts)
        .where(
          sql`${contacts.email} ILIKE ${`%${validatedIdentifier}%`} OR ${contacts.name} ILIKE ${`%${validatedIdentifier}%`}`
        )
        .limit(1);

      if (contact.length === 0) {
        return {
          text: `📭 Contact not found: ${validatedIdentifier}`,
          response_type: 'ephemeral',
        };
      }

      // Get contact insights
      const insight = await db
        .select()
        .from(contactInsights)
        .where(eq(contactInsights.contactId, contact[0].id))
        .limit(1);

      // Get recent interactions
      const recentInteractions = await db
        .select()
        .from(interactions)
        .where(eq(interactions.contactId, contact[0].id))
        .orderBy(desc(interactions.createdAt))
        .limit(5);

      const suggestedMessage = insight[0]?.suggestedMessage || 'No suggested message available.';

      return {
        text: `Suggested message for ${contact[0].name || contact[0].email}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `💬 What to Say to ${contact[0].name || contact[0].email}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Suggested Message:*\n${suggestedMessage}`,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `*Last interaction:* ${contact[0].lastInteraction ? new Date(contact[0].lastInteraction).toLocaleDateString() : 'Never'}`,
              },
            ],
          },
        ],
      };
    } catch (error) {
      logger.error('Error in what-to-say command', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Handle status command
   */
  static async handleStatus(contactIdentifier: string): Promise<any> {
    try {
      // Validate input
      const validatedIdentifier = validateContactIdentifier(contactIdentifier);
      
      logger.info('Getting contact status', { identifier: validatedIdentifier });
      
      // Find contact
      const contact = await db
        .select()
        .from(contacts)
        .where(
          sql`${contacts.email} ILIKE ${`%${validatedIdentifier}%`} OR ${contacts.name} ILIKE ${`%${validatedIdentifier}%`}`
        )
        .limit(1);

      if (contact.length === 0) {
        return {
          text: `📭 Contact not found: ${validatedIdentifier}`,
          response_type: 'ephemeral',
        };
      }

      // Get interactions
      const contactInteractions = await db
        .select()
        .from(interactions)
        .where(eq(interactions.contactId, contact[0].id))
        .orderBy(desc(interactions.createdAt))
        .limit(10);

      // Get insights
      const insight = await db
        .select()
        .from(contactInsights)
        .where(eq(contactInsights.contactId, contact[0].id))
        .limit(1);

      return {
        text: `Status for ${contact[0].name || contact[0].email}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📊 Status: ${contact[0].name || contact[0].email}`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Email:*\n${contact[0].email}`,
              },
              {
                type: 'mrkdwn',
                text: `*First Interaction:*\n${contact[0].firstInteraction ? new Date(contact[0].firstInteraction).toLocaleDateString() : 'Never'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Last Interaction:*\n${contact[0].lastInteraction ? new Date(contact[0].lastInteraction).toLocaleDateString() : 'Never'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Relationship Stage:*\n${insight[0]?.relationshipStage || 'Unknown'}`,
              },
            ],
          },
          {
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Recent Interactions (${contactInteractions.length}):*`,
            },
          },
          ...contactInteractions.map((interaction) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${interaction.interactionType}* - ${interaction.status}\n${interaction.summary || 'No summary'}\n_${new Date(interaction.createdAt).toLocaleString()}_`,
            },
          })),
        ],
      };
    } catch (error) {
      logger.error('Error in status command', {}, error instanceof Error ? error : undefined);
      throw error;
    }
  }
}
