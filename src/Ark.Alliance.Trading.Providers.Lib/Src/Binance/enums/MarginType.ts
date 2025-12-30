/**
 * @fileoverview Margin Type Enumeration
 * @module enums/MarginType
 *
 * Defines margin types for Binance Futures positions.
 *
 * @remarks
 * Margin type determines how margin is allocated:
 * - Cross: Shared margin across all positions
 * - Isolated: Separate margin per position
 */

/**
 * Margin type enumeration.
 *
 * @enum {string}
 */
export enum MarginType {
    /**
     * Cross margin - shared margin pool across all positions.
     * Higher capital efficiency, but all positions share liquidation risk.
     */
    CROSSED = 'CROSSED',

    /**
     * Isolated margin - separate margin per position.
     * Lower risk exposure, only assigned margin can be liquidated.
     */
    ISOLATED = 'ISOLATED'
}

/**
 * Type alias for margin type string literals.
 * @deprecated Use MarginType enum instead.
 */
export type MarginTypeType = 'ISOLATED' | 'CROSSED';
