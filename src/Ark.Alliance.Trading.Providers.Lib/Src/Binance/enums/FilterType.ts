/**
 * @fileoverview Filter Type Enumeration
 * @module enums/FilterType
 *
 * Defines symbol filter types from Exchange Info.
 *
 * @remarks
 * Filters constrain order parameters (price, quantity, notional).
 */

/**
 * Symbol filter type enumeration.
 *
 * @enum {string}
 */
export enum FilterType {
    /**
     * Price filter - min/max price and tick size.
     */
    PRICE_FILTER = 'PRICE_FILTER',

    /**
     * Lot size filter - min/max quantity and step size.
     */
    LOT_SIZE = 'LOT_SIZE',

    /**
     * Market lot size filter - limits for market orders.
     */
    MARKET_LOT_SIZE = 'MARKET_LOT_SIZE',

    /**
     * Maximum number of open orders.
     */
    MAX_NUM_ORDERS = 'MAX_NUM_ORDERS',

    /**
     * Maximum number of algo orders.
     */
    MAX_NUM_ALGO_ORDERS = 'MAX_NUM_ALGO_ORDERS',

    /**
     * Minimum notional value (price * quantity).
     */
    MIN_NOTIONAL = 'MIN_NOTIONAL',

    /**
     * Percent price filter - limits price deviation from mark price.
     */
    PERCENT_PRICE = 'PERCENT_PRICE'
}

/**
 * Type alias for filter type string literals.
 * @deprecated Use FilterType enum instead.
 */
export type FilterTypeType =
    | 'PRICE_FILTER'
    | 'LOT_SIZE'
    | 'MARKET_LOT_SIZE'
    | 'MAX_NUM_ORDERS'
    | 'MAX_NUM_ALGO_ORDERS'
    | 'MIN_NOTIONAL'
    | 'PERCENT_PRICE';
