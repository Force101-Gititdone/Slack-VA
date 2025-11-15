import { Router } from 'express';
import { logger } from '../utils/logger.js';
import { db } from '../db/client.js';
import { oauthTokens } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Health check endpoint for Slack webhook verification
 * Slack will POST to this endpoint to verify the webhook URL
 */
router.post('/events', (req, res) => {
  logger.debug('Slack events endpoint called', { body: req.body });
  res.json({ ok: true });
});

/**
 * Status endpoint - Check service health and configuration
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      service: 'slack-va',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        oauth: 'unknown',
      },
    };

    // Check database connection
    try {
      await db.select().from(oauthTokens).limit(1);
      status.checks.database = 'connected';
    } catch (error) {
      status.checks.database = 'error';
      status.status = 'degraded';
      logger.warn('Database health check failed', {}, error instanceof Error ? error : undefined);
    }

    // Check OAuth tokens
    try {
      const tokens = await db.select().from(oauthTokens).limit(1);
      status.checks.oauth = tokens.length > 0 ? 'configured' : 'not_configured';
    } catch (error) {
      status.checks.oauth = 'error';
      logger.warn('OAuth check failed', {}, error instanceof Error ? error : undefined);
    }

    const statusCode = status.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(status);
  } catch (error) {
    logger.error('Status endpoint error', {}, error instanceof Error ? error : undefined);
    res.status(500).json({
      service: 'slack-va',
      status: 'error',
      error: 'Internal server error',
    });
  }
});

export default router;

