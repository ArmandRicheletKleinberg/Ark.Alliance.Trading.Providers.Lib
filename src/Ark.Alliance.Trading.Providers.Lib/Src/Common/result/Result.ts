/**
 * @fileoverview Generic Result Class
 * @module Common/result/Result
 *
 * Type-safe result pattern for operation outcomes.
 * Provides consistent error handling across the application.
 *
 * @remarks
 * Key features:
 * - **Static shortcuts**: Result.Success, Result.Failure, etc.
 * - **Fluent methods**: withReason(), withData(), withStatus()
 * - **Railway pattern**: whenSuccess(), map(), flatMap()
 * - **Exception conversion**: toException()
 */

import { ResultStatus, isSuccessStatus, isRetryableStatus } from './ResultStatus';
import { ErrorDetail, createErrorDetail } from './ErrorDetail';
import { ResultException } from './ResultException';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JSON representation of a Result.
 */
export interface ResultJSON<T> {
    readonly success: boolean;
    readonly status: string;
    readonly data?: T;
    readonly error?: ErrorDetail;
    readonly reason?: string;
    readonly correlationId?: string;
    readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Result Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generic Result class for type-safe operation outcomes.
 *
 * @template T - The type of the success data.
 *
 * @example
 * ```typescript
 * // Success result
 * const success = Result.ok({ id: 1, name: 'Test' });
 *
 * // Failure result
 * const failure = Result.fail<User>({ code: 'NOT_FOUND', message: 'User not found', timestamp: Date.now() });
 *
 * // Static shortcuts
 * const notFound = Result.NotFound.withReason('User 123 not found');
 *
 * // Railway-oriented programming
 * const result = await validateUser(input)
 *     .whenSuccess(createUser)
 *     .whenSuccess(sendWelcomeEmail);
 * ```
 */
export class Result<T> {
    // ═══════════════════════════════════════════════════════════════════════════
    // Instance Properties
    // ═══════════════════════════════════════════════════════════════════════════

    /** Whether the operation was successful. */
    public readonly success: boolean;

    /** The result status. */
    public readonly status: ResultStatus;

    /** The success data (only present if success is true). */
    public readonly data?: T;

    /** Error information (only present if success is false). */
    public readonly error?: ErrorDetail;

    /** The reason in text why a not succeeded result occurred. */
    public readonly reason?: string;

    /** Optional correlation ID for tracing. */
    public readonly correlationId?: string;

    /** Timestamp when the result was created. */
    public readonly timestamp: number;

    /** The original exception if unexpected error. */
    public readonly exception?: Error;

    // ═══════════════════════════════════════════════════════════════════════════
    // Constructor (private - use factory methods)
    // ═══════════════════════════════════════════════════════════════════════════

    private constructor(
        success: boolean,
        status: ResultStatus,
        data?: T,
        error?: ErrorDetail,
        correlationId?: string,
        reason?: string,
        exception?: Error
    ) {
        this.success = success;
        this.status = status;
        this.data = data;
        this.error = error;
        this.correlationId = correlationId ?? error?.correlationId;
        this.reason = reason ?? error?.message;
        this.exception = exception;
        this.timestamp = Date.now();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Static Shortcuts (C# Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Creates a successful void result. */
    public static get Success(): Result<void> {
        return new Result<void>(true, ResultStatus.SUCCESS, undefined);
    }

    /** Creates a failed void result. */
    public static get Failure(): Result<void> {
        return new Result<void>(false, ResultStatus.FAILURE, undefined, {
            code: 'FAILURE',
            message: 'Operation failed',
            timestamp: Date.now()
        });
    }

    /** Creates an unexpected error void result. */
    public static get Unexpected(): Result<void> {
        return new Result<void>(false, ResultStatus.UNEXPECTED, undefined, {
            code: 'UNEXPECTED',
            message: 'An unexpected error occurred',
            timestamp: Date.now()
        });
    }

    /** Creates an unauthorized void result. */
    public static get Unauthorized(): Result<void> {
        return new Result<void>(false, ResultStatus.UNAUTHORIZED, undefined, {
            code: 'UNAUTHORIZED',
            message: 'Unauthorized access',
            timestamp: Date.now()
        });
    }

    /** Creates an already-completed void result. */
    public static get Already(): Result<void> {
        return new Result<void>(false, ResultStatus.ALREADY, undefined, {
            code: 'ALREADY',
            message: 'Operation already completed',
            timestamp: Date.now()
        });
    }

    /** Creates a not found void result. */
    public static get NotFound(): Result<void> {
        return new Result<void>(false, ResultStatus.NOT_FOUND, undefined, {
            code: 'NOT_FOUND',
            message: 'Resource not found',
            timestamp: Date.now()
        });
    }

    /** Creates a bad prerequisites void result. */
    public static get BadPrerequisites(): Result<void> {
        return new Result<void>(false, ResultStatus.BAD_PREREQUISITES, undefined, {
            code: 'BAD_PREREQUISITES',
            message: 'Prerequisites not met',
            timestamp: Date.now()
        });
    }

    /** Creates a bad parameters void result. */
    public static get BadParameters(): Result<void> {
        return new Result<void>(false, ResultStatus.BAD_PARAMETERS, undefined, {
            code: 'BAD_PARAMETERS',
            message: 'Invalid parameters',
            timestamp: Date.now()
        });
    }

    /** Creates a cancelled void result. */
    public static get Cancelled(): Result<void> {
        return new Result<void>(false, ResultStatus.CANCELLED, undefined, {
            code: 'CANCELLED',
            message: 'Operation cancelled',
            timestamp: Date.now()
        });
    }

    /** Creates a timeout void result. */
    public static get Timeout(): Result<void> {
        return new Result<void>(false, ResultStatus.TIMEOUT, undefined, {
            code: 'TIMEOUT',
            message: 'Operation timed out',
            timestamp: Date.now()
        });
    }

    /** Creates a no connection void result. */
    public static get NoConnection(): Result<void> {
        return new Result<void>(false, ResultStatus.NO_CONNECTION, undefined, {
            code: 'NO_CONNECTION',
            message: 'No connection available',
            timestamp: Date.now()
        });
    }

    /** Creates a not implemented void result. */
    public static get NotImplemented(): Result<void> {
        return new Result<void>(false, ResultStatus.NOT_IMPLEMENTED, undefined, {
            code: 'NOT_IMPLEMENTED',
            message: 'Operation not implemented',
            timestamp: Date.now()
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Static Factory Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Creates a successful result with data.
     *
     * @param data - The success data.
     * @param correlationId - Optional correlation ID.
     * @returns New success Result.
     */
    public static ok<T>(data: T, correlationId?: string): Result<T> {
        return new Result<T>(true, ResultStatus.SUCCESS, data, undefined, correlationId);
    }

    /**
     * Creates a failed result with error details.
     *
     * @param error - Error details.
     * @param status - Result status (default: FAILURE).
     * @returns New failure Result.
     */
    public static fail<T>(error: ErrorDetail, status: ResultStatus = ResultStatus.FAILURE): Result<T> {
        return new Result<T>(false, status, undefined, error, error.correlationId);
    }

    /**
     * Creates a failed result from an Error object.
     *
     * @param error - The error object.
     * @param code - Optional error code.
     * @param correlationId - Optional correlation ID.
     * @returns New failure Result with UNEXPECTED status.
     */
    public static fromError<T>(error: Error, code?: string, correlationId?: string): Result<T> {
        return new Result<T>(
            false,
            ResultStatus.UNEXPECTED,
            undefined,
            createErrorDetail(error, code, correlationId),
            correlationId,
            error.message,
            error
        );
    }

    /**
     * Creates a Result from another Result (copy constructor).
     *
     * @param result - Source result.
     * @returns New Result with same properties.
     */
    public static from<T>(result: Result<T>): Result<T> {
        return new Result<T>(
            result.success,
            result.status,
            result.data,
            result.error,
            result.correlationId,
            result.reason,
            result.exception
        );
    }

    /**
     * Creates a pending result.
     *
     * @param correlationId - Optional correlation ID.
     * @returns New pending Result.
     */
    public static pending<T>(correlationId?: string): Result<T> {
        return new Result<T>(false, ResultStatus.PENDING, undefined, undefined, correlationId);
    }

    /**
     * Creates a not found result.
     *
     * @param message - Error message.
     * @param correlationId - Optional correlation ID.
     * @returns New not found Result.
     */
    public static notFound<T>(message: string, correlationId?: string): Result<T> {
        return Result.fail<T>({
            code: 'NOT_FOUND',
            message,
            timestamp: Date.now(),
            correlationId
        }, ResultStatus.NOT_FOUND);
    }

    /**
     * Creates a validation error result.
     *
     * @param message - Validation message.
     * @param details - Validation details.
     * @param correlationId - Optional correlation ID.
     * @returns New validation error Result.
     */
    public static validationError<T>(
        message: string,
        details?: Record<string, unknown>,
        correlationId?: string
    ): Result<T> {
        return Result.fail<T>({
            code: 'VALIDATION_ERROR',
            message,
            details,
            timestamp: Date.now(),
            correlationId
        }, ResultStatus.VALIDATION_ERROR);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Computed Properties (C# Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Checks if the result is successful. */
    public get isSuccess(): boolean {
        return this.success && isSuccessStatus(this.status);
    }

    /** Checks if the result is not successful. */
    public get isNotSuccess(): boolean {
        return !this.isSuccess;
    }

    /** Checks if the result is a failure. */
    public get isFailure(): boolean {
        return this.status === ResultStatus.FAILURE;
    }

    /** Checks if the result is an unexpected error. */
    public get isUnexpected(): boolean {
        return this.status === ResultStatus.UNEXPECTED;
    }

    /** Checks if the result is unauthorized. */
    public get isUnauthorized(): boolean {
        return this.status === ResultStatus.UNAUTHORIZED;
    }

    /** Checks if the result is already completed. */
    public get isAlready(): boolean {
        return this.status === ResultStatus.ALREADY;
    }

    /** Checks if the result is not found. */
    public get isNotFound(): boolean {
        return this.status === ResultStatus.NOT_FOUND;
    }

    /** Checks if the result has bad prerequisites. */
    public get isBadPrerequisites(): boolean {
        return this.status === ResultStatus.BAD_PREREQUISITES;
    }

    /** Checks if the result has bad parameters. */
    public get isBadParameters(): boolean {
        return this.status === ResultStatus.BAD_PARAMETERS;
    }

    /** Checks if the result is cancelled. */
    public get isCancelled(): boolean {
        return this.status === ResultStatus.CANCELLED;
    }

    /** Checks if the result is a timeout. */
    public get isTimeout(): boolean {
        return this.status === ResultStatus.TIMEOUT;
    }

    /** Checks if the result has no connection. */
    public get isNoConnection(): boolean {
        return this.status === ResultStatus.NO_CONNECTION;
    }

    /** Checks if the result is not implemented. */
    public get isNotImplemented(): boolean {
        return this.status === ResultStatus.NOT_IMPLEMENTED;
    }

    /** Checks if the result can be retried. */
    public get isRetryable(): boolean {
        return isRetryableStatus(this.status);
    }

    /** Checks if the result has data. */
    public get hasData(): boolean {
        return this.data !== undefined && this.data !== null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Fluent Methods (C# Pattern - returns new immutable instances)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Sets the reason and returns a new Result.
     *
     * @param reason - The reason text.
     * @returns New Result with updated reason.
     */
    public withReason(reason: string): Result<T> {
        return new Result<T>(
            this.success,
            this.status,
            this.data,
            this.error ? { ...this.error, message: reason } : {
                code: this.status,
                message: reason,
                timestamp: Date.now()
            },
            this.correlationId,
            reason,
            this.exception
        );
    }

    /**
     * Adds reason to existing reason and returns a new Result.
     *
     * @param reason - Additional reason text.
     * @returns New Result with accumulated reason.
     */
    public addReason(reason: string): Result<T> {
        const newReason = this.reason
            ? `${reason}\n${this.reason}`
            : reason;
        return this.withReason(newReason);
    }

    /**
     * Sets the status and returns a new Result.
     *
     * @param status - New status.
     * @returns New Result with updated status.
     */
    public withStatus(status: ResultStatus): Result<T> {
        return new Result<T>(
            isSuccessStatus(status),
            status,
            this.data,
            this.error,
            this.correlationId,
            this.reason,
            this.exception
        );
    }

    /**
     * Sets the data and returns a new Result.
     *
     * @param data - New data.
     * @returns New Result with updated data.
     */
    public withData<U>(data: U): Result<U> {
        return new Result<U>(
            this.success,
            this.status,
            data,
            this.error,
            this.correlationId,
            this.reason,
            this.exception
        );
    }

    /**
     * Sets the exception and returns a new Result.
     *
     * @param exception - The exception.
     * @returns New Result with exception.
     */
    public withException(exception: Error): Result<T> {
        return new Result<T>(
            this.success,
            this.status,
            this.data,
            this.error,
            this.correlationId,
            this.reason,
            exception
        );
    }

    /**
     * Sets the correlation ID and returns a new Result.
     *
     * @param correlationId - Correlation ID.
     * @returns New Result with correlation ID.
     */
    public withCorrelationId(correlationId: string): Result<T> {
        return new Result<T>(
            this.success,
            this.status,
            this.data,
            this.error ? { ...this.error, correlationId } : undefined,
            correlationId,
            this.reason,
            this.exception
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Railway-Oriented Programming
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Continues with function if successful.
     *
     * @param fn - Function to execute on success.
     * @returns This result if failed, otherwise the function result.
     */
    public whenSuccess<U>(fn: (result: Result<T>) => Result<U>): Result<U> {
        if (this.isNotSuccess) {
            return Result.fail<U>(this.error!, this.status);
        }
        return fn(this);
    }

    /**
     * Continues with async function if successful.
     *
     * @param fn - Async function to execute on success.
     * @returns This result if failed, otherwise the function result.
     */
    public async whenSuccessAsync<U>(fn: (result: Result<T>) => Promise<Result<U>>): Promise<Result<U>> {
        if (this.isNotSuccess) {
            return Result.fail<U>(this.error!, this.status);
        }
        return fn(this);
    }

    /**
     * Maps the data to a new type if successful.
     *
     * @param mapper - Transformation function.
     * @returns New Result with mapped data.
     */
    public map<U>(mapper: (data: T) => U): Result<U> {
        if (this.success && this.data !== undefined) {
            return Result.ok(mapper(this.data), this.correlationId);
        }
        return Result.fail<U>(this.error!, this.status);
    }

    /**
     * Flat maps the result to a new Result.
     *
     * @param mapper - Function returning new Result.
     * @returns Mapped Result.
     */
    public flatMap<U>(mapper: (data: T) => Result<U>): Result<U> {
        if (this.success && this.data !== undefined) {
            return mapper(this.data);
        }
        return Result.fail<U>(this.error!, this.status);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Data Access Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the data or throws ResultException if not successful.
     *
     * @returns The data.
     * @throws ResultException if not successful.
     */
    public getOrThrow(): T {
        if (!this.success || this.data === undefined) {
            throw this.toException();
        }
        return this.data;
    }

    /**
     * Gets the data or a default value.
     *
     * @param defaultValue - Value to return if not successful.
     * @returns Data or default value.
     */
    public getOrDefault(defaultValue: T): T {
        return this.success && this.data !== undefined ? this.data : defaultValue;
    }

    /**
     * Gets the data or null.
     *
     * @returns Data or null.
     */
    public getOrNull(): T | null {
        return this.success && this.data !== undefined ? this.data : null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Exception Conversion (C# Pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Converts this Result to a ResultException.
     *
     * @returns ResultException representing this result.
     */
    public toException(): ResultException {
        return new ResultException(
            this.status,
            this.error,
            this.exception,
            this.data
        );
    }

    /**
     * Converts to a void Result (strips data).
     *
     * @returns Result without data.
     */
    public toVoid(): Result<void> {
        return new Result<void>(
            this.success,
            this.status,
            undefined,
            this.error,
            this.correlationId,
            this.reason,
            this.exception
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Serialization
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Serializes the result to JSON.
     *
     * @returns JSON representation.
     */
    public toJSON(): ResultJSON<T> {
        return {
            success: this.success,
            status: this.status,
            data: this.data,
            error: this.error,
            reason: this.reason,
            correlationId: this.correlationId,
            timestamp: this.timestamp
        };
    }

    /**
     * Creates a Result from JSON.
     *
     * @param json - JSON representation.
     * @returns Result instance.
     */
    public static fromJSON<T>(json: ResultJSON<T>): Result<T> {
        if (json.success && json.data !== undefined) {
            return Result.ok(json.data, json.correlationId);
        }
        if (json.error) {
            return Result.fail<T>(json.error, json.status as ResultStatus);
        }
        return Result.fail<T>({
            code: 'UNKNOWN',
            message: 'Invalid result JSON',
            timestamp: Date.now()
        });
    }

    /**
     * String representation.
     *
     * @returns Formatted string.
     */
    public toString(): string {
        const parts: string[] = [this.status];
        if (this.reason) parts.push(this.reason);
        if (this.hasData) parts.push(`Data: ${typeof this.data}`);
        return parts.join(' - ');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Backward Compatibility
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use Result<T> directly.
 */
export type ServiceResult<T> = Result<T>;

/**
 * Creates a successful service result.
 *
 * @deprecated Use Result.ok() instead.
 */
export function successResult<T>(data: T): Result<T> {
    return Result.ok(data);
}

/**
 * Creates a failed service result.
 *
 * @deprecated Use Result.fail() instead.
 */
export function errorResult<T>(code: string, message: string, details?: unknown): Result<T> {
    return Result.fail<T>({
        code,
        message,
        details: details as Record<string, unknown>,
        timestamp: Date.now()
    });
}
