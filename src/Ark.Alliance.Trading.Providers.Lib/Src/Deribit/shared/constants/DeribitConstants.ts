/**
 * @fileoverview Deribit Constants
 * @module Deribit/shared/constants/DeribitConstants
 *
 * Centralized constants for Deribit API integration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Production WebSocket URL.
 */
export const MAINNET_WS_URL = 'wss://www.deribit.com/ws/api/v2';

/**
 * Testnet WebSocket URL.
 */
export const TESTNET_WS_URL = 'wss://test.deribit.com/ws/api/v2';

/**
 * Production REST API URL.
 */
export const MAINNET_REST_URL = 'https://www.deribit.com/api/v2';

/**
 * Testnet REST API URL.
 */
export const TESTNET_REST_URL = 'https://test.deribit.com/api/v2';

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
 * Token refresh buffer in milliseconds (refresh 5 minutes before expiry).
 */
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

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
// JSON-RPC Constants
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JSON-RPC version.
 */
export const JSONRPC_VERSION = '2.0';

// ═══════════════════════════════════════════════════════════════════════════════
// API Methods
// ═══════════════════════════════════════════════════════════════════════════════

export const METHODS = {
    // Authentication
    AUTH: 'public/auth',
    LOGOUT: 'private/logout',

    // Session Management
    SET_HEARTBEAT: 'public/set_heartbeat',
    DISABLE_HEARTBEAT: 'public/disable_heartbeat',
    ENABLE_CANCEL_ON_DISCONNECT: 'private/enable_cancel_on_disconnect',
    DISABLE_CANCEL_ON_DISCONNECT: 'private/disable_cancel_on_disconnect',
    GET_CANCEL_ON_DISCONNECT: 'private/get_cancel_on_disconnect',

    // Public Market Data
    GET_INSTRUMENTS: 'public/get_instruments',
    GET_INSTRUMENT: 'public/get_instrument',
    GET_ORDER_BOOK: 'public/get_order_book',
    TICKER: 'public/ticker',
    GET_CURRENCIES: 'public/get_currencies',
    GET_TIME: 'public/get_time',
    TEST: 'public/test',

    // Trading - Order Placement
    BUY: 'private/buy',
    SELL: 'private/sell',
    EDIT_ORDER: 'private/edit',
    CANCEL_ORDER: 'private/cancel',
    CANCEL_ALL: 'private/cancel_all',
    CANCEL_ALL_BY_INSTRUMENT: 'private/cancel_all_by_instrument',
    CANCEL_ALL_BY_CURRENCY: 'private/cancel_all_by_currency',
    CANCEL_BY_LABEL: 'private/cancel_by_label',
    CLOSE_POSITION: 'private/close_position',

    // Account
    GET_POSITION: 'private/get_position',
    GET_POSITIONS: 'private/get_positions',
    GET_ACCOUNT_SUMMARY: 'private/get_account_summary',
    GET_ACCOUNT_SUMMARIES: 'private/get_account_summaries',

    // Orders
    GET_OPEN_ORDERS: 'private/get_open_orders',
    GET_OPEN_ORDERS_BY_INSTRUMENT: 'private/get_open_orders_by_instrument',
    GET_OPEN_ORDERS_BY_CURRENCY: 'private/get_open_orders_by_currency',
    GET_ORDER_STATE: 'private/get_order_state',
    GET_ORDER_HISTORY_BY_INSTRUMENT: 'private/get_order_history_by_instrument',
    GET_ORDER_HISTORY_BY_CURRENCY: 'private/get_order_history_by_currency',

    // Trades
    GET_USER_TRADES_BY_INSTRUMENT: 'private/get_user_trades_by_instrument',
    GET_USER_TRADES_BY_CURRENCY: 'private/get_user_trades_by_currency',

    // Subscriptions
    SUBSCRIBE: 'public/subscribe',
    UNSUBSCRIBE: 'public/unsubscribe',
    PRIVATE_SUBSCRIBE: 'private/subscribe',
    PRIVATE_UNSUBSCRIBE: 'private/unsubscribe'
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Subscription Channels
// ═══════════════════════════════════════════════════════════════════════════════

export const CHANNELS = {
    /**
     * Ticker updates for an instrument.
     * @example "ticker.BTC-PERPETUAL.100ms"
     */
    TICKER: (instrument: string, interval: string = '100ms') =>
        `ticker.${instrument}.${interval}`,

    /**
     * Order book updates.
     * @example "book.BTC-PERPETUAL.100ms"
     */
    BOOK: (instrument: string, interval: string = '100ms') =>
        `book.${instrument}.${interval}`,

    /**
     * Best bid/ask quote.
     * @example "quote.BTC-PERPETUAL"
     */
    QUOTE: (instrument: string) => `quote.${instrument}`,

    /**
     * Public trades.
     * @example "trades.BTC-PERPETUAL.100ms"
     */
    TRADES: (instrument: string, interval: string = '100ms') =>
        `trades.${instrument}.${interval}`,

    /**
     * User changes (orders, positions, trades).
     * @example "user.changes.BTC-PERPETUAL.raw"
     */
    USER_CHANGES: (instrument: string, interval: string = 'raw') =>
        `user.changes.${instrument}.${interval}`,

    /**
     * User portfolio updates.
     * @example "user.portfolio.btc"
     */
    USER_PORTFOLIO: (currency: string) => `user.portfolio.${currency.toLowerCase()}`,

    /**
     * User orders updates.
     * @example "user.orders.BTC-PERPETUAL.raw"
     */
    USER_ORDERS: (instrument: string, interval: string = 'raw') =>
        `user.orders.${instrument}.${interval}`,

    /**
     * User trades updates.
     * @example "user.trades.BTC-PERPETUAL.raw"
     */
    USER_TRADES: (instrument: string, interval: string = 'raw') =>
        `user.trades.${instrument}.${interval}`
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Currencies
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported base currencies on Deribit.
 */
export const CURRENCIES = ['BTC', 'ETH', 'SOL', 'USDC'] as const;
export type DeribitCurrency = (typeof CURRENCIES)[number];
