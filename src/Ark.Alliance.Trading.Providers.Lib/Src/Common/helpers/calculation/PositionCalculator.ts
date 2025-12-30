/**
 * @fileoverview Position Calculator
 * @module helpers/calculation/PositionCalculator
 * 
 * Utility class for position-related calculations.
 * Note: PnL calculations are handled by FuturesCostAndPnLService.
 */

/**
 * Position calculation utilities
 */
export class PositionCalculator {
    /**
     * Calculate position size in coins based on investment and leverage
     * 
     * Formula: positionSize = (investment × leverage) / price
     * 
     * @param investmentUsdt - Investment amount in USDT
     * @param leverage - Leverage multiplier
     * @param price - Entry price
     * @returns Position size in coins
     */
    static calculatePositionSize(investmentUsdt: number, leverage: number, price: number): number {
        return (investmentUsdt * leverage) / price;
    }

    /**
     * Calculate reversal order quantity (x2 of current position)
     * 
     * For inversion: need to close current position (1x) AND open opposite (1x) = 2x
     * 
     * @param currentPositionAmt - Current position amount
     * @returns Reversal order quantity (always positive)
     */
    static calculateReversalQuantity(currentPositionAmt: number): number {
        return Math.abs(currentPositionAmt) * 2;
    }

    /**
     * Calculate close-only quantity (1x of current position)
     * 
     * For waitForTrendConfirmation: just close current position, then open new based on trend
     * 
     * @param currentPositionAmt - Current position amount
     * @returns Close order quantity (always positive)
     */
    static calculateCloseQuantity(currentPositionAmt: number): number {
        return Math.abs(currentPositionAmt);
    }

    /**
     * Determine order side for reversal
     * 
     * @param currentSide - Current position side (BUY/SELL)
     * @returns Opposite side for reversal
     */
    static getReversalSide(currentSide: string): 'BUY' | 'SELL' {
        return currentSide === 'BUY' ? 'SELL' : 'BUY';
    }

    /**
     * Get the order side that OPENED the current position
     * 
     * IMPORTANT: This returns the ORDER SIDE (BUY/SELL), not to be confused with 
     * Binance's positionSide field (LONG/SHORT/BOTH).
     * 
     * In one-way mode (positionSide=BOTH):
     * - positionAmt > 0: Position was opened with a BUY order → returns 'BUY' (LONG position)
     * - positionAmt < 0: Position was opened with a SELL order → returns 'SELL' (SHORT position)
     * 
     * This is used for inversion logic to determine which order side to use
     * for closing/reversing the position.
     * 
     * @param positionAmt - Current position amount from Binance (positive=LONG, negative=SHORT)
     * @returns 'BUY' if LONG position, 'SELL' if SHORT position, null if FLAT/no position
     */
    static getCurrentPositionSide(positionAmt: number): 'BUY' | 'SELL' | null {
        if (positionAmt > 0) return 'BUY';  // LONG position - opened with BUY
        if (positionAmt < 0) return 'SELL'; // SHORT position - opened with SELL
        return null; // FLAT - no position
    }

    /**
     * Format number to symbol precision
     * 
     * @param value - Number to format
     * @param precision - Number of decimal places
     * @returns Formatted string
     */
    static formatToPrecision(value: number, precision: number): string {
        return value.toFixed(precision);
    }

    /**
     * Check if PnL has reached click threshold
     * 
     * @param currentPnL - Current unrealized PnL
     * @param nextClickLevel - Next click threshold
     * @returns True if click event should trigger
     */
    static hasReachedClickLevel(currentPnL: number, nextClickLevel: number): boolean {
        return currentPnL >= nextClickLevel;
    }

    /**
     * Check if PnL has reached inversion threshold
     * 
     * @param currentPnL - Current unrealized PnL
     * @param inversionLevel - Inversion threshold
     * @returns True if inversion event should trigger
     */
    static hasReachedInversionLevel(currentPnL: number, inversionLevel: number): boolean {
        return currentPnL <= inversionLevel;
    }

    /**
     * Calculate inversion order quantity based on Market Close settings
     * 
     * LOGIC:
     * - Default: 2x (close current 1x + reverse 1x)
     * - Market Close enabled + clicks >= minClicks: 1x (Market Order handles close)
     * - Wait Trends mode: 1x (only close, trend reopens later)
     * 
     * @param currentPositionAmt - Current position amount
     * @param marketOrderCloseEnabled - Whether Market Close option is enabled
     * @param clickCounter - Current click count
     * @param minClicks - Minimum clicks required for Market Close
     * @param waitForTrendConfirmation - Whether Wait Trends mode is enabled
     * @returns Inversion order quantity (1x or 2x)
     */
    static calculateInversionQuantity(
        currentPositionAmt: number,
        marketOrderCloseEnabled: boolean = false,
        clickCounter: number = 0,
        minClicks: number = 2,
        waitForTrendConfirmation: boolean = false
    ): number {
        const absQty = Math.abs(currentPositionAmt);

        // Wait Trends mode: only close position (1x), trend analysis reopens
        if (waitForTrendConfirmation) {
            return absQty;  // 1x
        }

        // Market Close mode: if clicks >= min, Market Order handles close
        // So inversion order only needs to reverse (1x)
        if (marketOrderCloseEnabled && clickCounter >= minClicks) {
            return absQty;  // 1x
        }

        // Default: close (1x) + reverse (1x) = 2x
        return absQty * 2;
    }
}
