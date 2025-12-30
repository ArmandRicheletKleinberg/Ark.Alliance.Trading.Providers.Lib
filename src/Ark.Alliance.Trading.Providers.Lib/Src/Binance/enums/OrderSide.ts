/**
 * @fileoverview Order Side Enumeration
 * @module enums/OrderSide
 *
 * Defines the side of an order (BUY or SELL) in Binance Futures trading.
 *
 * @remarks
 * This enum is used across all order-related operations including:
 * - Order placement via REST and WebSocket APIs
 * - Order updates from User Data Stream
 * - Position calculations and reversals
 *
 * @example
 * ```typescript
 * import { OrderSide } from '../enums';
 *
 * function placeOrder(side: OrderSide) {
 *     console.log(`Placing ${side} order`);
 * }
 *
 * placeOrder(OrderSide.BUY);
 * ```
 */

/**
 * Order side enumeration.
 *
 * @enum {string}
 */
export enum OrderSide {
    /**
     * Buy order - opens or adds to a LONG position.
     */
    BUY = 'BUY',

    /**
     * Sell order - opens or adds to a SHORT position.
     */
    SELL = 'SELL'
}

/**
 * Type alias for order side string literals.
 * @deprecated Use OrderSide enum instead.
 */
export type OrderSideType = 'BUY' | 'SELL';

/**
 * Helper to get the opposite side.
 *
 * @param side - Current order side.
 * @returns The opposite side.
 *
 * @example
 * ```typescript
 * getOppositeSide(OrderSide.BUY); // Returns OrderSide.SELL
 * ```
 */
export function getOppositeSide(side: OrderSide): OrderSide {
    return side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
}
