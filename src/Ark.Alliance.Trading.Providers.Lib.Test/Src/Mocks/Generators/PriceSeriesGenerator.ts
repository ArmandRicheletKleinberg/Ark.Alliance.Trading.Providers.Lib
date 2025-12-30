/**
 * @fileoverview Price Series Generator
 * @module Mocks/Generators/PriceSeriesGenerator
 *
 * Generates realistic price time series for mock testing.
 * Implements Geometric Brownian Motion with optional volatility clustering.
 *
 * @remarks
 * Key features:
 * - Deterministic output with seed for reproducibility
 * - Configurable volatility, drift, and time steps
 * - Optional GARCH-like volatility clustering
 * - Event injection (gaps, flash crash simulation)
 *
 * @example
 * ```typescript
 * const generator = new PriceSeriesGenerator({
 *     startPrice: 50000,
 *     volatility: 0.02,
 *     drift: 0.0001,
 *     steps: 100
 * });
 * const prices = generator.generate();
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for price series generation.
 */
export interface PriceSeriesConfig {
    /** Starting price (e.g., 50000 for BTC) */
    startPrice: number;

    /** Annualized volatility (e.g., 0.5 = 50%) */
    volatility: number;

    /** Annualized drift/expected return (e.g., 0.1 = 10%) */
    drift: number;

    /** Number of price points to generate */
    steps: number;

    /** Time step in seconds (default: 1) */
    stepSize?: number;

    /** Random seed for reproducibility */
    seed?: number;
}

/**
 * GARCH configuration for volatility clustering.
 */
export interface GarchConfig {
    /** Alpha - shock persistence (0-1) */
    alpha: number;

    /** Beta - volatility persistence (0-1) */
    beta: number;

    /** Omega - base variance */
    omega: number;
}

/**
 * Event injection configuration.
 */
export interface PriceEventConfig {
    /** Flash crash probability per step (0-1) */
    flashCrashProbability?: number;

    /** Flash crash magnitude (e.g., 0.05 = 5% drop) */
    flashCrashMagnitude?: number;

    /** Gap probability per step */
    gapProbability?: number;

    /** Gap size as percentage */
    gapMagnitude?: number;
}

/**
 * Generated price point.
 */
export interface PricePoint {
    /** Timestamp (ms) */
    timestamp: number;

    /** Open price */
    open: number;

    /** High price */
    high: number;

    /** Low price */
    low: number;

    /** Close price */
    close: number;

    /** Simulated volume */
    volume: number;
}

/**
 * OHLCV candle data.
 */
export interface OHLCVCandle {
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closeTime: number;
    quoteAssetVolume: string;
    trades: number;
    takerBuyBaseAssetVolume: string;
    takerBuyQuoteAssetVolume: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Seeded Random Number Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simple seeded random number generator (Mulberry32).
 * Provides deterministic pseudo-random numbers for reproducible tests.
 */
class SeededRandom {
    private state: number;

    constructor(seed: number = Date.now()) {
        this.state = seed;
    }

    /**
     * Returns a random number between 0 and 1.
     */
    public next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns a normally distributed random number (Box-Muller transform).
     */
    public nextGaussian(): number {
        const u1 = this.next();
        const u2 = this.next();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }

    /**
     * Returns a random number with Student-t distribution (fat tails).
     * @param df - Degrees of freedom (lower = fatter tails)
     */
    public nextStudentT(df: number = 5): number {
        const normal = this.nextGaussian();
        const chi2 = this.nextChiSquared(df);
        return normal / Math.sqrt(chi2 / df);
    }

    /**
     * Returns chi-squared distributed random number.
     */
    private nextChiSquared(df: number): number {
        let sum = 0;
        for (let i = 0; i < df; i++) {
            const g = this.nextGaussian();
            sum += g * g;
        }
        return sum;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Price Series Generator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generates realistic price time series using Geometric Brownian Motion.
 *
 * @remarks
 * The generator supports:
 * - Basic GBM (Geometric Brownian Motion)
 * - GARCH-like volatility clustering
 * - Fat-tailed returns (Student-t distribution)
 * - Event injection (flash crash, gaps)
 */
export class PriceSeriesGenerator {
    private config: Required<PriceSeriesConfig>;
    private garchConfig?: GarchConfig;
    private eventConfig?: PriceEventConfig;
    private random: SeededRandom;

    /**
     * Creates a new price series generator.
     */
    constructor(
        config: PriceSeriesConfig,
        garchConfig?: GarchConfig,
        eventConfig?: PriceEventConfig
    ) {
        this.config = {
            startPrice: config.startPrice,
            volatility: config.volatility,
            drift: config.drift,
            steps: config.steps,
            stepSize: config.stepSize ?? 1,
            seed: config.seed ?? Date.now()
        };
        this.garchConfig = garchConfig;
        this.eventConfig = eventConfig;
        this.random = new SeededRandom(this.config.seed);
    }

    /**
     * Generates an array of price points.
     */
    public generate(): PricePoint[] {
        const prices: PricePoint[] = [];
        let currentPrice = this.config.startPrice;
        let currentVolatility = this.config.volatility;
        let previousReturn = 0;
        const baseTime = Date.now();

        for (let i = 0; i < this.config.steps; i++) {
            // Calculate return using configured distribution
            const dt = this.config.stepSize / (365 * 24 * 60 * 60); // Convert to year fraction
            const driftComponent = this.config.drift * dt;

            // Update volatility if GARCH enabled
            if (this.garchConfig) {
                currentVolatility = this.updateGarchVolatility(
                    currentVolatility,
                    previousReturn
                );
            }

            // Generate return with fat tails (Student-t)
            const randomShock = this.random.nextStudentT(5);
            const volatilityComponent = currentVolatility * Math.sqrt(dt) * randomShock;
            let logReturn = driftComponent + volatilityComponent;

            // Apply event injection
            if (this.eventConfig) {
                logReturn = this.applyEvents(logReturn);
            }

            previousReturn = logReturn;

            // Calculate new price (geometric)
            const newPrice = currentPrice * Math.exp(logReturn);

            // Generate OHLC with realistic spread
            const spread = Math.abs(logReturn) * currentPrice;
            const high = Math.max(currentPrice, newPrice) + spread * this.random.next();
            const low = Math.min(currentPrice, newPrice) - spread * this.random.next();

            prices.push({
                timestamp: baseTime + i * this.config.stepSize * 1000,
                open: currentPrice,
                high: high,
                low: low,
                close: newPrice,
                volume: this.generateVolume(Math.abs(logReturn))
            });

            currentPrice = newPrice;
        }

        return prices;
    }

    /**
     * Generates OHLCV candles for Binance API mock.
     */
    public generateCandles(): OHLCVCandle[] {
        const pricePoints = this.generate();
        return pricePoints.map((p, i) => ({
            openTime: p.timestamp,
            open: p.open.toFixed(2),
            high: p.high.toFixed(2),
            low: p.low.toFixed(2),
            close: p.close.toFixed(2),
            volume: p.volume.toFixed(4),
            closeTime: p.timestamp + (this.config.stepSize * 1000) - 1,
            quoteAssetVolume: (p.volume * p.close).toFixed(2),
            trades: Math.floor(100 + this.random.next() * 1000),
            takerBuyBaseAssetVolume: (p.volume * 0.5).toFixed(4),
            takerBuyQuoteAssetVolume: (p.volume * p.close * 0.5).toFixed(2)
        }));
    }

    /**
     * Generates a single current price snapshot.
     */
    public generateCurrentPrice(symbol: string = 'BTCUSDT'): {
        symbol: string;
        price: string;
        time: number;
    } {
        const prices = this.generate();
        const lastPrice = prices[prices.length - 1];
        return {
            symbol,
            price: lastPrice.close.toFixed(2),
            time: lastPrice.timestamp
        };
    }

    /**
     * Generates book ticker (best bid/ask).
     */
    public generateBookTicker(symbol: string = 'BTCUSDT'): {
        symbol: string;
        bidPrice: string;
        bidQty: string;
        askPrice: string;
        askQty: string;
        time: number;
    } {
        const prices = this.generate();
        const lastPrice = prices[prices.length - 1].close;
        const spread = lastPrice * 0.0001; // 0.01% spread

        return {
            symbol,
            bidPrice: (lastPrice - spread / 2).toFixed(2),
            bidQty: (this.random.next() * 10).toFixed(3),
            askPrice: (lastPrice + spread / 2).toFixed(2),
            askQty: (this.random.next() * 10).toFixed(3),
            time: Date.now()
        };
    }

    /**
     * Updates volatility using GARCH(1,1) model.
     */
    private updateGarchVolatility(
        currentVol: number,
        previousReturn: number
    ): number {
        if (!this.garchConfig) return currentVol;

        const { alpha, beta, omega } = this.garchConfig;
        const variance = omega +
            alpha * previousReturn * previousReturn +
            beta * currentVol * currentVol;

        return Math.sqrt(variance);
    }

    /**
     * Applies event injection to return.
     */
    private applyEvents(logReturn: number): number {
        if (!this.eventConfig) return logReturn;

        // Flash crash
        if (this.eventConfig.flashCrashProbability &&
            this.random.next() < this.eventConfig.flashCrashProbability) {
            const magnitude = this.eventConfig.flashCrashMagnitude ?? 0.05;
            return logReturn - magnitude;
        }

        // Gap (up or down)
        if (this.eventConfig.gapProbability &&
            this.random.next() < this.eventConfig.gapProbability) {
            const magnitude = this.eventConfig.gapMagnitude ?? 0.02;
            const direction = this.random.next() > 0.5 ? 1 : -1;
            return logReturn + direction * magnitude;
        }

        return logReturn;
    }

    /**
     * Generates realistic volume based on volatility.
     * Higher volatility = higher volume.
     */
    private generateVolume(absReturn: number): number {
        const baseVolume = 100 + this.random.next() * 900;
        const volatilityMultiplier = 1 + absReturn * 100;
        return baseVolume * volatilityMultiplier;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates a default BTC price series generator.
 */
export function createBtcPriceGenerator(steps: number = 100, seed?: number): PriceSeriesGenerator {
    return new PriceSeriesGenerator({
        startPrice: 50000,
        volatility: 0.5,    // 50% annual volatility (typical for BTC)
        drift: 0.0,         // No drift for testing
        steps,
        stepSize: 60,       // 1-minute candles
        seed
    });
}

/**
 * Creates a default ETH price series generator.
 */
export function createEthPriceGenerator(steps: number = 100, seed?: number): PriceSeriesGenerator {
    return new PriceSeriesGenerator({
        startPrice: 3000,
        volatility: 0.6,    // 60% annual volatility
        drift: 0.0,
        steps,
        stepSize: 60,
        seed
    });
}

/**
 * Creates a high-volatility generator for stress testing.
 */
export function createHighVolatilityGenerator(
    startPrice: number,
    steps: number = 100,
    seed?: number
): PriceSeriesGenerator {
    return new PriceSeriesGenerator(
        {
            startPrice,
            volatility: 1.0,    // 100% annual volatility
            drift: 0.0,
            steps,
            stepSize: 1,        // 1-second for high frequency
            seed
        },
        {
            alpha: 0.1,
            beta: 0.85,
            omega: 0.0001
        },
        {
            flashCrashProbability: 0.01,
            flashCrashMagnitude: 0.03,
            gapProbability: 0.02,
            gapMagnitude: 0.015
        }
    );
}
