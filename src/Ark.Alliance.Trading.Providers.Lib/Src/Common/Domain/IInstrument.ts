/**
 * @fileoverview Provider-Agnostic Instrument Interface
 * @module Common/Domain/IInstrument
 *
 * Defines the common instrument interface for representing
 * trading instruments across different providers.
 */

/**
 * Instrument type/kind.
 */
export enum InstrumentType {
    SPOT = 'SPOT',
    PERPETUAL = 'PERPETUAL',
    FUTURE = 'FUTURE',
    OPTION = 'OPTION'
}

/**
 * Option type (for options only).
 */
export enum OptionType {
    CALL = 'CALL',
    PUT = 'PUT'
}

/**
 * Settlement type.
 */
export enum SettlementType {
    LINEAR = 'LINEAR',    // Settled in quote currency (e.g., USDT)
    INVERSE = 'INVERSE'   // Settled in base currency (e.g., BTC)
}

/**
 * Provider-agnostic instrument interface.
 *
 * @remarks
 * Represents a tradeable instrument with all necessary metadata
 * for order placement and position management.
 */
export interface IInstrument {
    /**
     * Symbol/name in provider-specific format.
     * @remarks Binance: "BTCUSDT", Deribit: "BTC-PERPETUAL"
     */
    readonly symbol: string;

    /**
     * Base currency (e.g., "BTC").
     */
    readonly baseCurrency: string;

    /**
     * Quote currency (e.g., "USDT", "USD").
     */
    readonly quoteCurrency: string;

    /**
     * Instrument type.
     */
    readonly type: InstrumentType;

    /**
     * Settlement type (linear or inverse).
     */
    readonly settlementType: SettlementType;

    /**
     * Contract size (1 for spot).
     */
    readonly contractSize: string;

    /**
     * Tick size (minimum price increment).
     */
    readonly tickSize: string;

    /**
     * Lot size (minimum quantity increment).
     */
    readonly lotSize: string;

    /**
     * Minimum order quantity.
     */
    readonly minQuantity: string;

    /**
     * Maximum order quantity.
     */
    readonly maxQuantity: string;

    /**
     * Price precision (decimal places).
     */
    readonly pricePrecision: number;

    /**
     * Quantity precision (decimal places).
     */
    readonly quantityPrecision: number;

    /**
     * Whether the instrument is currently tradeable.
     */
    readonly isTradeable: boolean;

    /**
     * Expiration timestamp for futures/options (undefined for perpetuals/spot).
     */
    readonly expirationTime?: number;

    /**
     * Strike price for options.
     */
    readonly strikePrice?: string;

    /**
     * Option type for options.
     */
    readonly optionType?: OptionType;

    /**
     * Maximum leverage allowed.
     */
    readonly maxLeverage?: number;

    /**
     * Provider-specific data.
     */
    readonly providerData: unknown;
}

/**
 * Parse a Deribit instrument name.
 *
 * @example
 * ```typescript
 * parseDeribitInstrument('BTC-PERPETUAL');
 * // { baseCurrency: 'BTC', type: 'PERPETUAL' }
 *
 * parseDeribitInstrument('BTC-25MAR23-420-C');
 * // { baseCurrency: 'BTC', expiry: '25MAR23', strikePrice: '420', optionType: 'CALL' }
 * ```
 */
export interface ParsedDeribitInstrument {
    readonly baseCurrency: string;
    readonly quoteCurrency: string;
    readonly type: InstrumentType;
    readonly expiry?: string;
    readonly strikePrice?: string;
    readonly optionType?: OptionType;
}

/**
 * Parse a Binance instrument name.
 *
 * @example
 * ```typescript
 * parseBinanceInstrument('BTCUSDT');
 * // { baseCurrency: 'BTC', quoteCurrency: 'USDT' }
 * ```
 */
export interface ParsedBinanceInstrument {
    readonly baseCurrency: string;
    readonly quoteCurrency: string;
    readonly type: InstrumentType;
}
