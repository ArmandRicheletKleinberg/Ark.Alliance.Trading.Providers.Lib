/**
 * @fileoverview Kraken Futures API Constants
 * @module Kraken/shared/constants/KrakenConstants
 *
 * Centralized constants for Kraken Futures API integration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Production REST API base URL.
 */
export const MAINNET_REST_URL = 'https://futures.kraken.com';

/**
 * Testnet REST API base URL.
 */
export const TESTNET_REST_URL = 'https://demo-futures.kraken.com';

/**
 * Production WebSocket URL.
 */
export const MAINNET_WS_URL = 'wss://futures.kraken.com/ws/v1';

/**
 * Testnet WebSocket URL.
 */
export const TESTNET_WS_URL = 'wss://demo-futures.kraken.com/ws/v1';

/**
 * REST API path prefix.
 */
export const API_PATH_PREFIX = '/derivatives/api/v3';

// ═══════════════════════════════════════════════════════════════════════════════
// Timing Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WebSocket ping interval in milliseconds.
 */
export const WS_PING_INTERVAL_MS = 30000;

/**
 * Default request timeout in milliseconds.
 */
export const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Initial reconnect delay in milliseconds.
 */
export const INITIAL_RECONNECT_DELAY_MS = 1000;

/**
 * Maximum reconnect delay in milliseconds.
 */
export const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Maximum reconnect attempts.
 */
export const MAX_RECONNECT_ATTEMPTS = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// REST API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

export const ENDPOINTS = {
    // Public Market Data
    INSTRUMENTS: '/instruments',
    TICKERS: '/tickers',
    ORDERBOOK: '/orderbook',
    HISTORY: '/history',
    FEESCHEDULES: '/feeschedules',
    FEESCHEDULE_VOLUMES: '/feeschedules/volumes',

    // Private Account
    ACCOUNTS: '/accounts',
    OPEN_POSITIONS: '/openpositions',
    NOTIFICATIONS: '/notifications',
    ACCOUNT_LOG: '/account-log',

    // Private Trading
    SEND_ORDER: '/sendorder',
    EDIT_ORDER: '/editorder',
    CANCEL_ORDER: '/cancelorder',
    CANCEL_ALL_ORDERS: '/cancelallorders',
    CANCEL_ALL_ORDERS_AFTER: '/cancelallordersafter',
    BATCH_ORDER: '/batchorder',
    OPEN_ORDERS: '/openorders',
    ORDERS_STATUS: '/orders/status',

    // Private Transfers
    TRANSFER: '/transfer',
    TRANSFERS: '/transfers',
    WITHDRAWAL: '/withdrawal',

    // Server Info
    SERVER_TIME: '/time'
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Feeds (Public)
// ═══════════════════════════════════════════════════════════════════════════════

export const WS_FEEDS = {
    // Public feeds
    BOOK: 'book',
    TRADE: 'trade',
    TICKER: 'ticker',
    TICKER_LITE: 'ticker_lite',
    HEARTBEAT: 'heartbeat',

    // Private feeds (require authentication)
    FILLS: 'fills',
    OPEN_ORDERS: 'open_orders',
    OPEN_POSITIONS: 'open_positions',
    ACCOUNT: 'account',
    NOTIFICATIONS: 'notifications'
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Message Types
// ═══════════════════════════════════════════════════════════════════════════════

export const WS_EVENTS = {
    SUBSCRIBE: 'subscribe',
    UNSUBSCRIBE: 'unsubscribe',
    CHALLENGE: 'challenge',
    SUBSCRIBED: 'subscribed',
    UNSUBSCRIBED: 'unsubscribed',
    INFO: 'info',
    ERROR: 'error'
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Supported Products
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common Kraken Futures perpetual contract symbols.
 */
export const PERPETUALS = {
    BTC_USD: 'PI_XBTUSD',
    ETH_USD: 'PI_ETHUSD',
    XRP_USD: 'PI_XRPUSD',
    LTC_USD: 'PI_LTCUSD',
    BCH_USD: 'PI_BCHUSD',
    SOL_USD: 'PI_SOLUSD'
} as const;

export type KrakenPerpetual = (typeof PERPETUALS)[keyof typeof PERPETUALS];
