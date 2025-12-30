/**
 * @fileoverview Order Category Enumeration
 * @module enums/OrderCategory
 *
 * Defines order categories for classification purposes.
 *
 * @remarks
 * Used to categorize orders in the frontend display:
 * - REGULAR: Standard limit/market orders
 * - GTX: Post-only (maker) orders
 * - ALGO: Conditional orders (TP/SL/trailing stop)
 */

/**
 * Order category enumeration.
 *
 * @enum {string}
 */
export enum OrderCategory {
    /**
     * Regular order - standard limit/market orders.
     */
    REGULAR = 'REGULAR',

    /**
     * GTX order - post-only/maker-only orders.
     */
    GTX = 'GTX',

    /**
     * Algo order - conditional orders (TP, SL, trailing stop).
     */
    ALGO = 'ALGO'
}

/**
 * Type alias for order category string literals.
 * @deprecated Use OrderCategory enum instead.
 */
export type OrderCategoryType = 'REGULAR' | 'GTX' | 'ALGO';
