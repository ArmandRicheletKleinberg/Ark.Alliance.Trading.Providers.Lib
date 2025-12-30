/**
 * Order Normalizer
 * 
 * Provides high-level order normalization and validation combining all filter rules.
 * 
 * **Business Logic:** This is the main entry point for order normalization.
 * It orchestrates price/quantity normalization and validates all exchange rules
 * before an order is submitted to Binance.
 * 
 * **Use Case:** Call normalizeOrder() before placing any order to ensure compliance.
 */

import { SymbolFilters } from '../types';
import { SymbolFilterNormalizer, NormalizedPrice, NormalizedQuantity, NotionalValidation } from './SymbolFilterNormalizer';
import { PricePrecisionHelper } from './PricePrecisionHelper';

// TODO: SystemSettingsRepository was removed - using hardcoded defaults
// Consider injecting configuration through constructor or adding config parameter
const DEFAULT_MAX_LEVERAGE = 125;

export interface OrderParameters {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET';
    price?: number;
    quantity: number;
    stopPrice?: number;
    leverage?: number;
    /** Current market price for MARKET orders (used for notional validation) */
    marketPrice?: number;
    /** Time in force for LIMIT orders */
    timeInForce?: 'GTC' | 'IOC' | 'FOK' | 'GTX';
    /** Working type for STOP orders */
    workingType?: 'CONTRACT_PRICE' | 'MARK_PRICE';
}


export interface NormalizedOrder {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: string;
    price?: string;
    quantity: string;
    stopPrice?: string;
    leverage?: number;
    timeInForce?: string;
    workingType?: 'CONTRACT_PRICE' | 'MARK_PRICE';

    // Metadata
    priceInfo?: NormalizedPrice;
    quantityInfo: NormalizedQuantity;
    notionalValidation: NotionalValidation;
    warnings: string[];
}

export interface OrderValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    normalizedOrder?: NormalizedOrder;
}

export class OrderNormalizer {

    /**
     * Normalizes an order according to symbol filters.
     * 
// ... (omitting lines for brevity if possible, or I should include enough context)
// Re-reading instructions: "ReplacementContent" must be complete drop-in replacement of TargetContent.
// I will just replace the interface part and the return statement.
// Since they are far apart, I might need multi_replace.
// I'll stick to replace_file_content for the interface first if possible, or just use multi_replace.
// Let's use multi_replace for safety.


export interface OrderValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    normalizedOrder?: NormalizedOrder;
}

export class OrderNormalizer {

    /**
     * Normalizes an order according to symbol filters.
     * 
     * @param order - Raw order parameters
     * @param symbolFilters - Symbol filter configuration
     * @returns Normalized order ready for API submission
     * 
     * **Steps:**
     * 1. Normalize price (if LIMIT order)
     * 2. Normalize quantity (floor for SELL, round for BUY)
     * 3. Normalize stop price (if stop order)
     * 4. Validate notional
     * 5. Format all numeric values to correct decimal places
     * 
     * **Example:**
     * ```typescript
     * const order = { symbol: 'BTCUSDT', side: 'BUY', type: 'LIMIT', price: 50123.456, quantity: 1.2345 };
     * const filters = getSymbolFilters('BTCUSDT');
     * const normalized = normalizeOrder(order, filters);
     * // → { price: '50123.45', quantity: '1.234', ... }
     * ```
     */
    public static normalizeOrder(
        order: OrderParameters,
        symbolFilters: SymbolFilters
    ): NormalizedOrder {
        const warnings: string[] = [];

        // Normalize quantity (always required)
        // Always floor quantity to avoid exceeding wallet balance or position size
        const roundDown = true;
        const quantityInfo = SymbolFilterNormalizer.normalizeQuantity(
            symbolFilters,
            order.quantity,
            roundDown
        );

        if (quantityInfo.wasAdjusted) {
            warnings.push(
                `Quantity adjusted from ${quantityInfo.original} to ${quantityInfo.normalized}`
            );
        }

        // Normalize price (for LIMIT orders)
        let priceInfo: NormalizedPrice | undefined;
        let normalizedPrice: string | undefined;

        if (order.price !== undefined) {
            priceInfo = SymbolFilterNormalizer.normalizePrice(symbolFilters, order.price);
            normalizedPrice = priceInfo.normalized.toFixed(priceInfo.decimals);

            if (priceInfo.wasAdjusted) {
                warnings.push(
                    `Price adjusted from ${priceInfo.original} to ${priceInfo.normalized}`
                );
            }
        }

        // Normalize stop price (for stop orders)
        let normalizedStopPrice: string | undefined;
        if (order.stopPrice !== undefined) {
            const stopPriceInfo = SymbolFilterNormalizer.normalizePrice(
                symbolFilters,
                order.stopPrice
            );
            normalizedStopPrice = stopPriceInfo.normalized.toFixed(stopPriceInfo.decimals);

            if (stopPriceInfo.wasAdjusted) {
                warnings.push(
                    `Stop price adjusted from ${order.stopPrice} to ${stopPriceInfo.normalized}`
                );
            }
        }

        // Validate notional (use normalized price, or market price for MARKET orders)
        const effectivePrice = priceInfo?.normalized || order.price || order.marketPrice || 0;
        const notionalValidation = SymbolFilterNormalizer.validateNotional(
            symbolFilters,
            effectivePrice,
            quantityInfo.normalized
        );

        if (!notionalValidation.isValid) {
            warnings.push(notionalValidation.message || 'Notional validation failed');
        }

        // Format quantity to correct decimal places
        const normalizedQuantity = quantityInfo.normalized.toFixed(quantityInfo.decimals);

        return {
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            price: normalizedPrice,
            quantity: normalizedQuantity,
            stopPrice: normalizedStopPrice,
            leverage: order.leverage,
            timeInForce: order['timeInForce'], // Pass through optional param
            workingType: order.workingType,    // Pass through for STOP orders
            priceInfo,
            quantityInfo,
            notionalValidation,
            warnings
        };
    }

    /**
     * Validates an order and returns detailed validation result.
     * 
     * @param order - Raw order parameters
     * @param symbolFilters - Symbol filter configuration
     * @returns Validation result with errors, warnings, and normalized order
     * 
     * **Validation Checks:**
     * - Symbol filters exist
     * - Price is within min/max (LIMIT orders)
     * - Quantity is within min/max
     * - Notional meets minimum requirement
     * - Leverage is valid (if specified)
     * 
     * **Example:**
     * ```typescript
     * const result = validateOrder(order, filters);
     * if (!result.isValid) {
     *   console.error('Order validation failed:', result.errors);
     *   return;
     * }
     * await placeOrder(result.normalizedOrder);
     * ```
     */
    public static validateOrder(
        order: OrderParameters,
        symbolFilters: SymbolFilters
    ): OrderValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validate symbol filters exist
        if (!symbolFilters.lotSizeFilter) {
            errors.push(`LOT_SIZE filter not found for symbol ${order.symbol}`);
        }

        if (order.price !== undefined && !symbolFilters.priceFilter) {
            errors.push(`PRICE_FILTER not found for symbol ${order.symbol}`);
        }

        // If basic filters missing, can't continue
        if (errors.length > 0) {
            return {
                isValid: false,
                errors,
                warnings
            };
        }

        // Normalize the order
        let normalizedOrder: NormalizedOrder;
        try {
            normalizedOrder = this.normalizeOrder(order, symbolFilters);
            warnings.push(...normalizedOrder.warnings);
        } catch (error: any) {
            errors.push(`Normalization failed: ${error.message}`);
            return {
                isValid: false,
                errors,
                warnings
            };
        }

        // Validate notional
        if (!normalizedOrder.notionalValidation.isValid) {
            errors.push(
                normalizedOrder.notionalValidation.message ||
                `Notional ${normalizedOrder.notionalValidation.actual} below minimum ${normalizedOrder.notionalValidation.required}`
            );
        }

        // Validate quantity is not zero after normalization
        if (normalizedOrder.quantityInfo.normalized === 0) {
            errors.push(
                `Quantity ${order.quantity} is too small and rounds to zero (step size: ${normalizedOrder.quantityInfo.stepSize})`
            );
        }

        // Validate leverage if specified
        if (order.leverage !== undefined) {
            // Use default max leverage - consider making this configurable
            const maxLeverage = DEFAULT_MAX_LEVERAGE;

            if (!SymbolFilterNormalizer.validateLeverage(maxLeverage, order.leverage)) {
                errors.push(
                    `Leverage ${order.leverage} is invalid (must be between 1 and ${maxLeverage})`
                );
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            normalizedOrder: errors.length === 0 ? normalizedOrder : undefined
        };
    }

    /**
     * Calculates notional value of an order.
     * 
     * @param price - Order price
     * @param quantity - Order quantity
     * @returns Notional value (price * quantity)
     * 
     * **Use Case:** Quick notional calculation for validation.
     * 
     * **Example:**
     * ```typescript
     * calculateNotional(50000, 0.5)  // → 25000
     * ```
     */
    public static calculateNotional(price: number, quantity: number): number {
        return price * quantity;
    }
}
