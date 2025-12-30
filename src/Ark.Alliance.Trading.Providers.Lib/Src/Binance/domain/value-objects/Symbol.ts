/**
 * @fileoverview Symbol Value Object
 * @module domain/value-objects/Symbol
 *
 * Immutable value object representing a trading symbol with metadata.
 * Encapsulates symbol validation and formatting.
 */

/**
 * Symbol filter information.
 */
export interface SymbolFilters {
    /**
     * Tick size for price increments.
     */
    readonly tickSize: number;

    /**
     * Step size for quantity increments.
     */
    readonly stepSize: number;

    /**
     * Minimum price allowed.
     */
    readonly minPrice: number;

    /**
     * Maximum price allowed.
     */
    readonly maxPrice: number;

    /**
     * Minimum quantity allowed.
     */
    readonly minQty: number;

    /**
     * Maximum quantity allowed.
     */
    readonly maxQty: number;

    /**
     * Minimum notional value (price * quantity).
     */
    readonly minNotional: number;
}

/**
 * Immutable symbol value object with trading pair information.
 *
 * @class TradingSymbol
 *
 * @remarks
 * Represents a trading pair like BTCUSDT with associated filter information.
 *
 * @example
 * ```typescript
 * const symbol = TradingSymbol.create('BTCUSDT', {
 *     tickSize: 0.01,
 *     stepSize: 0.001,
 *     minPrice: 0.01,
 *     maxPrice: 1000000,
 *     minQty: 0.001,
 *     maxQty: 1000,
 *     minNotional: 5
 * });
 *
 * console.log(symbol.name);         // "BTCUSDT"
 * console.log(symbol.baseAsset);    // "BTC"
 * console.log(symbol.quoteAsset);   // "USDT"
 * ```
 */
export class TradingSymbol {
    /**
     * The symbol name (e.g., "BTCUSDT").
     * @readonly
     */
    public readonly name: string;

    /**
     * The base asset (e.g., "BTC").
     * @readonly
     */
    public readonly baseAsset: string;

    /**
     * The quote asset (e.g., "USDT").
     * @readonly
     */
    public readonly quoteAsset: string;

    /**
     * Symbol filter constraints.
     * @readonly
     */
    public readonly filters: SymbolFilters;

    /**
     * Private constructor - use static factory methods.
     */
    private constructor(name: string, filters: SymbolFilters) {
        this.name = name.toUpperCase();
        this.filters = filters;

        // Parse base and quote assets
        // Common quote assets: USDT, BUSD, BTC, ETH
        const quoteAssets = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];
        let foundQuote = '';

        for (const quote of quoteAssets) {
            if (this.name.endsWith(quote)) {
                foundQuote = quote;
                break;
            }
        }

        this.quoteAsset = foundQuote || 'USDT';
        this.baseAsset = this.name.slice(0, this.name.length - this.quoteAsset.length);
    }

    /**
     * Creates a TradingSymbol value object.
     *
     * @param name - The symbol name (e.g., "BTCUSDT").
     * @param filters - Symbol filter constraints.
     * @returns A new TradingSymbol instance.
     */
    public static create(name: string, filters: SymbolFilters): TradingSymbol {
        return new TradingSymbol(name, filters);
    }

    /**
     * Creates a TradingSymbol with default filters.
     *
     * @param name - The symbol name.
     * @returns A new TradingSymbol with default filters.
     */
    public static withDefaults(name: string): TradingSymbol {
        return new TradingSymbol(name, {
            tickSize: 0.01,
            stepSize: 0.001,
            minPrice: 0,
            maxPrice: 0,
            minQty: 0.001,
            maxQty: 0,
            minNotional: 5
        });
    }

    /**
     * Checks if this symbol equals another.
     *
     * @param other - The symbol to compare with.
     * @returns True if symbol names are equal.
     */
    public equals(other: TradingSymbol): boolean {
        return this.name === other.name;
    }

    /**
     * Checks if a symbol name matches this symbol.
     *
     * @param symbolName - The symbol name to check.
     * @returns True if names match (case-insensitive).
     */
    public matches(symbolName: string): boolean {
        return this.name === symbolName.toUpperCase();
    }

    /**
     * Returns the symbol name as a string.
     *
     * @returns The symbol name.
     */
    public toString(): string {
        return this.name;
    }

    /**
     * Returns JSON representation.
     *
     * @returns Object with symbol details.
     */
    public toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            baseAsset: this.baseAsset,
            quoteAsset: this.quoteAsset,
            filters: this.filters
        };
    }
}
