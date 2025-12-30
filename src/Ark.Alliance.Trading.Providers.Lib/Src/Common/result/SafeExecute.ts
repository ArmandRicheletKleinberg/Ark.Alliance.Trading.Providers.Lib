/**
 * @fileoverview Safe Execute Pattern
 * @module Common/result/SafeExecute
 *
 * Wraps function execution in try/catch and converts exceptions to Results.
 * Provides safe execution patterns with optional logging integration.
 */

import { Result } from './Result';
import { ResultStatus } from './ResultStatus';
import { LoggingService } from '../helpers/logging';

// ═══════════════════════════════════════════════════════════════════════════════
// Safe Execute Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely executes a synchronous function that returns a Result.
 * If any exception occurs, an unexpected Result is returned.
 *
 * @param action - The action to safely execute.
 * @param onException - Optional callback when exception occurs.
 * @returns The Result from the action or Unexpected on exception.
 *
 * @example
 * ```typescript
 * const result = safeExecute(() => {
 *     return Result.ok(riskyOperation());
 * });
 * ```
 */
export function safeExecute<T>(
    action: () => Result<T>,
    onException?: (error: Error) => void
): Result<T> {
    try {
        return action();
    } catch (error) {
        const err = error as Error;
        onException?.(err);
        return Result.fromError<T>(err, 'UNEXPECTED');
    }
}

/**
 * Safely executes an async function that returns a Result.
 * If any exception occurs, an unexpected Result is returned.
 *
 * @param action - The async action to safely execute.
 * @param onException - Optional callback when exception occurs.
 * @returns Promise of the Result from the action or Unexpected on exception.
 *
 * @example
 * ```typescript
 * const result = await safeExecuteAsync(async () => {
 *     const data = await fetchData();
 *     return Result.ok(data);
 * });
 * ```
 */
export async function safeExecuteAsync<T>(
    action: () => Promise<Result<T>>,
    onException?: (error: Error) => void
): Promise<Result<T>> {
    try {
        return await action();
    } catch (error) {
        const err = error as Error;
        onException?.(err);
        return Result.fromError<T>(err, 'UNEXPECTED');
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Safe Execute With Logging
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely executes a function and logs failures.
 *
 * @param action - The action to safely execute.
 * @param logger - Logger to use for failure logging.
 * @returns The Result from the action or Unexpected on exception.
 *
 * @example
 * ```typescript
 * const result = safeExecuteWithLog(() => {
 *     return validateAndProcess(data);
 * }, this.logger);
 * ```
 */
export function safeExecuteWithLog<T>(
    action: () => Result<T>,
    logger: LoggingService
): Result<T> {
    const result = safeExecute(action, (error) => {
        logger.error('Unexpected error during safe execution', error);
    });

    if (result.isNotSuccess) {
        logResult(result, logger);
    }

    return result;
}

/**
 * Safely executes an async function and logs failures.
 *
 * @param action - The async action to safely execute.
 * @param logger - Logger to use for failure logging.
 * @returns Promise of the Result from the action or Unexpected on exception.
 *
 * @example
 * ```typescript
 * const result = await safeExecuteWithLogAsync(async () => {
 *     const data = await fetchData();
 *     return Result.ok(data);
 * }, this.logger);
 * ```
 */
export async function safeExecuteWithLogAsync<T>(
    action: () => Promise<Result<T>>,
    logger: LoggingService
): Promise<Result<T>> {
    const result = await safeExecuteAsync(action, (error) => {
        logger.error('Unexpected error during safe execution', error);
    });

    if (result.isNotSuccess) {
        logResult(result, logger);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Try Execute (converts any function to Result)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wraps a function that may throw and returns a Result.
 *
 * @param action - The action that may throw.
 * @returns Result containing the return value or error.
 *
 * @example
 * ```typescript
 * const result = tryExecute(() => JSON.parse(jsonString));
 * if (result.isSuccess) {
 *     console.log(result.data);
 * }
 * ```
 */
export function tryExecute<T>(action: () => T): Result<T> {
    try {
        const data = action();
        return Result.ok(data);
    } catch (error) {
        return Result.fromError<T>(error as Error);
    }
}

/**
 * Wraps an async function that may throw and returns a Result.
 *
 * @param action - The async action that may throw.
 * @returns Promise of Result containing the return value or error.
 *
 * @example
 * ```typescript
 * const result = await tryExecuteAsync(() => fetch('/api/data'));
 * ```
 */
export async function tryExecuteAsync<T>(action: () => Promise<T>): Promise<Result<T>> {
    try {
        const data = await action();
        return Result.ok(data);
    } catch (error) {
        return Result.fromError<T>(error as Error);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Logs a Result based on its status.
 *
 * @param result - The result to log.
 * @param logger - The logger to use.
 */
function logResult<T>(result: Result<T>, logger: LoggingService): void {
    const message = result.reason ?? result.error?.message ?? 'Operation failed';
    const context = {
        status: result.status,
        code: result.error?.code,
        correlationId: result.correlationId
    };

    switch (result.status) {
        case ResultStatus.UNEXPECTED:
            logger.critical(message, result.exception ?? context);
            break;

        case ResultStatus.FAILURE:
        case ResultStatus.UNAUTHORIZED:
        case ResultStatus.BAD_PREREQUISITES:
        case ResultStatus.BAD_PARAMETERS:
            logger.error(message, context);
            break;

        case ResultStatus.NOT_FOUND:
        case ResultStatus.ALREADY:
        case ResultStatus.VALIDATION_ERROR:
            logger.warn(message, context);
            break;

        case ResultStatus.TIMEOUT:
        case ResultStatus.RATE_LIMITED:
        case ResultStatus.NO_CONNECTION:
        case ResultStatus.SERVICE_UNAVAILABLE:
            logger.warn(`Transient failure: ${message}`, context);
            break;

        case ResultStatus.CANCELLED:
            logger.info(`Operation cancelled: ${message}`, context);
            break;

        case ResultStatus.NOT_IMPLEMENTED:
            logger.warn(`Not implemented: ${message}`, context);
            break;

        default:
            logger.debug(`Result: ${result.status}`, context);
    }
}
