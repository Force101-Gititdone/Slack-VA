import { db } from '../db/client.js';
import { contacts, contactInsights, interactions } from '../db/schema.js';
import { desc, eq, sql } from 'drizzle-orm';
export class CRMCommands {
    /**
     * Handle who-next command - Get prioritized list of contacts
     */
    static async handleWhoNext() {
        try {
            // Get contacts with insights, ordered by priority
            const contactsWithInsights = await db
                .select({
                contact: contacts,
                insight: contactInsights,
            })
                .from(contacts)
                .leftJoin(contactInsights, eq(contacts.id, contactInsights.contactId))
                .orderBy(desc(contactInsights.priority))
                .limit(10);
            if (contactsWithInsights.length === 0) {
                return {
                    text: 'No contacts found. Start by categorizing some emails!',
                    response_type: 'ephemeral',
                };
            }
            return {
                text: `Top ${contactsWithInsights.length} contacts to reach out to`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `👥 Who to Talk to Next`,
                        },
                    },
                    {
                        type: 'divider',
                    },
                    ...contactsWithInsights.map((item, index) => ({
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*${index + 1}. ${item.contact.name || item.contact.email}*\n${item.insight?.nextAction || 'No action suggested'}\n\n*Suggested message:*\n${item.insight?.suggestedMessage || 'No message suggested'}`,
                        },
                        accessory: {
                            type: 'button',
                            text: {
                                type: 'plain_text',
                                text: 'View Details',
                            },
                            action_id: 'view_contact',
                            value: item.contact.id,
                        },
                    })),
                ],
            };
        }
        catch (error) {
            console.error('Who-next error:', error);
            return {
                text: `❌ Error getting contacts: ${error.message}`,
                response_type: 'ephemeral',
            };
        }
    }
    /**
     * Handle what-to-say command
     */
    static async handleWhatToSay(contactIdentifier) {
        try {
            // Find contact by email or name
            const contact = await db
                .select()
                .from(contacts)
                .where(sql `${contacts.email} ILIKE ${`%${contactIdentifier}%`} OR ${contacts.name} ILIKE ${`%${contactIdentifier}%`}`)
                .limit(1);
            if (contact.length === 0) {
                return {
                    text: `Contact not found: ${contactIdentifier}`,
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
        }
        catch (error) {
            console.error('What-to-say error:', error);
            return {
                text: `❌ Error getting suggested message: ${error.message}`,
                response_type: 'ephemeral',
            };
        }
    }
    /**
     * Handle status command
     */
    static async handleStatus(contactIdentifier) {
        try {
            // Find contact
            const contact = await db
                .select()
                .from(contacts)
                .where(sql `${contacts.email} ILIKE ${`%${contactIdentifier}%`} OR ${contacts.name} ILIKE ${`%${contactIdentifier}%`}`)
                .limit(1);
            if (contact.length === 0) {
                return {
                    text: `Contact not found: ${contactIdentifier}`,
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
        }
        catch (error) {
            console.error('Status error:', error);
            return {
                text: `❌ Error getting status: ${error.message}`,
                response_type: 'ephemeral',
            };
        }
    }
}
//# sourceMappingURL=crm.js.map