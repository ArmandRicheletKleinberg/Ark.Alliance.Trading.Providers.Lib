/**
 * @fileoverview Symbol Information Cache
 * @module domain/cache/SymbolInfoCache
 *
 * Stores symbol information from exchangeInfo for order validation.
 * Essential for ensuring price/quantity conform to exchange rules.
 *
 * @remarks
 * - Prevents "precision over maximum" errors
 * - Validates order parameters against symbol filters
 * - Provides rounding helpers for tick/step sizes
 *
 * @example
 * ```typescript
 * const cache = new SymbolInfoCache();
 * cache.updateFromExchangeInfo(exchangeInfo.symbols);
 * 
 * const validPrice = cache.roundToTickSize('BTCUSDT', 50123.456);
 * const validQty = cache.roundToStepSize('BTCUSDT', 0.00123);
 * ```
 */

import { BaseDomainCache } from './Base/BaseDomainCache';
import { CacheConfig } from '../../../Common/helpers/cache/CacheConfig';
import { LoggingService } from '../../../Common/helpers/logging/LoggingService';
import { LogLevel } from '../../../Common/helpers/logging/LogLevel';
import {
    ExchangeSymbol,
    PriceFilter,
    LotSizeFilter,
    MarketLotSizeFilter,
    MinNotionalFilter,
    SymbolFilter
} from '../../dtos/marketData/ExchangeInfo';

/**
 * Symbol info cache configuration.
 */
export interface SymbolInfoCacheConfig extends CacheConfig {
    // No additional config needed currently
}

/**
 * Symbol Information Cache - Stores exchange info for order validation.
 *
 * @extends BaseDomainCache<string, ExchangeSymbol>
 *
 * @remarks
 * Key: symbol name (e.g., "BTCUSDT")
 * Value: Complete ExchangeSymbol from exchangeInfo
 */
export class SymbolInfoCache extends BaseDomainCache<string, ExchangeSymbol> {
    /** Logger instance. */
    private readonly logger: LoggingService;

    /**
     * Creates a new SymbolInfoCache instance.
     *
     * @param config - Optional cache configuration.
     */
    constructor(config?: SymbolInfoCacheConfig) {
        super({
            name: 'SymbolInfoCache',
            defaultTtlMs: 0, // No TTL - exchangeInfo rarely changes
            ...config
        });
        this.logger = new LoggingService({ minLevel: LogLevel.DEBUG }, 'SymbolInfoCache');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Data Loading
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Updates cache from exchangeInfo response.
     *
     * @param symbols - Array of symbols from exchangeInfo.
     */
    public updateFromExchangeInfo(symbols: ExchangeSymbol[]): void {
        for (const symbol of symbols) {
            this.set(symbol.symbol, symbol);
        }
        this.logger.info(`Loaded ${symbols.length} symbols`);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Symbol Info Retrieval
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Gets symbol information.
     *
     * @param symbol - Trading symbol (e.g., "BTCUSDT").
     * @returns Symbol info or undefined.
     */
    public getSymbolInfo(symbol: string): ExchangeSymbol | undefined {
        return this.get(symbol);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Filter Helpers
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Gets PRICE_FILTER for a symbol.
     *
     * @param symbol - Trading symbol.
     * @returns Price filter or undefined.
     */
    public getPriceFilter(symbol: string): PriceFilter | undefined {
        const info = this.getSymbolInfo(symbol);
        return info?.filters.find(f => f.filterType === 'PRICE_FILTER') as PriceFilter | undefined;
    }

    /**
     * Gets LOT_SIZE filter for a symbol.
     *
     * @param symbol - Trading symbol.
     * @returns Lot size filter or undefined.
     */
    public getLotSizeFilter(symbol: string): LotSizeFilter | undefined {
        const info = this.getSymbolInfo(symbol);
        return info?.filters.find(f => f.filterType === 'LOT_SIZE') as LotSizeFilter | undefined;
    }

    /**
     * Gets MARKET_LOT_SIZE filter for a symbol.
     *
     * @param symbol - Trading symbol.
     * @returns Market lot size filter or undefined.
     */
    public getMarketLotSizeFilter(symbol: string): MarketLotSizeFilter | undefined {
        const info = this.getSymbolInfo(symbol);
        return info?.filters.find(f => f.filterType === 'MARKET_LOT_SIZE') as MarketLotSizeFilter | undefined;
    }

    /**
     * Gets MIN_NOTIONAL filter for a symbol.
     *
     * @param symbol - Trading symbol.
     * @returns Min notional filter or undefined.
     */
    public getMinNotionalFilter(symbol: string): MinNotionalFilter | undefined {
        const info = this.getSymbolInfo(symbol);
        return info?.filters.find(f => f.filterType === 'MIN_NOTIONAL') as MinNotionalFilter | undefined;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Validation Methods
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Validates price against PRICE_FILTER.
     *
     * @param symbol - Trading symbol.
     * @param price - Price to validate.
     * @returns True if valid.
     */
    public validatePrice(symbol: string, price: number): boolean {
        const filter = this.getPriceFilter(symbol);
        if (!filter) return true; // No filter = allow

        const tickSize = parseFloat(filter.tickSize);
        const minPrice = parseFloat(filter.minPrice);
        const maxPrice = parseFloat(filter.maxPrice);

        // Check range
        if (price < minPrice || price > maxPrice) return false;

        // Check tick size: price % tickSize must equal 0
        const remainder = price % tickSize;
        return Math.abs(remainder) < 1e-8; // Floating point tolerance
    }

    /**
     * Validates quantity against LOT_SIZE filter.
     *
     * @param symbol - Trading symbol.
     * @param quantity - Quantity to validate.
     * @returns True if valid.
     */
    public validateQuantity(symbol: string, quantity: number): boolean {
        const filter = this.getLotSizeFilter(symbol);
        if (!filter) return true; // No filter = allow

        const stepSize = parseFloat(filter.stepSize);
        const minQty = parseFloat(filter.minQty);
        const maxQty = parseFloat(filter.maxQty);

        // Check range
        if (quantity < minQty || quantity > maxQty) return false;

        // Check step size: quantity % stepSize must equal 0
        const remainder = quantity % stepSize;
        return Math.abs(remainder) < 1e-8; // Floating point tolerance
    }

    /**
     * Validates notional value (price * quantity).
     *
     * @param symbol - Trading symbol.
     * @param price - Order price.
     * @param quantity - Order quantity.
     * @returns True if valid.
     */
    public validateNotional(symbol: string, price: number, quantity: number): boolean {
        const filter = this.getMinNotionalFilter(symbol);
        if (!filter) return true; // No filter = allow

        const notional = price * quantity;
        const minNotional = parseFloat(filter.notional);

        return notional >= minNotional;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Rounding Helpers
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Rounds price to valid tick size.
     *
     * @param symbol - Trading symbol.
     * @param price - Price to round.
     * @returns Rounded price.
     */
    public roundToTickSize(symbol: string, price: number): number {
        const filter = this.getPriceFilter(symbol);
        if (!filter) return price;

        const tickSize = parseFloat(filter.tickSize);
        return Math.floor(price / tickSize) * tickSize;
    }

    /**
     * Rounds quantity to valid step size.
     *
     * @param symbol - Trading symbol.
     * @param quantity - Quantity to round.
     * @returns Rounded quantity.
     */
    public roundToStepSize(symbol: string, quantity: number): number {
        const filter = this.getLotSizeFilter(symbol);
        if (!filter) return quantity;

        const stepSize = parseFloat(filter.stepSize);
        return Math.floor(quantity / stepSize) * stepSize;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Utility Methods
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Gets all cached symbol names.
     *
     * @returns Array of symbol names.
     */
    public getAllSymbols(): string[] {
        return this.keys();
    }

    /**
     * Checks if symbol exists in cache.
     *
     * @param symbol - Trading symbol.
     * @returns True if symbol info is cached.
     */
    public hasSymbol(symbol: string): boolean {
        return this.has(symbol);
    }

    /**
     * Gets cache statistics.
     *
     * @returns Statistics including symbol count.
     */
    public getSymbolStats(): {
        totalSymbols: number;
        tradingSymbols: number;
        symbols: string[];
    } {
        const allSymbols = this.getAllSymbols();
        const tradingSymbols = allSymbols.filter(s => {
            const info = this.getSymbolInfo(s);
            return info?.status === 'TRADING';
        });

        return {
            totalSymbols: allSymbols.length,
            tradingSymbols: tradingSymbols.length,
            symbols: tradingSymbols
        };
    }
}
