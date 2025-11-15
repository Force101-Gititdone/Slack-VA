declare const oauth2Client: import("google-auth-library").OAuth2Client;
export declare const GOOGLE_SCOPES: string[];
export declare class OAuthHelper {
    /**
     * Get OAuth authorization URL
     */
    static getAuthUrl(userId?: string): string;
    /**
     * Exchange authorization code for tokens
     */
    static exchangeCodeForTokens(code: string, userId?: string): Promise<void>;
    /**
     * Get authenticated OAuth2 client
     */
    static getAuthenticatedClient(userId?: string): Promise<typeof oauth2Client>;
    /**
     * Check if user is authenticated
     */
    static isAuthenticated(userId?: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=oauth.d.ts.map