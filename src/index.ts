import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PORT, ENV } from './config.js';
import { receiver, slackApp } from './services/slack.js';
import slackRouter from './routes/slack.js';
import healthRouter from './routes/health.js';
import { OAuthHelper } from './utils/oauth.js';
import { logger } from './utils/logger.js';
import { GmailLabelerService } from './services/gmail-labeler.js';

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
    await OAuthHelper.exchangeCodeForTokens(code, (state as string) || 'default');
    res.send('✅ Authentication successful! You can close this window.');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('Authentication failed. Please try again.');
  }
});

// OAuth initiation route
app.get('/auth/google', (req, res) => {
  const userId = (req.query.user_id as string) || 'default';
  const authUrl = OAuthHelper.getAuthUrl(userId);
  res.redirect(authUrl);
});

// Initialize Gmail labeler service
const gmailLabeler = new GmailLabelerService();

// Start server - CRITICAL: Bind to localhost only for security
app.listen(PORT, '127.0.0.1', async () => {
  logger.info('Slack VA server starting', {
    port: PORT,
    environment: ENV.NODE_ENV,
    baseUrl: ENV.BASE_URL,
  });
  
  console.log(`🚀 Slack VA server listening on 127.0.0.1:${PORT}`);
  console.log(`📍 Environment: ${ENV.NODE_ENV}`);
  console.log(`🔗 Base URL: ${ENV.BASE_URL}`);
  console.log(`🔐 OAuth URL: ${ENV.BASE_URL}/auth/google`);
  console.log(`🔒 Security: Bound to localhost only (SSH tunnel required)`);
  
  try {
    await slackApp.start();
    logger.info('Slack Bolt app started successfully');
    console.log('✅ Slack Bolt app started');
  } catch (error) {
    logger.critical('Failed to start Slack Bolt app', {}, error instanceof Error ? error : undefined);
    console.error('❌ Failed to start Slack Bolt app:', error);
    process.exit(1);
  }

  // Start Gmail labeler service
  try {
    await gmailLabeler.start();
    logger.info('Gmail labeler service started');
    console.log('✅ Gmail labeler service started');
  } catch (error) {
    logger.error('Failed to start Gmail labeler service', {}, error instanceof Error ? error : undefined);
    console.error('⚠️  Failed to start Gmail labeler service:', error);
    // Don't exit - labeler is optional
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  gmailLabeler.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  gmailLabeler.stop();
  process.exit(0);
});

