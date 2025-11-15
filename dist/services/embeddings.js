import { AIService } from './ai.js';
import { db } from '../db/client.js';
import { emails, contacts } from '../db/schema.js';
import { isNull, eq } from 'drizzle-orm';
export class EmbeddingsService {
    /**
     * Generate and store embedding for an email
     */
    static async generateEmailEmbedding(emailId) {
        const email = await db
            .select()
            .from(emails)
            .where(eq(emails.id, emailId))
            .limit(1);
        if (email.length === 0) {
            throw new Error('Email not found');
        }
        const emailData = email[0];
        const text = `${emailData.subject || ''} ${emailData.body || ''}`.trim();
        if (!text) {
            return; // Skip if no text content
        }
        const embedding = await AIService.generateEmbedding(text);
        // Update email with embedding
        await db
            .update(emails)
            .set({
            contentEmbedding: embedding,
            updatedAt: new Date(),
        })
            .where(eq(emails.id, emailId));
    }
    /**
     * Generate and store embedding for a contact profile
     */
    static async generateContactEmbedding(contactId) {
        const contact = await db
            .select()
            .from(contacts)
            .where(eq(contacts.id, contactId))
            .limit(1);
        if (contact.length === 0) {
            throw new Error('Contact not found');
        }
        const contactData = contact[0];
        const text = `${contactData.name || ''} ${contactData.email || ''} ${JSON.stringify(contactData.metadata || {})}`.trim();
        if (!text) {
            return;
        }
        const embedding = await AIService.generateEmbedding(text);
        // Update contact with embedding
        await db
            .update(contacts)
            .set({
            profileEmbedding: embedding,
            updatedAt: new Date(),
        })
            .where(eq(contacts.id, contactId));
    }
    /**
     * Batch generate embeddings for emails without embeddings
     */
    static async batchGenerateEmailEmbeddings(limit = 100) {
        const emailsWithoutEmbeddings = await db
            .select()
            .from(emails)
            .where(isNull(emails.contentEmbedding))
            .limit(limit);
        let count = 0;
        for (const email of emailsWithoutEmbeddings) {
            try {
                await this.generateEmailEmbedding(email.id);
                count++;
            }
            catch (error) {
                console.error(`Failed to generate embedding for email ${email.id}:`, error);
            }
        }
        return count;
    }
    /**
     * Batch generate embeddings for contacts without embeddings
     */
    static async batchGenerateContactEmbeddings(limit = 100) {
        const contactsWithoutEmbeddings = await db
            .select()
            .from(contacts)
            .where(isNull(contacts.profileEmbedding))
            .limit(limit);
        let count = 0;
        for (const contact of contactsWithoutEmbeddings) {
            try {
                await this.generateContactEmbedding(contact.id);
                count++;
            }
            catch (error) {
                console.error(`Failed to generate embedding for contact ${contact.id}:`, error);
            }
        }
        return count;
    }
}
//# sourceMappingURL=embeddings.js.map