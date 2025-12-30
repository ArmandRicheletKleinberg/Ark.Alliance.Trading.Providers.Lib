/**
 * @fileoverview Result Exception Class
 * @module Common/result/ResultException
 *
 * Exception class created from a failed Result.
 * Preserves Result information for debugging and error handling.
 */

import { ResultStatus } from './ResultStatus';
import { ErrorDetail } from './ErrorDetail';

// ═══════════════════════════════════════════════════════════════════════════════
// ResultException Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exception class created from a failed Result.
 *
 * @extends Error
 *
 * @example
 * ```typescript
 * // Throw from a failed result
 * if (!result.isSuccess) {
 *     throw new ResultException(result.status, result.error);
 * }
 *
 * // Catch and check type
 * try {
 *     await riskyOperation();
 * } catch (error) {
 *     if (ResultException.isResultException(error)) {
 *         console.log(`Result error: ${error.status}`);
 *     }
 * }
 * ```
 */
export class ResultException extends Error {
    /**
     * Unique identifier for this error type.
     * @readonly
     */
    public readonly name = 'ResultException';

    /**
     * The result status that caused this exception.
     * @readonly
     */
    public readonly status: ResultStatus;

    /**
     * The reason/message for the failure.
     * @readonly
     */
    public readonly reason?: string;

    /**
     * Structured error details.
     * @readonly
     */
    public readonly errorDetail?: ErrorDetail;

    /**
     * The original exception if this was caused by an unexpected error.
     * @readonly
     */
    public readonly innerError?: Error;

    /**
     * Additional data associated with the result.
     * @readonly
     */
    public readonly data?: unknown;

    /**
     * Correlation ID for tracing.
     * @readonly
     */
    public readonly correlationId?: string;

    /**
     * Creates a new ResultException.
     *
     * @param status - The result status.
     * @param error - Optional error detail.
     * @param innerError - Optional inner exception.
     * @param data - Optional additional data.
     */
    constructor(
        status: ResultStatus,
        error?: ErrorDetail,
        innerError?: Error,
        data?: unknown
    ) {
        const message = error?.message ?? `Operation failed with status: ${status}`;
        super(message);

        this.status = status;
        this.reason = error?.message;
        this.errorDetail = error;
        this.innerError = innerError;
        this.data = data;
        this.correlationId = error?.correlationId;

        // Maintain proper stack trace (V8 engines)
        if ('captureStackTrace' in Error && typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, ResultException);
        }

        // Ensure prototype chain is correct
        Object.setPrototypeOf(this, ResultException.prototype);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Static Factory Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Creates a ResultException from an unexpected error.
     *
     * @param error - The original error.
     * @param correlationId - Optional correlation ID.
     * @returns New ResultException with UNEXPECTED status.
     */
    public static fromError(error: Error, correlationId?: string): ResultException {
        return new ResultException(
            ResultStatus.UNEXPECTED,
            {
                code: 'UNEXPECTED',
                message: error.message,
                details: { name: error.name, stack: error.stack },
                timestamp: Date.now(),
                correlationId
            },
            error
        );
    }

    /**
     * Creates a not found exception.
     *
     * @param resourceType - Type of resource not found.
     * @param identifier - Resource identifier.
     * @param correlationId - Optional correlation ID.
     * @returns New ResultException with NOT_FOUND status.
     */
    public static notFound(
        resourceType: string,
        identifier: string | number,
        correlationId?: string
    ): ResultException {
        return new ResultException(
            ResultStatus.NOT_FOUND,
            {
                code: 'NOT_FOUND',
                message: `${resourceType} with identifier '${identifier}' was not found`,
                details: { resourceType, identifier },
                timestamp: Date.now(),
                correlationId
            }
        );
    }

    /**
     * Creates a validation exception.
     *
     * @param message - Validation message.
     * @param details - Validation details.
     * @param correlationId - Optional correlation ID.
     * @returns New ResultException with VALIDATION_ERROR status.
     */
    public static validationError(
        message: string,
        details?: Record<string, unknown>,
        correlationId?: string
    ): ResultException {
        return new ResultException(
            ResultStatus.VALIDATION_ERROR,
            {
                code: 'VALIDATION_ERROR',
                message,
                details,
                timestamp: Date.now(),
                correlationId
            }
        );
    }

    /**
     * Creates an unauthorized exception.
     *
     * @param message - Optional message.
     * @param correlationId - Optional correlation ID.
     * @returns New ResultException with UNAUTHORIZED status.
     */
    public static unauthorized(
        message: string = 'Unauthorized access',
        correlationId?: string
    ): ResultException {
        return new ResultException(
            ResultStatus.UNAUTHORIZED,
            {
                code: 'UNAUTHORIZED',
                message,
                timestamp: Date.now(),
                correlationId
            }
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Type Guard
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Type guard to check if an error is a ResultException.
     *
     * @param error - Error to check.
     * @returns True if error is a ResultException.
     */
    public static isResultException(error: unknown): error is ResultException {
        return error instanceof ResultException ||
            (error instanceof Error && error.name === 'ResultException');
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Instance Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the full error chain as a string.
     *
     * @returns Formatted error chain.
     */
    public getFullMessage(): string {
        let message = `[${this.status}] ${this.message}`;

        if (this.innerError) {
            message += `\n  Caused by: ${this.innerError.message}`;
        }

        return message;
    }

    /**
     * Converts to a plain object for serialization.
     *
     * @returns Plain object representation.
     */
    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            status: this.status,
            message: this.message,
            reason: this.reason,
            errorDetail: this.errorDetail,
            correlationId: this.correlationId,
            data: this.data,
            stack: this.stack,
            innerError: this.innerError ? {
                name: this.innerError.name,
                message: this.innerError.message,
                stack: this.innerError.stack
            } : undefined
        };
    }

    /**
     * String representation.
     */
    public override toString(): string {
        return this.getFullMessage();
    }
}
