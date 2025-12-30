/**
 * @fileoverview Quantity Utilities
 * @module helpers/QuantityUtils
 * 
 * Common quantity-related calculations and validations for trading.
 * Eliminates magic numbers for quantity thresholds throughout the codebase.
 */

// ═══════════════════════════════════════════════════════════════════════════
// QUANTITY THRESHOLDS (exported for documentation purposes)
// ═══════════════════════════════════════════════════════════════════════════

/** 
 * Default negligible quantity threshold.
 * Quantities below this are considered effectively zero.
 * Used for position close detection, residual checks, etc.
 */
export const DEFAULT_NEGLIGIBLE_QTY = 0.001;

/**
 * Minimum position threshold for "has position" checks.
 * Positions with absolute value below this are considered closed/flat.
 */
export const MIN_POSITION_THRESHOLD = 0.001;

/**
 * Default comparison epsilon for floating-point quantity comparisons.
 * Used when comparing quantities that may have floating-point errors.
 */
export const QTY_EPSILON = 0.0001;

// ═══════════════════════════════════════════════════════════════════════════
// QUANTITY UTILITIES CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class QuantityUtils {
    /**
     * Check if a quantity is negligible (effectively zero).
     * 
     * Use this instead of hardcoding `< 0.001` throughout the codebase.
     * 
     * @param qty - Quantity to check
     * @param threshold - Negligible threshold (default: DEFAULT_NEGLIGIBLE_QTY = 0.001)
     * @returns True if quantity is negligible
     * 
     * @example
     * QuantityUtils.isNegligible(0.0005) // true
     * QuantityUtils.isNegligible(0.5)    // false
     * QuantityUtils.isNegligible(0.005, 0.01) // true (custom threshold)
     */
    static isNegligible(qty: number, threshold: number = DEFAULT_NEGLIGIBLE_QTY): boolean {
        return Math.abs(qty) < threshold;
    }

    /**
     * Check if a quantity is significant (not negligible).
     * 
     * @param qty - Quantity to check
     * @param threshold - Negligible threshold (default: DEFAULT_NEGLIGIBLE_QTY = 0.001)
     * @returns True if quantity is significant
     * 
     * @example
     * QuantityUtils.isSignificant(0.5)     // true
     * QuantityUtils.isSignificant(0.0005)  // false
     */
    static isSignificant(qty: number, threshold: number = DEFAULT_NEGLIGIBLE_QTY): boolean {
        return Math.abs(qty) >= threshold;
    }

    /**
     * Check if a position is considered "flat" (no position).
     * 
     * @param positionAmt - Position amount from exchange
     * @param threshold - Flat threshold (default: MIN_POSITION_THRESHOLD = 0.001)
     * @returns True if position is flat/closed
     * 
     * @example
     * QuantityUtils.isPositionFlat(0.0001)  // true
     * QuantityUtils.isPositionFlat(1.5)     // false
     * QuantityUtils.isPositionFlat(-0.0001) // true
     */
    static isPositionFlat(positionAmt: number, threshold: number = MIN_POSITION_THRESHOLD): boolean {
        return Math.abs(positionAmt) < threshold;
    }

    /**
     * Check if a position is open (not flat).
     * 
     * @param positionAmt - Position amount from exchange
     * @param threshold - Flat threshold (default: MIN_POSITION_THRESHOLD = 0.001)
     * @returns True if position is open
     * 
     * @example
     * QuantityUtils.hasPosition(1.5)       // true
     * QuantityUtils.hasPosition(0.0001)    // false
     * QuantityUtils.hasPosition(-2.0)      // true
     */
    static hasPosition(positionAmt: number, threshold: number = MIN_POSITION_THRESHOLD): boolean {
        return Math.abs(positionAmt) >= threshold;
    }

    /**
     * Check if two quantities are approximately equal (within epsilon).
     * 
     * Handles floating-point comparison issues.
     * 
     * @param qty1 - First quantity
     * @param qty2 - Second quantity
     * @param epsilon - Comparison epsilon (default: QTY_EPSILON = 0.0001)
     * @returns True if quantities are approximately equal
     * 
     * @example
     * QuantityUtils.areEqual(1.0001, 1.0002) // true
     * QuantityUtils.areEqual(1.0, 1.01)      // false
     */
    static areEqual(qty1: number, qty2: number, epsilon: number = QTY_EPSILON): boolean {
        return Math.abs(qty1 - qty2) < epsilon;
    }

    /**
     * Get the remaining quantity to fill.
     * 
     * @param targetQty - Target quantity to reach
     * @param filledQty - Already filled quantity
     * @returns Remaining quantity (always positive or zero)
     * 
     * @example
     * QuantityUtils.remaining(10, 3)   // 7
     * QuantityUtils.remaining(10, 12)  // 0 (clamped)
     */
    static remaining(targetQty: number, filledQty: number): number {
        return Math.max(0, Math.abs(targetQty) - Math.abs(filledQty));
    }

    /**
     * Calculate inversion quantity (2x current position).
     * 
     * For reversing a position: close current (1x) + open opposite (1x) = 2x
     * 
     * @param currentPositionAmt - Current position amount
     * @returns Inversion quantity (always positive)
     * 
     * @example
     * QuantityUtils.inversionQuantity(5)   // 10
     * QuantityUtils.inversionQuantity(-3)  // 6
     */
    static inversionQuantity(currentPositionAmt: number): number {
        return Math.abs(currentPositionAmt) * 2;
    }

    /**
     * Calculate close quantity (1x current position).
     * 
     * For closing a position without reversing.
     * 
     * @param currentPositionAmt - Current position amount
     * @returns Close quantity (always positive)
     * 
     * @example
     * QuantityUtils.closeQuantity(5)   // 5
     * QuantityUtils.closeQuantity(-3)  // 3
     */
    static closeQuantity(currentPositionAmt: number): number {
        return Math.abs(currentPositionAmt);
    }

    /**
     * Clamp a quantity to min/max bounds.
     * 
     * @param qty - Quantity to clamp
     * @param minQty - Minimum allowed quantity
     * @param maxQty - Maximum allowed quantity (optional)
     * @returns Clamped quantity
     * 
     * @example
     * QuantityUtils.clamp(0.5, 1.0, 10.0)   // 1.0
     * QuantityUtils.clamp(15, 1.0, 10.0)    // 10.0
     * QuantityUtils.clamp(5, 1.0)           // 5 (no max)
     */
    static clamp(qty: number, minQty: number, maxQty?: number): number {
        let result = Math.max(qty, minQty);
        if (maxQty !== undefined) {
            result = Math.min(result, maxQty);
        }
        return result;
    }

    /**
     * Round quantity to step size (for exchange order precision).
     * 
     * @param qty - Quantity to round
     * @param stepSize - Step size from exchange symbol info
     * @returns Quantity rounded to step size
     * 
     * @example
     * QuantityUtils.roundToStep(1.234567, 0.001)  // 1.234
     * QuantityUtils.roundToStep(1.5, 0.1)         // 1.5
     */
    static roundToStep(qty: number, stepSize: number): number {
        if (stepSize <= 0) return qty;
        const precision = Math.round(-Math.log10(stepSize));
        return Math.floor(qty / stepSize) * stepSize;
    }
}
