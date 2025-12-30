/**
 * @fileoverview Cache Module Barrel Export
 * @module Common/helpers/cache
 *
 * Centralized exports for cache infrastructure.
 * Provides thread-safe (async-safe) caching with TTL and statistics.
 */

// Constants
export {
    DEFAULT_CACHE_TTL_MS,
    MIN_CACHE_TTL_MS,
    MAX_CACHE_TTL_MS,
    NO_EXPIRATION_TTL,
    DEFAULT_MAX_ENTRIES,
    MIN_MAX_ENTRIES,
    MAX_MAX_ENTRIES,
    NO_MAX_ENTRIES,
    DEFAULT_CLEANUP_INTERVAL_MS,
    MIN_CLEANUP_INTERVAL_MS,
    CLEANUP_BATCH_SIZE,
    MAX_PENDING_PROMISE_WAIT_MS,
    FAILED_PROMISE_REMOVAL_DELAY_MS,
    STATS_LOG_INTERVAL_MS
} from './CacheConstants';

// Cache entry wrapper
export {
    CacheEntry,
    CacheEntryPriority,
    type CacheEntryOptions,
    createPermanentEntry,
    createTimedEntry,
    createLowPriorityEntry
} from './CacheEntry';

// Configuration
export {
    type CacheConfig,
    type CacheStats,
    DEFAULT_CACHE_CONFIG,
    mergeCacheConfig
} from './CacheConfig';

// Main cache class
export {
    ConcurrentCache,
    type CacheFactory,
    type AsyncCacheFactory,
    type CachePredicate
} from './ConcurrentCache';
