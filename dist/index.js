import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PORT, ENV } from './config.js';
import { receiver, slackApp } from './services/slack.js';
import slackRouter from './routes/slack.js';
import healthRouter from './routes/health.js';
import { OAuthHelper } from './utils/oauth.js';
const app = express();
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// Mount Slack Bolt receiver
app.use(receiver.router);
// Routes
app.use('/slack', slackRouter);
app.use('/health', healthRouter);
// OAuth callback route
app.get('/auth/google/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || typeof code !== 'string') {
        return res.status(400).send('Missing authorization code');
    }
    try {
        await OAuthHelper.exchangeCodeForTokens(code, state || 'default');
        res.send('✅ Authentication successful! You can close this window.');
    }
    catch (error) {
        console.error('OAuth error:', error);
        res.status(500).send('Authentication failed. Please try again.');
    }
});
// OAuth initiation route
app.get('/auth/google', (req, res) => {
    const userId = req.query.user_id || 'default';
    const authUrl = OAuthHelper.getAuthUrl(userId);
    res.redirect(authUrl);
});
// Start server - CRITICAL: Bind to localhost only for security
app.listen(PORT, '127.0.0.1', async () => {
    console.log(`🚀 Slack VA server listening on 127.0.0.1:${PORT}`);
    console.log(`📍 Environment: ${ENV.NODE_ENV}`);
    console.log(`🔗 Base URL: ${ENV.BASE_URL}`);
    console.log(`🔐 OAuth URL: ${ENV.BASE_URL}/auth/google`);
    console.log(`🔒 Security: Bound to localhost only (SSH tunnel required)`);
    await slackApp.start();
    console.log('✅ Slack Bolt app started');
});
//# sourceMappingURL=index.js.map