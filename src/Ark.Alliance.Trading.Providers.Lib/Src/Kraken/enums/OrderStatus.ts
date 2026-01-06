/**
 * @fileoverview Kraken Order Status Enum
 * @module Kraken/enums/OrderStatus
 *
 * Defines order status values for Kraken Futures API.
 */

/**
 * Kraken order status values.
 * 
 * @remarks
 * Based on Kraken Futures API order statuses.
 */
export enum KrakenOrderStatus {
    /** Order has been placed */
    PLACED = 'placed',
    /** Order has been partially filled */
    PARTIALLY_FILLED = 'partiallyFilled',
    /** Order has been fully filled */
    FILLED = 'filled',
    /** Order has been cancelled */
    CANCELLED = 'cancelled',
    /** Order has not been touched */
    UNTOUCHED = 'untouched',
    /** Order is pending entry */
    PENDING = 'pending',
    /** Order entry failed */
    ENTRY_FAILED = 'entry_failed'
}

/** Type alias for KrakenOrderStatus values */
export type KrakenOrderStatusType = `${KrakenOrderStatus}`;

/**
 * Check if order is in a terminal state (no further updates expected).
 */
export function isTerminalState(status: KrakenOrderStatus): boolean {
    return (
        status === KrakenOrderStatus.FILLED ||
        status === KrakenOrderStatus.CANCELLED ||
        status === KrakenOrderStatus.ENTRY_FAILED
    );
}

/**
 * Check if order is in an active state (may receive updates).
 */
export function isActiveState(status: KrakenOrderStatus): boolean {
    return (
        status === KrakenOrderStatus.PLACED ||
        status === KrakenOrderStatus.PARTIALLY_FILLED ||
        status === KrakenOrderStatus.UNTOUCHED ||
        status === KrakenOrderStatus.PENDING
    );
}

/**
 * Check if order has been at least partially filled.
 */
export function hasBeenFilled(status: KrakenOrderStatus): boolean {
    return (
        status === KrakenOrderStatus.PARTIALLY_FILLED ||
        status === KrakenOrderStatus.FILLED
    );
}
