import { CalendarService } from '../services/calendar.js';

export class CalendarCommands {
  /**
   * Handle schedule command
   */
  static async handleSchedule(description: string): Promise<any> {
    try {
      // Parse description to extract event details
      // This is a simplified parser - in production, use AI to parse natural language
      const calendar = await CalendarService.create();
      
      // For now, create a simple event (1 hour from now)
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 1);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1);

      const event = await calendar.createEvent({
        title: description,
        startTime,
        endTime,
      });

      return {
        text: `✅ Scheduled: ${description}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Event Created:*\n*${description}*\n\n*Start:* ${startTime.toLocaleString()}\n*End:* ${endTime.toLocaleString()}`,
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View in Calendar',
              },
              url: event.htmlLink || '',
            },
          },
        ],
      };
    } catch (error: any) {
      console.error('Schedule error:', error);
      return {
        text: `❌ Error scheduling event: ${error.message}`,
        response_type: 'ephemeral',
      };
    }
  }

  /**
   * Handle query command
   */
  static async handleQuery(query: string): Promise<any> {
    try {
      const calendar = await CalendarService.create();
      const events = await calendar.fetchUpcomingEvents(10);

      return {
        text: `Found ${events.length} upcoming events`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `📅 Upcoming Events (${events.length})`,
            },
          },
          {
            type: 'divider',
          },
          ...events.map((event) => ({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${event.summary || 'No title'}*\n${event.start?.dateTime ? new Date(event.start.dateTime).toLocaleString() : 'No start time'}`,
            },
            accessory: event.htmlLink
              ? {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'View',
                  },
                  url: event.htmlLink,
                }
              : undefined,
          })),
        ],
      };
    } catch (error: any) {
      console.error('Query error:', error);
      return {
        text: `❌ Error querying calendar: ${error.message}`,
        response_type: 'ephemeral',
      };
    }
  }
}
