/**
 * @fileoverview Result DTO for API Responses
 * @module Common/result/ResultDto
 *
 * Data Transfer Objects for serializing Results in API responses.
 * Provides standardized structure for REST API error handling.
 */

import { Result } from './Result';
import { ResultStatus } from './ResultStatus';
import { ErrorDetail } from './ErrorDetail';
import { PagedResult, PaginationInfo } from './PagedResult';

// ═══════════════════════════════════════════════════════════════════════════════
// Exception DTO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Serializable exception information.
 */
export interface ExceptionDto {
    /** Exception type name. */
    readonly name: string;
    /** Exception message. */
    readonly message: string;
    /** Stack trace (may be omitted in production). */
    readonly stack?: string;
    /** Inner exception if any. */
    readonly innerException?: ExceptionDto;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Result DTO (Void)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base DTO fields for all Result DTOs.
 */
export interface ResultDtoBase {
    /** The result status. */
    readonly status: ResultStatus;
    /** The reason for failure if not successful. */
    readonly reason?: string;
    /** Error code for programmatic handling. */
    readonly code?: string;
    /** Exception details if unexpected error. */
    readonly exception?: ExceptionDto;
    /** Correlation ID for tracing. */
    readonly correlationId?: string;
    /** Timestamp of the result. */
    readonly timestamp: number;
}

/**
 * DTO for void Result (no data).
 *
 * @remarks
 * Used for API responses where only success/failure is needed.
 */
export type VoidResultDto = ResultDtoBase;

// ═══════════════════════════════════════════════════════════════════════════════
// Result DTO (With Data)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DTO for Result with data.
 *
 * @template T - Type of the data.
 */
export interface ResultDto<T> extends ResultDtoBase {
    /** The data if successful. */
    readonly data?: T;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Paged Result DTO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * DTO for paginated results.
 *
 * @template T - Type of items.
 */
export interface PagedResultDto<T> extends ResultDto<T[]> {
    /** Pagination metadata. */
    readonly pagination?: PaginationInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Conversion Functions: Result -> DTO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Converts an Error to ExceptionDto.
 *
 * @param error - The error to convert.
 * @param includeStack - Whether to include stack trace.
 * @returns ExceptionDto representation.
 */
export function toExceptionDto(error: Error, includeStack: boolean = false): ExceptionDto {
    const dto: ExceptionDto = {
        name: error.name,
        message: error.message
    };

    if (includeStack && error.stack) {
        return { ...dto, stack: error.stack };
    }

    // Check for nested error (cause)
    if ((error as Error & { cause?: Error }).cause) {
        return {
            ...dto,
            innerException: toExceptionDto((error as Error & { cause: Error }).cause, includeStack)
        };
    }

    return dto;
}

/**
 * Converts a Result<T> to ResultDto<T>.
 *
 * @param result - The Result to convert.
 * @param includeStack - Whether to include stack trace in exception.
 * @returns ResultDto<T> representation.
 */
export function toResultDto<T>(result: Result<T>, includeStack: boolean = false): ResultDto<T> {
    const dto: ResultDto<T> = {
        status: result.status,
        reason: result.reason,
        code: result.error?.code,
        correlationId: result.correlationId,
        timestamp: result.timestamp,
        data: result.data
    };

    if (result.exception) {
        return {
            ...dto,
            exception: toExceptionDto(result.exception, includeStack)
        };
    }

    return dto;
}

/**
 * Converts a PagedResult to PagedResultDto.
 *
 * @param result - The PagedResult to convert.
 * @param includeStack - Whether to include stack trace.
 * @returns PagedResultDto representation.
 */
export function toPagedResultDto<T>(
    result: PagedResult<T>,
    includeStack: boolean = false
): PagedResultDto<T> {
    const baseDto = toResultDto(result.toResult(), includeStack);
    return {
        ...baseDto,
        pagination: result.pagination
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Conversion Functions: DTO -> Result
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a Result from ResultDto.
 *
 * @param dto - The DTO to convert.
 * @returns Result instance.
 */
export function fromResultDto<T>(dto: ResultDto<T>): Result<T> {
    if (dto.status === ResultStatus.SUCCESS && dto.data !== undefined) {
        return Result.ok(dto.data, dto.correlationId);
    }

    const error: ErrorDetail = {
        code: dto.code ?? dto.status,
        message: dto.reason ?? 'Unknown error',
        timestamp: dto.timestamp,
        correlationId: dto.correlationId
    };

    return Result.fail<T>(error, dto.status);
}

/**
 * Creates a PagedResult from PagedResultDto.
 *
 * @param dto - The DTO to convert.
 * @returns PagedResult instance.
 */
export function fromPagedResultDto<T>(dto: PagedResultDto<T>): PagedResult<T> {
    if (dto.status === ResultStatus.SUCCESS && dto.data !== undefined && dto.pagination) {
        return PagedResult.ok(dto.data, dto.pagination, dto.correlationId);
    }

    const error: ErrorDetail = {
        code: dto.code ?? dto.status,
        message: dto.reason ?? 'Unknown error',
        timestamp: dto.timestamp,
        correlationId: dto.correlationId
    };

    return PagedResult.fail<T>(error, dto.status);
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Response Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets HTTP status code for a Result.
 *
 * @param result - The result to check.
 * @returns Appropriate HTTP status code.
 */
export function getHttpStatusCode<T>(result: Result<T>): number {
    if (result.isSuccess) {
        return result.hasData ? 200 : 204;
    }

    switch (result.status) {
        case ResultStatus.NOT_FOUND:
            return 404;
        case ResultStatus.UNAUTHORIZED:
            return 401;
        case ResultStatus.VALIDATION_ERROR:
        case ResultStatus.BAD_PARAMETERS:
            return 400;
        case ResultStatus.BAD_PREREQUISITES:
            return 412;
        case ResultStatus.ALREADY:
            return 409;
        case ResultStatus.TIMEOUT:
            return 408;
        case ResultStatus.RATE_LIMITED:
            return 429;
        case ResultStatus.SERVICE_UNAVAILABLE:
        case ResultStatus.NO_CONNECTION:
            return 503;
        case ResultStatus.NOT_IMPLEMENTED:
            return 501;
        case ResultStatus.UNEXPECTED:
            return 500;
        default:
            return 500;
    }
}

/**
 * Creates an API response object from a Result.
 *
 * @param result - The result to convert.
 * @param includeStack - Whether to include stack traces (dev mode).
 * @returns Object with status code and body.
 */
export function createApiResponse<T>(
    result: Result<T>,
    includeStack: boolean = false
): { statusCode: number; body: ResultDto<T> } {
    return {
        statusCode: getHttpStatusCode(result),
        body: toResultDto(result, includeStack)
    };
}
