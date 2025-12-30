/**
 * @fileoverview Binance Result Mapper
 * @module Binance/shared/utils/BinanceResultMapper
 *
 * Maps Binance API responses and error codes to the Result pattern.
 * Provides centralized error handling for all Binance client operations.
 */

import { Result, ResultStatus, ErrorDetail } from '../../../Common/result';

// ═══════════════════════════════════════════════════════════════════════════════
// Binance Error Code Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps Binance API error codes to appropriate ResultStatus values.
 *
 * @param binanceCode - The Binance error code (negative integer).
 * @returns The corresponding ResultStatus.
 *
 * @remarks
 * Binance error code ranges:
 * - -1000 to -1099: General request issues
 * - -1100 to -1199: Validation errors
 * - -1200 to -1299: Server issues
 * - -2000 to -2099: Processing issues
 * - -4000 to -4199: Filter failures
 * - -5000 to -5099: Timestamp issues
 */
export function mapBinanceCodeToStatus(binanceCode: number): ResultStatus {
    // ───────────────────────────────────────────────────────────────────────────
    // Authentication Errors → UNAUTHORIZED
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -1002 ||  // Unauthorized
        binanceCode === -1022 ||  // Invalid signature
        binanceCode === -2014 ||  // API key format invalid
        binanceCode === -2015) {  // Invalid API key/IP/permissions
        return ResultStatus.UNAUTHORIZED;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Rate Limiting → RATE_LIMITED
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -1003 ||  // Too many requests
        binanceCode === -1015) {  // Too many new orders
        return ResultStatus.RATE_LIMITED;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Timeout Issues → TIMEOUT
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -1007 ||  // Timeout waiting for response
        binanceCode === -1021) {  // Timestamp outside recv window
        return ResultStatus.TIMEOUT;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Service Unavailable → SERVICE_UNAVAILABLE
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -1016 ||  // Service unavailable
        binanceCode === -1200) {  // Server busy
        return ResultStatus.SERVICE_UNAVAILABLE;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Not Found → NOT_FOUND
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -2013) {  // Order does not exist
        return ResultStatus.NOT_FOUND;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Already Exists → ALREADY
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -2025) {  // Reduce only order already exists
        return ResultStatus.ALREADY;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Validation Errors (-1100 to -1199) → BAD_PARAMETERS
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode >= -1199 && binanceCode <= -1100) {
        return ResultStatus.BAD_PARAMETERS;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Filter Failures (-4000 to -4199) → BAD_PARAMETERS
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode >= -4199 && binanceCode <= -4000) {
        return ResultStatus.BAD_PARAMETERS;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Prerequisite Failures → BAD_PREREQUISITES
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -2011 ||  // Cancel rejected
        binanceCode === -2016 ||  // No trading window
        binanceCode === -2018 ||  // Balance not sufficient
        binanceCode === -2019 ||  // Margin not sufficient
        binanceCode === -2022 ||  // Reduce only order invalid
        binanceCode === -2024 ||  // Position side mismatch
        binanceCode === -4016 ||  // Max leverage exceeded
        binanceCode === -4055 ||  // Borrow amount too small
        binanceCode === -4068) {  // Max OCO orders
        return ResultStatus.BAD_PREREQUISITES;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Processing Errors (-2000 to -2099) → BAD_PARAMETERS or FAILURE
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode >= -2099 && binanceCode <= -2000) {
        // Specific parameter errors
        if (binanceCode === -2010 ||  // New order rejected
            binanceCode === -2020 ||  // Unable to fill
            binanceCode === -2021) {  // Order would trigger immediately
            return ResultStatus.BAD_PARAMETERS;
        }
        return ResultStatus.FAILURE;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Unexpected Errors → UNEXPECTED
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -1000 ||  // Unknown error
        binanceCode === -1006) {  // Unexpected response
        return ResultStatus.UNEXPECTED;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Connection Errors → NO_CONNECTION
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -1001) {  // Disconnected from server
        return ResultStatus.NO_CONNECTION;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Other general errors (-1014, -1020, etc.) → BAD_PARAMETERS
    // ───────────────────────────────────────────────────────────────────────────
    if (binanceCode === -1014 ||  // Unknown order composition
        binanceCode === -1020) {  // Unsupported operation
        return ResultStatus.BAD_PARAMETERS;
    }

    // Default to FAILURE for unrecognized codes
    return ResultStatus.FAILURE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Result Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a failed Result from a Binance API error response.
 *
 * @template T - The expected success data type.
 * @param binanceCode - The Binance error code (may be undefined).
 * @param message - The error message from Binance.
 * @param context - Additional context about the request.
 * @returns A failed Result with appropriate status.
 *
 * @example
 * ```typescript
 * const result = createBinanceErrorResult<OrderResponse>(
 *     -1121,
 *     "Invalid symbol.",
 *     { symbol: "INVALID", endpoint: "/fapi/v1/order" }
 * );
 * // result.status === ResultStatus.BAD_PARAMETERS
 * // result.error.code === "BINANCE_-1121"
 * ```
 */
export function createBinanceErrorResult<T>(
    binanceCode: number | undefined,
    message: string,
    context?: Record<string, unknown>
): Result<T> {
    const status = binanceCode !== undefined
        ? mapBinanceCodeToStatus(binanceCode)
        : ResultStatus.FAILURE;

    const errorDetail: ErrorDetail = {
        code: binanceCode !== undefined ? `BINANCE_${binanceCode}` : 'BINANCE_UNKNOWN',
        message,
        details: {
            binanceCode,
            ...context
        },
        timestamp: Date.now()
    };

    return Result.fail<T>(errorDetail, status);
}

/**
 * Creates a successful Result from a Binance API response.
 *
 * @template T - The response data type.
 * @param data - The parsed response data.
 * @param correlationId - Optional correlation ID for tracing.
 * @returns A successful Result.
 *
 * @example
 * ```typescript
 * const result = createBinanceSuccessResult<ServerTimeResponse>({
 *     serverTime: 1234567890123
 * });
 * ```
 */
export function createBinanceSuccessResult<T>(
    data: T,
    correlationId?: string
): Result<T> {
    return Result.ok(data, correlationId);
}

/**
 * Creates a timeout Result for Binance request timeouts.
 *
 * @template T - The expected data type.
 * @param timeoutMs - The timeout duration in milliseconds.
 * @param endpoint - The API endpoint that timed out.
 * @returns A timeout Result.
 */
export function createBinanceTimeoutResult<T>(
    timeoutMs: number,
    endpoint?: string
): Result<T> {
    return Result.fail<T>({
        code: 'BINANCE_TIMEOUT',
        message: `Binance request timed out after ${timeoutMs}ms`,
        details: { timeoutMs, endpoint },
        timestamp: Date.now()
    }, ResultStatus.TIMEOUT);
}

/**
 * Creates a network error Result for connection failures.
 *
 * @template T - The expected data type.
 * @param error - The network error.
 * @param endpoint - The API endpoint.
 * @returns A no-connection Result.
 */
export function createBinanceNetworkErrorResult<T>(
    error: Error,
    endpoint?: string
): Result<T> {
    return Result.fail<T>({
        code: 'BINANCE_NETWORK_ERROR',
        message: error.message,
        details: {
            errorName: error.name,
            endpoint,
            stack: error.stack
        },
        timestamp: Date.now()
    }, ResultStatus.NO_CONNECTION);
}

/**
 * Creates a parse error Result for JSON parsing failures.
 *
 * @template T - The expected data type.
 * @param rawData - The raw response data that failed to parse.
 * @param parseError - The parsing error.
 * @param endpoint - The API endpoint.
 * @returns An unexpected Result.
 */
export function createBinanceParseErrorResult<T>(
    rawData: string,
    parseError: Error,
    endpoint?: string
): Result<T> {
    return Result.fail<T>({
        code: 'BINANCE_PARSE_ERROR',
        message: 'Failed to parse Binance response',
        details: {
            rawData: rawData.substring(0, 500), // Limit for safety
            parseError: parseError.message,
            endpoint
        },
        timestamp: Date.now()
    }, ResultStatus.UNEXPECTED);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if a Binance error code indicates a retryable error.
 *
 * @param binanceCode - The Binance error code.
 * @returns True if the error is retryable.
 */
export function isBinanceRetryable(binanceCode: number): boolean {
    const status = mapBinanceCodeToStatus(binanceCode);
    return status === ResultStatus.TIMEOUT ||
        status === ResultStatus.RATE_LIMITED ||
        status === ResultStatus.SERVICE_UNAVAILABLE ||
        status === ResultStatus.NO_CONNECTION;
}

/**
 * Gets a human-readable description for a Binance error code.
 *
 * @param binanceCode - The Binance error code.
 * @returns Human-readable description, or undefined if unknown.
 */
export function getBinanceErrorDescription(binanceCode: number): string | undefined {
    const descriptions: Record<number, string> = {
        [-1000]: 'Unknown error',
        [-1001]: 'Disconnected from server',
        [-1002]: 'Unauthorized access',
        [-1003]: 'Too many requests - rate limit exceeded',
        [-1006]: 'Unexpected response from server',
        [-1007]: 'Timeout waiting for response',
        [-1014]: 'Unknown order composition',
        [-1015]: 'Too many new orders - rate limit exceeded',
        [-1016]: 'Service unavailable',
        [-1020]: 'Unsupported operation',
        [-1021]: 'Timestamp outside receive window',
        [-1022]: 'Invalid signature',
        [-1100]: 'Illegal characters in parameter',
        [-1101]: 'Too many parameters',
        [-1102]: 'Mandatory parameter missing',
        [-1103]: 'Unknown parameter',
        [-1111]: 'Bad precision',
        [-1116]: 'Bad side',
        [-1121]: 'Invalid symbol',
        [-1125]: 'Invalid listen key',
        [-2010]: 'New order rejected',
        [-2011]: 'Cancel rejected',
        [-2013]: 'Order does not exist',
        [-2014]: 'API key format invalid',
        [-2015]: 'Invalid API key, IP, or permissions',
        [-2016]: 'No trading window',
        [-2018]: 'Balance not sufficient',
        [-2019]: 'Margin not sufficient',
        [-2020]: 'Unable to fill order',
        [-2021]: 'Order would trigger immediately',
        [-2022]: 'Reduce only order invalid',
        [-2024]: 'Position side mismatch',
        [-2025]: 'Reduce only order already exists',
        [-4003]: 'Quantity less than minimum',
        [-4004]: 'Quantity greater than maximum',
        [-4005]: 'Price less than minimum',
        [-4013]: 'Price precision too high',
        [-4014]: 'Minimum notional not met',
        [-4015]: 'Maximum notional exceeded',
        [-4016]: 'Maximum leverage exceeded',
        [-4028]: 'Tick size violation',
        [-4029]: 'Step size violation'
    };

    return descriptions[binanceCode];
}
