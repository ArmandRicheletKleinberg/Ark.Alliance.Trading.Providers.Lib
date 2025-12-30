/**
 * @fileoverview Abstract Base Domain Cache
 * @module domain/cache/Base/BaseDomainCache
 *
 * Provides a foundation for domain-specific caches by wrapping ConcurrentCache.
 * Domain caches should extend this class to leverage TTL, statistics, and
 * automatic cleanup while adding their domain-specific logic.
 *
 * @remarks
 * This class follows the composition pattern - it wraps ConcurrentCache
 * rather than extending it, allowing domain caches to expose only the
 * methods relevant to their domain.
 *
 * @example
 * ```typescript
 * class AccountCache extends BaseDomainCache<string, AccountCacheEntry> {
 *     constructor() {
 *         super({ name: 'AccountCache', defaultTtlMs: 5000 });
 *     }
 *
 *     update(instanceKey: string, balance: AccountBalance): void {
 *         this.cache.set(instanceKey, { balance, lastFetch: new Date() });
 *     }
 * }
 * ```
 */

import { ConcurrentCache, CacheFactory, AsyncCacheFactory } from '../../../../Common/helpers/cache/ConcurrentCache';
import { CacheConfig, CacheStats } from '../../../../Common/helpers/cache/CacheConfig';
import { CacheEntryOptions } from '../../../../Common/helpers/cache/CacheEntry';

/**
 * Abstract base class for domain-specific caches.
 *
 * @template K - Key type for cache entries.
 * @template V - Value type for cache entries.
 *
 * @remarks
 * Subclasses should:
 * 1. Call super() with appropriate CacheConfig
 * 2. Expose domain-specific methods (update, get, getAll, etc.)
 * 3. Delegate storage operations to this.cache
 */
export abstract class BaseDomainCache<K, V> {
    /**
     * The underlying ConcurrentCache instance.
     * @protected
     */
    protected readonly cache: ConcurrentCache<K, V>;

    /**
     * Cache name for logging and identification.
     * @protected
     */
    protected readonly cacheName: string;

    /**
     * Creates a new BaseDomainCache instance.
     *
     * @param config - Cache configuration including name, TTL, max entries.
     */
    protected constructor(config?: CacheConfig) {
        this.cache = new ConcurrentCache<K, V>(config);
        this.cacheName = config?.name ?? 'DomainCache';
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Core Operations (delegated to ConcurrentCache)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Gets a value from the cache.
     *
     * @param key - The key to look up.
     * @returns The cached value or undefined.
     */
    protected get(key: K): V | undefined {
        return this.cache.get(key);
    }

    /**
     * Sets a value in the cache.
     *
     * @param key - The key.
     * @param value - The value to cache.
     * @param options - Optional entry configuration.
     */
    protected set(key: K, value: V, options?: CacheEntryOptions): void {
        this.cache.set(key, value, options);
    }

    /**
     * Gets a value or adds it using the factory if not present.
     *
     * @param key - The key.
     * @param factory - Factory function to create value if not found.
     * @param options - Optional entry configuration.
     * @returns The existing or newly created value.
     */
    protected getOrAdd(key: K, factory: CacheFactory<K, V>, options?: CacheEntryOptions): V {
        return this.cache.getOrAdd(key, factory, options);
    }

    /**
     * Gets a value or adds it using an async factory if not present.
     *
     * @param key - The key.
     * @param factory - Async factory function.
     * @param options - Optional entry configuration.
     * @returns Promise resolving to the value.
     */
    protected async getOrAddAsync(
        key: K,
        factory: AsyncCacheFactory<K, V>,
        options?: CacheEntryOptions
    ): Promise<V> {
        return this.cache.getOrAddAsync(key, factory, options);
    }

    /**
     * Removes an entry from the cache.
     *
     * @param key - The key to remove.
     * @returns True if the key was found and removed.
     */
    protected remove(key: K): boolean {
        return this.cache.remove(key);
    }

    /**
     * Checks if a key exists in the cache.
     *
     * @param key - The key to check.
     * @returns True if key exists and is not expired.
     */
    protected has(key: K): boolean {
        return this.cache.has(key);
    }

    /**
     * Gets all keys from the cache.
     *
     * @returns Array of cache keys.
     */
    protected keys(): K[] {
        return this.cache.keys();
    }

    /**
     * Gets all values from the cache.
     *
     * @returns Array of cached values.
     */
    protected getAll(): V[] {
        return this.cache.getAll();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Public Lifecycle & Statistics
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Current number of entries in the cache.
     */
    public get size(): number {
        return this.cache.size;
    }

    /**
     * Whether the cache is empty.
     */
    public get isEmpty(): boolean {
        return this.cache.isEmpty;
    }

    /**
     * Gets cache statistics including hits, misses, and evictions.
     *
     * @returns Cache statistics object.
     */
    public getStats(): CacheStats {
        return this.cache.getStats();
    }

    /**
     * Resets cache statistics.
     */
    public resetStats(): void {
        this.cache.resetStats();
    }

    /**
     * Clears all entries from the cache.
     */
    public clear(): void {
        this.cache.clear();
    }

    /**
     * Disposes the cache and stops cleanup timers.
     * Should be called when the owning service stops.
     */
    public dispose(): void {
        this.cache.dispose();
    }
}
