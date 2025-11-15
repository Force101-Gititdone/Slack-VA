/**
 * Slack VA Interface - UI Layer
 * 
 * Message templates and formatting for Slack messages
 * 
 * This file organizes message formatting from the existing implementation.
 * See: src/utils/formatting.ts for email formatting utilities
 */

import { formatEmailMessage } from '../../src/utils/formatting.js';
import { createCMABlocks, createEmailListBlocks } from './blocks.js';

/**
 * Format error message for Slack
 */
export function formatErrorMessage(error: string, command?: string): string {
  const prefix = command ? `Error in ${command} command: ` : 'Error: ';
  return `${prefix}${error}`;
}

/**
 * Format success message
 */
export function formatSuccessMessage(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format info message
 */
export function formatInfoMessage(message: string): string {
  return `ℹ️ ${message}`;
}

/**
 * Format warning message
 */
export function formatWarningMessage(message: string): string {
  return `⚠️ ${message}`;
}

/**
 * Format email message for Slack display
 * Uses existing formatting utility
 */
export function formatEmailForSlack(email: {
  subject: string;
  sender: string;
  body: string;
  date?: Date;
}): string {
  return formatEmailMessage(email);
}

/**
 * Format CMA response message
 */
export function formatCMAResponse(cma: {
  id: string;
  address: string;
  estimatedValue: { low: number; mid: number; high: number };
  status: string;
  comps?: Array<{ address: string; price: number }>;
}): { text?: string; blocks?: any[] } {
  const blocks = createCMABlocks(cma);
  
  // Add comps if available
  if (cma.comps && cma.comps.length > 0) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Comparable Properties:*',
        },
      }
    );
    
    cma.comps.slice(0, 5).forEach(comp => {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• ${comp.address} - $${comp.price.toLocaleString()}`,
        },
      });
    });
  }

  return {
    text: `CMA Report for ${cma.address}`,
    blocks,
  };
}

/**
 * Format email list response
 */
export function formatEmailListResponse(emails: Array<{
  subject: string;
  sender: string;
  snippet: string;
}>): { text?: string; blocks?: any[] } {
  const blocks = createEmailListBlocks(emails);
  
  return {
    text: `Found ${emails.length} email(s)`,
    blocks,
  };
}

/**
 * Format calendar event message
 */
export function formatCalendarEvent(event: {
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
}): string {
  const startTime = event.start.toLocaleString();
  const endTime = event.end.toLocaleString();
  let message = `📅 *${event.summary}*\n`;
  message += `Time: ${startTime} - ${endTime}\n`;
  if (event.location) {
    message += `Location: ${event.location}\n`;
  }
  if (event.description) {
    message += `\n${event.description}`;
  }
  return message;
}

/**
 * Format CRM contact message
 */
export function formatCRMContact(contact: {
  name: string;
  email: string;
  lastContact?: Date;
  notes?: string;
}): string {
  let message = `👤 *${contact.name}*\n`;
  message += `Email: ${contact.email}\n`;
  if (contact.lastContact) {
    message += `Last Contact: ${contact.lastContact.toLocaleDateString()}\n`;
  }
  if (contact.notes) {
    message += `\nNotes: ${contact.notes}`;
  }
  return message;
}

/**
 * Format usage/help message for commands
 */
export function formatCommandUsage(command: string, usage: string, examples?: string[]): string {
  let message = `*Usage:* \`${usage}\`\n`;
  if (examples && examples.length > 0) {
    message += `\n*Examples:*\n`;
    examples.forEach(example => {
      message += `• \`${example}\`\n`;
    });
  }
  return message;
}

