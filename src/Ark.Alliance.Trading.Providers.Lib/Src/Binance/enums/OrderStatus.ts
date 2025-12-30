/**
 * @fileoverview Order Status Enumeration
 * @module enums/OrderStatus
 *
 * Defines all order status values returned by Binance Futures.
 *
 * @remarks
 * Order status is received in ORDER_TRADE_UPDATE events and
 * REST API responses.
 */

/**
 * Order status enumeration.
 *
 * @enum {string}
 */
export enum OrderStatus {
    /**
     * New order - accepted but not yet executed.
     */
    NEW = 'NEW',

    /**
     * Partially filled - some quantity has been executed.
     */
    PARTIALLY_FILLED = 'PARTIALLY_FILLED',

    /**
     * Filled - order completely executed.
     */
    FILLED = 'FILLED',

    /**
     * Canceled - order was canceled by user or system.
     */
    CANCELED = 'CANCELED',

    /**
     * Rejected - order was rejected by the matching engine.
     */
    REJECTED = 'REJECTED',

    /**
     * Expired - order expired (GTD orders or after market close).
     */
    EXPIRED = 'EXPIRED',

    /**
     * Expired in match - order expired during matching engine processing.
     */
    EXPIRED_IN_MATCH = 'EXPIRED_IN_MATCH',

    /**
     * New insurance - order related to insurance fund.
     */
    NEW_INSURANCE = 'NEW_INSURANCE',

    /**
     * New ADL - order related to auto-deleveraging.
     */
    NEW_ADL = 'NEW_ADL'
}

/**
 * Type alias for order status string literals.
 * @deprecated Use OrderStatus enum instead.
 */
export type OrderStatusType =
    | 'NEW'
    | 'PARTIALLY_FILLED'
    | 'FILLED'
    | 'CANCELED'
    | 'EXPIRED'
    | 'EXPIRED_IN_MATCH';

/**
 * Checks if an order is in a terminal state (no longer active).
 *
 * @param status - The order status.
 * @returns True if order is complete/canceled/expired.
 */
export function isTerminalStatus(status: OrderStatus): boolean {
    return status === OrderStatus.FILLED ||
        status === OrderStatus.CANCELED ||
        status === OrderStatus.EXPIRED ||
        status === OrderStatus.EXPIRED_IN_MATCH;
}

/**
 * Checks if an order is still active (can be filled or canceled).
 *
 * @param status - The order status.
 * @returns True if order is NEW or PARTIALLY_FILLED.
 */
export function isActiveStatus(status: OrderStatus): boolean {
    return status === OrderStatus.NEW ||
        status === OrderStatus.PARTIALLY_FILLED;
}

/**
 * Checks if an order has been at least partially filled.
 *
 * @param status - The order status.
 * @returns True if order is PARTIALLY_FILLED or FILLED.
 */
export function hasBeenFilled(status: OrderStatus): boolean {
    return status === OrderStatus.PARTIALLY_FILLED ||
        status === OrderStatus.FILLED;
}
