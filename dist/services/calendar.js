import { google } from 'googleapis';
import { OAuthHelper } from '../utils/oauth.js';
import { db } from '../db/client.js';
import { calendarEvents } from '../db/schema.js';
import { eq } from 'drizzle-orm';
export class CalendarService {
    constructor(calendar) {
        this.calendar = calendar;
    }
    /**
     * Create Calendar service instance with authenticated client
     */
    static async create(userId = 'default') {
        const auth = await OAuthHelper.getAuthenticatedClient(userId);
        const calendar = google.calendar({ version: 'v3', auth });
        return new CalendarService(calendar);
    }
    /**
     * Fetch upcoming events
     */
    async fetchUpcomingEvents(maxResults = 10) {
        const response = await this.calendar.events.list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            maxResults,
            singleEvents: true,
            orderBy: 'startTime',
        });
        return response.data.items || [];
    }
    /**
     * Create calendar event
     */
    async createEvent(event) {
        const response = await this.calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: event.title,
                description: event.description,
                start: {
                    dateTime: event.startTime.toISOString(),
                    timeZone: 'America/Denver',
                },
                end: {
                    dateTime: event.endTime.toISOString(),
                    timeZone: 'America/Denver',
                },
                location: event.location,
                attendees: event.attendees?.map((email) => ({ email })),
            },
            sendUpdates: 'all',
        });
        const createdEvent = response.data;
        // Store in database
        if (createdEvent.id) {
            await db.insert(calendarEvents).values({
                eventId: createdEvent.id,
                title: event.title,
                description: event.description,
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
                attendees: event.attendees,
                status: createdEvent.status || 'confirmed',
            });
        }
        return createdEvent;
    }
    /**
     * Find available time slots
     */
    async findAvailableSlots(startDate, endDate, durationMinutes = 60) {
        const response = await this.calendar.freebusy.query({
            requestBody: {
                timeMin: startDate.toISOString(),
                timeMax: endDate.toISOString(),
                items: [{ id: 'primary' }],
            },
        });
        const busy = response.data.calendars?.primary?.busy || [];
        const available = [];
        let current = new Date(startDate);
        const end = new Date(endDate);
        while (current < end) {
            const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
            // Check if this slot overlaps with any busy period
            const isBusy = busy.some((period) => {
                const busyStart = new Date(period.start || '');
                const busyEnd = new Date(period.end || '');
                return current < busyEnd && slotEnd > busyStart;
            });
            if (!isBusy) {
                available.push({ start: new Date(current), end: new Date(slotEnd) });
            }
            // Move to next hour
            current = new Date(current.getTime() + 60 * 60000);
        }
        return available;
    }
    /**
     * Update calendar event
     */
    async updateEvent(eventId, updates) {
        // Get existing event
        const existing = await this.calendar.events.get({
            calendarId: 'primary',
            eventId,
        });
        const response = await this.calendar.events.update({
            calendarId: 'primary',
            eventId,
            requestBody: {
                ...existing.data,
                summary: updates.title || existing.data.summary,
                description: updates.description !== undefined ? updates.description : existing.data.description,
                start: updates.startTime
                    ? {
                        dateTime: updates.startTime.toISOString(),
                        timeZone: 'America/Denver',
                    }
                    : existing.data.start,
                end: updates.endTime
                    ? {
                        dateTime: updates.endTime.toISOString(),
                        timeZone: 'America/Denver',
                    }
                    : existing.data.end,
                location: updates.location !== undefined ? updates.location : existing.data.location,
            },
            sendUpdates: 'all',
        });
        // Update in database
        if (response.data.id) {
            await db
                .update(calendarEvents)
                .set({
                title: updates.title || undefined,
                description: updates.description !== undefined ? updates.description : undefined,
                startTime: updates.startTime || undefined,
                endTime: updates.endTime || undefined,
                location: updates.location !== undefined ? updates.location : undefined,
                updatedAt: new Date(),
            })
                .where(eq(calendarEvents.eventId, response.data.id));
        }
        return response.data;
    }
}
//# sourceMappingURL=calendar.js.map