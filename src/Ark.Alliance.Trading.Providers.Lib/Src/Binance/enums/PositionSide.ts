/**
 * @fileoverview Position Side Enumeration
 * @module enums/PositionSide
 *
 * Defines position side values for Binance Futures trading.
 *
 * @remarks
 * Binance Futures supports two position modes:
 * - One-way mode: Uses BOTH for all positions
 * - Hedge mode: Uses LONG and SHORT separately
 *
 * In one-way mode, the sign of positionAmt indicates direction:
 * - Positive = LONG position
 * - Negative = SHORT position
 * - Zero = No position
 */

/**
 * Position side enumeration for Binance hedge mode.
 *
 * @enum {string}
 */
export enum PositionSide {
    /**
     * Long position side (hedge mode only).
     */
    LONG = 'LONG',

    /**
     * Short position side (hedge mode only).
     */
    SHORT = 'SHORT',

    /**
     * Both/Any side (one-way mode - default).
     */
    BOTH = 'BOTH'
}

/**
 * Position direction for position state tracking.
 *
 * @enum {string}
 */
export enum PositionDirection {
    /**
     * Long position (positive positionAmt).
     */
    LONG = 'LONG',

    /**
     * Short position (negative positionAmt).
     */
    SHORT = 'SHORT',

    /**
     * No position (zero positionAmt).
     */
    FLAT = 'FLAT'
}

/**
 * Type alias for position side string literals.
 * @deprecated Use PositionSide enum instead.
 */
export type PositionSideType = 'LONG' | 'SHORT' | 'BOTH';

/**
 * Type alias for position direction string literals.
 * @deprecated Use PositionDirection enum instead.
 */
export type PositionDirectionType = 'LONG' | 'SHORT' | 'FLAT';

/**
 * Gets the position direction from position amount.
 *
 * @param positionAmt - The position amount from Binance.
 * @returns The position direction.
 */
export function getPositionDirection(positionAmt: number): PositionDirection {
    if (positionAmt > 0) return PositionDirection.LONG;
    if (positionAmt < 0) return PositionDirection.SHORT;
    return PositionDirection.FLAT;
}

/**
 * Gets the order side that opened the position.
 *
 * @param positionAmt - The position amount from Binance.
 * @returns OrderSide BUY for LONG, SELL for SHORT, null for FLAT.
 */
export function getPositionOrderSide(positionAmt: number): 'BUY' | 'SELL' | null {
    if (positionAmt > 0) return 'BUY';   // LONG position - opened with BUY
    if (positionAmt < 0) return 'SELL';  // SHORT position - opened with SELL
    return null;                          // FLAT - no position
}

/**
 * Checks if a position inversion occurred between two directions.
 *
 * @param previous - Previous position direction.
 * @param current - Current position direction.
 * @returns True if position was inverted (LONG→SHORT or SHORT→LONG).
 */
export function isPositionInversion(
    previous: PositionDirection,
    current: PositionDirection
): boolean {
    return (
        (previous === PositionDirection.LONG && current === PositionDirection.SHORT) ||
        (previous === PositionDirection.SHORT && current === PositionDirection.LONG)
    );
}
