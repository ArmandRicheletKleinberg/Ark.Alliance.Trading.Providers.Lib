/**
 * @fileoverview Time Utilities
 * @module helpers/TimeUtils
 * 
 * Common time-related calculations and conversions.
 * Eliminates magic numbers for time constants throughout the codebase.
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIME CONSTANTS (exported for documentation purposes)
// ═══════════════════════════════════════════════════════════════════════════

/** Milliseconds in one second */
export const MS_PER_SECOND = 1000;

/** Milliseconds in one minute */
export const MS_PER_MINUTE = 60 * 1000;

/** Milliseconds in one hour */
export const MS_PER_HOUR = 60 * 60 * 1000;

/** Milliseconds in one day */
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Seconds in one minute */
export const SECONDS_PER_MINUTE = 60;

/** Seconds in one hour */
export const SECONDS_PER_HOUR = 60 * 60;

/** Seconds in one day */
export const SECONDS_PER_DAY = 24 * 60 * 60;

// ═══════════════════════════════════════════════════════════════════════════
// TIME UTILITIES CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class TimeUtils {
    /**
     * Convert milliseconds to seconds.
     * 
     * @param ms - Time in milliseconds
     * @returns Time in seconds (floor)
     * 
     * @example
     * TimeUtils.msToSeconds(5500) // 5
     */
    static msToSeconds(ms: number): number {
        return Math.floor(ms / MS_PER_SECOND);
    }

    /**
     * Convert milliseconds to minutes.
     * 
     * @param ms - Time in milliseconds
     * @returns Time in minutes (floor)
     * 
     * @example
     * TimeUtils.msToMinutes(150000) // 2
     */
    static msToMinutes(ms: number): number {
        return Math.floor(ms / MS_PER_MINUTE);
    }

    /**
     * Convert milliseconds to hours.
     * 
     * @param ms - Time in milliseconds
     * @returns Time in hours (floor)
     * 
     * @example
     * TimeUtils.msToHours(7200000) // 2
     */
    static msToHours(ms: number): number {
        return Math.floor(ms / MS_PER_HOUR);
    }

    /**
     * Convert seconds to milliseconds.
     * 
     * @param seconds - Time in seconds
     * @returns Time in milliseconds
     * 
     * @example
     * TimeUtils.secondsToMs(5) // 5000
     */
    static secondsToMs(seconds: number): number {
        return seconds * MS_PER_SECOND;
    }

    /**
     * Convert minutes to milliseconds.
     * 
     * @param minutes - Time in minutes
     * @returns Time in milliseconds
     * 
     * @example
     * TimeUtils.minutesToMs(15) // 900000
     */
    static minutesToMs(minutes: number): number {
        return minutes * MS_PER_MINUTE;
    }

    /**
     * Convert hours to milliseconds.
     * 
     * @param hours - Time in hours
     * @returns Time in milliseconds
     * 
     * @example
     * TimeUtils.hoursToMs(1) // 3600000
     */
    static hoursToMs(hours: number): number {
        return hours * MS_PER_HOUR;
    }

    /**
     * Calculate the number of retry attempts given total wait time and interval per retry.
     * 
     * This is a self-documenting replacement for calculations like:
     * `Math.floor(maxWaitMs / 2000)` → `TimeUtils.calculateRetryCount(maxWaitMs, intervalMs)`
     * 
     * @param totalWaitMs - Total time to wait in milliseconds
     * @param intervalPerRetryMs - Time per retry attempt in milliseconds
     * @param minRetries - Minimum number of retries (default: 1)
     * @returns Number of retry attempts (at least minRetries)
     * 
     * @example
     * TimeUtils.calculateRetryCount(10000, 2000) // 5
     * TimeUtils.calculateRetryCount(1000, 2000)  // 1 (minimum)
     */
    static calculateRetryCount(totalWaitMs: number, intervalPerRetryMs: number, minRetries: number = 1): number {
        if (intervalPerRetryMs <= 0) {
            throw new Error('intervalPerRetryMs must be positive');
        }
        return Math.max(minRetries, Math.floor(totalWaitMs / intervalPerRetryMs));
    }

    /**
     * Calculate elapsed time since a timestamp.
     * 
     * @param startTime - Start timestamp in milliseconds
     * @param endTime - End timestamp (default: Date.now())
     * @returns Elapsed time in milliseconds
     * 
     * @example
     * const start = Date.now() - 5000;
     * TimeUtils.elapsed(start) // ~5000
     */
    static elapsed(startTime: number, endTime: number = Date.now()): number {
        return endTime - startTime;
    }

    /**
     * Calculate uptime in seconds from a start timestamp.
     * 
     * @param startTime - Start timestamp in milliseconds
     * @returns Uptime in seconds
     * 
     * @example
     * const start = Date.now() - 5000;
     * TimeUtils.uptimeSeconds(start) // 5
     */
    static uptimeSeconds(startTime: number): number {
        return this.msToSeconds(Date.now() - startTime);
    }

    /**
     * Check if a timeout has been exceeded.
     * 
     * @param startTime - Start timestamp in milliseconds
     * @param timeoutMs - Timeout duration in milliseconds
     * @returns True if timeout has been exceeded
     * 
     * @example
     * const start = Date.now() - 5000;
     * TimeUtils.hasTimedOut(start, 3000) // true
     * TimeUtils.hasTimedOut(start, 10000) // false
     */
    static hasTimedOut(startTime: number, timeoutMs: number): boolean {
        return this.elapsed(startTime) >= timeoutMs;
    }

    /**
     * Format milliseconds as a human-readable duration string.
     * 
     * @param ms - Duration in milliseconds
     * @returns Formatted string (e.g., "2h 30m 15s")
     * 
     * @example
     * TimeUtils.formatDuration(9015000) // "2h 30m 15s"
     * TimeUtils.formatDuration(45000)   // "45s"
     */
    static formatDuration(ms: number): string {
        const hours = Math.floor(ms / MS_PER_HOUR);
        const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
        const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);

        const parts: string[] = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

        return parts.join(' ');
    }
}
