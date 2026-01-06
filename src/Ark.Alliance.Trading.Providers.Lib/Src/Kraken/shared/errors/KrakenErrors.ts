/**
 * @fileoverview Kraken Error Handling
 * @module Kraken/shared/errors/KrakenErrors
 *
 * Custom error classes and error code mapping for Kraken Futures API.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Error Codes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken Futures API error codes.
 */
export const ERROR_CODES = {
    // Authentication errors
    AUTH_FAILED: 'authenticationError',
    INVALID_KEY: 'apiLimitExceeded',
    EXPIRED_KEY: 'keyExpired',

    // Order errors  
    INSUFFICIENT_FUNDS: 'insufficientFunds',
    INVALID_ORDER: 'Unavailable',
    ORDER_NOT_FOUND: 'orderNotFound',
    INVALID_QUANTITY: 'invalidQuantity',
    INVALID_PRICE: 'invalidPrice',
    MARKET_SUSPENDED: 'marketSuspended',
    INVALID_ACCOUNT: 'invalidAccount',

    // Rate limit
    RATE_LIMIT: 'apiLimitExceeded',

    // General
    INVALID_REQUEST: 'invalidRequest',
    UNKNOWN_ERROR: 'unknownError'
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Base Error Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base error class for Kraken API errors.
 */
export class KrakenError extends Error {
    readonly code: string;
    readonly timestamp: number;
    readonly details?: Record<string, unknown>;

    constructor(
        message: string,
        code: string = ERROR_CODES.UNKNOWN_ERROR,
        details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'KrakenError';
        this.code = code;
        this.timestamp = Date.now();
        this.details = details;

        // Maintains proper stack trace for where error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, KrakenError);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Specific Error Classes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Authentication error.
 */
export class KrakenAuthError extends KrakenError {
    constructor(message: string = 'Authentication failed', details?: Record<string, unknown>) {
        super(message, ERROR_CODES.AUTH_FAILED, details);
        this.name = 'KrakenAuthError';
    }
}

/**
 * Connection error.
 */
export class KrakenConnectionError extends KrakenError {
    constructor(message: string = 'Connection failed', details?: Record<string, unknown>) {
        super(message, 'connectionError', details);
        this.name = 'KrakenConnectionError';
    }
}

/**
 * Rate limit error.
 */
export class KrakenRateLimitError extends KrakenError {
    readonly retryAfterMs?: number;

    constructor(
        message: string = 'Rate limit exceeded',
        retryAfterMs?: number,
        details?: Record<string, unknown>
    ) {
        super(message, ERROR_CODES.RATE_LIMIT, details);
        this.name = 'KrakenRateLimitError';
        this.retryAfterMs = retryAfterMs;
    }
}

/**
 * Order error.
 */
export class KrakenOrderError extends KrakenError {
    readonly orderId?: string;

    constructor(
        message: string,
        code: string = ERROR_CODES.INVALID_ORDER,
        orderId?: string,
        details?: Record<string, unknown>
    ) {
        super(message, code, details);
        this.name = 'KrakenOrderError';
        this.orderId = orderId;
    }
}

/**
 * Insufficient funds error.
 */
export class KrakenInsufficientFundsError extends KrakenOrderError {
    constructor(message: string = 'Insufficient funds', details?: Record<string, unknown>) {
        super(message, ERROR_CODES.INSUFFICIENT_FUNDS, undefined, details);
        this.name = 'KrakenInsufficientFundsError';
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Error Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create appropriate error from API response.
 * 
 * @param errorCode - Error code from API
 * @param message - Error message
 * @param details - Additional details
 * @returns Appropriate KrakenError subclass
 */
export function createErrorFromCode(
    errorCode: string,
    message: string,
    details?: Record<string, unknown>
): KrakenError {
    switch (errorCode) {
        case ERROR_CODES.AUTH_FAILED:
        case ERROR_CODES.INVALID_KEY:
        case ERROR_CODES.EXPIRED_KEY:
            return new KrakenAuthError(message, details);

        case ERROR_CODES.RATE_LIMIT:
            return new KrakenRateLimitError(message, undefined, details);

        case ERROR_CODES.INSUFFICIENT_FUNDS:
            return new KrakenInsufficientFundsError(message, details);

        case ERROR_CODES.INVALID_ORDER:
        case ERROR_CODES.ORDER_NOT_FOUND:
        case ERROR_CODES.INVALID_QUANTITY:
        case ERROR_CODES.INVALID_PRICE:
            return new KrakenOrderError(message, errorCode, undefined, details);

        default:
            return new KrakenError(message, errorCode, details);
    }
}

/**
 * Check if error is retryable (e.g., rate limit, temporary network issue).
 */
export function isRetryableError(error: Error): boolean {
    if (error instanceof KrakenRateLimitError) {
        return true;
    }
    if (error instanceof KrakenConnectionError) {
        return true;
    }
    return false;
}
