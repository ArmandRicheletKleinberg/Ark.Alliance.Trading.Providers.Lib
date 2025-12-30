/**
 * @fileoverview Common Provider Constants
 * @module Common/constants/ProviderConstants
 *
 * Centralized constants shared across all trading providers (Binance, Deribit, etc.).
 * Provider-specific constants should remain in their respective constant files.
 *
 * @remarks
 * Following DDD principles - common defaults are defined here to ensure
 * consistent behavior across providers while allowing provider-specific overrides.
 */

import { MS_PER_MINUTE, MS_PER_HOUR } from '../helpers/TimeUtils';

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Connection Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default WebSocket ping interval in milliseconds.
 * Used to keep connections alive.
 */
export const DEFAULT_WS_PING_INTERVAL_MS = 30_000;

/**
 * Default WebSocket request timeout in milliseconds.
 */
export const DEFAULT_WS_REQUEST_TIMEOUT_MS = 10_000;

// ═══════════════════════════════════════════════════════════════════════════════
// Reconnection Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default initial delay before first reconnection attempt.
 */
export const DEFAULT_INITIAL_RECONNECT_DELAY_MS = 1_000;

/**
 * Default maximum delay between reconnection attempts (cap).
 */
export const DEFAULT_MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Default maximum number of reconnection attempts.
 */
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Default jitter factor for reconnection delays (±25%).
 */
export const DEFAULT_RECONNECT_JITTER_FACTOR = 0.25;

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Timing Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default order cache cleanup interval (10 minutes).
 */
export const DEFAULT_ORDER_CACHE_CLEANUP_INTERVAL_MS = 10 * MS_PER_MINUTE;

/**
 * Default position cache cleanup interval (5 minutes).
 */
export const DEFAULT_POSITION_CACHE_CLEANUP_INTERVAL_MS = 5 * MS_PER_MINUTE;

/**
 * Default completed order TTL (1 hour).
 * Completed orders are kept in cache for reference before cleanup.
 */
export const DEFAULT_COMPLETED_ORDER_TTL_MS = MS_PER_HOUR;

/**
 * Default closed position TTL (5 minutes).
 * Closed positions are kept briefly for reference.
 */
export const DEFAULT_CLOSED_POSITION_TTL_MS = 5 * MS_PER_MINUTE;

/**
 * Default stale data threshold (1 minute).
 * Data older than this may be considered stale for reconciliation.
 */
export const DEFAULT_STALE_THRESHOLD_MS = MS_PER_MINUTE;

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Capacity Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default maximum entries per cache instance.
 */
export const DEFAULT_CACHE_MAX_ENTRIES = 1_000;

/**
 * Default maximum orders per symbol in cache.
 */
export const DEFAULT_MAX_ORDERS_PER_SYMBOL = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// Token/Authentication Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default token refresh buffer (5 minutes before expiry).
 */
export const DEFAULT_TOKEN_REFRESH_BUFFER_MS = 5 * MS_PER_MINUTE;

// ═══════════════════════════════════════════════════════════════════════════════
// Resilience Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default retry attempts for resilience policies.
 */
export const DEFAULT_RETRY_ATTEMPTS = 5;

/**
 * Default base delay for exponential backoff retries.
 */
export const DEFAULT_RETRY_BASE_DELAY_MS = 200;

/**
 * Default maximum delay for exponential backoff retries.
 */
export const DEFAULT_RETRY_MAX_DELAY_MS = 30_000;

// ═══════════════════════════════════════════════════════════════════════════════
// Latency/Tracking Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default maximum samples to keep in latency tracker.
 */
export const DEFAULT_LATENCY_TRACKER_MAX_SAMPLES = 100;
