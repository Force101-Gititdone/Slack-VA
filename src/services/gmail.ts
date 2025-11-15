import { gmail_v1, google } from 'googleapis';
import { OAuthHelper } from '../utils/oauth.js';
import { db } from '../db/client.js';
import { emails, contacts } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class GmailService {
  private gmail: gmail_v1.Gmail;

  private constructor(gmail: gmail_v1.Gmail) {
    this.gmail = gmail;
  }

  /**
   * Create Gmail service instance with authenticated client
   */
  static async create(userId: string = 'default'): Promise<GmailService> {
    const auth = await OAuthHelper.getAuthenticatedClient(userId);
    const gmail = google.gmail({ version: 'v1', auth });
    return new GmailService(gmail);
  }

  /**
   * Fetch recent emails
   */
  async fetchRecentEmails(maxResults: number = 10): Promise<gmail_v1.Schema$Message[]> {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: 'in:inbox',
    });

    if (!response.data.messages) {
      return [];
    }

    // Fetch full message details
    const messagePromises = response.data.messages.map((msg) =>
      this.gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })
    );

    const messages = await Promise.all(messagePromises);
    return messages.map((m) => m.data).filter((m): m is gmail_v1.Schema$Message => !!m);
  }

  /**
   * Parse email message
   */
  parseEmail(message: gmail_v1.Schema$Message): {
    messageId: string;
    threadId: string;
    subject: string;
    body: string;
    sender: string;
    recipient: string;
    receivedAt: Date;
    labels: string[];
  } {
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const date = getHeader('Date');

    // Extract email from "Name <email@example.com>" format
    const extractEmail = (str: string): string => {
      const match = str.match(/<(.+)>/);
      return match ? match[1] : str.trim();
    };

    // Extract body text
    let body = '';
    if (message.payload?.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      // Try to find text/plain part
      const textPart = message.payload.parts.find(
        (part) => part.mimeType === 'text/plain' || part.mimeType === 'text/html'
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      messageId: message.id!,
      threadId: message.threadId!,
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
  async storeEmail(parsedEmail: ReturnType<typeof this.parseEmail>): Promise<void> {
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
          labels: parsedEmail.labels as any,
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
      labels: parsedEmail.labels as any,
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
    } else {
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
  async applyLabel(messageId: string, labelId: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }

  /**
   * List all Gmail labels
   */
  async listLabels(): Promise<gmail_v1.Schema$Label[]> {
    const response = await this.gmail.users.labels.list({ userId: 'me' });
    return response.data.labels || [];
  }

  /**
   * Create or get label by name (case-insensitive matching)
   */
  async getOrCreateLabel(labelName: string): Promise<string> {
    // List all labels
    const labels = await this.listLabels();
    
    // Case-insensitive match
    const existingLabel = labels.find(
      (l) => l.name?.toLowerCase() === labelName.toLowerCase()
    );

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

    return createResponse.data.id!;
  }

  /**
   * Fetch unprocessed emails (emails that haven't been processed by the labeler)
   * Uses a query to get emails since a specific date or from inbox
   */
  async fetchUnprocessedEmails(
    sinceDate?: Date,
    maxResults: number = 50
  ): Promise<gmail_v1.Schema$Message[]> {
    let query = 'in:inbox';
    
    if (sinceDate) {
      // Gmail query format: after:YYYY/MM/DD
      const dateStr = sinceDate.toISOString().split('T')[0].replace(/-/g, '/');
      query += ` after:${dateStr}`;
    }

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    if (!response.data.messages) {
      return [];
    }

    // Fetch full message details
    const messagePromises = response.data.messages.map((msg) =>
      this.gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'full',
      })
    );

    const messages = await Promise.all(messagePromises);
    return messages.map((m) => m.data).filter((m): m is gmail_v1.Schema$Message => !!m);
  }
}
