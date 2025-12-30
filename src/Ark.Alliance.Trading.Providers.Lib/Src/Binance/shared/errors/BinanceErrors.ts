/**
 * @fileoverview Binance API Error Classes
 * @module shared/errors/BinanceErrors
 *
 * Typed error classes for the Binance provider library.
 * Provides structured error handling with error codes, messages,
 * and contextual information for debugging and user feedback.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Error Codes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enumeration of all error codes in the Binance provider.
 */
export enum BinanceErrorCode {
    // ─────────────────────────────────────────────────────────────────────────
    // Connection Errors
    // ─────────────────────────────────────────────────────────────────────────
    CONNECTION_FAILED = 'BINANCE_CONNECTION_FAILED',
    CONNECTION_TIMEOUT = 'BINANCE_CONNECTION_TIMEOUT',
    WEBSOCKET_ERROR = 'BINANCE_WEBSOCKET_ERROR',
    RECONNECT_FAILED = 'BINANCE_RECONNECT_FAILED',
    MAX_RECONNECT_REACHED = 'BINANCE_MAX_RECONNECT_REACHED',

    // ─────────────────────────────────────────────────────────────────────────
    // API Errors
    // ─────────────────────────────────────────────────────────────────────────
    API_ERROR = 'BINANCE_API_ERROR',
    INVALID_SIGNATURE = 'BINANCE_INVALID_SIGNATURE',
    TIMESTAMP_OUTSIDE_WINDOW = 'BINANCE_TIMESTAMP_ERROR',
    RATE_LIMIT_EXCEEDED = 'BINANCE_RATE_LIMIT',
    IP_BANNED = 'BINANCE_IP_BANNED',
    REQUEST_TIMEOUT = 'BINANCE_REQUEST_TIMEOUT',
    PARSE_ERROR = 'BINANCE_PARSE_ERROR',

    // ─────────────────────────────────────────────────────────────────────────
    // Order Errors
    // ─────────────────────────────────────────────────────────────────────────
    ORDER_PLACEMENT_FAILED = 'ORDER_PLACEMENT_FAILED',
    ORDER_CANCEL_FAILED = 'ORDER_CANCEL_FAILED',
    ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
    INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
    INVALID_QUANTITY = 'INVALID_QUANTITY',
    INVALID_PRICE = 'INVALID_PRICE',
    MIN_NOTIONAL_NOT_MET = 'MIN_NOTIONAL_NOT_MET',

    // ─────────────────────────────────────────────────────────────────────────
    // Position Errors
    // ─────────────────────────────────────────────────────────────────────────
    POSITION_NOT_FOUND = 'POSITION_NOT_FOUND',
    INVALID_LEVERAGE = 'INVALID_LEVERAGE',
    MARGIN_INSUFFICIENT = 'MARGIN_INSUFFICIENT',

    // ─────────────────────────────────────────────────────────────────────────
    // Instance Errors
    // ─────────────────────────────────────────────────────────────────────────
    INSTANCE_NOT_FOUND = 'INSTANCE_NOT_FOUND',
    INVALID_PARAMETER = 'INVALID_PARAMETER',
    MISSING_FIELDS = 'MISSING_FIELDS',

    // ─────────────────────────────────────────────────────────────────────────
    // Environment Errors
    // ─────────────────────────────────────────────────────────────────────────
    TESTNET_NOT_SUPPORTED = 'TESTNET_NOT_SUPPORTED',

    // ─────────────────────────────────────────────────────────────────────────
    // System Errors
    // ─────────────────────────────────────────────────────────────────────────
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Base Error Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base error class for all Binance-related errors.
 *
 * @extends Error
 */
export class BinanceError extends Error {
    /**
     * Error code for programmatic handling.
     */
    public readonly code: BinanceErrorCode;

    /**
     * Additional context about the error.
     */
    public readonly context?: Record<string, unknown>;

    /**
     * Whether this error is recoverable.
     */
    public readonly isRecoverable: boolean;

    /**
     * Creates a BinanceError instance.
     *
     * @param code - The error code.
     * @param message - Human-readable error message.
     * @param context - Additional error context.
     * @param isRecoverable - Whether the error is recoverable.
     */
    constructor(
        code: BinanceErrorCode,
        message: string,
        context?: Record<string, unknown>,
        isRecoverable: boolean = false
    ) {
        super(message);
        this.name = 'BinanceError';
        this.code = code;
        this.context = context;
        this.isRecoverable = isRecoverable;

        // Maintains proper stack trace for where error was thrown
        Error.captureStackTrace?.(this, this.constructor);
    }

    /**
     * Serializes the error to JSON.
     *
     * @returns JSON representation of the error.
     */
    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            context: this.context,
            isRecoverable: this.isRecoverable,
            stack: this.stack
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Specific Error Classes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Error thrown when API request fails.
 *
 * @extends BinanceError
 */
export class BinanceApiError extends BinanceError {
    /**
     * Binance error code from the response.
     */
    public readonly binanceCode?: number;

    /**
     * HTTP status code if applicable.
     */
    public readonly httpStatus?: number;

    /**
     * Creates a BinanceApiError instance.
     *
     * @param message - Error message.
     * @param binanceCode - Binance-specific error code.
     * @param httpStatus - HTTP status code.
     * @param context - Additional context.
     */
    constructor(
        message: string,
        binanceCode?: number,
        httpStatus?: number,
        context?: Record<string, unknown>
    ) {
        super(BinanceErrorCode.API_ERROR, message, context, false);
        this.name = 'BinanceApiError';
        this.binanceCode = binanceCode;
        this.httpStatus = httpStatus;
    }
}

/**
 * Error thrown when connection fails or is lost.
 *
 * @extends BinanceError
 */
export class BinanceConnectionError extends BinanceError {
    /**
     * WebSocket close code if applicable.
     */
    public readonly closeCode?: number;

    /**
     * Number of reconnection attempts made.
     */
    public readonly reconnectAttempts: number;

    /**
     * Creates a BinanceConnectionError instance.
     *
     * @param message - Error message.
     * @param reconnectAttempts - Number of reconnect attempts.
     * @param closeCode - WebSocket close code.
     * @param context - Additional context.
     */
    constructor(
        message: string,
        reconnectAttempts: number = 0,
        closeCode?: number,
        context?: Record<string, unknown>
    ) {
        super(BinanceErrorCode.CONNECTION_FAILED, message, context, true);
        this.name = 'BinanceConnectionError';
        this.closeCode = closeCode;
        this.reconnectAttempts = reconnectAttempts;
    }
}

/**
 * Error thrown when rate limit is exceeded.
 *
 * @extends BinanceError
 */
export class BinanceRateLimitError extends BinanceError {
    /**
     * Type of rate limit that was exceeded.
     */
    public readonly limitType: 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';

    /**
     * Current usage count.
     */
    public readonly currentUsage: number;

    /**
     * Maximum limit.
     */
    public readonly limit: number;

    /**
     * Time until limit resets (milliseconds).
     */
    public readonly resetInMs: number;

    /**
     * Creates a BinanceRateLimitError instance.
     *
     * @param limitType - Type of rate limit exceeded.
     * @param currentUsage - Current usage count.
     * @param limit - Maximum limit.
     * @param resetInMs - Time until reset.
     */
    constructor(
        limitType: 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS',
        currentUsage: number,
        limit: number,
        resetInMs: number
    ) {
        super(
            BinanceErrorCode.RATE_LIMIT_EXCEEDED,
            `Rate limit exceeded: ${limitType} (${currentUsage}/${limit})`,
            { limitType, currentUsage, limit, resetInMs },
            true
        );
        this.name = 'BinanceRateLimitError';
        this.limitType = limitType;
        this.currentUsage = currentUsage;
        this.limit = limit;
        this.resetInMs = resetInMs;
    }
}

/**
 * Error thrown for order-related failures.
 *
 * @extends BinanceError
 */
export class BinanceOrderError extends BinanceError {
    /**
     * Order ID if available.
     */
    public readonly orderId?: number;

    /**
     * Trading symbol.
     */
    public readonly symbol?: string;

    /**
     * Creates a BinanceOrderError instance.
     *
     * @param code - Error code.
     * @param message - Error message.
     * @param symbol - Trading symbol.
     * @param orderId - Order ID.
     * @param context - Additional context.
     */
    constructor(
        code: BinanceErrorCode,
        message: string,
        symbol?: string,
        orderId?: number,
        context?: Record<string, unknown>
    ) {
        super(code, message, { ...context, symbol, orderId }, false);
        this.name = 'BinanceOrderError';
        this.orderId = orderId;
        this.symbol = symbol;
    }
}
