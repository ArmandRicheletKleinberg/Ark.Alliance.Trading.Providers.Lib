/**
 * Leverage Bracket Manager
 * 
 * **Responsibility:** Validate leverage against Binance bracket limits
 * 
 * **Purpose:** Prevent Error -4061 (Invalid Leverage) from Binance API
 * 
 * Binance uses tiered leverage brackets - max leverage decreases as position size increases:
 * - Small positions: Up to 125x
 * - Large positions: May be limited to 5x or less
 * 
 * @module common/validation/LeverageBracketManager
 */

import { logger } from '../logger';

export interface LeverageBracket {
    bracket: number;
    initialLeverage: number;
    notionalCap: number;
    notionalFloor: number;
    maintMarginRatio: number;
    cum: number;
}

export interface LeverageValidationResult {
    /** True if leverage is valid for the position size */
    valid: boolean;

    /** Maximum allowed leverage for this notional */
    maxAllowed: number;

    /** Message describing the result */
    message?: string;

    /** Matching bracket (if found) */
    bracket?: LeverageBracket;
}

// Default brackets for common symbols (can be updated from API)
const DEFAULT_BRACKETS: LeverageBracket[] = [
    { bracket: 1, initialLeverage: 125, notionalCap: 50000, notionalFloor: 0, maintMarginRatio: 0.004, cum: 0 },
    { bracket: 2, initialLeverage: 100, notionalCap: 250000, notionalFloor: 50000, maintMarginRatio: 0.005, cum: 50 },
    { bracket: 3, initialLeverage: 50, notionalCap: 1000000, notionalFloor: 250000, maintMarginRatio: 0.01, cum: 1300 },
    { bracket: 4, initialLeverage: 20, notionalCap: 5000000, notionalFloor: 1000000, maintMarginRatio: 0.025, cum: 16300 },
    { bracket: 5, initialLeverage: 10, notionalCap: 10000000, notionalFloor: 5000000, maintMarginRatio: 0.05, cum: 141300 },
    { bracket: 6, initialLeverage: 5, notionalCap: 20000000, notionalFloor: 10000000, maintMarginRatio: 0.10, cum: 641300 },
    { bracket: 7, initialLeverage: 4, notionalCap: 50000000, notionalFloor: 20000000, maintMarginRatio: 0.125, cum: 1141300 },
    { bracket: 8, initialLeverage: 3, notionalCap: 100000000, notionalFloor: 50000000, maintMarginRatio: 0.15, cum: 2391300 },
    { bracket: 9, initialLeverage: 2, notionalCap: 200000000, notionalFloor: 100000000, maintMarginRatio: 0.25, cum: 12391300 },
    { bracket: 10, initialLeverage: 1, notionalCap: Number.MAX_SAFE_INTEGER, notionalFloor: 200000000, maintMarginRatio: 0.50, cum: 62391300 }
];

// Symbol-specific bracket cache
const symbolBrackets = new Map<string, LeverageBracket[]>();

export class LeverageBracketManager {
    /**
     * Update brackets for a symbol from API response
     * 
     * @param symbol - Trading symbol
     * @param brackets - Bracket data from Binance API
     */
    public static updateBrackets(symbol: string, brackets: LeverageBracket[]): void {
        symbolBrackets.set(symbol, brackets);
        logger.debug('Leverage brackets updated', { symbol, bracketCount: brackets.length });
    }

    /**
     * Get brackets for a symbol
     * 
     * @param symbol - Trading symbol
     * @returns Leverage brackets (default if not cached)
     */
    public static getBrackets(symbol: string): LeverageBracket[] {
        return symbolBrackets.get(symbol) || DEFAULT_BRACKETS;
    }

    /**
     * Find bracket for a given notional value
     * 
     * @param symbol - Trading symbol
     * @param notional - Position notional value
     * @returns Matching bracket or undefined
     */
    public static findBracket(symbol: string, notional: number): LeverageBracket | undefined {
        const brackets = this.getBrackets(symbol);
        return brackets.find(b => notional >= b.notionalFloor && notional < b.notionalCap);
    }

    /**
     * Get maximum leverage for a given notional
     * 
     * @param symbol - Trading symbol
     * @param notional - Position notional value
     * @returns Maximum allowed leverage
     */
    public static getMaxLeverage(symbol: string, notional: number): number {
        const bracket = this.findBracket(symbol, notional);
        return bracket?.initialLeverage || 1;
    }

    /**
     * Validate leverage for a position
     * 
     * @param symbol - Trading symbol
     * @param leverage - Requested leverage
     * @param notional - Position notional value
     * @returns Validation result
     */
    public static validateLeverage(
        symbol: string,
        leverage: number,
        notional: number
    ): LeverageValidationResult {
        const bracket = this.findBracket(symbol, notional);
        const maxAllowed = bracket?.initialLeverage || 1;
        const valid = leverage <= maxAllowed;

        const result: LeverageValidationResult = {
            valid,
            maxAllowed,
            bracket,
            message: valid
                ? `Leverage ${leverage}x is valid for notional ${notional.toFixed(2)} USDT`
                : `Leverage ${leverage}x exceeds maximum ${maxAllowed}x for notional ${notional.toFixed(2)} USDT`
        };

        logger.debug('Leverage validation', {
            symbol,
            leverage,
            notional,
            maxAllowed,
            valid,
            bracketNumber: bracket?.bracket
        });

        return result;
    }

    /**
     * Get recommended leverage for a position (70% of max)
     * 
     * @param symbol - Trading symbol
     * @param notional - Position notional value
     * @returns Recommended leverage
     */
    public static getRecommendedLeverage(symbol: string, notional: number): number {
        const maxLeverage = this.getMaxLeverage(symbol, notional);
        return Math.floor(maxLeverage * 0.70);
    }

    /**
     * Clear cached brackets (for refresh)
     */
    public static clearCache(): void {
        symbolBrackets.clear();
        logger.info('Leverage bracket cache cleared');
    }
}
