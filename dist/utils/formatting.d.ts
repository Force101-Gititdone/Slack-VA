export declare function formatEmailMessage(email: {
    subject?: string | null;
    sender: string;
    receivedAt: Date;
    category?: string | null;
    intent?: string | null;
}): any;
export declare function formatCalendarEvent(event: {
    title: string;
    startTime: Date;
    endTime: Date;
    location?: string | null;
}): any;
export declare function formatCRMInsight(insight: {
    nextAction?: string | null;
    suggestedMessage?: string | null;
    relationshipStage?: string | null;
}): any;
//# sourceMappingURL=formatting.d.ts.map