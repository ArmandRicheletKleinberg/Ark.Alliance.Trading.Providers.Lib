/**
 * @fileoverview Kraken Order Side Enum
 * @module Kraken/enums/OrderSide
 *
 * Defines order side values for Kraken Futures API.
 */

/**
 * Kraken order side.
 * 
 * @remarks
 * Kraken uses lowercase strings for order side in API calls.
 */
export enum KrakenOrderSide {
    BUY = 'buy',
    SELL = 'sell'
}

/** Type alias for KrakenOrderSide values */
export type KrakenOrderSideType = `${KrakenOrderSide}`;

/**
 * Get the opposite side.
 */
export function getOppositeSide(side: KrakenOrderSide): KrakenOrderSide {
    return side === KrakenOrderSide.BUY ? KrakenOrderSide.SELL : KrakenOrderSide.BUY;
}
