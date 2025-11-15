import { google } from 'googleapis';
import { ENV } from '../config.js';
import { db } from '../db/client.js';
import { oauthTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt } from './encryption.js';
const oauth2Client = new google.auth.OAuth2(ENV.GOOGLE_CLIENT_ID, ENV.GOOGLE_CLIENT_SECRET, ENV.GOOGLE_REDIRECT_URI);
// Google OAuth scopes
export const GOOGLE_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];
export class OAuthHelper {
    /**
     * Get OAuth authorization URL
     */
    static getAuthUrl(userId) {
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: GOOGLE_SCOPES,
            prompt: 'consent', // Force consent to get refresh token
            state: userId || 'default',
        });
    }
    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCodeForTokens(code, userId = 'default') {
        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.refresh_token) {
            throw new Error('No refresh token received');
        }
        // Encrypt tokens before storing
        const encryptedAccessToken = tokens.access_token ? encrypt(tokens.access_token) : null;
        const encryptedRefreshToken = encrypt(tokens.refresh_token);
        // Store or update tokens in database
        const existing = await db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.provider, 'google'))
            .limit(1);
        if (existing.length > 0) {
            await db
                .update(oauthTokens)
                .set({
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                scope: tokens.scope || GOOGLE_SCOPES.join(' '),
                updatedAt: new Date(),
            })
                .where(eq(oauthTokens.id, existing[0].id));
        }
        else {
            await db.insert(oauthTokens).values({
                provider: 'google',
                userId,
                accessToken: encryptedAccessToken,
                refreshToken: encryptedRefreshToken,
                expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
                scope: tokens.scope || GOOGLE_SCOPES.join(' '),
            });
        }
    }
    /**
     * Get authenticated OAuth2 client
     */
    static async getAuthenticatedClient(userId = 'default') {
        const tokenRecord = await db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.provider, 'google'))
            .limit(1);
        if (tokenRecord.length === 0) {
            throw new Error('No OAuth tokens found. Please authenticate first.');
        }
        const { refreshToken, accessToken, expiresAt } = tokenRecord[0];
        // Decrypt tokens
        const decryptedRefreshToken = decrypt(refreshToken);
        const decryptedAccessToken = accessToken ? decrypt(accessToken) : null;
        oauth2Client.setCredentials({
            refresh_token: decryptedRefreshToken,
            access_token: decryptedAccessToken,
            expiry_date: expiresAt ? expiresAt.getTime() : undefined,
        });
        // Refresh token if expired
        if (!decryptedAccessToken || (expiresAt && expiresAt < new Date())) {
            const { credentials } = await oauth2Client.refreshAccessToken();
            // Update stored tokens
            const encryptedAccessToken = credentials.access_token ? encrypt(credentials.access_token) : null;
            await db
                .update(oauthTokens)
                .set({
                accessToken: encryptedAccessToken,
                expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
                updatedAt: new Date(),
            })
                .where(eq(oauthTokens.id, tokenRecord[0].id));
            oauth2Client.setCredentials(credentials);
        }
        return oauth2Client;
    }
    /**
     * Check if user is authenticated
     */
    static async isAuthenticated(userId = 'default') {
        const tokenRecord = await db
            .select()
            .from(oauthTokens)
            .where(eq(oauthTokens.provider, 'google'))
            .limit(1);
        return tokenRecord.length > 0 && !!tokenRecord[0].refreshToken;
    }
}
//# sourceMappingURL=oauth.js.map