/**
 * @fileoverview Symbol Status Enumeration
 * @module enums/SymbolStatus
 *
 * Defines trading status for symbols in Binance Futures.
 *
 * @remarks
 * Symbol status indicates whether trading is currently allowed.
 */

/**
 * Symbol trading status enumeration.
 *
 * @enum {string}
 */
export enum SymbolStatus {
    /**
     * Trading is active and orders can be placed.
     */
    TRADING = 'TRADING',

    /**
     * Pre-trading phase - trading not yet active.
     */
    PRE_TRADING = 'PRE_TRADING',

    /**
     * Post-trading phase - trading has ended.
     */
    POST_TRADING = 'POST_TRADING',

    /**
     * End of day - market closed.
     */
    END_OF_DAY = 'END_OF_DAY',

    /**
     * Trading halted - temporary suspension.
     */
    HALT = 'HALT',

    /**
     * Trading break - scheduled pause.
     */
    BREAK = 'BREAK'
}

/**
 * Type alias for symbol status string literals.
 * @deprecated Use SymbolStatus enum instead.
 */
export type SymbolStatusType =
    | 'TRADING'
    | 'PRE_TRADING'
    | 'POST_TRADING'
    | 'END_OF_DAY'
    | 'HALT'
    | 'BREAK';

/**
 * Checks if trading is currently allowed for a symbol.
 *
 * @param status - Symbol status.
 * @returns True if trading is allowed.
 */
export function isTradingAllowed(status: SymbolStatus): boolean {
    return status === SymbolStatus.TRADING;
}
