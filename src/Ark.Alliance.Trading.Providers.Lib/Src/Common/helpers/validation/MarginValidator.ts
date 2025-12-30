/**
 * Margin Validator
 * 
 * **Responsibility:** Validate margin availability before placing orders
 * 
 * **Purpose:** Prevent Error -2019 (Margin Insufficient) from Binance API
 * 
 * @module common/validation/MarginValidator
 */

import { logger } from '../logger';

export interface MarginCalculationResult {
    /** True if sufficient margin is available */
    isAvailable: boolean;

    /** Required margin for the order */
    requiredMargin: number;

    /** Available margin in account */
    availableMargin: number;

    /** Message describing the result */
    message: string;

    /** Detailed breakdown */
    details: {
        notional: number;
        leverage: number;
        initialMargin: number;
        maintenanceMargin: number;
        bufferRecommended: number;
    };
}

export class MarginValidator {
    /**
     * Validate margin availability for an order
     * 
     * @param price - Order price
     * @param quantity - Order quantity
     * @param leverage - Leverage multiplier
     * @param accountInfo - Account info from /fapi/v2/account
     * @param includeSafetyBuffer - Whether to include 10% safety buffer
     * @returns Margin calculation result
     */
    public static async validateMarginAvailability(
        price: number,
        quantity: number,
        leverage: number,
        accountInfo: any,
        includeSafetyBuffer: boolean = true
    ): Promise<MarginCalculationResult> {
        try {
            const notional = price * quantity;
            const initialMargin = notional / leverage;

            // Maintenance margin is typically 0.4% for most pairs
            const maintenanceMarginRate = 0.004;
            const maintenanceMargin = notional * maintenanceMarginRate;

            // Add safety buffer if requested
            const bufferMultiplier = includeSafetyBuffer ? 1.10 : 1.0;
            const requiredMargin = initialMargin * bufferMultiplier;

            // Get available margin from account info
            const availableMargin = parseFloat(accountInfo?.availableBalance || '0');

            const isAvailable = availableMargin >= requiredMargin;

            const result: MarginCalculationResult = {
                isAvailable,
                requiredMargin,
                availableMargin,
                message: isAvailable
                    ? `Margin check passed: ${requiredMargin.toFixed(4)} USDT required, ${availableMargin.toFixed(4)} USDT available`
                    : `Insufficient margin: ${requiredMargin.toFixed(4)} USDT required, only ${availableMargin.toFixed(4)} USDT available (shortage: ${(requiredMargin - availableMargin).toFixed(4)} USDT)`,
                details: {
                    notional,
                    leverage,
                    initialMargin,
                    maintenanceMargin,
                    bufferRecommended: initialMargin * 0.10
                }
            };

            logger.debug('Margin validation completed', {
                price,
                quantity,
                leverage,
                notional,
                requiredMargin,
                availableMargin,
                isAvailable
            });

            return result;
        } catch (error: any) {
            logger.error('Error validating margin', { error: error.message });
            throw error;
        }
    }

    /**
     * Calculate maximum quantity for available margin
     * 
     * @param price - Order price
     * @param leverage - Leverage multiplier
     * @param availableMargin - Available margin
     * @param safetyFactor - Safety factor (default 0.90 for 10% buffer)
     * @returns Maximum quantity that can be ordered
     */
    public static calculateMaxQuantity(
        price: number,
        leverage: number,
        availableMargin: number,
        safetyFactor: number = 0.90
    ): number {
        const usableMargin = availableMargin * safetyFactor;
        const maxNotional = usableMargin * leverage;
        return maxNotional / price;
    }
}
