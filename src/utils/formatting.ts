// Slack message formatting utilities

export function formatEmailMessage(email: {
  subject?: string | null;
  sender: string;
  receivedAt: Date;
  category?: string | null;
  intent?: string | null;
}): any {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${email.subject || 'No subject'}*\nFrom: ${email.sender}\nCategory: ${email.category || 'Uncategorized'}\nIntent: ${email.intent || 'Unknown'}\nDate: ${email.receivedAt.toLocaleString()}`,
    },
  };
}

export function formatCalendarEvent(event: {
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string | null;
}): any {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*${event.title}*\nStart: ${event.startTime.toLocaleString()}\nEnd: ${event.endTime.toLocaleString()}${event.location ? `\nLocation: ${event.location}` : ''}`,
    },
  };
}

export function formatCRMInsight(insight: {
  nextAction?: string | null;
  suggestedMessage?: string | null;
  relationshipStage?: string | null;
}): any {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Next Action:* ${insight.nextAction || 'None'}\n*Suggested Message:* ${insight.suggestedMessage || 'None'}\n*Relationship Stage:* ${insight.relationshipStage || 'Unknown'}`,
    },
  };
}

