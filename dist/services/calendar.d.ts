import { calendar_v3 } from 'googleapis';
export declare class CalendarService {
    private calendar;
    private constructor();
    /**
     * Create Calendar service instance with authenticated client
     */
    static create(userId?: string): Promise<CalendarService>;
    /**
     * Fetch upcoming events
     */
    fetchUpcomingEvents(maxResults?: number): Promise<calendar_v3.Schema$Event[]>;
    /**
     * Create calendar event
     */
    createEvent(event: {
        title: string;
        description?: string;
        startTime: Date;
        endTime: Date;
        location?: string;
        attendees?: string[];
    }): Promise<calendar_v3.Schema$Event>;
    /**
     * Find available time slots
     */
    findAvailableSlots(startDate: Date, endDate: Date, durationMinutes?: number): Promise<{
        start: Date;
        end: Date;
    }[]>;
    /**
     * Update calendar event
     */
    updateEvent(eventId: string, updates: {
        title?: string;
        description?: string;
        startTime?: Date;
        endTime?: Date;
        location?: string;
    }): Promise<calendar_v3.Schema$Event>;
}
//# sourceMappingURL=calendar.d.ts.map