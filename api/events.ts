/**
 * Slack VA Interface - API Layer
 * 
 * Handles Slack webhook events (Events API)
 * 
 * This file organizes webhook event handling from the existing implementation.
 * See: src/routes/slack.ts, src/services/slack.ts
 */

import { Router } from 'express';
import { logger } from '../../src/utils/logger.js';
import { db } from '../../src/db/client.js';
import { oauthTokens } from '../../src/db/schema.js';
import { receiver, slackApp } from '../../src/services/slack.js';

const router = Router();

/**
 * Health check endpoint for Slack webhook verification
 * Slack will POST to this endpoint to verify the webhook URL
 */
export function handleSlackEvents(req: any, res: any): void {
  logger.debug('Slack events endpoint called', { body: req.body });
  res.json({ ok: true });
}

/**
 * Status endpoint - Check service health and configuration
 */
export async function handleStatus(req: any, res: any): Promise<void> {
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
}

/**
 * Get Slack Bolt receiver for mounting in Express app
 */
export function getReceiver() {
  return receiver;
}

/**
 * Get Slack Bolt app instance
 */
export function getSlackApp() {
  return slackApp;
}

