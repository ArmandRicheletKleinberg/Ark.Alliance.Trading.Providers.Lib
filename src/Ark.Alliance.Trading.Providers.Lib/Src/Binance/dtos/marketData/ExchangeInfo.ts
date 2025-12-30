/**
 * @fileoverview Exchange Information Models
 * @module models/marketData/ExchangeInfo
 *
 * Response models for GET /fapi/v1/exchangeInfo endpoint.
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Exchange-Information
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limit Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Rate limit configuration from exchange info.
 */
export interface ExchangeRateLimit {
    /**
     * Rate limit type: REQUEST_WEIGHT, ORDERS, or RAW_REQUESTS.
     */
    rateLimitType: 'REQUEST_WEIGHT' | 'ORDERS' | 'RAW_REQUESTS';

    /**
     * Interval unit: MINUTE, SECOND, DAY.
     */
    interval: 'MINUTE' | 'SECOND' | 'DAY';

    /**
     * Number of intervals.
     */
    intervalNum: number;

    /**
     * Maximum limit for the interval.
     */
    limit: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Asset Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Asset information from exchange info.
 */
export interface ExchangeAsset {
    /**
     * Asset symbol (e.g., "USDT", "BTC").
     */
    asset: string;

    /**
     * Whether the asset can be used as margin in Multi-Assets mode.
     */
    marginAvailable: boolean;

    /**
     * Auto-exchange threshold in Multi-Assets margin mode.
     * Can be null if not applicable.
     */
    autoAssetExchange: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Symbol Filter Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Price filter for symbol.
 */
export interface PriceFilter {
    filterType: 'PRICE_FILTER';
    minPrice: string;
    maxPrice: string;
    tickSize: string;
}

/**
 * Lot size filter for symbol.
 */
export interface LotSizeFilter {
    filterType: 'LOT_SIZE';
    minQty: string;
    maxQty: string;
    stepSize: string;
}

/**
 * Market lot size filter for symbol.
 */
export interface MarketLotSizeFilter {
    filterType: 'MARKET_LOT_SIZE';
    minQty: string;
    maxQty: string;
    stepSize: string;
}

/**
 * Maximum number of orders filter.
 */
export interface MaxNumOrdersFilter {
    filterType: 'MAX_NUM_ORDERS';
    limit: number;
}

/**
 * Minimum notional value filter.
 */
export interface MinNotionalFilter {
    filterType: 'MIN_NOTIONAL';
    notional: string;
}

/**
 * Percent price filter.
 */
export interface PercentPriceFilter {
    filterType: 'PERCENT_PRICE';
    multiplierUp: string;
    multiplierDown: string;
    multiplierDecimal: string;
}

/**
 * Union type for all symbol filters.
 */
export type SymbolFilter =
    | PriceFilter
    | LotSizeFilter
    | MarketLotSizeFilter
    | MaxNumOrdersFilter
    | MinNotionalFilter
    | PercentPriceFilter;

// ═══════════════════════════════════════════════════════════════════════════════
// Symbol Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Contract type enumeration.
 */
export type ContractType =
    | 'PERPETUAL'
    | 'CURRENT_QUARTER'
    | 'NEXT_QUARTER'
    | 'TRADIFI_PERPETUAL';

/**
 * Symbol trading status.
 */
export type SymbolStatus =
    | 'TRADING'
    | 'PRE_TRADING'
    | 'POST_TRADING'
    | 'END_OF_DAY'
    | 'HALT'
    | 'BREAK';

/**
 * Symbol information from exchange info.
 */
export interface ExchangeSymbol {
    /**
     * Trading symbol (e.g., "BTCUSDT").
     */
    symbol: string;

    /**
     * Trading pair (e.g., "BTCUSDT").
     */
    pair: string;

    /**
     * Contract type.
     */
    contractType: ContractType;

    /**
     * Delivery date for delivery contracts (Unix timestamp).
     */
    deliveryDate: number;

    /**
     * Onboard date (Unix timestamp).
     */
    onboardDate: number;

    /**
     * Trading status.
     */
    status: SymbolStatus;

    /**
     * Base asset (e.g., "BTC").
     */
    baseAsset: string;

    /**
     * Quote asset (e.g., "USDT").
     */
    quoteAsset: string;

    /**
     * Margin asset (e.g., "USDT").
     */
    marginAsset: string;

    /**
     * Price precision (decimal places, but use tickSize instead).
     */
    pricePrecision: number;

    /**
     * Quantity precision (decimal places, but use stepSize instead).
     */
    quantityPrecision: number;

    /**
     * Base asset precision.
     */
    baseAssetPrecision: number;

    /**
     * Quote precision.
     */
    quotePrecision: number;

    /**
     * Underlying asset type.
     */
    underlyingType: string;

    /**
     * Underlying sub types.
     */
    underlyingSubType: string[];

    /**
     * Trigger protection threshold for algo orders.
     */
    triggerProtect: string;

    /**
     * Symbol filters.
     */
    filters: SymbolFilter[];

    /**
     * Supported order types.
     */
    OrderType: string[];

    /**
     * Supported time in force options.
     */
    timeInForce: string[];

    /**
     * Liquidation fee rate.
     */
    liquidationFee: string;

    /**
     * Maximum price difference rate from mark price for market orders.
     */
    marketTakeBound: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exchange Info Response
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full exchange information response.
 */
export interface ExchangeInfoResponse {
    /**
     * Exchange-level filters (usually empty for futures).
     */
    exchangeFilters: any[];

    /**
     * Rate limit configurations.
     */
    rateLimits: ExchangeRateLimit[];

    /**
     * Server time (use /fapi/v1/time instead for accuracy).
     */
    serverTime: number;

    /**
     * Available assets.
     */
    assets: ExchangeAsset[];

    /**
     * Available trading symbols.
     */
    symbols: ExchangeSymbol[];

    /**
     * Server timezone (always "UTC").
     */
    timezone: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts price filter from symbol filters.
 *
 * @param filters - Symbol filters array.
 * @returns Price filter or undefined if not found.
 */
export function getPriceFilter(filters: SymbolFilter[]): PriceFilter | undefined {
    return filters.find(f => f.filterType === 'PRICE_FILTER') as PriceFilter | undefined;
}

/**
 * Extracts lot size filter from symbol filters.
 *
 * @param filters - Symbol filters array.
 * @returns Lot size filter or undefined if not found.
 */
export function getLotSizeFilter(filters: SymbolFilter[]): LotSizeFilter | undefined {
    return filters.find(f => f.filterType === 'LOT_SIZE') as LotSizeFilter | undefined;
}

/**
 * Extracts min notional filter from symbol filters.
 *
 * @param filters - Symbol filters array.
 * @returns Min notional filter or undefined if not found.
 */
export function getMinNotionalFilter(filters: SymbolFilter[]): MinNotionalFilter | undefined {
    return filters.find(f => f.filterType === 'MIN_NOTIONAL') as MinNotionalFilter | undefined;
}
