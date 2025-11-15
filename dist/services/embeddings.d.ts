export declare class EmbeddingsService {
    /**
     * Generate and store embedding for an email
     */
    static generateEmailEmbedding(emailId: string): Promise<void>;
    /**
     * Generate and store embedding for a contact profile
     */
    static generateContactEmbedding(contactId: string): Promise<void>;
    /**
     * Batch generate embeddings for emails without embeddings
     */
    static batchGenerateEmailEmbeddings(limit?: number): Promise<number>;
    /**
     * Batch generate embeddings for contacts without embeddings
     */
    static batchGenerateContactEmbeddings(limit?: number): Promise<number>;
}
//# sourceMappingURL=embeddings.d.ts.map