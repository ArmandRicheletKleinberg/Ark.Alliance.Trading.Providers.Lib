/**
 * @fileoverview Result Module Barrel Export
 * @module Common/result
 *
 * Centralized exports for Result pattern classes and utilities.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Status Enumeration
// ═══════════════════════════════════════════════════════════════════════════════

export {
    ResultStatus,
    type ResultStatusType,
    isSuccessStatus,
    isNotSuccessStatus,
    isUnexpectedStatus,
    isValidationErrorStatus,
    isNetworkErrorStatus,
    isRetryableStatus,
    isTerminalStatus,
    isUnauthorizedStatus,
    isNotFoundStatus,
    isAlreadyStatus,
    isCancelledStatus,
    isTimeoutStatus,
    isPendingStatus,
    isNotImplementedStatus
} from './ResultStatus';

// ═══════════════════════════════════════════════════════════════════════════════
// Error Handling
// ═══════════════════════════════════════════════════════════════════════════════

export {
    type ErrorDetail,
    createErrorDetail,
    createValidationError,
    createNotFoundError,
    createTimeoutError
} from './ErrorDetail';

export {
    ResultException
} from './ResultException';

// ═══════════════════════════════════════════════════════════════════════════════
// Core Result Class
// ═══════════════════════════════════════════════════════════════════════════════

export {
    Result,
    type ResultJSON,
    // Backward compatibility
    type ServiceResult,
    successResult,
    errorResult
} from './Result';

// ═══════════════════════════════════════════════════════════════════════════════
// Paginated Result
// ═══════════════════════════════════════════════════════════════════════════════

export {
    PagedResult,
    type PagedResultJSON,
    type PaginationInfo
} from './PagedResult';

// ═══════════════════════════════════════════════════════════════════════════════
// Safe Execution Pattern
// ═══════════════════════════════════════════════════════════════════════════════

export {
    safeExecute,
    safeExecuteAsync,
    safeExecuteWithLog,
    safeExecuteWithLogAsync,
    tryExecute,
    tryExecuteAsync
} from './SafeExecute';

// ═══════════════════════════════════════════════════════════════════════════════
// DTO for API Responses
// ═══════════════════════════════════════════════════════════════════════════════

export {
    type ExceptionDto,
    type ResultDtoBase,
    type VoidResultDto,
    type ResultDto,
    type PagedResultDto,
    toExceptionDto,
    toResultDto,
    toPagedResultDto,
    fromResultDto,
    fromPagedResultDto,
    getHttpStatusCode,
    createApiResponse
} from './ResultDto';
