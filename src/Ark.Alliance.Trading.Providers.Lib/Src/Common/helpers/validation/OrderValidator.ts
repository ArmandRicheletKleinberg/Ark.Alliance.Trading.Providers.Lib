/**
 * Order Validator
 * 
 * **Responsibility:** Complete order validation combining all rules:
 * - Symbol filters (tick/step/notional) via OrderNormalizer
 * - Leverage bracket validation via LeverageBracketManager
 * - Margin availability via MarginValidator
 * 
 * **Purpose:** Single entry point for order validation before API submission
 * 
 * **Usage:** Always call validateCompleteOrder() before placing any order
 * 
 * @module common/validation/OrderValidator
 */

import { OrderNormalizer, OrderParameters, NormalizedOrder } from '../normalization/OrderNormalizer';
import { SymbolFilters } from '../types';
import { MarginValidator, MarginCalculationResult } from './MarginValidator';
import { LeverageBracketManager, LeverageValidationResult } from './LeverageBracketManager';
import { logger } from '../logger';

export interface CompleteOrderValidationResult {
    /** True if order passes all validation checks */
    isValid: boolean;

    /** Critical errors that prevent order placement */
    errors: string[];

    /** Non-critical warnings (order can proceed with caution) */
    warnings: string[];

    /** Normalized order ready for API (if valid) */
    normalizedOrder?: NormalizedOrder;

    /** Margin calculation details */
    marginCheck?: MarginCalculationResult;

    /** Leverage validation details */
    leverageCheck?: LeverageValidationResult;

    /** Validation summary for logging */
    summary: string;
}

export class OrderValidator {
    /**
     * Complete order validation pipeline
     * 
     * **Steps:**
     * 1. Normalize price/quantity according to symbol filters (OrderNormalizer)
     * 2. Validate leverage is within bracket limits (LeverageBracketManager)
     * 3. Check margin availability (MarginValidator)
     * 
     * **Error Prevention:**
     * - Error -2019 (Margin Insufficient) → Step 3
     * - Error -1111 (Precision Invalid) → Step 1
     * - Error -4061 (Leverage Invalid) → Step 2
     * 
     * @param order - Raw order parameters
     * @param symbolFilters - Symbol filter configuration from exchangeInfo
     * @param accountInfo - Account info from /fapi/v2/account
     * @returns Complete validation result
     * 
     * @example
     * ```typescript
     * const validation = await OrderValidator.validateCompleteOrder(
     *   {
     *     symbol: 'BTCUSDT',
     *     side: 'BUY',
     *     type: 'LIMIT',
     *     price: 94500,
     *     quantity: 0.001,
     *     leverage: 20
     *   },
     *   symbolFilters,
     *   accountInfo
     * );
     * 
     * if (!validation.isValid) {
     *   throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
     * }
     * 
     * // Place order using validation.normalizedOrder
     * await binanceClient.placeOrder(validation.normalizedOrder);
     * ```
     */
    public static async validateCompleteOrder(
        order: OrderParameters,
        symbolFilters: SymbolFilters,
        accountInfo: any
    ): Promise<CompleteOrderValidationResult> {
        const errors: string[] = [];
        const warnings: string[] = [];
        const startTime = Date.now();

        logger.debug('Starting complete order validation', {
            symbol: order.symbol,
            side: order.side,
            type: order.type,
            price: order.price,
            quantity: order.quantity,
            leverage: order.leverage
        });

        // ============================================
        // STEP 1: Symbol Filter Normalization
        // ============================================
        const normResult = OrderNormalizer.validateOrder(order, symbolFilters);

        if (!normResult.isValid) {
            logger.warn('Order normalization failed', {
                symbol: order.symbol,
                errors: normResult.errors
            });

            return {
                isValid: false,
                errors: normResult.errors,
                warnings: normResult.warnings,
                summary: `Normalization failed: ${normResult.errors[0]}`
            };
        }

        const normalized = normResult.normalizedOrder!;
        warnings.push(...normResult.warnings);

        // Parse normalized values
        // For MARKET orders, use marketPrice if no normalized price
        const price = parseFloat(normalized.price || '0') || order.marketPrice || 0;
        const qty = parseFloat(normalized.quantity);
        const stopPrice = normalized.stopPrice ? parseFloat(normalized.stopPrice) : undefined;
        const leverage = order.leverage || 20; // Default 20x if not specified

        logger.debug('Normalization successful', {
            originalPrice: order.price,
            normalizedPrice: price,
            originalQty: order.quantity,
            normalizedQty: qty,
            warnings: warnings.length
        });

        // ============================================
        // STEP 2: Leverage Bracket Validation
        // ============================================
        const notional = price * qty;
        const leverageCheck = LeverageBracketManager.validateLeverage(
            order.symbol,
            leverage,
            notional
        );

        if (!leverageCheck.valid) {
            errors.push(leverageCheck.message || 'Leverage validation failed');
            logger.warn('Leverage validation failed', {
                symbol: order.symbol,
                leverage,
                maxAllowed: leverageCheck.maxAllowed,
                notional
            });
        } else {
            logger.debug('Leverage validation passed', {
                leverage,
                maxAllowed: leverageCheck.maxAllowed,
                bracket: leverageCheck.bracket?.bracket
            });
        }

        // ============================================
        // STEP 3: Margin Availability Check
        // ============================================
        let marginCheck: MarginCalculationResult | undefined;

        try {
            marginCheck = await MarginValidator.validateMarginAvailability(
                price,
                qty,
                leverage,
                accountInfo,
                true // Include 10% safety buffer
            );

            if (!marginCheck.isAvailable) {
                errors.push(marginCheck.message);
                logger.error('Margin check failed', {
                    symbol: order.symbol,
                    required: marginCheck.requiredMargin,
                    available: marginCheck.availableMargin,
                    shortage: marginCheck.requiredMargin - marginCheck.availableMargin
                });
            } else {
                logger.debug('Margin check passed', {
                    required: marginCheck.requiredMargin,
                    available: marginCheck.availableMargin,
                    buffer: marginCheck.details.bufferRecommended
                });
            }
        } catch (error: any) {
            errors.push(`Margin validation error: ${error.message}`);
            logger.error('Margin validator threw exception', {
                error: error.message,
                stack: error.stack
            });
        }

        // ============================================
        // STEP 4: Additional Safety Checks
        // ============================================

        // Check stop price is reasonable (for stop orders)
        if (stopPrice && price) {
            const priceDiff = Math.abs(stopPrice - price) / price;
            if (priceDiff > 0.05) { // More than 5% difference
                warnings.push(
                    `Large price gap between stop (${stopPrice}) and limit (${price}): ${(priceDiff * 100).toFixed(2)}%`
                );
            }
        }

        // Check quantity is not too small (dust)
        if (notional < 5) {
            warnings.push(
                `Very small notional value: ${notional.toFixed(2)} USDT. Binance minimum is typically 5-10 USDT`
            );
        }

        // ============================================
        // Generate Summary & Return
        // ============================================
        const duration = Date.now() - startTime;
        const isValid = errors.length === 0;

        let summary: string;
        if (isValid) {
            summary = `✅ Order validated successfully in ${duration}ms (${warnings.length} warnings)`;
        } else {
            summary = `❌ Validation failed: ${errors.length} errors, ${warnings.length} warnings`;
        }

        logger.info('Order validation complete', {
            symbol: order.symbol,
            isValid,
            errors: errors.length,
            warnings: warnings.length,
            duration
        });

        return {
            isValid,
            errors,
            warnings,
            normalizedOrder: isValid ? normalized : undefined,
            marginCheck,
            leverageCheck,
            summary
        };
    }

    /**
     * Quick validation - returns only boolean
     * 
     * @param order - Order parameters
     * @param symbolFilters - Symbol filters
     * @param accountInfo - Account info
     * @returns True if order is valid
     */
    public static async isOrderValid(
        order: OrderParameters,
        symbolFilters: SymbolFilters,
        accountInfo: any
    ): Promise<boolean> {
        const result = await this.validateCompleteOrder(order, symbolFilters, accountInfo);
        return result.isValid;
    }

    /**
     * Validate multiple orders at once
     * 
     * @param orders - Array of orders to validate
     * @param symbolFilters - Symbol filters
     * @param accountInfo - Account info
     * @returns Array of validation results
     */
    public static async validateBatch(
        orders: OrderParameters[],
        symbolFilters: SymbolFilters,
        accountInfo: any
    ): Promise<CompleteOrderValidationResult[]> {
        const results: CompleteOrderValidationResult[] = [];

        for (const order of orders) {
            const result = await this.validateCompleteOrder(order, symbolFilters, accountInfo);
            results.push(result);
        }

        return results;
    }

    /**
     * Get validation errors as user-friendly message
     * 
     * @param result - Validation result
     * @returns Formatted error message
     */
    public static getErrorMessage(result: CompleteOrderValidationResult): string {
        if (result.isValid) {
            return 'Order is valid';
        }

        const errorList = result.errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
        const warningList = result.warnings.length > 0
            ? `\n\nWarnings:\n${result.warnings.map((w, i) => `${i + 1}. ${w}`).join('\n')}`
            : '';

        return `Order Validation Failed:\n\n${errorList}${warningList}`;
    }
}
