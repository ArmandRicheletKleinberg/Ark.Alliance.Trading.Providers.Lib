/**
 * @fileoverview Contract Type Enumeration
 * @module enums/ContractType
 *
 * Defines contract types for Binance Futures.
 *
 * @remarks
 * Used for continuous klines and exchange info.
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Continuous-Contract-Kline-Candlestick-Data
 */

/**
 * Contract type enumeration.
 *
 * @enum {string}
 */
export enum ContractType {
    /**
     * Perpetual contract - no expiry date.
     */
    PERPETUAL = 'PERPETUAL',

    /**
     * Current quarter delivery contract.
     */
    CURRENT_QUARTER = 'CURRENT_QUARTER',

    /**
     * Next quarter delivery contract.
     */
    NEXT_QUARTER = 'NEXT_QUARTER',

    /**
     * TradiFi perpetual contract.
     */
    TRADIFI_PERPETUAL = 'TRADIFI_PERPETUAL'
}

/**
 * Type alias for contract type string literals.
 * @deprecated Use ContractType enum instead.
 */
export type ContractTypeType =
    | 'PERPETUAL'
    | 'CURRENT_QUARTER'
    | 'NEXT_QUARTER'
    | 'TRADIFI_PERPETUAL';
