/**
 * @fileoverview Order Type Enumeration
 * @module enums/OrderType
 *
 * Defines all order types supported by Binance Futures.
 *
 * @remarks
 * Different order types have different requirements:
 * - LIMIT: Requires price and quantity
 * - MARKET: Requires quantity only
 * - STOP/STOP_MARKET: Requires stopPrice
 * - TAKE_PROFIT/TAKE_PROFIT_MARKET: Requires stopPrice
 * - TRAILING_STOP_MARKET: Requires callbackRate
 *
 * @see https://binance-docs.github.io/apidocs/futures/en/#new-order-trade
 */

/**
 * Order type enumeration.
 *
 * @enum {string}
 */
export enum OrderType {
    /**
     * Limit order - executes at specified price or better.
     * Requires: price, quantity, timeInForce
     */
    LIMIT = 'LIMIT',

    /**
     * Market order - executes immediately at current market price.
     * Requires: quantity
     */
    MARKET = 'MARKET',

    /**
     * Stop limit order - limit order triggered when stopPrice is reached.
     * Requires: price, quantity, stopPrice
     */
    STOP = 'STOP',

    /**
     * Stop market order - market order triggered when stopPrice is reached.
     * Requires: quantity, stopPrice
     */
    STOP_MARKET = 'STOP_MARKET',

    /**
     * Take profit limit order - limit order triggered when stopPrice is reached.
     * Requires: price, quantity, stopPrice
     */
    TAKE_PROFIT = 'TAKE_PROFIT',

    /**
     * Take profit market order - market order triggered when stopPrice is reached.
     * Requires: quantity, stopPrice
     */
    TAKE_PROFIT_MARKET = 'TAKE_PROFIT_MARKET',

    /**
     * Trailing stop market order - follows price with trailing delta.
     * Requires: callbackRate
     */
    TRAILING_STOP_MARKET = 'TRAILING_STOP_MARKET'
}

/**
 * Type alias for order type string literals.
 * @deprecated Use OrderType enum instead.
 */
export type OrderTypeType =
    | 'LIMIT'
    | 'MARKET'
    | 'STOP'
    | 'STOP_MARKET'
    | 'TAKE_PROFIT'
    | 'TAKE_PROFIT_MARKET'
    | 'TRAILING_STOP_MARKET';

/**
 * Checks if an order type requires a price parameter.
 *
 * @param type - The order type to check.
 * @returns True if the order type requires a price.
 */
export function requiresPrice(type: OrderType): boolean {
    return type === OrderType.LIMIT ||
        type === OrderType.STOP ||
        type === OrderType.TAKE_PROFIT;
}

/**
 * Checks if an order type requires a stopPrice parameter.
 *
 * @param type - The order type to check.
 * @returns True if the order type requires a stopPrice.
 */
export function requiresStopPrice(type: OrderType): boolean {
    return type === OrderType.STOP ||
        type === OrderType.STOP_MARKET ||
        type === OrderType.TAKE_PROFIT ||
        type === OrderType.TAKE_PROFIT_MARKET;
}

/**
 * Checks if an order type is a conditional (algo) order.
 *
 * @param type - The order type to check.
 * @returns True if the order type is conditional.
 */
export function isConditionalOrder(type: OrderType): boolean {
    return type === OrderType.STOP ||
        type === OrderType.STOP_MARKET ||
        type === OrderType.TAKE_PROFIT ||
        type === OrderType.TAKE_PROFIT_MARKET ||
        type === OrderType.TRAILING_STOP_MARKET;
}
