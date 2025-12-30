/**
 * @fileoverview Result Status Enumeration
 * @module Common/result/ResultStatus
 *
 * Defines all possible transaction/operation result states.
 * Used by the Result<T> class for type-safe status handling.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Result Status Enumeration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Enumeration of all possible result statuses for operations.
 *
 * @enum {string}
 *
 * @remarks
 * Status categories:
 * - **Success**: SUCCESS
 * - **Client Errors**: VALIDATION_ERROR, BAD_PARAMETERS, BAD_PREREQUISITES, UNAUTHORIZED, NOT_FOUND, ALREADY
 * - **Server Errors**: FAILURE, UNEXPECTED, SERVICE_UNAVAILABLE
 * - **Transient**: TIMEOUT, RATE_LIMITED, NO_CONNECTION, CANCELLED
 * - **Meta**: NONE, PENDING, NOT_IMPLEMENTED
 */
export enum ResultStatus {
    /** No status set (initial/default state). */
    NONE = 'NONE',

    /** Operation completed successfully. */
    SUCCESS = 'SUCCESS',

    /** Operation failed with a known error. */
    FAILURE = 'FAILURE',

    /** Unexpected exception occurred. */
    UNEXPECTED = 'UNEXPECTED',

    /** Operation is still in progress. */
    PENDING = 'PENDING',

    /** Operation timed out. */
    TIMEOUT = 'TIMEOUT',

    /** Authorization/authentication failed. */
    UNAUTHORIZED = 'UNAUTHORIZED',

    /** Operation already completed (idempotency check). */
    ALREADY = 'ALREADY',

    /** Validation errors occurred. */
    VALIDATION_ERROR = 'VALIDATION_ERROR',

    /** Resource not found. */
    NOT_FOUND = 'NOT_FOUND',

    /** Pre-conditions/prerequisites not met. */
    BAD_PREREQUISITES = 'BAD_PREREQUISITES',

    /** Invalid parameters provided. */
    BAD_PARAMETERS = 'BAD_PARAMETERS',

    /** Operation cancelled by user or system. */
    CANCELLED = 'CANCELLED',

    /** Rate limit exceeded. */
    RATE_LIMITED = 'RATE_LIMITED',

    /** Service unavailable. */
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

    /** No network connection available. */
    NO_CONNECTION = 'NO_CONNECTION',

    /** Operation not implemented. */
    NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Type Aliases
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type alias for result status string values.
 */
export type ResultStatusType = `${ResultStatus}`;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions - Success Checks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if status indicates success.
 *
 * @param status - Status to check.
 * @returns True if operation was successful.
 */
export function isSuccessStatus(status: ResultStatus): boolean {
    return status === ResultStatus.SUCCESS;
}

/**
 * Checks if status indicates not success (any non-success state).
 *
 * @param status - Status to check.
 * @returns True if operation was not successful.
 */
export function isNotSuccessStatus(status: ResultStatus): boolean {
    return status !== ResultStatus.SUCCESS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions - Error Type Checks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if status indicates an unexpected/unhandled error.
 *
 * @param status - Status to check.
 * @returns True if unexpected error occurred.
 */
export function isUnexpectedStatus(status: ResultStatus): boolean {
    return status === ResultStatus.UNEXPECTED;
}

/**
 * Checks if status indicates a validation or parameter error.
 *
 * @param status - Status to check.
 * @returns True if validation/parameter error.
 */
export function isValidationErrorStatus(status: ResultStatus): boolean {
    return status === ResultStatus.VALIDATION_ERROR ||
        status === ResultStatus.BAD_PARAMETERS ||
        status === ResultStatus.BAD_PREREQUISITES;
}

/**
 * Checks if status indicates a network/connection error.
 *
 * @param status - Status to check.
 * @returns True if network error.
 */
export function isNetworkErrorStatus(status: ResultStatus): boolean {
    return status === ResultStatus.NO_CONNECTION ||
        status === ResultStatus.TIMEOUT ||
        status === ResultStatus.SERVICE_UNAVAILABLE;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions - Retry/Terminal Checks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if status indicates a retryable transient error.
 *
 * @param status - Status to check.
 * @returns True if operation can be retried.
 */
export function isRetryableStatus(status: ResultStatus): boolean {
    return status === ResultStatus.TIMEOUT ||
        status === ResultStatus.RATE_LIMITED ||
        status === ResultStatus.SERVICE_UNAVAILABLE ||
        status === ResultStatus.NO_CONNECTION;
}

/**
 * Checks if status indicates a terminal error (cannot be retried).
 *
 * @param status - Status to check.
 * @returns True if error is terminal.
 */
export function isTerminalStatus(status: ResultStatus): boolean {
    return status === ResultStatus.FAILURE ||
        status === ResultStatus.UNAUTHORIZED ||
        status === ResultStatus.VALIDATION_ERROR ||
        status === ResultStatus.BAD_PARAMETERS ||
        status === ResultStatus.BAD_PREREQUISITES ||
        status === ResultStatus.NOT_FOUND ||
        status === ResultStatus.ALREADY ||
        status === ResultStatus.CANCELLED ||
        status === ResultStatus.NOT_IMPLEMENTED;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions - Specific Status Checks
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Checks if status indicates unauthorized access.
 *
 * @param status - Status to check.
 * @returns True if unauthorized.
 */
export function isUnauthorizedStatus(status: ResultStatus): boolean {
    return status === ResultStatus.UNAUTHORIZED;
}

/**
 * Checks if status indicates not found.
 *
 * @param status - Status to check.
 * @returns True if not found.
 */
export function isNotFoundStatus(status: ResultStatus): boolean {
    return status === ResultStatus.NOT_FOUND;
}

/**
 * Checks if status indicates operation was already done.
 *
 * @param status - Status to check.
 * @returns True if already completed.
 */
export function isAlreadyStatus(status: ResultStatus): boolean {
    return status === ResultStatus.ALREADY;
}

/**
 * Checks if status indicates cancellation.
 *
 * @param status - Status to check.
 * @returns True if cancelled.
 */
export function isCancelledStatus(status: ResultStatus): boolean {
    return status === ResultStatus.CANCELLED;
}

/**
 * Checks if status indicates timeout.
 *
 * @param status - Status to check.
 * @returns True if timed out.
 */
export function isTimeoutStatus(status: ResultStatus): boolean {
    return status === ResultStatus.TIMEOUT;
}

/**
 * Checks if status indicates pending/in-progress.
 *
 * @param status - Status to check.
 * @returns True if pending.
 */
export function isPendingStatus(status: ResultStatus): boolean {
    return status === ResultStatus.PENDING;
}

/**
 * Checks if status indicates not implemented.
 *
 * @param status - Status to check.
 * @returns True if not implemented.
 */
export function isNotImplementedStatus(status: ResultStatus): boolean {
    return status === ResultStatus.NOT_IMPLEMENTED;
}
