/**
 * @fileoverview Position Margin Modification Type
 * @module Binance/enums/MarginModifyType
 * 
 * Type of margin modification for isolated positions.
 * @see https://binance-docs.github.io/apidocs/futures/en/#modify-isolated-position-margin-trade
 */

/**
 * Margin modification type for isolated position margin
 */
export enum MarginModifyType {
    /** Add margin to position */
    ADD = 1,
    /** Reduce margin from position */
    REDUCE = 2
}

/**
 * Type alias for margin modification type
 */
export type MarginModifyTypeValue = MarginModifyType.ADD | MarginModifyType.REDUCE;
