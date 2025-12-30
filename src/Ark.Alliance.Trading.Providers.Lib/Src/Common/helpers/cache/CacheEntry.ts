/**
 * @fileoverview Cache Entry Wrapper Class
 * @module Common/helpers/cache/CacheEntry
 *
 * Wrapper class for cached values with timestamp and TTL tracking.
 * Inspired by C# TimedObject pattern for cache entry management.
 *
 * @remarks
 * Each cache entry stores:
 * - The cached value
 * - Creation timestamp for TTL calculations
 * - Access timestamp for LRU eviction
 * - Optional custom TTL override
 *
 * @see C# TimedObject pattern from Cache/_MemoryRepositoryBase.cs
 */

import { NO_EXPIRATION_TTL } from './CacheConstants';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for cache entry.
 */
export interface CacheEntryOptions {
    /**
     * Time-to-live in milliseconds.
     * Set to -1 for no expiration.
     */
    ttlMs?: number;

    /**
     * Priority for eviction (higher = less likely to be evicted).
     */
    priority?: CacheEntryPriority;
}

/**
 * Priority levels for cache entry eviction.
 */
export enum CacheEntryPriority {
    /** Entry can be evicted at any time. */
    LOW = 0,
    /** Default priority. */
    NORMAL = 1,
    /** Entry should be kept longer. */
    HIGH = 2,
    /** Entry should never be evicted (except on explicit removal). */
    NEVER_REMOVE = 3
}

// ═══════════════════════════════════════════════════════════════════════════════
// CacheEntry Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Wrapper class for cached values with TTL and access tracking.
 *
 * @template T - Type of the cached value.
 *
 * @example
 * ```typescript
 * const entry = new CacheEntry('data', { ttlMs: 60000 });
 *
 * if (!entry.isExpired) {
 *     const data = entry.value;
 *     console.log(`Entry age: ${entry.ageMs}ms`);
 * }
 * ```
 */
export class CacheEntry<T> {
    /**
     * The cached value.
     * @private
     */
    private readonly _value: T;

    /**
     * Timestamp when the entry was created.
     * @private
     */
    private readonly _createdAt: number;

    /**
     * Timestamp when the entry was last accessed.
     * @private
     */
    private _lastAccessedAt: number;

    /**
     * Time-to-live in milliseconds.
     * @private
     */
    private readonly _ttlMs: number;

    /**
     * Eviction priority.
     * @private
     */
    private readonly _priority: CacheEntryPriority;

    /**
     * Number of times this entry has been accessed.
     * @private
     */
    private _accessCount: number = 0;

    /**
     * Creates a new CacheEntry.
     *
     * @param value - The value to cache.
     * @param options - Optional configuration.
     */
    constructor(value: T, options?: CacheEntryOptions) {
        this._value = value;
        this._createdAt = Date.now();
        this._lastAccessedAt = this._createdAt;
        this._ttlMs = options?.ttlMs ?? NO_EXPIRATION_TTL;
        this._priority = options?.priority ?? CacheEntryPriority.NORMAL;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Properties
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets the cached value and updates access timestamp.
     */
    public get value(): T {
        this._lastAccessedAt = Date.now();
        this._accessCount++;
        return this._value;
    }

    /**
     * Gets the cached value without updating access timestamp.
     * Use for read-only inspection.
     */
    public get valueWithoutUpdate(): T {
        return this._value;
    }

    /**
     * Timestamp when the entry was created (Unix ms).
     */
    public get createdAt(): number {
        return this._createdAt;
    }

    /**
     * Timestamp when the entry was last accessed (Unix ms).
     */
    public get lastAccessedAt(): number {
        return this._lastAccessedAt;
    }

    /**
     * Time-to-live in milliseconds (-1 for no expiration).
     */
    public get ttlMs(): number {
        return this._ttlMs;
    }

    /**
     * Eviction priority.
     */
    public get priority(): CacheEntryPriority {
        return this._priority;
    }

    /**
     * Number of times this entry has been accessed.
     */
    public get accessCount(): number {
        return this._accessCount;
    }

    /**
     * Age of the entry in milliseconds.
     */
    public get ageMs(): number {
        return Date.now() - this._createdAt;
    }

    /**
     * Time since last access in milliseconds.
     */
    public get idleMs(): number {
        return Date.now() - this._lastAccessedAt;
    }

    /**
     * Whether the entry has expired based on TTL.
     */
    public get isExpired(): boolean {
        if (this._ttlMs === NO_EXPIRATION_TTL) {
            return false;
        }
        return this.ageMs > this._ttlMs;
    }

    /**
     * Time remaining until expiration in milliseconds.
     * Returns 0 if already expired, -1 if no expiration.
     */
    public get remainingTtlMs(): number {
        if (this._ttlMs === NO_EXPIRATION_TTL) {
            return NO_EXPIRATION_TTL;
        }
        const remaining = this._ttlMs - this.ageMs;
        return remaining > 0 ? remaining : 0;
    }

    /**
     * Whether this entry should never be evicted.
     */
    public get isNeverRemove(): boolean {
        return this._priority === CacheEntryPriority.NEVER_REMOVE;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Checks if value is valid for given TTL.
     *
     * @param validityMs - Custom validity to check against.
     * @returns True if entry is still valid.
     */
    public isValidFor(validityMs: number): boolean {
        return this.ageMs <= validityMs;
    }

    /**
     * Manually marks the entry as accessed.
     * Updates the last accessed timestamp.
     */
    public touch(): void {
        this._lastAccessedAt = Date.now();
        this._accessCount++;
    }

    /**
     * Creates a copy of this entry with a new value.
     *
     * @param newValue - The new value.
     * @returns New CacheEntry with same options.
     */
    public withValue<U>(newValue: U): CacheEntry<U> {
        return new CacheEntry(newValue, {
            ttlMs: this._ttlMs,
            priority: this._priority
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a cache entry that never expires.
 *
 * @template T - Type of the value.
 * @param value - The value to cache.
 * @returns CacheEntry with no expiration.
 */
export function createPermanentEntry<T>(value: T): CacheEntry<T> {
    return new CacheEntry(value, {
        ttlMs: NO_EXPIRATION_TTL,
        priority: CacheEntryPriority.HIGH
    });
}

/**
 * Creates a cache entry with specified TTL.
 *
 * @template T - Type of the value.
 * @param value - The value to cache.
 * @param ttlMs - Time-to-live in milliseconds.
 * @returns CacheEntry with specified TTL.
 */
export function createTimedEntry<T>(value: T, ttlMs: number): CacheEntry<T> {
    return new CacheEntry(value, { ttlMs });
}

/**
 * Creates a low-priority cache entry.
 *
 * @template T - Type of the value.
 * @param value - The value to cache.
 * @param ttlMs - Time-to-live in milliseconds.
 * @returns CacheEntry with low priority.
 */
export function createLowPriorityEntry<T>(value: T, ttlMs?: number): CacheEntry<T> {
    return new CacheEntry(value, {
        ttlMs,
        priority: CacheEntryPriority.LOW
    });
}
