import pkg from '@slack/bolt';
const { App, ExpressReceiver } = pkg;
import { ENV } from '../config.js';
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
    }
    else if (text.startsWith('query')) {
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
    }
    else {
        await respond({
            text: 'Unknown command. Use `/gmail categorize` or `/gmail query <your query>`',
            response_type: 'ephemeral',
        });
    }
});
// Register calendar command
slackApp.command('/calendar', async ({ command, ack, respond }) => {
    await ack();
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
    }
    else if (text.startsWith('query')) {
        const { CalendarCommands } = await import('../commands/calendar.js');
        const response = await CalendarCommands.handleQuery(text.substring(5).trim());
        await respond(response);
    }
    else {
        await respond({
            text: 'Unknown command. Use `/calendar schedule <description>` or `/calendar query`',
            response_type: 'ephemeral',
        });
    }
});
// Register CRM command
slackApp.command('/crm', async ({ command, ack, respond }) => {
    await ack();
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
    }
    else if (text.startsWith('what-to-say')) {
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
    }
    else if (text.startsWith('status')) {
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
    }
    else {
        await respond({
            text: 'Unknown command. Use `/crm who-next`, `/crm what-to-say <contact>`, or `/crm status <contact>`',
            response_type: 'ephemeral',
        });
    }
});
//# sourceMappingURL=slack.js.map