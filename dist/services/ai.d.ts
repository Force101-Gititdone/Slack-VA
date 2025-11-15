export interface CategorizationResult {
    category: string;
    intent: string;
    urgency: 'low' | 'medium' | 'high';
    summary: string;
    suggestedLabels: string[];
}
export declare class AIService {
    /**
     * Categorize email using AI
     */
    static categorizeEmail(subject: string, body: string, sender: string): Promise<CategorizationResult>;
    /**
     * Understand natural language query
     */
    static understandQuery(query: string): Promise<{
        intent: string;
        filters: {
            dateRange?: {
                start: Date;
                end: Date;
            };
            sender?: string;
            category?: string;
            urgency?: string;
            keywords?: string[];
        };
    }>;
    /**
     * Generate embedding for text
     */
    static generateEmbedding(text: string): Promise<number[]>;
}
//# sourceMappingURL=ai.d.ts.map