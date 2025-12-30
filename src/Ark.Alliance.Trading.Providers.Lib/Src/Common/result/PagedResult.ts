/**
 * @fileoverview Paged Result for Paginated Data
 * @module Common/result/PagedResult
 *
 * Extended Result class for paginated data responses.
 * Uses composition pattern for proper TypeScript extension.
 */

import { Result, ResultJSON } from './Result';
import { ResultStatus } from './ResultStatus';
import { ErrorDetail } from './ErrorDetail';

// ═══════════════════════════════════════════════════════════════════════════════
// Pagination Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Pagination metadata.
 */
export interface PaginationInfo {
    /** Current page number (1-indexed). */
    readonly page: number;
    /** Items per page. */
    readonly pageSize: number;
    /** Total number of items. */
    readonly totalItems: number;
    /** Total number of pages. */
    readonly totalPages: number;
    /** Whether there is a next page. */
    readonly hasNextPage: boolean;
    /** Whether there is a previous page. */
    readonly hasPreviousPage: boolean;
}

/**
 * JSON representation of a PagedResult.
 */
export interface PagedResultJSON<T> extends ResultJSON<T[]> {
    readonly pagination?: PaginationInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PagedResult Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result class for paginated data.
 * Uses composition to wrap a Result<T[]> with pagination metadata.
 *
 * @template T - The type of items in the page.
 *
 * @example
 * ```typescript
 * const pagedResult = PagedResult.ok(
 *     [{ id: 1 }, { id: 2 }],
 *     { page: 1, pageSize: 10, totalItems: 100, totalPages: 10, hasNextPage: true, hasPreviousPage: false }
 * );
 *
 * // Or with calculated pagination
 * const result = PagedResult.okWithPagination(items, page, pageSize, totalItems);
 * ```
 */
export class PagedResult<T> {
    // ═══════════════════════════════════════════════════════════════════════════
    // Properties
    // ═══════════════════════════════════════════════════════════════════════════

    /** The underlying Result. */
    private readonly _result: Result<T[]>;

    /** Pagination metadata. */
    public readonly pagination?: PaginationInfo;

    // ═══════════════════════════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════════════════════════

    private constructor(
        result: Result<T[]>,
        pagination?: PaginationInfo
    ) {
        this._result = result;
        this.pagination = pagination;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Delegated Properties (from underlying Result)
    // ═══════════════════════════════════════════════════════════════════════════

    /** Whether the operation was successful. */
    public get success(): boolean { return this._result.success; }

    /** The result status. */
    public get status(): ResultStatus { return this._result.status; }

    /** The success data array. */
    public get data(): T[] | undefined { return this._result.data; }

    /** Error information. */
    public get error(): ErrorDetail | undefined { return this._result.error; }

    /** The reason for failure. */
    public get reason(): string | undefined { return this._result.reason; }

    /** Correlation ID for tracing. */
    public get correlationId(): string | undefined { return this._result.correlationId; }

    /** Timestamp when created. */
    public get timestamp(): number { return this._result.timestamp; }

    /** Checks if successful. */
    public get isSuccess(): boolean { return this._result.isSuccess; }

    /** Checks if not successful. */
    public get isNotSuccess(): boolean { return this._result.isNotSuccess; }

    /** Checks if has data. */
    public get hasData(): boolean { return this._result.hasData; }

    /** Number of items in current page. */
    public get count(): number { return this._result.data?.length ?? 0; }

    /** Whether the result is empty (no items). */
    public get isEmpty(): boolean { return this.count === 0; }

    // ═══════════════════════════════════════════════════════════════════════════
    // Static Factory Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Creates a successful paged result.
     *
     * @param data - Array of items.
     * @param pagination - Pagination metadata.
     * @param correlationId - Optional correlation ID.
     * @returns New successful PagedResult.
     */
    public static ok<T>(
        data: T[],
        pagination: PaginationInfo,
        correlationId?: string
    ): PagedResult<T> {
        return new PagedResult<T>(
            Result.ok(data, correlationId),
            pagination
        );
    }

    /**
     * Creates a successful paged result with calculated pagination.
     *
     * @param data - Array of items.
     * @param page - Current page number (1-indexed).
     * @param pageSize - Items per page.
     * @param totalItems - Total items across all pages.
     * @param correlationId - Optional correlation ID.
     * @returns New successful PagedResult with calculated pagination.
     */
    public static okWithPagination<T>(
        data: T[],
        page: number,
        pageSize: number,
        totalItems: number,
        correlationId?: string
    ): PagedResult<T> {
        const totalPages = Math.ceil(totalItems / pageSize);
        const pagination: PaginationInfo = {
            page,
            pageSize,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        };
        return PagedResult.ok(data, pagination, correlationId);
    }

    /**
     * Creates an empty successful paged result.
     *
     * @param page - Current page number.
     * @param pageSize - Items per page.
     * @param correlationId - Optional correlation ID.
     * @returns Empty PagedResult.
     */
    public static empty<T>(
        page: number = 1,
        pageSize: number = 10,
        correlationId?: string
    ): PagedResult<T> {
        return PagedResult.okWithPagination<T>([], page, pageSize, 0, correlationId);
    }

    /**
     * Creates a failed paged result.
     *
     * @param error - Error details.
     * @param status - Result status.
     * @returns New failed PagedResult.
     */
    public static fail<T>(
        error: ErrorDetail,
        status: ResultStatus = ResultStatus.FAILURE
    ): PagedResult<T> {
        return new PagedResult<T>(
            Result.fail<T[]>(error, status),
            undefined
        );
    }

    /**
     * Creates a PagedResult from an existing Result<T[]>.
     *
     * @param result - Existing array result.
     * @param pagination - Pagination metadata.
     * @returns New PagedResult wrapping the result.
     */
    public static fromResult<T>(
        result: Result<T[]>,
        pagination?: PaginationInfo
    ): PagedResult<T> {
        return new PagedResult<T>(result, pagination);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Instance Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the data array or throws.
     *
     * @returns Data array.
     * @throws ResultException if not successful.
     */
    public getOrThrow(): T[] {
        return this._result.getOrThrow();
    }

    /**
     * Gets the data or a default value.
     *
     * @param defaultValue - Default array.
     * @returns Data or default.
     */
    public getOrDefault(defaultValue: T[]): T[] {
        return this._result.getOrDefault(defaultValue);
    }

    /**
     * Gets the data or empty array.
     *
     * @returns Data or empty array.
     */
    public getOrEmpty(): T[] {
        return this._result.getOrDefault([]);
    }

    /**
     * Maps items to a new type.
     *
     * @param mapper - Transformation function.
     * @returns New PagedResult with mapped items.
     */
    public map<U>(mapper: (item: T) => U): PagedResult<U> {
        if (this.isSuccess && this.data) {
            const mappedData = this.data.map(mapper);
            return PagedResult.ok(mappedData, this.pagination!, this.correlationId);
        }
        return PagedResult.fail<U>(this.error!, this.status);
    }

    /**
     * Filters items.
     *
     * @param predicate - Filter function.
     * @returns New PagedResult with filtered items.
     *
     * @remarks
     * Note: This affects the current page only, not total counts.
     */
    public filter(predicate: (item: T) => boolean): PagedResult<T> {
        if (this.isSuccess && this.data) {
            const filteredData = this.data.filter(predicate);
            // Keep original pagination since we're filtering client-side
            return new PagedResult<T>(
                Result.ok(filteredData, this.correlationId),
                this.pagination
            );
        }
        return this;
    }

    /**
     * Gets the underlying Result.
     *
     * @returns The wrapped Result<T[]>.
     */
    public toResult(): Result<T[]> {
        return this._result;
    }

    /**
     * Converts to void Result (strips data).
     *
     * @returns Result without data.
     */
    public toVoid(): Result<void> {
        return this._result.toVoid();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Serialization
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Serializes to JSON including pagination.
     *
     * @returns JSON representation.
     */
    public toJSON(): PagedResultJSON<T> {
        return {
            ...this._result.toJSON(),
            pagination: this.pagination
        };
    }

    /**
     * Creates from JSON.
     *
     * @param json - JSON representation.
     * @returns PagedResult instance.
     */
    public static fromJSON<T>(json: PagedResultJSON<T>): PagedResult<T> {
        if (json.success && json.data !== undefined) {
            return PagedResult.ok(json.data, json.pagination!, json.correlationId);
        }
        if (json.error) {
            return PagedResult.fail<T>(json.error, json.status as ResultStatus);
        }
        return PagedResult.fail<T>({
            code: 'UNKNOWN',
            message: 'Invalid result JSON',
            timestamp: Date.now()
        });
    }

    /**
     * String representation.
     */
    public toString(): string {
        if (this.isSuccess) {
            return `PagedResult: ${this.count} items (page ${this.pagination?.page ?? 1} of ${this.pagination?.totalPages ?? 1})`;
        }
        return `PagedResult: ${this.status} - ${this.reason}`;
    }
}
