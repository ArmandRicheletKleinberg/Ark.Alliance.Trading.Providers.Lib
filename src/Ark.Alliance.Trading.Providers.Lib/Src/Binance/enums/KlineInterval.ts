/**
 * @fileoverview Kline Interval Definitions
 * @module enums/KlineInterval
 *
 * Defines all kline/candlestick interval options for Binance Futures.
 *
 * @remarks
 * ## Supported Intervals by Endpoint
 *
 * **USDⓈ-M Futures (All endpoints support these 15 intervals):**
 * - REST: `/fapi/v1/klines`, `/fapi/v1/continuousKlines`, `/fapi/v1/indexPriceKlines`,
 *         `/fapi/v1/markPriceKlines`, `/fapi/v1/premiumIndexKlines`
 * - WebSocket: `<symbol>@kline_<interval>`
 *
 * **NOT Supported in Futures:**
 * - `1s` (1 second) - Only available in Spot WebSocket, NOT in Futures
 *
 * ## TypeScript Pattern Used
 * Since TypeScript enums cannot extend other enums, we use the following patterns:
 * 1. `KlineInterval` enum for the common case (Futures intervals)
 * 2. `KlineIntervalType` union type for type annotations
 * 3. Const arrays for iteration and validation
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Kline-Candlestick-Data
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/websocket-market-streams/Kline-Candlestick-Streams
 */

// ═══════════════════════════════════════════════════════════════════════════════
// USDⓈ-M Futures Kline Intervals
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kline interval enumeration for USDⓈ-M Futures.
 *
 * These intervals are supported by all USDⓈ-M Futures kline endpoints:
 * - GET /fapi/v1/klines (symbol klines)
 * - GET /fapi/v1/continuousKlines (perpetual/delivery contracts)
 * - GET /fapi/v1/indexPriceKlines
 * - GET /fapi/v1/markPriceKlines
 * - GET /fapi/v1/premiumIndexKlines
 * - WebSocket kline streams
 *
 * @enum {string}
 *
 * @example
 * ```typescript
 * import { KlineInterval, getIntervalMs } from '../enums';
 *
 * // Use in API calls
 * const klines = await client.getKlines('BTCUSDT', KlineInterval.HOUR_4);
 *
 * // Get interval duration
 * const durationMs = getIntervalMs(KlineInterval.DAY_1); // 86400000
 * ```
 */
export enum KlineInterval {
    /**
     * 1 minute interval.
     * Best for: High-frequency analysis, scalping indicators.
     */
    MINUTE_1 = '1m',

    /**
     * 3 minute interval.
     */
    MINUTE_3 = '3m',

    /**
     * 5 minute interval.
     * Best for: Short-term trend analysis.
     */
    MINUTE_5 = '5m',

    /**
     * 15 minute interval.
     * Best for: Intraday support/resistance, medium-term scalping.
     */
    MINUTE_15 = '15m',

    /**
     * 30 minute interval.
     */
    MINUTE_30 = '30m',

    /**
     * 1 hour interval.
     * Best for: Intraday trends, swing trading entry.
     */
    HOUR_1 = '1h',

    /**
     * 2 hour interval.
     */
    HOUR_2 = '2h',

    /**
     * 4 hour interval.
     * Best for: Swing trading, medium-term trend confirmation.
     */
    HOUR_4 = '4h',

    /**
     * 6 hour interval.
     */
    HOUR_6 = '6h',

    /**
     * 8 hour interval.
     */
    HOUR_8 = '8h',

    /**
     * 12 hour interval.
     */
    HOUR_12 = '12h',

    /**
     * 1 day interval.
     * Best for: Daily trend analysis, position trading.
     */
    DAY_1 = '1d',

    /**
     * 3 day interval.
     */
    DAY_3 = '3d',

    /**
     * 1 week interval.
     * Best for: Long-term trend analysis.
     */
    WEEK_1 = '1w',

    /**
     * 1 month interval.
     * Best for: Historical analysis, major support/resistance.
     */
    MONTH_1 = '1M'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type Aliases
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type alias for kline interval string literals (Futures).
 *
 * Use this for function parameter types when you need to accept raw strings.
 *
 * @example
 * ```typescript
 * function processKlines(interval: KlineIntervalType): void {
 *     // Works with both enum values and string literals
 * }
 * processKlines('4h');
 * processKlines(KlineInterval.HOUR_4);
 * ```
 */
export type KlineIntervalType =
    | '1m' | '3m' | '5m' | '15m' | '30m'
    | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
    | '1d' | '3d' | '1w' | '1M';

// ═══════════════════════════════════════════════════════════════════════════════
// Interval Collections (for iteration and validation)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * All USDⓈ-M Futures kline intervals.
 *
 * Use for iteration, dropdown menus, or validation.
 *
 * @example
 * ```typescript
 * // Validate user input
 * if (!ALL_KLINE_INTERVALS.includes(userInterval)) {
 *     throw new Error('Invalid interval');
 * }
 *
 * // Build dropdown options
 * ALL_KLINE_INTERVALS.map(i => ({ value: i, label: getIntervalLabel(i) }));
 * ```
 */
export const ALL_KLINE_INTERVALS: KlineInterval[] = [
    KlineInterval.MINUTE_1,
    KlineInterval.MINUTE_3,
    KlineInterval.MINUTE_5,
    KlineInterval.MINUTE_15,
    KlineInterval.MINUTE_30,
    KlineInterval.HOUR_1,
    KlineInterval.HOUR_2,
    KlineInterval.HOUR_4,
    KlineInterval.HOUR_6,
    KlineInterval.HOUR_8,
    KlineInterval.HOUR_12,
    KlineInterval.DAY_1,
    KlineInterval.DAY_3,
    KlineInterval.WEEK_1,
    KlineInterval.MONTH_1
];

/**
 * Minute intervals only.
 */
export const MINUTE_INTERVALS: KlineInterval[] = [
    KlineInterval.MINUTE_1,
    KlineInterval.MINUTE_3,
    KlineInterval.MINUTE_5,
    KlineInterval.MINUTE_15,
    KlineInterval.MINUTE_30
];

/**
 * Hour intervals only.
 */
export const HOUR_INTERVALS: KlineInterval[] = [
    KlineInterval.HOUR_1,
    KlineInterval.HOUR_2,
    KlineInterval.HOUR_4,
    KlineInterval.HOUR_6,
    KlineInterval.HOUR_8,
    KlineInterval.HOUR_12
];

/**
 * Day/Week/Month intervals only.
 */
export const LONG_INTERVALS: KlineInterval[] = [
    KlineInterval.DAY_1,
    KlineInterval.DAY_3,
    KlineInterval.WEEK_1,
    KlineInterval.MONTH_1
];

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets interval duration in milliseconds.
 *
 * @param interval - Kline interval.
 * @returns Duration in milliseconds.
 *
 * @example
 * ```typescript
 * const duration = getIntervalMs(KlineInterval.HOUR_4); // 14400000 (4 hours)
 * const expectedKlines = timeRange / duration;
 * ```
 */
export function getIntervalMs(interval: KlineInterval): number {
    const MS_MINUTE = 60 * 1000;
    const MS_HOUR = 60 * MS_MINUTE;
    const MS_DAY = 24 * MS_HOUR;

    const map: Record<KlineInterval, number> = {
        [KlineInterval.MINUTE_1]: 1 * MS_MINUTE,
        [KlineInterval.MINUTE_3]: 3 * MS_MINUTE,
        [KlineInterval.MINUTE_5]: 5 * MS_MINUTE,
        [KlineInterval.MINUTE_15]: 15 * MS_MINUTE,
        [KlineInterval.MINUTE_30]: 30 * MS_MINUTE,
        [KlineInterval.HOUR_1]: 1 * MS_HOUR,
        [KlineInterval.HOUR_2]: 2 * MS_HOUR,
        [KlineInterval.HOUR_4]: 4 * MS_HOUR,
        [KlineInterval.HOUR_6]: 6 * MS_HOUR,
        [KlineInterval.HOUR_8]: 8 * MS_HOUR,
        [KlineInterval.HOUR_12]: 12 * MS_HOUR,
        [KlineInterval.DAY_1]: 1 * MS_DAY,
        [KlineInterval.DAY_3]: 3 * MS_DAY,
        [KlineInterval.WEEK_1]: 7 * MS_DAY,
        [KlineInterval.MONTH_1]: 30 * MS_DAY // Approximate
    };
    return map[interval];
}

/**
 * Gets human-readable label for interval.
 *
 * @param interval - Kline interval.
 * @returns Human-readable label (e.g., "4 Hours").
 */
export function getIntervalLabel(interval: KlineInterval): string {
    const labels: Record<KlineInterval, string> = {
        [KlineInterval.MINUTE_1]: '1 Minute',
        [KlineInterval.MINUTE_3]: '3 Minutes',
        [KlineInterval.MINUTE_5]: '5 Minutes',
        [KlineInterval.MINUTE_15]: '15 Minutes',
        [KlineInterval.MINUTE_30]: '30 Minutes',
        [KlineInterval.HOUR_1]: '1 Hour',
        [KlineInterval.HOUR_2]: '2 Hours',
        [KlineInterval.HOUR_4]: '4 Hours',
        [KlineInterval.HOUR_6]: '6 Hours',
        [KlineInterval.HOUR_8]: '8 Hours',
        [KlineInterval.HOUR_12]: '12 Hours',
        [KlineInterval.DAY_1]: '1 Day',
        [KlineInterval.DAY_3]: '3 Days',
        [KlineInterval.WEEK_1]: '1 Week',
        [KlineInterval.MONTH_1]: '1 Month'
    };
    return labels[interval];
}

/**
 * Validates if a string is a valid kline interval.
 *
 * @param value - String to validate.
 * @returns True if valid interval.
 */
export function isValidKlineInterval(value: string): value is KlineIntervalType {
    return (ALL_KLINE_INTERVALS as string[]).includes(value);
}

/**
 * Parses a string to KlineInterval if valid.
 *
 * @param value - String to parse.
 * @returns KlineInterval or undefined if invalid.
 */
export function parseKlineInterval(value: string): KlineInterval | undefined {
    if (isValidKlineInterval(value)) {
        return value as KlineInterval;
    }
    return undefined;
}
