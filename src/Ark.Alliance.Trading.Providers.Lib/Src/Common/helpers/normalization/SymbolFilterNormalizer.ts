/**
 * Symbol Filter Normalizer
 * 
 * Normalizes prices and quantities according to symbol-specific exchange filters.
 * 
 * **Business Logic:** Each symbol on Binance Futures has specific rules for:
 * - PRICE_FILTER: min price, max price, tick size
 * - LOT_SIZE: min quantity, max quantity, step size
 * - MIN_NOTIONAL: minimum order value (price * quantity)
 * 
 * This class ensures all order parameters comply with these rules before submission.
 * 
 * Ported from C# Ark.Trading.Common.Normalization.SymbolFilterNormalizer
 * @see file:///C:/Repos/Monitor/src/Ark.Trading.Common/Normalization/SymbolFilterNormalizer.cs
 */

import { PricePrecisionHelper } from './PricePrecisionHelper';
import { SymbolFilters, PriceFilter, LotSizeFilter, MinNotionalFilter } from '../types';

export interface NormalizedPrice {
    original: number;
    normalized: number;
    decimals: number;
    tickSize: number;
    wasAdjusted: boolean;
    /** Price is below minPrice (may be rejected by exchange, but not modified) */
    belowMinPrice?: boolean;
}

export interface NormalizedQuantity {
    original: number;
    normalized: number;
    decimals: number;
    stepSize: number;
    wasAdjusted: boolean;
}

export interface NotionalValidation {
    isValid: boolean;
    actual: number;
    required: number;
    message?: string;
}

export class SymbolFilterNormalizer {

    /**
     * Normalizes a price according to PRICE_FILTER rules.
     * 
     * @param symbolFilters - Symbol filter configuration
     * @param price - Raw price to normalize
     * @returns Normalized price with metadata
     * @throws {Error} If PRICE_FILTER is not defined for the symbol
     * 
     * **Steps:**
     * 1. Round price to tickSize
     * 2. Clamp to minPrice/maxPrice
     * 3. Calculate decimal places from tickSize
     * 
     * **Example:**
     * ```typescript
     * const filters = { priceFilter: { tickSize: '0.01', minPrice: '1', maxPrice: '100000' } };
     * normalizePrice(filters, 50.123);
     * // → { original: 50.123, normalized: 50.12, decimals: 2, tickSize: 0.01, wasAdjusted: true }
     * ```
     */
    public static normalizePrice(
        symbolFilters: SymbolFilters,
        price: number
    ): NormalizedPrice {
        const priceFilter = symbolFilters.priceFilter;

        if (!priceFilter) {
            throw new Error(`PRICE_FILTER not found for symbol ${symbolFilters.symbol}`);
        }

        const tickSize = parseFloat(priceFilter.tickSize);
        const minPrice = parseFloat(priceFilter.minPrice);
        const maxPrice = parseFloat(priceFilter.maxPrice);

        // Round to tick size (floor to avoid exceeding max price or precision issues)
        let normalized = PricePrecisionHelper.floorToStep(price, tickSize);

        // IMPORTANT: Do NOT clamp to minPrice if it would significantly change the price
        // TESTNET often has outdated/incorrect minPrice values (e.g., 261.10 when market is 130.51)
        // Only clamp to maxPrice to prevent exceeding maximum allowed
        if (normalized > maxPrice) {
            normalized = maxPrice;
        }

        // Warn but don't modify if price is below minPrice (let Binance reject if truly invalid)
        const belowMinPrice = normalized < minPrice;

        // Calculate decimals from original string to preserve trailing zeros
        const decimals = PricePrecisionHelper.countDecimalsFromString(priceFilter.tickSize);

        return {
            original: price,
            normalized,
            decimals,
            tickSize,
            wasAdjusted: Math.abs(price - normalized) > Number.EPSILON,
            belowMinPrice // Add flag to indicate warning
        };
    }

    /**
     * Normalizes a quantity according to LOT_SIZE rules.
     * 
     * @param symbolFilters - Symbol filter configuration
     * @param quantity - Raw quantity to normalize
     * @param roundDown - If true, floors to step size. If false, rounds to nearest
     * @returns Normalized quantity with metadata
     * @throws {Error} If LOT_SIZE filter is not defined for the symbol
     * 
     * **Important:** For SELL orders, always floor quantity to avoid exceeding position size.
     * For BUY orders, you may round to nearest.
     * 
     * **Example:**
     * ```typescript
     * const filters = { lotSizeFilter: { stepSize: '0.001', minQty: '0.001', maxQty: '10000' } };
     * normalizeQuantity(filters, 1.2345, true);
     * // → { original: 1.2345, normalized: 1.234, decimals: 3, stepSize: 0.001, wasAdjusted: true }
     * ```
     */
    public static normalizeQuantity(
        symbolFilters: SymbolFilters,
        quantity: number,
        roundDown: boolean = true
    ): NormalizedQuantity {
        const lotSizeFilter = symbolFilters.lotSizeFilter;

        if (!lotSizeFilter) {
            throw new Error(`LOT_SIZE filter not found for symbol ${symbolFilters.symbol}`);
        }

        const stepSize = parseFloat(lotSizeFilter.stepSize);
        const minQty = parseFloat(lotSizeFilter.minQty);
        const maxQty = parseFloat(lotSizeFilter.maxQty);

        // Round to step size (floor for safety on sells)
        let normalized = roundDown
            ? PricePrecisionHelper.floorToStep(quantity, stepSize)
            : PricePrecisionHelper.roundToStep(quantity, stepSize);

        // Clamp to min/max
        normalized = PricePrecisionHelper.clamp(normalized, minQty, maxQty);

        // Calculate decimals from original string to preserve trailing zeros
        const decimals = PricePrecisionHelper.countDecimalsFromString(lotSizeFilter.stepSize);

        return {
            original: quantity,
            normalized,
            decimals,
            stepSize,
            wasAdjusted: Math.abs(quantity - normalized) > Number.EPSILON
        };
    }

    /**
     * Validates if an order meets MIN_NOTIONAL requirements.
     * 
     * @param symbolFilters - Symbol filter configuration
     * @param price - Order price
     * @param quantity - Order quantity
     * @returns Validation result with notional values
     * 
     * **Notional Calculation:** notional = price * quantity
     * 
     * **Business Rule:** Binance rejects orders where notional < minNotional.
     * This prevents dust orders that are too small to be meaningful.
     * 
     * **Example:**
     * ```typescript
     * const filters = { minNotionalFilter: { notional: '10' } };
     * validateNotional(filters, 5, 1);
     * // → { isValid: false, actual: 5, required: 10, message: 'Notional 5 < minimum 10' }
     * ```
     */
    public static validateNotional(
        symbolFilters: SymbolFilters,
        price: number,
        quantity: number
    ): NotionalValidation {
        const minNotionalFilter = symbolFilters.minNotionalFilter;

        if (!minNotionalFilter) {
            // No MIN_NOTIONAL filter means any notional is acceptable
            return {
                isValid: true,
                actual: price * quantity,
                required: 0
            };
        }

        const minNotional = parseFloat(minNotionalFilter.notional);
        const actualNotional = price * quantity;
        const isValid = actualNotional >= minNotional;

        return {
            isValid,
            actual: actualNotional,
            required: minNotional,
            message: isValid
                ? undefined
                : `Notional ${actualNotional.toFixed(2)} is below minimum ${minNotional.toFixed(2)}`
        };
    }

    /**
     * Calculates minimum quantity needed to meet MIN_NOTIONAL at a given price.
     * 
     * @param symbolFilters - Symbol filter configuration
     * @param price - Order price
     * @returns Minimum quantity, rounded up to step size
     * 
     * **Use Case:** When placing a market order, determine minimum quantity
     * that will be accepted by the exchange.
     * 
     * **Example:**
     * ```typescript
     * const filters = {
     *   minNotionalFilter: { notional: '10' },
     *   lotSizeFilter: { stepSize: '0.001', minQty: '0.001', maxQty: '10000' }
     * };
     * calculateMinQuantityForNotional(filters, 4.5);
     * // minNotional / price = 10 / 4.5 = 2.222...
     * // Rounded up to stepSize = 2.223
     * ```
     */
    public static calculateMinQuantityForNotional(
        symbolFilters: SymbolFilters,
        price: number
    ): number {
        const minNotionalFilter = symbolFilters.minNotionalFilter;
        const lotSizeFilter = symbolFilters.lotSizeFilter;

        if (!minNotionalFilter || !lotSizeFilter) {
            const minQty = lotSizeFilter ? parseFloat(lotSizeFilter.minQty) : 0;
            return minQty;
        }

        const minNotional = parseFloat(minNotionalFilter.notional);
        const stepSize = parseFloat(lotSizeFilter.stepSize);
        const minQty = parseFloat(lotSizeFilter.minQty);

        // Calculate raw quantity needed
        const rawQuantity = minNotional / price;

        // Round up to step size
        const quantity = PricePrecisionHelper.ceilToStep(rawQuantity, stepSize);

        // Ensure it's at least minQty
        return Math.max(quantity, minQty);
    }

    /**
     * Validates if leverage is within acceptable range.
     * 
     * @param maxLeverage - Maximum leverage for the symbol (from exchange info)
     * @param requestedLeverage - Requested leverage
     * @returns True if leverage is valid (1 to maxLeverage)
     * 
     * **Business Rule:** Leverage must be between 1x and the symbol's max leverage.
     * Most Binance Futures symbols support up to 125x, but some have lower limits.
     * 
     * **Example:**
     * ```typescript
     * validateLeverage(125, 50)   // → true
     * validateLeverage(125, 150)  // → false
     * validateLeverage(20, 50)    // → false (exceeds max)
     * ```
     */
    public static validateLeverage(
        maxLeverage: number,
        requestedLeverage: number
    ): boolean {
        return requestedLeverage >= 1 && requestedLeverage <= maxLeverage;
    }
}
