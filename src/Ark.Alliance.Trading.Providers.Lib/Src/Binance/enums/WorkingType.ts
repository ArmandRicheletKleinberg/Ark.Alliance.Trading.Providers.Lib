/**
 * @fileoverview Working Type Enumeration
 * @module enums/WorkingType
 *
 * Defines working type for conditional orders in Binance Futures.
 *
 * @remarks
 * Working type determines which price is used to trigger conditional orders:
 * - MARK_PRICE: Uses fair mark price (recommended, less susceptible to manipulation)
 * - CONTRACT_PRICE: Uses last traded price
 */

/**
 * Working type enumeration for conditional orders.
 *
 * @enum {string}
 */
export enum WorkingType {
    /**
     * Mark price - fair price calculated from index and funding.
     * Recommended for conditional orders to avoid manipulation.
     */
    MARK_PRICE = 'MARK_PRICE',

    /**
     * Contract price - last traded price.
     */
    CONTRACT_PRICE = 'CONTRACT_PRICE'
}

/**
 * Type alias for working type string literals.
 * @deprecated Use WorkingType enum instead.
 */
export type WorkingTypeType = 'MARK_PRICE' | 'CONTRACT_PRICE';
