/**
 * @fileoverview Kraken Futures Order DTOs
 * @module Kraken/dtos/trading/OrderTypes
 *
 * Type definitions for Kraken Futures order-related API requests and responses.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Order Request Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send order request parameters.
 */
export interface SendOrderRequest {
    /** Order type: 'lmt', 'mkt', 'stp', 'take_profit', 'ioc', 'post' */
    orderType: string;

    /** Product ID (e.g., 'PI_XBTUSD') */
    symbol: string;

    /** Order side: 'buy' or 'sell' */
    side: string;

    /** Order size (number of contracts) */
    size: number;

    /** Limit price (required for limit orders) */
    limitPrice?: number;

    /** Stop/trigger price (required for stop orders) */
    stopPrice?: number;

    /** Client order ID for tracking */
    cliOrdId?: string;

    /** Whether order should only reduce position */
    reduceOnly?: boolean;

    /** Trigger signal: 'mark', 'spot', 'last' */
    triggerSignal?: 'mark' | 'spot' | 'last';

    /** Trailing stop distance */
    trailingStopDeviationUnit?: 'PERCENT';
    trailingStopMaxDeviation?: number;
}

/**
 * Edit order request parameters.
 */
export interface EditOrderRequest {
    /** Order ID to edit */
    orderId?: string;

    /** Client order ID to edit */
    cliOrdId?: string;

    /** New size */
    size?: number;

    /** New limit price */
    limitPrice?: number;

    /** New stop price */
    stopPrice?: number;
}

/**
 * Cancel order request parameters.
 */
export interface CancelOrderRequest {
    /** Order ID to cancel */
    orderId?: string;

    /** Client order ID to cancel */
    cliOrdId?: string;
}

/**
 * Batch order request.
 */
export interface BatchOrderRequest {
    /** Batch ID */
    batchId?: string;

    /** JSON-encoded array of order instructions */
    json: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Response Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send order response.
 */
export interface SendOrderResponse {
    /** Result status: 'success' or error */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** Send status information */
    sendStatus: {
        /** Order ID assigned by exchange */
        order_id: string;

        /** Status: 'placed', 'cancelled', etc. */
        status: string;

        /** Received timestamp */
        receivedTime: string;

        /** Order events */
        orderEvents?: OrderEvent[];
    };
}

/**
 * Order event from Kraken.
 */
export interface OrderEvent {
    /** Event type */
    executionId?: string;

    /** Price at which event occurred */
    price?: string;

    /** Amount involved */
    amount?: number;

    /** Order prior state */
    orderPriorEdit?: KrakenOrder;

    /** Order prior execution */
    orderPriorExecution?: KrakenOrder;

    /** Remaining amount after event */
    takerReducedQuantity?: number;

    /** Event type */
    type?: string;
}

/**
 * Kraken order structure (from API responses).
 */
export interface KrakenOrder {
    /** Order ID */
    orderId: string;

    /** Client order ID */
    cliOrdId?: string;

    /** Order type */
    type: string;

    /** Product symbol */
    symbol: string;

    /** Order side: 'buy' or 'sell' */
    side: string;

    /** Order quantity */
    quantity: number;

    /** Filled quantity */
    filled: number;

    /** Limit price */
    limitPrice?: number;

    /** Stop price */
    stopPrice?: number;

    /** Reduce only flag */
    reduceOnly: boolean;

    /** Order timestamp */
    timestamp: string;

    /** Last update timestamp */
    lastUpdateTimestamp?: string;

    /** Order status */
    status: string;
}

/**
 * Cancel order response.
 */
export interface CancelOrderResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** Cancel status */
    cancelStatus: {
        status: string;
        orderId?: string;
        cliOrdId?: string;
        receivedTime: string;
        orderEvents?: OrderEvent[];
    };
}

/**
 * Open orders response.
 */
export interface OpenOrdersResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** List of open orders */
    openOrders: KrakenOrder[];
}

/**
 * Order status response.
 */
export interface OrderStatusResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** Orders with their current status */
    orders: KrakenOrder[];
}
