/**
 * @fileoverview Rate Limit Enumerations
 * @module enums/RateLimit
 *
 * Defines rate limit types and intervals for Binance API.
 *
 * @remarks
 * Binance has multiple rate limit categories that must be tracked:
 * - REQUEST_WEIGHT: General API request weight (default limit: 2400/minute)
 * - ORDERS: Order placement limits (default: 300/10s, 1200/minute)
 * - RAW_REQUESTS: Raw connection requests
 */

/**
 * Rate limit type enumeration.
 *
 * @enum {string}
 */
export enum RateLimitType {
    /**
     * Request weight limit - general API usage.
     */
    REQUEST_WEIGHT = 'REQUEST_WEIGHT',

    /**
     * Order limit - order placement operations.
     */
    ORDERS = 'ORDERS',

    /**
     * Raw requests limit - connection level.
     */
    RAW_REQUESTS = 'RAW_REQUESTS'
}

/**
 * Rate limit interval enumeration.
 *
 * @enum {string}
 */
export enum RateLimitInterval {
    /**
     * Per second interval.
     */
    SECOND = 'SECOND',

    /**
     * Per minute interval.
     */
    MINUTE = 'MINUTE',

    /**
     * Per day interval.
     */
    DAY = 'DAY'
}

/**
 * Type alias for rate limit type string literals.
 * @deprecated Use RateLimitType enum instead.
 */
export type RateLimitTypeType = 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';

/**
 * Type alias for rate limit interval string literals.
 * @deprecated Use RateLimitInterval enum instead.
 */
export type RateLimitIntervalType = 'SECOND' | 'MINUTE' | 'DAY';
