// Slack message formatting utilities
export function formatEmailMessage(email) {
    return {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*${email.subject || 'No subject'}*\nFrom: ${email.sender}\nCategory: ${email.category || 'Uncategorized'}\nIntent: ${email.intent || 'Unknown'}\nDate: ${email.receivedAt.toLocaleString()}`,
        },
    };
}
export function formatCalendarEvent(event) {
    return {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*${event.title}*\nStart: ${event.startTime.toLocaleString()}\nEnd: ${event.endTime.toLocaleString()}${event.location ? `\nLocation: ${event.location}` : ''}`,
        },
    };
}
export function formatCRMInsight(insight) {
    return {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*Next Action:* ${insight.nextAction || 'None'}\n*Suggested Message:* ${insight.suggestedMessage || 'None'}\n*Relationship Stage:* ${insight.relationshipStage || 'Unknown'}`,
        },
    };
}
//# sourceMappingURL=formatting.js.map