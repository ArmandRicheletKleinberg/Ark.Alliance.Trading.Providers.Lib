/**
 * @fileoverview Deribit Order Type Enum
 * @module Deribit/enums/OrderType
 *
 * Defines the order types available on Deribit.
 */

/**
 * Deribit order type.
 */
export enum DeribitOrderType {
    LIMIT = 'limit',
    MARKET = 'market',
    STOP_LIMIT = 'stop_limit',
    STOP_MARKET = 'stop_market',
    TAKE_LIMIT = 'take_limit',
    TAKE_MARKET = 'take_market',
    MARKET_LIMIT = 'market_limit',
    TRAILING_STOP = 'trailing_stop'
}

/**
 * Type alias for order type values.
 */
export type DeribitOrderTypeType = `${DeribitOrderType}`;

/**
 * Check if order type requires price.
 */
export function requiresPrice(type: DeribitOrderType): boolean {
    return [
        DeribitOrderType.LIMIT,
        DeribitOrderType.STOP_LIMIT,
        DeribitOrderType.TAKE_LIMIT
    ].includes(type);
}

/**
 * Check if order type is a stop order (requires trigger price).
 */
export function isStopOrder(type: DeribitOrderType): boolean {
    return [
        DeribitOrderType.STOP_LIMIT,
        DeribitOrderType.STOP_MARKET,
        DeribitOrderType.TAKE_LIMIT,
        DeribitOrderType.TAKE_MARKET,
        DeribitOrderType.TRAILING_STOP
    ].includes(type);
}
