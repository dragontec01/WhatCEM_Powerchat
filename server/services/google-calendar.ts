import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Request, Response } from 'express';
import { storage } from '../storage';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

class GoogleCalendarService {
  constructor() {
  }

  /**
   * Get Google OAuth credentials from super admin settings
   */
  private async getApplicationCredentials(): Promise<{
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  } | null> {
    try {
      const credentials = await storage.getAppSetting('google_calendar_oauth');

      if (!credentials || !credentials.value) {
        console.error('Google Calendar OAuth not configured in admin settings');
        return null;
      }

      const config = credentials.value as any;
      if (!config.enabled || !config.client_id || !config.client_secret) {
        console.error('Google Calendar OAuth not properly configured or disabled');
        return null;
      }

      return {
        clientId: config.client_id,
        clientSecret: config.client_secret,
        redirectUri: config.redirect_uri || `${process.env.BASE_URL || 'http://localhost:9000'}/api/google/calendar/callback`
      };
    } catch (error) {
      console.error('Error getting application Google credentials:', error);
      return null;
    }
  }

  /**
   * Create a Google OAuth2 client using application credentials
   */
  private async getOAuth2Client(): Promise<OAuth2Client | null> {
    const credentials = await this.getApplicationCredentials();

    if (!credentials) {
      return null;
    }

    return new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
  }

  /**
   * Generate an authentication URL for Google Calendar
   */
  public async getAuthUrl(userId: number, companyId: number): Promise<string | null> {
    const oauth2Client = await this.getOAuth2Client();

    if (!oauth2Client) {
      return null;
    }

    const state = Buffer.from(JSON.stringify({ userId, companyId })).toString('base64');

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state,
      prompt: 'consent'
    });
  }

  /**
   * Handle the OAuth callback and save tokens
   */
  public async handleAuthCallback(req: Request, res: Response): Promise<void> {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code) {
      res.status(400).send('Authorization code not provided');
      return;
    }

    try {
      const stateData = JSON.parse(Buffer.from(stateParam, 'base64').toString());
      const userId = stateData.userId;
      const companyId = stateData.companyId;

      if (!userId || !companyId) {
        res.status(400).send('User ID or Company ID not found in state parameter');
        return;
      }

      const oauth2Client = await this.getOAuth2Client();

      if (!oauth2Client) {
        res.status(400).send('Google Calendar OAuth not configured in admin settings');
        return;
      }

      const { tokens } = await oauth2Client.getToken(code);

      const googleTokens = {
        access_token: tokens.access_token || '',
        refresh_token: tokens.refresh_token || undefined,
        id_token: tokens.id_token || undefined,
        token_type: tokens.token_type || undefined,
        expiry_date: tokens.expiry_date || undefined,
        scope: tokens.scope || undefined
      };

      await storage.saveGoogleTokens(userId, companyId, googleTokens);

      res.redirect('/settings?google_auth=success');
    } catch (error) {
      console.error('Error handling Google auth callback:', error);
      res.status(500).send('Failed to authenticate with Google');
    }
  }

  /**
   * Get an authorized Google Calendar client for a user
   */
  public async getCalendarClient(userId: number, companyId: number): Promise<calendar_v3.Calendar | null> {
    try {
      const tokens = await storage.getGoogleTokens(userId, companyId);

      if (!tokens) {
        console.error(`No Google tokens found for user ${userId} in company ${companyId}`);
        return null;
      }

      const oauth2Client = await this.getOAuth2Client();

      if (!oauth2Client) {
        console.error('Google Calendar OAuth not configured in admin settings');
        return null;
      }

      oauth2Client.setCredentials(tokens);

      if (tokens.expiry_date && tokens.expiry_date < Date.now() && tokens.refresh_token) {
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();

          const googleTokens = {
            access_token: credentials.access_token || '',
            refresh_token: credentials.refresh_token || undefined,
            id_token: credentials.id_token || undefined,
            token_type: credentials.token_type || undefined,
            expiry_date: credentials.expiry_date || undefined,
            scope: credentials.scope || undefined
          };

          await storage.saveGoogleTokens(userId, companyId, googleTokens);
          oauth2Client.setCredentials(credentials);
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
          return null;
        }
      }

      return google.calendar({ version: 'v3', auth: oauth2Client });
    } catch (error) {
      console.error('Error creating Google Calendar client:', error);
      return null;
    }
  }

  /**
   * Create a calendar event
   */
  public async createCalendarEvent(
    userId: number,
    companyId: number,
    eventData: any
  ): Promise<{ success: boolean, eventId?: string, error?: string, eventLink?: string }> {


    const {
      summary,
      description,
      location,
      start,
      end,
      attendees = []
    } = eventData;

    const startDateTime = start?.dateTime;
    const endDateTime = end?.dateTime;



    if (!startDateTime || !endDateTime) {
      console.error('Google Calendar Service: Missing start or end time');
      return { success: false, error: 'Start and end times are required' };
    }
    try {

      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        console.error('Google Calendar Service: Calendar client not available');
        return { success: false, error: 'Google Calendar client not available' };
      }



      const event: calendar_v3.Schema$Event = {
        summary,
        description,
        location,
        start: {
          dateTime: startDateTime,
          timeZone: start?.timeZone || 'UTC',
        },
        end: {
          dateTime: endDateTime,
          timeZone: end?.timeZone || 'UTC',
        },
        attendees: attendees && attendees.length > 0 ?
          (typeof attendees[0] === 'string' ?
            attendees.map((emailAddress: string) => ({ email: emailAddress })) :
            attendees
          ) : undefined,
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };


      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
        sendUpdates: 'all',
      });



      if (response.status === 200 && response.data.id) {
        const result: {
          success: boolean;
          eventId?: string;
          eventLink?: string;
        } = {
          success: true,
          eventId: response.data.id
        };

        if (response.data.htmlLink) {
          result.eventLink = response.data.htmlLink;
        }


        return result;
      } else {
        console.error('Google Calendar Service: Unexpected response status:', response.status);
        return {
          success: false,
          error: `Failed to create event, status code: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('Google Calendar Service: Error creating calendar event:', {
        error: error.message,
        stack: error.stack,
        userId,
        companyId,
        eventData
      });
      return {
        success: false,
        error: error.message || 'Failed to create calendar event'
      };
    }
  }

  /**
   * List calendar events for a specific time range
   */
  public async listCalendarEvents(
    userId: number,
    companyId: number,
    timeMin: string,
    timeMax: string,
    maxResults: number = 10
  ): Promise<any> {
    try {
      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        return { success: false, error: 'Google Calendar client not available' };
      }

      const startTime = typeof timeMin === 'string' ? timeMin : new Date(timeMin).toISOString();
      const endTime = typeof timeMax === 'string' ? timeMax : new Date(timeMax).toISOString();

      

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: startTime,
        timeMax: endTime,
        maxResults: maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return {
        success: true,
        items: response.data.items || [],
        nextPageToken: response.data.nextPageToken
      };
    } catch (error: any) {
      console.error('Error listing calendar events:', error);
      return {
        success: false,
        error: error.message || 'Failed to list calendar events',
        items: []
      };
    }
  }

  /**
   * Delete (cancel) a calendar event
   * @param userId The user ID
   * @param eventId The ID of the event to delete
   */
  public async deleteCalendarEvent(
    userId: number,
    companyId: number,
    eventId: string
  ): Promise<{ success: boolean, error?: string }> {
    try {
      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        return { success: false, error: 'Google Calendar client not available' };
      }

      

      const response = await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });

      if (response.status === 204 || response.status === 200) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Failed to delete event, status code: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete calendar event'
      };
    }
  }

  /**
   * Update an existing calendar event
   * @param userId The user ID
   * @param eventId The ID of the event to update
   * @param eventData The updated event data
   */
  public async updateCalendarEvent(
    userId: number,
    companyId: number,
    eventId: string,
    eventData: any
  ): Promise<{ success: boolean, error?: string, eventId?: string, eventLink?: string }> {
    try {
      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        return { success: false, error: 'Google Calendar client not available' };
      }

      

      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: eventData
      });

      if (response.status === 200) {
        const result: {
          success: boolean,
          eventId?: string,
          eventLink?: string
        } = {
          success: true,
          eventId: response.data.id as string | undefined
        };

        if (response.data.htmlLink) {
          result.eventLink = response.data.htmlLink;
        }

        return result;
      } else {
        return {
          success: false,
          error: `Failed to update event, status code: ${response.status}`
        };
      }
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      return {
        success: false,
        error: error.message || 'Failed to update calendar event'
      };
    }
  }

  /**
   * Find appointment by date and time
   * Useful for finding an appointment to cancel or update
   */
  public async findAppointmentByDateTime(
    userId: number,
    companyId: number,
    date: string,
    time: string,
    email?: string
  ): Promise<{ success: boolean, eventId?: string, error?: string }> {
    try {
      const appointmentDateTime = new Date(`${date}T${time}:00`);

      const timeMin = new Date(appointmentDateTime.getTime() - 60000).toISOString();
      const timeMax = new Date(appointmentDateTime.getTime() + 60000).toISOString();

      const events = await this.listCalendarEvents(userId, companyId, timeMin, timeMax, 10);

      if (!events.success) {
        return { success: false, error: events.error };
      }

      if (events.items.length === 0) {
        return { success: false, error: 'No appointment found at specified date and time' };
      }

      if (email) {
        for (const event of events.items) {
          if (event.attendees && event.attendees.some((attendee: any) => attendee.email === email)) {
            return { success: true, eventId: event.id };
          }
        }
      }

      return { success: true, eventId: events.items[0].id };

    } catch (error: any) {
      console.error('Error finding appointment:', error);
      return {
        success: false,
        error: error.message || 'Failed to find appointment'
      };
    }
  }

  /**
   * Check the connection status of the Google Calendar integration
   */
  public async checkCalendarConnectionStatus(
    userId: number,
    companyId: number
  ): Promise<{ connected: boolean, message: string }> {
    try {
      const tokens = await storage.getGoogleTokens(userId, companyId);

      if (!tokens) {
        return {
          connected: false,
          message: 'Not connected to Google Calendar'
        };
      }

      const calendar = await this.getCalendarClient(userId, companyId);
      if (!calendar) {
        return {
          connected: false,
          message: 'Connection to Google Calendar failed'
        };
      }

      return {
        connected: true,
        message: 'Connected to Google Calendar'
      };
    } catch (error) {
      console.error('Error checking calendar connection:', error);
      return {
        connected: false,
        message: 'Error checking Google Calendar connection'
      };
    }
  }

  /**
   * Get available time slots from a user's calendar
   * Enhanced to work with both single date and date range
   */
  public async getAvailableTimeSlots(
    userId: number,
    companyId: number,
    date?: string,
    durationMinutes: number = 60,
    startDate?: string,
    endDate?: string,
    businessHoursStart: number = 9,
    businessHoursEnd: number = 18
  ): Promise<{
    success: boolean,
    timeSlots?: Array<{
      date: string,
      slots: string[]
    }>,
    error?: string
  }> {


    try {

      const calendar = await this.getCalendarClient(userId, companyId);

      if (!calendar) {
        console.error('Google Calendar Service: Calendar client not available for availability check');
        return { success: false, error: 'Google Calendar client not available' };
      }



      let startDateTime: string;
      let endDateTime: string;
      let dateArray: string[] = [];

      if (date) {
        startDateTime = new Date(`${date}T00:00:00Z`).toISOString();
        endDateTime = new Date(`${date}T23:59:59Z`).toISOString();
        dateArray = [date];
      } else if (startDate && endDate) {
        startDateTime = new Date(`${startDate}T00:00:00Z`).toISOString();
        endDateTime = new Date(`${endDate}T23:59:59Z`).toISOString();

        dateArray = this.generateDateRange(startDate, endDate);
      } else {
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0];
        startDateTime = new Date(`${formattedToday}T00:00:00Z`).toISOString();
        endDateTime = new Date(`${formattedToday}T23:59:59Z`).toISOString();
        dateArray = [formattedToday];
      }

      

      const busyTimeSlotsResponse = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDateTime,
          timeMax: endDateTime,
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = busyTimeSlotsResponse.data.calendars?.primary?.busy || [];
      

      const allAvailableSlots: Array<{date: string, slots: string[]}> = [];

      for (const currentDate of dateArray) {
        const availableSlots: string[] = [];
        const dateObj = new Date(`${currentDate}T00:00:00Z`);

        dateObj.setHours(businessHoursStart, 0, 0, 0);

        

        while (dateObj.getHours() < businessHoursEnd) {
          const slotStart = new Date(dateObj);
          const slotEnd = new Date(dateObj);
          slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

          if (slotEnd.getHours() > businessHoursEnd ||
              (slotEnd.getHours() === businessHoursEnd && slotEnd.getMinutes() > 0)) {
            break;
          }

          const isSlotAvailable = !busySlots.some((busySlot: any) => {
            const busyStart = new Date(busySlot.start);
            const busyEnd = new Date(busySlot.end);

            return (
              (slotStart >= busyStart && slotStart < busyEnd) ||
              (slotEnd > busyStart && slotEnd <= busyEnd) ||
              (slotStart <= busyStart && slotEnd >= busyEnd)
            );
          });

          if (isSlotAvailable) {
            const formattedStart = slotStart.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
            availableSlots.push(formattedStart);
          }

          dateObj.setMinutes(dateObj.getMinutes() + 30);
        }

        allAvailableSlots.push({
          date: currentDate,
          slots: availableSlots
        });
      }

      return {
        success: true,
        timeSlots: allAvailableSlots
      };
    } catch (error: any) {
      console.error('Error getting available time slots:', error);
      return {
        success: false,
        error: error.message || 'Failed to get available time slots'
      };
    }
  }

  /**
   * Generate an array of dates between start and end dates (inclusive)
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray: string[] = [];

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const current = new Date(start);
    while (current <= end) {
      dateArray.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    return dateArray;
  }
}

const googleCalendarService = new GoogleCalendarService();
export default googleCalendarService;