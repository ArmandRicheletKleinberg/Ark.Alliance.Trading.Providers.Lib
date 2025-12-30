/**
 * @fileoverview Concurrent Cache Class
 * @module Common/helpers/cache/ConcurrentCache
 *
 * Thread-safe (async-safe) cache with TTL, GetOrAdd pattern, and statistics.
 * Inspired by C# ConcurrentDictionary and MemoryRepositoryBase patterns.
 *
 * @remarks
 * Key features:
 * - **GetOrAdd pattern**: Atomic get-or-compute operations
 * - **Promise caching**: Prevents duplicate async operations
 * - **TTL expiration**: Automatic invalidation of stale entries
 * - **LRU eviction**: Removes least-recently-used entries when full
 * - **Statistics**: Hit/miss ratio tracking
 *
 * @see https://docs.microsoft.com/en-us/dotnet/api/system.collections.concurrent.concurrentdictionary
 */

import { CacheEntry, CacheEntryOptions, CacheEntryPriority } from './CacheEntry';
import { CacheConfig, CacheStats, mergeCacheConfig } from './CacheConfig';
import {
    NO_EXPIRATION_TTL,
    NO_MAX_ENTRIES,
    CLEANUP_BATCH_SIZE,
    FAILED_PROMISE_REMOVAL_DELAY_MS
} from './CacheConstants';
import { logger } from '../logger';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Factory function for creating cache values.
 */
export type CacheFactory<K, V> = (key: K) => V;

/**
 * Async factory function for creating cache values.
 */
export type AsyncCacheFactory<K, V> = (key: K) => Promise<V>;

/**
 * Predicate for filtering cache entries.
 */
export type CachePredicate<K, V> = (key: K, value: V) => boolean;

// ═══════════════════════════════════════════════════════════════════════════════
// ConcurrentCache Class
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Thread-safe (async-safe) cache implementation.
 *
 * @template K - Key type.
 * @template V - Value type.
 *
 * @example
 * ```typescript
 * // Create cache with 5 minute TTL
 * const cache = new ConcurrentCache<string, UserData>({
 *     defaultTtlMs: 5 * 60 * 1000,
 *     maxEntries: 1000
 * });
 *
 * // Get or fetch user data
 * const user = await cache.getOrAddAsync('user:123', async (key) => {
 *     return await fetchUserFromDatabase(key);
 * });
 *
 * // Get statistics
 * console.log(`Hit ratio: ${cache.getStats().hitRatio}`);
 * ```
 */
export class ConcurrentCache<K, V> {
    /**
     * Internal storage map.
     * @private
     */
    private readonly _store: Map<K, CacheEntry<V>> = new Map();

    /**
     * Map of pending promises for getOrAddAsync.
     * Prevents duplicate async operations.
     * @private
     */
    private readonly _pendingPromises: Map<K, Promise<V>> = new Map();

    /**
     * Cache configuration.
     * @private
     */
    private readonly _config: Required<CacheConfig>;

    /**
     * Cleanup interval handle.
     * @private
     */
    private _cleanupInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * Statistics counters.
     * @private
     */
    private _hits: number = 0;
    private _misses: number = 0;
    private _evictions: number = 0;
    private _expirations: number = 0;

    /**
     * Creates a new ConcurrentCache instance.
     *
     * @param config - Optional configuration.
     */
    constructor(config?: CacheConfig) {
        this._config = mergeCacheConfig(config);
        this.startCleanupTimer();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Core Operations (C# CacheRepositoryBase pattern)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets a value from the cache.
     *
     * @param key - The key to look up.
     * @param defaultValue - Value to return if not found.
     * @returns The cached value or default.
     */
    public get(key: K, defaultValue?: V): V | undefined {
        const entry = this._store.get(key);

        if (!entry) {
            this._misses++;
            return defaultValue;
        }

        if (entry.isExpired) {
            this._store.delete(key);
            this._expirations++;
            this._misses++;
            return defaultValue;
        }

        this._hits++;
        return entry.value;
    }

    /**
     * Sets a value in the cache.
     *
     * @param key - The key.
     * @param value - The value to cache.
     * @param options - Optional entry configuration.
     */
    public set(key: K, value: V, options?: CacheEntryOptions): void {
        const entryOptions: CacheEntryOptions = {
            ttlMs: options?.ttlMs ?? this._config.defaultTtlMs,
            priority: options?.priority
        };

        this._store.set(key, new CacheEntry(value, entryOptions));
        this.enforceMaxEntries();
    }

    /**
     * Gets a value or adds it using the factory if not present.
     * Atomic operation - factory is called only once per key.
     *
     * @param key - The key.
     * @param factory - Factory function to create value if not found.
     * @param options - Optional entry configuration.
     * @returns The existing or newly created value.
     */
    public getOrAdd(key: K, factory: CacheFactory<K, V>, options?: CacheEntryOptions): V {
        const existing = this.get(key);
        if (existing !== undefined) {
            return existing;
        }

        const value = factory(key);
        this.set(key, value, options);
        return value;
    }

    /**
     * Gets a value or adds it using an async factory if not present.
     * The Promise is cached to prevent duplicate fetches.
     *
     * @param key - The key.
     * @param factory - Async factory function to create value if not found.
     * @param options - Optional entry configuration.
     * @returns Promise resolving to the existing or newly created value.
     *
     * @example
     * ```typescript
     * // Multiple concurrent calls for same key will share one fetch
     * const [user1, user2] = await Promise.all([
     *     cache.getOrAddAsync('user:123', fetchUser),
     *     cache.getOrAddAsync('user:123', fetchUser) // Uses same promise
     * ]);
     * ```
     */
    public async getOrAddAsync(
        key: K,
        factory: AsyncCacheFactory<K, V>,
        options?: CacheEntryOptions
    ): Promise<V> {
        // Check for existing value
        const existing = this.get(key);
        if (existing !== undefined) {
            return existing;
        }

        // Check for pending promise (prevents duplicate fetches)
        const pending = this._pendingPromises.get(key);
        if (pending) {
            return pending;
        }

        // Create and cache the promise
        const promise = this.executeFactory(key, factory, options);
        this._pendingPromises.set(key, promise);

        try {
            const value = await promise;
            return value;
        } finally {
            // Remove pending promise after completion
            this._pendingPromises.delete(key);
        }
    }

    /**
     * Executes the factory and handles errors.
     * @private
     */
    private async executeFactory(
        key: K,
        factory: AsyncCacheFactory<K, V>,
        options?: CacheEntryOptions
    ): Promise<V> {
        try {
            const value = await factory(key);
            this.set(key, value, options);
            return value;
        } catch (error) {
            // Remove pending promise on error after delay
            setTimeout(() => {
                this._pendingPromises.delete(key);
            }, FAILED_PROMISE_REMOVAL_DELAY_MS);
            throw error;
        }
    }

    /**
     * Updates an existing value or adds a new one.
     *
     * @param key - The key.
     * @param addValueFactory - Factory for new value if key doesn't exist.
     * @param updateValueFactory - Factory for updated value if key exists.
     * @param options - Optional entry configuration.
     * @returns The new or updated value.
     */
    public addOrUpdate(
        key: K,
        addValueFactory: CacheFactory<K, V>,
        updateValueFactory: (key: K, oldValue: V) => V,
        options?: CacheEntryOptions
    ): V {
        const existing = this.get(key);

        if (existing !== undefined) {
            const updated = updateValueFactory(key, existing);
            this.set(key, updated, options);
            return updated;
        }

        const value = addValueFactory(key);
        this.set(key, value, options);
        return value;
    }

    /**
     * Removes an entry from the cache.
     *
     * @param key - The key to remove.
     * @returns True if the key was found and removed.
     */
    public remove(key: K): boolean {
        return this._store.delete(key);
    }

    /**
     * Checks if a key exists in the cache (and is not expired).
     *
     * @param key - The key to check.
     * @returns True if key exists and is not expired.
     */
    public has(key: K): boolean {
        const entry = this._store.get(key);
        if (!entry) return false;

        if (entry.isExpired) {
            this._store.delete(key);
            this._expirations++;
            return false;
        }

        return true;
    }

    /**
     * Clears all entries from the cache.
     */
    public clear(): void {
        this._store.clear();
        this._pendingPromises.clear();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Collection Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets all non-expired values from the cache.
     *
     * @returns Array of cached values.
     */
    public getAll(): V[] {
        this.removeExpired();
        return Array.from(this._store.values()).map(entry => entry.valueWithoutUpdate);
    }

    /**
     * Gets all keys from the cache.
     *
     * @returns Array of cache keys.
     */
    public keys(): K[] {
        this.removeExpired();
        return Array.from(this._store.keys());
    }

    /**
     * Gets all entries matching a predicate.
     *
     * @param predicate - Filter function.
     * @returns Array of matching values.
     */
    public filter(predicate: CachePredicate<K, V>): V[] {
        const results: V[] = [];

        for (const [key, entry] of this._store) {
            if (!entry.isExpired && predicate(key, entry.valueWithoutUpdate)) {
                results.push(entry.valueWithoutUpdate);
            }
        }

        return results;
    }

    /**
     * Applies a function to all cache entries.
     *
     * @param fn - Function to apply.
     */
    public forEach(fn: (key: K, value: V) => void): void {
        for (const [key, entry] of this._store) {
            if (!entry.isExpired) {
                fn(key, entry.valueWithoutUpdate);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Properties
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Current number of entries in the cache.
     */
    public get size(): number {
        return this._store.size;
    }

    /**
     * Whether the cache is empty.
     */
    public get isEmpty(): boolean {
        return this._store.size === 0;
    }

    /**
     * Cache name for logging.
     */
    public get name(): string {
        return this._config.name;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TTL & Cleanup
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Removes all expired entries from the cache.
     *
     * @returns Number of entries removed.
     */
    public removeExpired(): number {
        let removed = 0;

        for (const [key, entry] of this._store) {
            if (entry.isExpired) {
                this._store.delete(key);
                removed++;
            }
        }

        this._expirations += removed;
        return removed;
    }

    /**
     * Sets custom TTL for an existing entry.
     *
     * @param key - The key.
     * @param ttlMs - New TTL in milliseconds.
     * @returns True if entry was found and updated.
     */
    public setTTL(key: K, ttlMs: number): boolean {
        const entry = this._store.get(key);
        if (!entry || entry.isExpired) return false;

        // Create new entry with updated TTL
        this._store.set(key, new CacheEntry(entry.valueWithoutUpdate, {
            ttlMs,
            priority: entry.priority
        }));

        return true;
    }

    /**
     * Touches an entry to reset its last accessed time.
     *
     * @param key - The key.
     * @returns True if entry was found.
     */
    public touch(key: K): boolean {
        const entry = this._store.get(key);
        if (!entry || entry.isExpired) return false;
        entry.touch();
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Statistics
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Gets cache statistics.
     *
     * @returns Cache statistics object.
     */
    public getStats(): CacheStats {
        const total = this._hits + this._misses;
        return {
            size: this._store.size,
            maxEntries: this._config.maxEntries,
            hits: this._hits,
            misses: this._misses,
            hitRatio: total > 0 ? this._hits / total : 0,
            evictions: this._evictions,
            expirations: this._expirations,
            name: this._config.name
        };
    }

    /**
     * Resets cache statistics.
     */
    public resetStats(): void {
        this._hits = 0;
        this._misses = 0;
        this._evictions = 0;
        this._expirations = 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Disposes the cache and stops cleanup timer.
     */
    public dispose(): void {
        this.stopCleanupTimer();
        this.clear();
    }

    /**
     * Starts the automatic cleanup timer.
     * @private
     */
    private startCleanupTimer(): void {
        if (this._config.cleanupIntervalMs <= 0) return;

        this._cleanupInterval = setInterval(() => {
            const removed = this.removeExpired();
            if (removed > 0) {
                logger.debug(`${this._config.name}: Removed ${removed} expired entries`);
            }
        }, this._config.cleanupIntervalMs);
    }

    /**
     * Stops the cleanup timer.
     * @private
     */
    private stopCleanupTimer(): void {
        if (this._cleanupInterval) {
            clearInterval(this._cleanupInterval);
            this._cleanupInterval = null;
        }
    }

    /**
     * Enforces maximum entries by evicting LRU entries.
     * @private
     */
    private enforceMaxEntries(): void {
        if (this._config.maxEntries === NO_MAX_ENTRIES) return;
        if (this._store.size <= this._config.maxEntries) return;

        // Get entries sorted by last accessed time (oldest first)
        const entries = Array.from(this._store.entries())
            .filter(([_, entry]) => !entry.isNeverRemove)
            .sort(([_, a], [__, b]) => a.lastAccessedAt - b.lastAccessedAt);

        // Remove oldest entries until under limit
        const toRemove = this._store.size - this._config.maxEntries;
        for (let i = 0; i < toRemove && i < entries.length; i++) {
            this._store.delete(entries[i][0]);
            this._evictions++;
        }
    }
}
