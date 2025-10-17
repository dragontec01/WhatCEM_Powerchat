

/**
 * Convert a datetime from a specific timezone to UTC
 * @param datetime Date string or Date object representing local time in the source timezone
 * @param fromTimezone Source timezone (IANA identifier like 'Asia/Karachi')
 * @returns UTC Date object
 */
export function convertToUTC(datetime: string | Date, fromTimezone: string): Date {
  if (fromTimezone === 'UTC') {
    return new Date(datetime);
  }

  try {
    const inputDate = new Date(datetime);
    const year = inputDate.getFullYear();
    const month = inputDate.getMonth() + 1;
    const day = inputDate.getDate();
    const hour = inputDate.getHours();
    const minute = inputDate.getMinutes();
    const second = inputDate.getSeconds();

    const localTimeString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;


    const testDate = new Date(localTimeString + 'Z');

    const localizedString = testDate.toLocaleString('sv-SE', {
      timeZone: fromTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const localizedDate = new Date(localizedString);
    const originalDate = new Date(localTimeString);

    const offsetMs = originalDate.getTime() - localizedDate.getTime();
    const utcResult = new Date(testDate.getTime() + offsetMs);

    return utcResult;
  } catch (error) {
    
    return new Date(datetime);
  }
}

/**
 * Convert UTC datetime to a specific timezone
 * @param utcDatetime UTC Date object
 * @param toTimezone Target timezone (IANA identifier)
 * @returns Date object representing the time in target timezone
 */
export function convertFromUTC(utcDatetime: Date, toTimezone: string): Date {
  if (toTimezone === 'UTC') {
    return new Date(utcDatetime);
  }
  
  try {
    const targetTimeString = utcDatetime.toLocaleString('sv-SE', { 
      timeZone: toTimezone 
    });
    
    return new Date(targetTimeString);
  } catch (error) {
    
    return new Date(utcDatetime);
  }
}

/**
 * Get timezone offset in minutes for debugging purposes
 * @param timezone IANA timezone identifier
 * @returns Offset in minutes from UTC (positive for east, negative for west)
 */
export function getTimezoneOffsetMinutes(timezone: string): number {
  try {
    const now = new Date();
    
    const utcTime = now.getTime();
    const localTimeString = now.toLocaleString('sv-SE', { timeZone: timezone });
    const localTime = new Date(localTimeString).getTime();
    
    return Math.round((localTime - utcTime) / (1000 * 60));
  } catch (error) {
    
    return 0;
  }
}

/**
 * Validate if a timezone identifier is valid
 * @param timezone IANA timezone identifier to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get human-readable timezone information
 * @param timezone IANA timezone identifier
 * @returns Object with timezone details
 */
export function getTimezoneInfo(timezone: string): {
  name: string;
  offset: string;
  offsetMinutes: number;
  isValid: boolean;
} {
  if (!isValidTimezone(timezone)) {
    return {
      name: timezone,
      offset: 'Invalid',
      offsetMinutes: 0,
      isValid: false
    };
  }
  
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'longOffset'
    });
    
    const parts = formatter.formatToParts(now);
    const offsetName = parts.find(part => part.type === 'timeZoneName')?.value || 'UTC+00:00';
    const offsetMinutes = getTimezoneOffsetMinutes(timezone);
    
    return {
      name: timezone,
      offset: offsetName,
      offsetMinutes,
      isValid: true
    };
  } catch (error) {
    return {
      name: timezone,
      offset: 'Error',
      offsetMinutes: 0,
      isValid: false
    };
  }
}

/**
 * Calculate the scheduled time for a follow-up with proper timezone handling
 * @param triggerEvent Type of trigger ('specific_datetime' or 'relative_delay')
 * @param specificDatetime Specific datetime string (for specific_datetime trigger)
 * @param timezone Target timezone
 * @param delayAmount Delay amount (for relative_delay trigger)
 * @param delayUnit Delay unit (for relative_delay trigger)
 * @returns UTC Date object for when the follow-up should execute
 */
export function calculateFollowUpTime(
  triggerEvent: string,
  specificDatetime?: string,
  timezone?: string,
  delayAmount?: number,
  delayUnit?: string
): Date {
  if (triggerEvent === 'specific_datetime' && specificDatetime) {
    const tz = timezone || 'UTC';
    
    if (tz === 'UTC') {
      return new Date(specificDatetime);
    }
    
    return convertToUTC(specificDatetime, tz);
  } else {
    const now = new Date();
    let delayMs = 0;
    
    const amount = delayAmount || 1;
    const unit = delayUnit || 'hours';
    
    switch (unit) {
      case 'minutes':
        delayMs = amount * 60 * 1000;
        break;
      case 'hours':
        delayMs = amount * 60 * 60 * 1000;
        break;
      case 'days':
        delayMs = amount * 24 * 60 * 60 * 1000;
        break;
      case 'weeks':
        delayMs = amount * 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        delayMs = amount * 60 * 60 * 1000;
    }
    
    return new Date(now.getTime() + delayMs);
  }
}

/**
 * Format a UTC datetime for display in a specific timezone
 * @param utcDate UTC Date object
 * @param timezone Target timezone for display
 * @param includeTimezone Whether to include timezone info in output
 * @returns Formatted datetime string
 */
export function formatDateTimeInTimezone(
  utcDate: Date, 
  timezone: string = 'UTC', 
  includeTimezone: boolean = true
): string {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    
    if (includeTimezone) {
      options.timeZoneName = 'short';
    }
    
    return utcDate.toLocaleString('en-US', options);
  } catch (error) {
    
    return utcDate.toISOString();
  }
}
