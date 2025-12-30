/**
 * @fileoverview Deribit Error Classes
 * @module Deribit/shared/errors/DeribitErrors
 *
 * Error classes for Deribit API error handling.
 */

/**
 * Base Deribit error class.
 */
export class DeribitError extends Error {
    constructor(
        message: string,
        public readonly code?: number,
        public readonly requestId?: string
    ) {
        super(message);
        this.name = 'DeribitError';
        Object.setPrototypeOf(this, DeribitError.prototype);
    }
}

/**
 * Authentication error.
 */
export class DeribitAuthError extends DeribitError {
    constructor(message: string, code?: number, requestId?: string) {
        super(message, code, requestId);
        this.name = 'DeribitAuthError';
        Object.setPrototypeOf(this, DeribitAuthError.prototype);
    }
}

/**
 * Connection error.
 */
export class DeribitConnectionError extends DeribitError {
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'DeribitConnectionError';
        Object.setPrototypeOf(this, DeribitConnectionError.prototype);
    }
}

/**
 * Rate limit error.
 */
export class DeribitRateLimitError extends DeribitError {
    constructor(
        message: string,
        public readonly retryAfterMs?: number
    ) {
        super(message, 10028); // Rate limit error code
        this.name = 'DeribitRateLimitError';
        Object.setPrototypeOf(this, DeribitRateLimitError.prototype);
    }
}

/**
 * Order rejection error.
 */
export class DeribitOrderError extends DeribitError {
    constructor(
        message: string,
        code?: number,
        public readonly orderId?: string
    ) {
        super(message, code);
        this.name = 'DeribitOrderError';
        Object.setPrototypeOf(this, DeribitOrderError.prototype);
    }
}

/**
 * 2FA required error.
 */
export class Deribit2FAError extends DeribitError {
    constructor(message: string = 'Two-factor authentication required') {
        super(message, 13004);
        this.name = 'Deribit2FAError';
        Object.setPrototypeOf(this, Deribit2FAError.prototype);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Error Code Mappings
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common Deribit error codes.
 */
export const ERROR_CODES = {
    // Authentication
    AUTHORIZATION_REQUIRED: 13009,
    INVALID_CREDENTIALS: 13004,
    SCOPE_EXCEEDED: 13403,

    // Rate Limiting
    TOO_MANY_REQUESTS: 10028,
    TOO_MANY_CONCURRENT_REQUESTS: 11045,

    // Order Errors
    ORDER_NOT_FOUND: 10004,
    NOT_ENOUGH_FUNDS: 10010,
    PRICE_TOO_LOW: 10003,
    PRICE_TOO_HIGH: 10020,
    INVALID_AMOUNT: 10014,
    INVALID_PRICE: 10015,
    POST_ONLY_REJECT: 10018,
    ALREADY_FILLED: 11050,
    ALREADY_CANCELLED: 11051,

    // System
    BAD_REQUEST: 11050,
    INTERNAL_SERVER_ERROR: 12000,
    SYSTEM_MAINTENANCE: 13000,

    // Position
    INVALID_INSTRUMENT: 10001,
    BOOK_CLOSED: 10013
} as const;

/**
 * Map error code to error class.
 */
export function createErrorFromCode(
    code: number,
    message: string,
    requestId?: string
): DeribitError {
    switch (code) {
        case ERROR_CODES.AUTHORIZATION_REQUIRED:
        case ERROR_CODES.INVALID_CREDENTIALS:
        case ERROR_CODES.SCOPE_EXCEEDED:
            return new DeribitAuthError(message, code, requestId);

        case ERROR_CODES.TOO_MANY_REQUESTS:
        case ERROR_CODES.TOO_MANY_CONCURRENT_REQUESTS:
            return new DeribitRateLimitError(message);

        case ERROR_CODES.ORDER_NOT_FOUND:
        case ERROR_CODES.NOT_ENOUGH_FUNDS:
        case ERROR_CODES.PRICE_TOO_LOW:
        case ERROR_CODES.PRICE_TOO_HIGH:
        case ERROR_CODES.INVALID_AMOUNT:
        case ERROR_CODES.INVALID_PRICE:
        case ERROR_CODES.POST_ONLY_REJECT:
        case ERROR_CODES.ALREADY_FILLED:
        case ERROR_CODES.ALREADY_CANCELLED:
            return new DeribitOrderError(message, code);

        default:
            return new DeribitError(message, code, requestId);
    }
}
