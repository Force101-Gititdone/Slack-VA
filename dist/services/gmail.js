import { google } from 'googleapis';
import { OAuthHelper } from '../utils/oauth.js';
import { db } from '../db/client.js';
import { emails, contacts } from '../db/schema.js';
import { eq } from 'drizzle-orm';
export class GmailService {
    constructor(gmail) {
        this.gmail = gmail;
    }
    /**
     * Create Gmail service instance with authenticated client
     */
    static async create(userId = 'default') {
        const auth = await OAuthHelper.getAuthenticatedClient(userId);
        const gmail = google.gmail({ version: 'v1', auth });
        return new GmailService(gmail);
    }
    /**
     * Fetch recent emails
     */
    async fetchRecentEmails(maxResults = 10) {
        const response = await this.gmail.users.messages.list({
            userId: 'me',
            maxResults,
            q: 'in:inbox',
        });
        if (!response.data.messages) {
            return [];
        }
        // Fetch full message details
        const messagePromises = response.data.messages.map((msg) => this.gmail.users.messages.get({
            userId: 'me',
            id: msg.id,
            format: 'full',
        }));
        const messages = await Promise.all(messagePromises);
        return messages.map((m) => m.data).filter((m) => !!m);
    }
    /**
     * Parse email message
     */
    parseEmail(message) {
        const headers = message.payload?.headers || [];
        const getHeader = (name) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
        const subject = getHeader('Subject');
        const from = getHeader('From');
        const to = getHeader('To');
        const date = getHeader('Date');
        // Extract email from "Name <email@example.com>" format
        const extractEmail = (str) => {
            const match = str.match(/<(.+)>/);
            return match ? match[1] : str.trim();
        };
        // Extract body text
        let body = '';
        if (message.payload?.body?.data) {
            body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
        }
        else if (message.payload?.parts) {
            // Try to find text/plain part
            const textPart = message.payload.parts.find((part) => part.mimeType === 'text/plain' || part.mimeType === 'text/html');
            if (textPart?.body?.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
            }
        }
        return {
            messageId: message.id,
            threadId: message.threadId,
            subject,
            body,
            sender: extractEmail(from),
            recipient: extractEmail(to),
            receivedAt: date ? new Date(date) : new Date(parseInt(message.internalDate || '0')),
            labels: message.labelIds || [],
        };
    }
    /**
     * Store email in database
     */
    async storeEmail(parsedEmail) {
        // Check if email already exists
        const existing = await db
            .select()
            .from(emails)
            .where(eq(emails.messageId, parsedEmail.messageId))
            .limit(1);
        if (existing.length > 0) {
            // Update existing email
            await db
                .update(emails)
                .set({
                labels: parsedEmail.labels,
                updatedAt: new Date(),
            })
                .where(eq(emails.id, existing[0].id));
            return;
        }
        // Create or get contact
        let contact = await db
            .select()
            .from(contacts)
            .where(eq(contacts.email, parsedEmail.sender))
            .limit(1);
        // Insert email
        await db.insert(emails).values({
            messageId: parsedEmail.messageId,
            threadId: parsedEmail.threadId,
            subject: parsedEmail.subject,
            body: parsedEmail.body,
            sender: parsedEmail.sender,
            recipient: parsedEmail.recipient,
            receivedAt: parsedEmail.receivedAt,
            labels: parsedEmail.labels,
        });
        // Update contact's last interaction
        if (contact.length > 0) {
            await db
                .update(contacts)
                .set({
                lastInteraction: parsedEmail.receivedAt,
                updatedAt: new Date(),
            })
                .where(eq(contacts.id, contact[0].id));
        }
        else {
            // Create new contact
            await db.insert(contacts).values({
                email: parsedEmail.sender,
                name: parsedEmail.sender.split('@')[0], // Default name from email
                firstInteraction: parsedEmail.receivedAt,
                lastInteraction: parsedEmail.receivedAt,
            });
        }
    }
    /**
     * Apply label to email
     */
    async applyLabel(messageId, labelId) {
        await this.gmail.users.messages.modify({
            userId: 'me',
            id: messageId,
            requestBody: {
                addLabelIds: [labelId],
            },
        });
    }
    /**
     * Create or get label by name
     */
    async getOrCreateLabel(labelName) {
        // List all labels
        const response = await this.gmail.users.labels.list({ userId: 'me' });
        const existingLabel = response.data.labels?.find((l) => l.name === labelName);
        if (existingLabel?.id) {
            return existingLabel.id;
        }
        // Create new label
        const createResponse = await this.gmail.users.labels.create({
            userId: 'me',
            requestBody: {
                name: labelName,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show',
            },
        });
        return createResponse.data.id;
    }
}
//# sourceMappingURL=gmail.js.map