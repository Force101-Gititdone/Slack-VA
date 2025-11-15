/**
 * Slack VA Interface - API Layer
 * 
 * Handles Slack slash commands
 * 
 * This file organizes slash command registration from the existing implementation.
 * See: src/services/slack.ts for the actual command handlers
 */

import { slackApp } from '../../src/services/slack.js';
import { handleError } from '../../src/utils/errors.js';

/**
 * Register all slash commands
 * 
 * This function is called during app initialization to register
 * all slash command handlers with the Slack Bolt app.
 * 
 * Commands registered:
 * - /gmail - Gmail categorization and querying
 * - /calendar - Calendar scheduling and querying
 * - /crm - CRM contact management
 * - /cma - Comparative Market Analysis generation
 */
export function registerSlashCommands(): void {
  // Gmail command - registered in src/services/slack.ts
  // Calendar command - registered in src/services/slack.ts
  // CRM command - registered in src/services/slack.ts
  // CMA command - registered in src/services/slack.ts
  
  // All commands are already registered in src/services/slack.ts
  // This file serves as documentation and organization point
  // for the slash command API layer
}

/**
 * Get registered slash commands
 * Returns list of all registered slash commands
 */
export function getRegisteredCommands(): string[] {
  return ['/gmail', '/calendar', '/crm', '/cma'];
}

/**
 * Handle slash command error
 * Wrapper for consistent error handling across commands
 */
export function handleSlashCommandError(error: unknown, command: string) {
  return handleError(error, command);
}

