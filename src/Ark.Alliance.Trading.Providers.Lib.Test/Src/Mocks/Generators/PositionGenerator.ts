/**
 * @fileoverview Position Generator
 * @module Mocks/Generators/PositionGenerator
 *
 * Generates realistic mock position data for all position states and scenarios.
 * Supports long/short positions with profit/loss, liquidation risk, and position transitions.
 *
 * @remarks
 * Design Philosophy (Open/Closed Principle):
 * - Generator is CLOSED to modification (core position logic stable)
 * - Generator is OPEN to extension (new position types via config)
 * - All position states covered for comprehensive non-regression testing
 *
 * Future Considerations:
 * - If adding new position fields: extend MockPositionConfig interface
 * - Do NOT modify existing generator methods signatures
 * - Add new helper methods instead of changing existing ones
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

// Import shared types from OrderGenerator to avoid duplication
import type { MockPositionSide } from './OrderGenerator';

/**
 * Margin type.
 */
export type MockMarginType = 'cross' | 'isolated';

/**
 * Configuration for generating a mock position.
 */
export interface MockPositionConfig {
    symbol?: string;
    positionAmt?: number;
    entryPrice?: number;
    markPrice?: number;
    unRealizedProfit?: number;
    liquidationPrice?: number;
    leverage?: number;
    marginType?: MockMarginType;
    positionSide?: MockPositionSide;
    isolatedMargin?: number;
    notional?: number;
}

/**
 * Binance PositionRisk DTO structure.
 */
export interface MockPositionRisk {
    symbol: string;
    positionAmt: string;
    entryPrice: string;
    markPrice: string;
    unRealizedProfit: string;
    liquidationPrice: string;
    leverage: string;
    maxNotionalValue: string;
    marginType: MockMarginType;
    isolatedMargin: string;
    isAutoAddMargin: string;
    positionSide: MockPositionSide;
    notional: string;
    isolatedWallet: string;
    updateTime: number;
}

/**
 * Position state scenarios for testing.
 */
export type PositionScenario =
    | 'LONG_PROFIT'
    | 'LONG_LOSS'
    | 'SHORT_PROFIT'
    | 'SHORT_LOSS'
    | 'NEUTRAL'
    | 'NEAR_LIQUIDATION'
    | 'HIGH_LEVERAGE'
    | 'MEDIUM_LEVERAGE_25X'
    | 'MEDIUM_LEVERAGE_50X'
    | 'LOW_LEVERAGE';

// ═══════════════════════════════════════════════════════════════════════════════
// Position Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates realistic mock position data for testing.
 *
 * @remarks
 * IMPORTANT: This generator follows the Open/Closed Principle
 * - DO NOT modify existing method signatures
 * - DO extend by adding new methods for new scenarios
 * - All calculations are deterministic for test reproducibility
 */
export class PositionGenerator {
    /**
     * Generates a mock PositionRisk.
     *
     * @remarks
     * Future-proof design: Add new fields to config interface, not this method
     */
    public generatePosition(config: MockPositionConfig = {}): MockPositionRisk {
        const symbol = config.symbol ?? 'BTCUSDT';
        const positionAmt = config.positionAmt ?? 0;
        const entryPrice = config.entryPrice ?? 50000;
        const markPrice = config.markPrice ?? 50000;
        const leverage = config.leverage ?? 10;
        const marginType = config.marginType ?? 'cross';
        const positionSide = config.positionSide ?? 'BOTH';

        // Calculate unrealized PnL if not provided
        const unRealizedProfit = config.unRealizedProfit ??
            this.calculateUnrealizedPnL(positionAmt, entryPrice, markPrice);

        // Calculate liquidation price if not provided
        const liquidationPrice = config.liquidationPrice ??
            this.calculateLiquidationPrice(positionAmt, entryPrice, leverage, marginType);

        // Calculate notional
        const notional = Math.abs(positionAmt * markPrice);

        // Calculate isolated margin
        const isolatedMargin = marginType === 'isolated'
            ? (notional / leverage).toFixed(8)
            : '0';

        return {
            symbol,
            positionAmt: positionAmt.toFixed(3),
            entryPrice: entryPrice.toFixed(2),
            markPrice: markPrice.toFixed(2),
            unRealizedProfit: unRealizedProfit.toFixed(8),
            liquidationPrice: liquidationPrice.toFixed(2),
            leverage: leverage.toString(),
            maxNotionalValue: '1000000',
            marginType,
            isolatedMargin,
            isAutoAddMargin: 'false',
            positionSide,
            notional: notional.toFixed(8),
            isolatedWallet: isolatedMargin,
            updateTime: Date.now()
        };
    }

    /**
     * Generates a long position in profit.
     */
    public generateLongInProfit(
        symbol: string = 'BTCUSDT',
        size: number = 0.01,
        profitPercent: number = 5
    ): MockPositionRisk {
        const entryPrice = 50000;
        const markPrice = entryPrice * (1 + profitPercent / 100);

        return this.generatePosition({
            symbol,
            positionAmt: size,
            entryPrice,
            markPrice,
            positionSide: 'LONG'
        });
    }

    /**
     * Generates a long position in loss.
     */
    public generateLongInLoss(
        symbol: string = 'BTCUSDT',
        size: number = 0.01,
        lossPercent: number = 3
    ): MockPositionRisk {
        const entryPrice = 50000;
        const markPrice = entryPrice * (1 - lossPercent / 100);

        return this.generatePosition({
            symbol,
            positionAmt: size,
            entryPrice,
            markPrice,
            positionSide: 'LONG'
        });
    }

    /**
     * Generates a short position in profit.
     */
    public generateShortInProfit(
        symbol: string = 'ETHUSDT',
        size: number = 0.5,
        profitPercent: number = 5
    ): MockPositionRisk {
        const entryPrice = 3000;
        const markPrice = entryPrice * (1 - profitPercent / 100);

        return this.generatePosition({
            symbol,
            positionAmt: -size,
            entryPrice,
            markPrice,
            positionSide: 'SHORT'
        });
    }

    /**
     * Generates a short position in loss.
     */
    public generateShortInLoss(
        symbol: string = 'ETHUSDT',
        size: number = 0.5,
        lossPercent: number = 3
    ): MockPositionRisk {
        const entryPrice = 3000;
        const markPrice = entryPrice * (1 + lossPercent / 100);

        return this.generatePosition({
            symbol,
            positionAmt: -size,
            entryPrice,
            markPrice,
            positionSide: 'SHORT'
        });
    }

    /**
     * Generates a neutral (no position).
     */
    public generateNeutralPosition(symbol: string = 'BTCUSDT'): MockPositionRisk {
        return this.generatePosition({
            symbol,
            positionAmt: 0,
            entryPrice: 0,
            markPrice: 50000,
            unRealizedProfit: 0,
            liquidationPrice: 0
        });
    }

    /**
     * Generates a position near liquidation (high risk).
     *
     * @remarks
     * CRITICAL: Used for testing liquidation warnings and margin calls
     * DO NOT modify liquidation calculation logic without extensive testing
     */
    public generateNearLiquidation(
        symbol: string = 'BTCUSDT',
        isLong: boolean = true
    ): MockPositionRisk {
        const leverage = 20;
        const entryPrice = 50000;
        const size = isLong ? 0.1 : -0.1;

        // Price very close to liquidation (within 1% of liq price)
        const liquidationPrice = this.calculateLiquidationPrice(
            size,
            entryPrice,
            leverage,
            'isolated'
        );

        const markPrice = isLong
            ? liquidationPrice * 1.01  // Just above liq for long
            : liquidationPrice * 0.99; // Just below liq for short

        return this.generatePosition({
            symbol,
            positionAmt: size,
            entryPrice,
            markPrice,
            leverage,
            marginType: 'isolated',
            liquidationPrice,
            positionSide: isLong ? 'LONG' : 'SHORT'
        });
    }

    /**
     * Generates a high-leverage position (risky).
     */
    public generateHighLeverage(
        symbol: string = 'BTCUSDT',
        size: number = 0.05
    ): MockPositionRisk {
        return this.generatePosition({
            symbol,
            positionAmt: size,
            entryPrice: 50000,
            markPrice: 50500,
            leverage: 125, // Maximum leverage
            marginType: 'cross',
            positionSide: 'LONG'
        });
    }

    /**
     * Generates a medium-leverage position (25x).
     * Common leverage for day traders.
     */
    public generateMediumLeverage25x(
        symbol: string = 'BTCUSDT',
        size: number = 0.1
    ): MockPositionRisk {
        return this.generatePosition({
            symbol,
            positionAmt: size,
            entryPrice: 50000,
            markPrice: 50750,
            leverage: 25,
            marginType: 'cross',
            positionSide: 'LONG'
        });
    }

    /**
     * Generates a medium-leverage position (50x).
     * Higher risk but still manageable.
     */
    public generateMediumLeverage50x(
        symbol: string = 'BTCUSDT',
        size: number = 0.08
    ): MockPositionRisk {
        return this.generatePosition({
            symbol,
            positionAmt: size,
            entryPrice: 50000,
            markPrice: 50500,
            leverage: 50,
            marginType: 'isolated',
            positionSide: 'LONG'
        });
    }

    /**
     * Generates a low-leverage position (conservative).
     *
     * @remarks
     * 1x leverage on futures is similar to spot trading in terms of price risk,
     * but with key differences:
     * - **Short selling**: Easy to short on futures (main benefit)
     * - **Funding rates**: Pay/receive every 8 hours (cost to consider)
     * - **Liquidation**: Still possible but at extreme price moves
     * - **Use cases**: Conservative traders, arbitrage, delta-neutral strategies
     *
     * For testing: This validates the "no leverage" edge case in the system.
     */
    public generateLowLeverage(
        symbol: string = 'BTCUSDT',
        size: number = 1.0
    ): MockPositionRisk {
        return this.generatePosition({
            symbol,
            positionAmt: size,
            entryPrice: 50000,
            markPrice: 51000,
            leverage: 1, // No leverage - similar to spot but with futures benefits
            marginType: 'isolated',
            positionSide: 'LONG'
        });
    }

    /**
     * Generates a position by scenario name.
     */
    public generateByScenario(scenario: PositionScenario): MockPositionRisk {
        switch (scenario) {
            case 'LONG_PROFIT':
                return this.generateLongInProfit();
            case 'LONG_LOSS':
                return this.generateLongInLoss();
            case 'SHORT_PROFIT':
                return this.generateShortInProfit();
            case 'SHORT_LOSS':
                return this.generateShortInLoss();
            case 'NEUTRAL':
                return this.generateNeutralPosition();
            case 'NEAR_LIQUIDATION':
                return this.generateNearLiquidation();
            case 'HIGH_LEVERAGE':
                return this.generateHighLeverage();
            case 'MEDIUM_LEVERAGE_25X':
                return this.generateMediumLeverage25x();
            case 'MEDIUM_LEVERAGE_50X':
                return this.generateMediumLeverage50x();
            case 'LOW_LEVERAGE':
                return this.generateLowLeverage();
        }
    }

    /**
     * Generates all position scenarios for comprehensive testing.
     */
    public generateAllScenarios(): Record<PositionScenario, MockPositionRisk> {
        const scenarios: PositionScenario[] = [
            'LONG_PROFIT', 'LONG_LOSS', 'SHORT_PROFIT', 'SHORT_LOSS',
            'NEUTRAL', 'NEAR_LIQUIDATION', 'HIGH_LEVERAGE',
            'MEDIUM_LEVERAGE_25X', 'MEDIUM_LEVERAGE_50X', 'LOW_LEVERAGE'
        ];

        const positions: Record<string, MockPositionRisk> = {};
        for (const scenario of scenarios) {
            positions[scenario] = this.generateByScenario(scenario);
        }

        return positions as Record<PositionScenario, MockPositionRisk>;
    }

    /**
     * Generates a position transition sequence (open → update → close).
     */
    public generatePositionLifecycle(
        symbol: string,
        isLong: boolean,
        size: number
    ): MockPositionRisk[] {
        const entryPrice = 50000;
        const midPrice = isLong ? 51000 : 49000;
        const exitPrice = isLong ? 52000 : 48000;

        // Open position
        const openPosition = this.generatePosition({
            symbol,
            positionAmt: isLong ? size : -size,
            entryPrice,
            markPrice: entryPrice,
            positionSide: isLong ? 'LONG' : 'SHORT'
        });

        // Update position (in profit)
        const updatePosition = this.generatePosition({
            symbol,
            positionAmt: isLong ? size : -size,
            entryPrice,
            markPrice: midPrice,
            positionSide: isLong ? 'LONG' : 'SHORT'
        });

        // Close position
        const closePosition = this.generateNeutralPosition(symbol);

        return [openPosition, updatePosition, closePosition];
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Private Calculation Methods
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * Calculates unrealized PnL.
     *
     * @remarks
     * IMMUTABLE: Do not modify this formula without full regression testing
     * Formula: (markPrice - entryPrice) * positionAmt
     */
    private calculateUnrealizedPnL(
        positionAmt: number,
        entryPrice: number,
        markPrice: number
    ): number {
        if (positionAmt === 0) return 0;
        return (markPrice - entryPrice) * positionAmt;
    }

    /**
     * Calculates liquidation price.
     *
     * @remarks
     * CRITICAL CALCULATION - DO NOT MODIFY
     * This is a simplified formula. Real Binance calculation is more complex.
     * For testing purposes, this provides realistic approximation.
     */
    private calculateLiquidationPrice(
        positionAmt: number,
        entryPrice: number,
        leverage: number,
        marginType: MockMarginType
    ): number {
        if (positionAmt === 0) return 0;

        const isLong = positionAmt > 0;
        const maintenanceMarginRate = 0.004; // 0.4% for most symbols

        if (marginType === 'cross') {
            // Simplified cross margin liquidation
            const buffer = 1 / leverage;
            return isLong
                ? entryPrice * (1 - buffer + maintenanceMarginRate)
                : entryPrice * (1 + buffer - maintenanceMarginRate);
        } else {
            // Isolated margin liquidation
            const buffer = 1 / leverage;
            return isLong
                ? entryPrice * (1 - buffer)
                : entryPrice * (1 + buffer);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a new PositionGenerator instance.
 */
export function createPositionGenerator(): PositionGenerator {
    return new PositionGenerator();
}

/**
 * Quick helper to generate a simple long position.
 */
export function quickLongPosition(
    symbol: string,
    size: number,
    entryPrice: number
): MockPositionRisk {
    return new PositionGenerator().generatePosition({
        symbol,
        positionAmt: size,
        entryPrice,
        markPrice: entryPrice,
        positionSide: 'LONG'
    });
}

/**
 * Quick helper to generate a simple short position.
 */
export function quickShortPosition(
    symbol: string,
    size: number,
    entryPrice: number
): MockPositionRisk {
    return new PositionGenerator().generatePosition({
        symbol,
        positionAmt: -size,
        entryPrice,
        markPrice: entryPrice,
        positionSide: 'SHORT'
    });
}
