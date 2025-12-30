/**
 * @fileoverview Cache Module Constants
 * @module Common/helpers/cache/CacheConstants
 *
 * Centralized constants for cache configuration to avoid hardcoded values.
 * All cache-related magic numbers should be defined here.
 *
 * @remarks
 * Following DDD principles - constants are kept separate from implementation
 * for maintainability and configuration clarity.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Time-to-Live Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default TTL for cache entries in milliseconds.
 * Entries expire after 5 minutes if no custom TTL is specified.
 */
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Minimum allowed TTL in milliseconds.
 * Prevents setting unreasonably short expiration times.
 */
export const MIN_CACHE_TTL_MS = 100;

/**
 * Maximum allowed TTL in milliseconds.
 * Prevents setting excessively long expiration times (1 day).
 */
export const MAX_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * TTL value indicating no expiration.
 * Use -1 to indicate the entry never expires.
 */
export const NO_EXPIRATION_TTL = -1;

// ═══════════════════════════════════════════════════════════════════════════════
// Capacity Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default maximum number of entries in the cache.
 * Limits memory usage by evicting oldest entries when exceeded.
 */
export const DEFAULT_MAX_ENTRIES = 1000;

/**
 * Minimum allowed maximum entries.
 */
export const MIN_MAX_ENTRIES = 1;

/**
 * Maximum allowed maximum entries.
 * Prevents excessive memory usage (100,000 entries).
 */
export const MAX_MAX_ENTRIES = 100000;

/**
 * Value indicating no maximum entries limit.
 */
export const NO_MAX_ENTRIES = -1;

// ═══════════════════════════════════════════════════════════════════════════════
// Cleanup Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default interval for automatic cleanup of expired entries in milliseconds.
 * Runs every 60 seconds.
 */
export const DEFAULT_CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Minimum cleanup interval in milliseconds.
 */
export const MIN_CLEANUP_INTERVAL_MS = 1000;

/**
 * Batch size for cleanup operations.
 * Number of entries to check in each cleanup iteration.
 */
export const CLEANUP_BATCH_SIZE = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// Promise Cache Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum time to wait for a pending promise in getOrAddAsync.
 * Prevents indefinite waiting on stuck promises.
 */
export const MAX_PENDING_PROMISE_WAIT_MS = 30000;

/**
 * Time after which a rejected promise is removed from cache.
 * Allows retry after failure.
 */
export const FAILED_PROMISE_REMOVAL_DELAY_MS = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// Statistics Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Interval for logging cache statistics in milliseconds.
 */
export const STATS_LOG_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
