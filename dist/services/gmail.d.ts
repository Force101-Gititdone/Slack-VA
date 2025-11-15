import { gmail_v1 } from 'googleapis';
export declare class GmailService {
    private gmail;
    private constructor();
    /**
     * Create Gmail service instance with authenticated client
     */
    static create(userId?: string): Promise<GmailService>;
    /**
     * Fetch recent emails
     */
    fetchRecentEmails(maxResults?: number): Promise<gmail_v1.Schema$Message[]>;
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
    };
    /**
     * Store email in database
     */
    storeEmail(parsedEmail: ReturnType<typeof this.parseEmail>): Promise<void>;
    /**
     * Apply label to email
     */
    applyLabel(messageId: string, labelId: string): Promise<void>;
    /**
     * Create or get label by name
     */
    getOrCreateLabel(labelName: string): Promise<string>;
}
//# sourceMappingURL=gmail.d.ts.map