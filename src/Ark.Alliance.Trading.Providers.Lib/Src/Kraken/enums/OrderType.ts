/**
 * @fileoverview Kraken Order Type Enum
 * @module Kraken/enums/OrderType
 *
 * Defines order type values for Kraken Futures API.
 */

/**
 * Kraken order types.
 * 
 * @remarks
 * Kraken Futures supports the following order types:
 * - lmt: Limit order
 * - mkt: Market order (immediate-or-cancel)
 * - stp: Stop order
 * - take_profit: Take profit order
 * - ioc: Immediate-or-cancel order
 * - post: Post-only order (maker only)
 */
export enum KrakenOrderType {
    /** Limit order */
    LIMIT = 'lmt',
    /** Market order */
    MARKET = 'mkt',
    /** Stop order */
    STOP = 'stp',
    /** Take profit order */
    TAKE_PROFIT = 'take_profit',
    /** Immediate-or-cancel order */
    IOC = 'ioc',
    /** Post-only order (maker only) */
    POST = 'post'
}

/** Type alias for KrakenOrderType values */
export type KrakenOrderTypeType = `${KrakenOrderType}`;

/**
 * Check if order type requires a price.
 */
export function requiresPrice(type: KrakenOrderType): boolean {
    return type === KrakenOrderType.LIMIT || type === KrakenOrderType.POST;
}

/**
 * Check if order type requires a stop/trigger price.
 */
export function requiresStopPrice(type: KrakenOrderType): boolean {
    return type === KrakenOrderType.STOP || type === KrakenOrderType.TAKE_PROFIT;
}

/**
 * Check if this is a stop-type order.
 */
export function isStopOrder(type: KrakenOrderType): boolean {
    return type === KrakenOrderType.STOP || type === KrakenOrderType.TAKE_PROFIT;
}
