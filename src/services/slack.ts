import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import { ENV } from '../config.js';
import { handleError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const receiver = new ExpressReceiver({
  signingSecret: ENV.SLACK_SIGNING_SECRET,
  endpoints: '/slack/events',
});

export const slackApp = new App({
  token: ENV.SLACK_BOT_TOKEN,
  receiver,
});

// Register slash commands
slackApp.command('/gmail', async ({ command, ack, respond }) => {
  await ack();

  try {
    const text = command.text.trim();
    
    if (!text) {
      await respond({
        text: 'Usage: `/gmail categorize` or `/gmail query <your query>`',
        response_type: 'ephemeral',
      });
      return;
    }

    if (text.startsWith('categorize')) {
      // Handle categorize command
      const { GmailCommands } = await import('../commands/gmail.js');
      const response = await GmailCommands.handleCategorize();
      await respond(response);
    } else if (text.startsWith('auto-label')) {
      // Handle auto-label command (Gmail-Context integration)
      const maxEmails = parseInt(text.substring(10).trim()) || 50;
      const { GmailCommands } = await import('../commands/gmail.js');
      const response = await GmailCommands.handleAutoLabel(maxEmails);
      await respond(response);
    } else if (text.startsWith('query')) {
      // Handle query command
      const query = text.substring(5).trim();
      if (!query) {
        await respond({
          text: 'Please provide a query. Example: `/gmail query urgent emails from last week`',
          response_type: 'ephemeral',
        });
        return;
      }
      const { GmailCommands } = await import('../commands/gmail.js');
      const response = await GmailCommands.handleQuery(query);
      await respond(response);
    } else {
      await respond({
        text: 'Unknown command. Use `/gmail categorize` or `/gmail query <your query>`',
        response_type: 'ephemeral',
      });
    }
  } catch (error) {
    const errorResponse = handleError(error, 'gmail');
    await respond(errorResponse);
  }
});

// Register calendar command
slackApp.command('/calendar', async ({ command, ack, respond }) => {
  await ack();

  try {
    const text = command.text.trim();
    
    if (!text) {
      await respond({
        text: 'Usage: `/calendar schedule <description>` or `/calendar query`',
        response_type: 'ephemeral',
      });
      return;
    }

    if (text.startsWith('schedule')) {
      const description = text.substring(8).trim();
      if (!description) {
        await respond({
          text: 'Please provide a description. Example: `/calendar schedule Meeting with John tomorrow at 2pm`',
          response_type: 'ephemeral',
        });
        return;
      }
      const { CalendarCommands } = await import('../commands/calendar.js');
      const response = await CalendarCommands.handleSchedule(description);
      await respond(response);
    } else if (text.startsWith('query')) {
      const { CalendarCommands } = await import('../commands/calendar.js');
      const response = await CalendarCommands.handleQuery(text.substring(5).trim());
      await respond(response);
    } else {
      await respond({
        text: 'Unknown command. Use `/calendar schedule <description>` or `/calendar query`',
        response_type: 'ephemeral',
      });
    }
  } catch (error) {
    const errorResponse = handleError(error, 'calendar');
    await respond(errorResponse);
  }
});

// Register CRM command
slackApp.command('/crm', async ({ command, ack, respond }) => {
  await ack();

  try {
    const text = command.text.trim();
    
    if (!text) {
      await respond({
        text: 'Usage: `/crm who-next`, `/crm what-to-say <contact>`, or `/crm status <contact>`',
        response_type: 'ephemeral',
      });
      return;
    }

    if (text.startsWith('who-next')) {
      const { CRMCommands } = await import('../commands/crm.js');
      const response = await CRMCommands.handleWhoNext();
      await respond(response);
    } else if (text.startsWith('what-to-say')) {
      const contact = text.substring(11).trim();
      if (!contact) {
        await respond({
          text: 'Please provide a contact. Example: `/crm what-to-say john@example.com`',
          response_type: 'ephemeral',
        });
        return;
      }
      const { CRMCommands } = await import('../commands/crm.js');
      const response = await CRMCommands.handleWhatToSay(contact);
      await respond(response);
    } else if (text.startsWith('status')) {
      const contact = text.substring(6).trim();
      if (!contact) {
        await respond({
          text: 'Please provide a contact. Example: `/crm status john@example.com`',
          response_type: 'ephemeral',
        });
        return;
      }
      const { CRMCommands } = await import('../commands/crm.js');
      const response = await CRMCommands.handleStatus(contact);
      await respond(response);
    } else {
      await respond({
        text: 'Unknown command. Use `/crm who-next`, `/crm what-to-say <contact>`, or `/crm status <contact>`',
        response_type: 'ephemeral',
      });
    }
  } catch (error) {
    const errorResponse = handleError(error, 'crm');
    await respond(errorResponse);
  }
});

// Register CMA command
slackApp.command('/cma', async ({ command, ack, respond }) => {
  await ack();

  try {
    const text = command.text.trim();
    const slackUserId = command.user_id;
    
    if (!text) {
      await respond({
        text: 'Usage: `/cma <address>` or `/cma generate <address> [beds] [baths] [sqft]`\nExample: `/cma 123 Main St, Denver, CO 80202`\n\nOther commands: `/cma status <cma-id>`, `/cma history`',
        response_type: 'ephemeral',
      });
      return;
    }

    if (text.startsWith('status')) {
      const cmaId = text.substring(6).trim();
      if (!cmaId) {
        await respond({
          text: 'Please provide a CMA ID. Example: `/cma status <cma-id>`',
          response_type: 'ephemeral',
        });
        return;
      }
      const { CMACommands } = await import('../commands/cma.js');
      const response = await CMACommands.handleStatus(slackUserId, cmaId);
      await respond(response);
    } else if (text.startsWith('history')) {
      const { CMACommands } = await import('../commands/cma.js');
      const response = await CMACommands.handleHistory(slackUserId);
      await respond(response);
    } else {
      // Default to generate command
      const { CMACommands } = await import('../commands/cma.js');
      const response = await CMACommands.handleGenerate(slackUserId, text);
      await respond(response);
    }
  } catch (error) {
    const errorResponse = handleError(error, 'cma');
    await respond(errorResponse);
  }
});

/**
 * Send notification about Gmail label application
 * Matches n8n workflow notification format
 */
export async function sendLabelApplicationNotification(
  channelId: string,
  labelName: string,
  userId?: string
): Promise<void> {
  try {
    const accountInfo = userId ? ` (${userId})` : '';
    const message = `${labelName}${accountInfo}`;

    await slackApp.client.chat.postMessage({
      channel: channelId,
      text: message,
      icon_emoji: ':b1:',
      username: 'Gmail Labeler',
    });

    logger.info('Sent label application notification', {
      channelId,
      labelName,
      userId,
    });
  } catch (error) {
    logger.error('Failed to send label application notification', {
      channelId,
      labelName,
      userId,
    }, error instanceof Error ? error : undefined);
    throw error;
  }
}
