/**
 * @fileoverview Concurrent Cache Configuration
 * @module Common/helpers/cache/CacheConfig
 *
 * Configuration interface for ConcurrentCache instances.
 * Provides type-safe configuration options with defaults.
 */

import {
    DEFAULT_CACHE_TTL_MS,
    DEFAULT_MAX_ENTRIES,
    DEFAULT_CLEANUP_INTERVAL_MS,
    NO_EXPIRATION_TTL,
    NO_MAX_ENTRIES
} from './CacheConstants';

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Configuration Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration options for ConcurrentCache.
 */
export interface CacheConfig {
    /**
     * Default TTL for entries in milliseconds.
     * Set to -1 for no expiration.
     * @default 300000 (5 minutes)
     */
    defaultTtlMs?: number;

    /**
     * Maximum number of entries in the cache.
     * When exceeded, oldest entries are evicted.
     * Set to -1 for unlimited.
     * @default 1000
     */
    maxEntries?: number;

    /**
     * Interval for automatic cleanup of expired entries.
     * Set to -1 to disable automatic cleanup.
     * @default 60000 (1 minute)
     */
    cleanupIntervalMs?: number;

    /**
     * Whether to track cache statistics.
     * @default true
     */
    trackStats?: boolean;

    /**
     * Optional name for logging purposes.
     */
    name?: string;
}

/**
 * Default cache configuration.
 */
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
    defaultTtlMs: DEFAULT_CACHE_TTL_MS,
    maxEntries: DEFAULT_MAX_ENTRIES,
    cleanupIntervalMs: DEFAULT_CLEANUP_INTERVAL_MS,
    trackStats: true,
    name: 'ConcurrentCache'
};

/**
 * Merges user config with defaults.
 *
 * @param config - User configuration.
 * @returns Complete configuration with defaults applied.
 */
export function mergeCacheConfig(config?: CacheConfig): Required<CacheConfig> {
    return { ...DEFAULT_CACHE_CONFIG, ...config };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Statistics Interface
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cache runtime statistics.
 */
export interface CacheStats {
    /** Current number of entries in the cache. */
    size: number;
    /** Maximum number of entries allowed. */
    maxEntries: number;
    /** Total number of cache hits. */
    hits: number;
    /** Total number of cache misses. */
    misses: number;
    /** Cache hit ratio (0-1). */
    hitRatio: number;
    /** Total number of entries evicted. */
    evictions: number;
    /** Total number of entries expired. */
    expirations: number;
    /** Cache name. */
    name: string;
}
