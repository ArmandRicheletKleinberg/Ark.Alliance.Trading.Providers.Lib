/**
 * @fileoverview Binance API Constants
 * @module shared/constants/BinanceConstants
 *
 * Centralized constants for the Binance provider library.
 * Contains all magic numbers, limits, timeouts, and configuration values
 * to ensure consistency across the codebase.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Timeout Constants (in milliseconds)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default timeout for REST API requests.
 */
export const REST_REQUEST_TIMEOUT_MS = 30000;

/**
 * Default timeout for WebSocket API requests.
 */
export const WS_REQUEST_TIMEOUT_MS = 10000;

/**
 * Interval for WebSocket ping/pong keep-alive.
 */
export const WS_PING_INTERVAL_MS = 30000;

/**
 * Interval for User Data Stream listen key keep-alive.
 */
export const LISTEN_KEY_KEEPALIVE_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Interval for server time synchronization.
 */
export const SERVER_TIME_SYNC_INTERVAL_MS = 60000;

// ═══════════════════════════════════════════════════════════════════════════════
// Reconnection Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum number of reconnection attempts before reset.
 */
export const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Maximum reconnect attempts for User Data Stream (higher for critical connection).
 */
export const MAX_RECONNECT_ATTEMPTS_USER_DATA = 100;

/**
 * Initial delay before first reconnection attempt.
 */
export const INITIAL_RECONNECT_DELAY_MS = 1000;

/**
 * Maximum delay between reconnection attempts (cap).
 */
export const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * jitter factor for reconnection delays (±25%).
 */
export const RECONNECT_JITTER_FACTOR = 0.25;

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limit Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default request weight limit per minute.
 */
export const DEFAULT_REQUEST_WEIGHT_LIMIT = 2400;

/**
 * Default order count limit per 10 seconds.
 */
export const DEFAULT_ORDER_COUNT_LIMIT_10S = 300;

/**
 * Default order count limit per minute.
 */
export const DEFAULT_ORDER_COUNT_LIMIT_1M = 1200;

// ═══════════════════════════════════════════════════════════════════════════════
// API Endpoint Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Mainnet REST API base URL for USD-M Futures.
 */
export const MAINNET_REST_URL_USDM = 'https://fapi.binance.com';

/**
 * Testnet REST API base URL for USD-M Futures.
 */
export const TESTNET_REST_URL_USDM = 'https://testnet.binancefuture.com';

/**
 * Mainnet WebSocket Market Data stream URL.
 */
export const MAINNET_WS_MARKET_URL = 'wss://fstream.binance.com';

/**
 * Testnet WebSocket Market Data stream URL.
 */
export const TESTNET_WS_MARKET_URL = 'wss://stream.binancefuture.com';

/**
 * Mainnet WebSocket API URL for orders.
 */
export const MAINNET_WS_API_URL = 'wss://ws-fapi.binance.com/ws-fapi/v1';

/**
 * Testnet WebSocket API URL for orders.
 */
export const TESTNET_WS_API_URL = 'wss://testnet.binancefuture.com/ws-fapi/v1';

/**
 * Mainnet Spot API base URL (for SAPI endpoints).
 */
export const MAINNET_SPOT_API_URL = 'api.binance.com';

// ═══════════════════════════════════════════════════════════════════════════════
// Precision Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maximum decimal places for price formatting.
 */
export const MAX_PRICE_PRECISION = 8;

/**
 * Maximum decimal places for quantity formatting.
 */
export const MAX_QUANTITY_PRECISION = 8;

/**
 * Default price precision when symbol info is unavailable.
 */
export const DEFAULT_PRICE_PRECISION = 2;

/**
 * Default quantity precision when symbol info is unavailable.
 */
export const DEFAULT_QUANTITY_PRECISION = 3;

// ═══════════════════════════════════════════════════════════════════════════════
// Trading Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum leverage allowed.
 */
export const MIN_LEVERAGE = 1;

/**
 * Maximum leverage allowed.
 */
export const MAX_LEVERAGE = 125;

/**
 * Default leverage for new positions.
 */
export const DEFAULT_LEVERAGE = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default refresh interval for account balance cache.
 */
export const ACCOUNT_CACHE_REFRESH_INTERVAL_MS = 5000;

/**
 * Maximum samples to keep in latency tracker.
 */
export const LATENCY_TRACKER_MAX_SAMPLES = 100;

/**
 * Default order cache size limit.
 */
export const ORDER_CACHE_MAX_SIZE = 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// Resilience Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default retry attempts for resilience policy.
 */
export const DEFAULT_RETRY_ATTEMPTS = 5;

/**
 * Base delay for exponential backoff retries.
 */
export const RETRY_BASE_DELAY_MS = 200;

/**
 * Maximum delay for exponential backoff retries.
 */
export const RETRY_MAX_DELAY_MS = 30000;
