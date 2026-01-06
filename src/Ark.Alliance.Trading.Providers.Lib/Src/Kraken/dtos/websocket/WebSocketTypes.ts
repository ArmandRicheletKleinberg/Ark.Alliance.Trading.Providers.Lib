/**
 * @fileoverview Kraken Futures WebSocket DTOs
 * @module Kraken/dtos/websocket/WebSocketTypes
 *
 * Type definitions for Kraken Futures WebSocket messages.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Base Message Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base WebSocket message structure.
 */
export interface WsMessage {
    /** Event type */
    event?: string;

    /** Feed name */
    feed?: string;

    /** Product IDs */
    product_ids?: string[];

    /** Error message if any */
    error?: string;

    /** Message content (for data messages) */
    message?: string;
}

/**
 * Subscribe/unsubscribe request.
 */
export interface WsSubscriptionRequest {
    /** Event: 'subscribe' or 'unsubscribe' */
    event: 'subscribe' | 'unsubscribe';

    /** Feed to subscribe to */
    feed: string;

    /** Product IDs to subscribe */
    product_ids?: string[];

    /** API key (for private feeds) */
    api_key?: string;

    /** Original challenge (for private auth) */
    original_challenge?: string;

    /** Signed challenge (for private auth) */
    signed_challenge?: string;
}

/**
 * Subscription confirmation response.
 */
export interface WsSubscriptionResponse {
    /** Event type */
    event: 'subscribed' | 'unsubscribed' | 'error';

    /** Feed name */
    feed: string;

    /** Product IDs */
    product_ids?: string[];

    /** Error message */
    message?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Authentication
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Challenge response for authentication.
 */
export interface WsChallengeResponse {
    /** Event type */
    event: 'challenge';

    /** Challenge message to sign */
    message: string;
}

/**
 * Authentication request (after receiving challenge).
 */
export interface WsAuthRequest {
    /** Event type */
    event: 'subscribe';

    /** Feed name (private feed) */
    feed: string;

    /** API key */
    api_key: string;

    /** Original challenge message */
    original_challenge: string;

    /** Signed challenge */
    signed_challenge: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Market Data Feeds
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ticker feed message.
 */
export interface WsTickerMessage {
    /** Feed name */
    feed: 'ticker';

    /** Product ID */
    product_id: string;

    /** Best bid */
    bid: number;

    /** Best ask */
    ask: number;

    /** Bid size */
    bid_size: number;

    /** Ask size */
    ask_size: number;

    /** Volume (24h) */
    volume: number;

    /** Daily turnover */
    dtm?: number;

    /** Leverage */
    leverage?: string;

    /** Index price */
    index?: number;

    /** Mark price */
    markPrice: number;

    /** Last price */
    last: number;

    /** Timestamp */
    time: number;

    /** Change percentage */
    change?: number;

    /** Funding rate */
    funding_rate?: number;

    /** Funding rate prediction */
    funding_rate_prediction?: number;

    /** Relative funding rate */
    relative_funding_rate?: number;

    /** Relative funding rate prediction */
    relative_funding_rate_prediction?: number;

    /** Next funding rate time */
    next_funding_rate_time?: number;

    /** Open interest */
    openInterest?: number;

    /** 24h high */
    high?: number;

    /** 24h low */
    low?: number;

    /** Tag */
    tag?: string;

    /** Pair */
    pair?: string;

    /** Post-only flag */
    post_only?: boolean;

    /** Suspended flag */
    suspended?: boolean;
}

/**
 * Order book snapshot message.
 */
export interface WsBookSnapshotMessage {
    /** Feed name */
    feed: 'book_snapshot';

    /** Product ID */
    product_id: string;

    /** Timestamp */
    timestamp: number;

    /** Sequence number */
    seq: number;

    /** Bids [price, qty] */
    bids: [number, number][];

    /** Asks [price, qty] */
    asks: [number, number][];
}

/**
 * Order book delta message.
 */
export interface WsBookDeltaMessage {
    /** Feed name */
    feed: 'book';

    /** Product ID */
    product_id: string;

    /** Side: 'buy' or 'sell' */
    side: 'buy' | 'sell';

    /** Sequence number */
    seq: number;

    /** Price level */
    price: number;

    /** New quantity (0 = remove level) */
    qty: number;

    /** Timestamp */
    timestamp: number;
}

/**
 * Trade feed message.
 */
export interface WsTradeMessage {
    /** Feed name */
    feed: 'trade';

    /** Product ID */
    product_id: string;

    /** Trade side: 'buy' or 'sell' */
    side: 'buy' | 'sell';

    /** Trade type */
    type: 'fill' | 'liquidation' | 'block';

    /** Sequence number */
    seq: number;

    /** Timestamp */
    time: number;

    /** Quantity */
    qty: number;

    /** Price */
    price: number;

    /** Trade ID */
    uid?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Private Feeds (User Data)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User fills feed message.
 */
export interface WsFillMessage {
    /** Feed name */
    feed: 'fills';

    /** Fill time */
    time: number;

    /** Fill ID */
    fill_id: string;

    /** Order ID */
    order_id: string;

    /** Client order ID */
    cli_ord_id?: string;

    /** Symbol */
    instrument: string;

    /** Trade price */
    price: number;

    /** Fill quantity */
    qty: number;

    /** Side: 'buy' or 'sell' */
    side: 'buy' | 'sell';

    /** Fill type */
    fill_type: 'maker' | 'taker' | 'liquidation';

    /** Remaining order size */
    remaining_order_qty?: number;

    /** Fee paid */
    fee_paid?: number;

    /** Fee currency */
    fee_currency?: string;
}

/**
 * User open orders feed message.
 */
export interface WsOpenOrderMessage {
    /** Feed name */
    feed: 'open_orders';

    /** Order ID */
    order_id: string;

    /** Client order ID */
    cli_ord_id?: string;

    /** Symbol */
    instrument: string;

    /** Order type */
    type: string;

    /** Order side */
    side: 'buy' | 'sell';

    /** Order quantity */
    qty: number;

    /** Filled quantity */
    filled: number;

    /** Limit price */
    limit_price?: number;

    /** Stop price */
    stop_price?: number;

    /** Reduce only */
    reduce_only: boolean;

    /** Timestamp */
    time: number;

    /** Last update timestamp */
    last_update_time?: number;

    /** Is cancel flag (order was cancelled) */
    is_cancel?: boolean;

    /** Reason for cancellation */
    reason?: string;
}

/**
 * User open positions feed message.
 */
export interface WsOpenPositionMessage {
    /** Feed name */
    feed: 'open_positions';

    /** Symbol */
    instrument: string;

    /** Position balance (positive=long, negative=short) */
    balance: number;

    /** Entry price */
    entry_price: number;

    /** Mark price */
    mark_price: number;

    /** Unrealized PnL */
    pnl?: number;

    /** Index price */
    index_price?: number;

    /** Effective leverage */
    effective_leverage?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Heartbeat
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Heartbeat message.
 */
export interface WsHeartbeatMessage {
    /** Feed name */
    feed: 'heartbeat';

    /** Timestamp */
    time: number;
}

/**
 * Info message (connection status).
 */
export interface WsInfoMessage {
    /** Event type */
    event: 'info';

    /** Version */
    version: number;
}
