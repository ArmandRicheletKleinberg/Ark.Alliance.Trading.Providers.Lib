/**
 * @fileoverview Error Detail Interface
 * @module Common/result/ErrorDetail
 *
 * Structured error information for Result pattern.
 */

/**
 * Structured error information.
 */
export interface ErrorDetail {
    /** Error code for programmatic handling. */
    readonly code: string;
    /** Human-readable error message. */
    readonly message: string;
    /** Additional error context. */
    readonly details?: Record<string, unknown>;
    /** Unix timestamp when error occurred. */
    readonly timestamp: number;
    /** Optional correlation ID for tracing. */
    readonly correlationId?: string;
    /** Optional inner error for chained errors. */
    readonly innerError?: ErrorDetail;
}

/**
 * Creates an ErrorDetail from an Error object.
 */
export function createErrorDetail(
    error: Error,
    code: string = 'UNKNOWN_ERROR',
    correlationId?: string
): ErrorDetail {
    return {
        code,
        message: error.message,
        details: { name: error.name, stack: error.stack },
        timestamp: Date.now(),
        correlationId
    };
}

/** Creates a validation error detail. */
export function createValidationError(field: string, message: string, value?: unknown, correlationId?: string): ErrorDetail {
    return {
        code: 'VALIDATION_ERROR',
        message: `Validation failed for '${field}': ${message}`,
        details: { field, value, validationMessage: message },
        timestamp: Date.now(),
        correlationId
    };
}

/** Creates a not found error detail. */
export function createNotFoundError(resourceType: string, identifier: string | number, correlationId?: string): ErrorDetail {
    return {
        code: 'NOT_FOUND',
        message: `${resourceType} with identifier '${identifier}' was not found`,
        details: { resourceType, identifier },
        timestamp: Date.now(),
        correlationId
    };
}

/** Creates a timeout error detail. */
export function createTimeoutError(operation: string, timeoutMs: number, correlationId?: string): ErrorDetail {
    return {
        code: 'TIMEOUT',
        message: `Operation '${operation}' timed out after ${timeoutMs}ms`,
        details: { operation, timeoutMs },
        timestamp: Date.now(),
        correlationId
    };
}
