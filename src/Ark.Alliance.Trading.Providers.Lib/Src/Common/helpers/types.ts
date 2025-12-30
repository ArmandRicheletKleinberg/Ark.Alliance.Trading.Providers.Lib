/**
 * @fileoverview Helper Types for Normalization
 * @module helpers/types
 */

/**
 * Price filter from Binance exchange info
 */
export interface PriceFilter {
    filterType: 'PRICE_FILTER';
    minPrice: string;
    maxPrice: string;
    tickSize: string;
}

/**
 * Lot size filter from Binance exchange info
 */
export interface LotSizeFilter {
    filterType: 'LOT_SIZE';
    minQty: string;
    maxQty: string;
    stepSize: string;
}

/**
 * Market lot size filter
 */
export interface MarketLotSizeFilter {
    filterType: 'MARKET_LOT_SIZE';
    minQty: string;
    maxQty: string;
    stepSize: string;
}

/**
 * Min notional filter from Binance exchange info
 */
export interface MinNotionalFilter {
    filterType: 'MIN_NOTIONAL';
    notional: string;
}

/**
 * Max orders filter
 */
export interface MaxNumOrdersFilter {
    filterType: 'MAX_NUM_ORDERS';
    limit: number;
}

/**
 * Max algo orders filter
 */
export interface MaxNumAlgoOrdersFilter {
    filterType: 'MAX_NUM_ALGO_ORDERS';
    limit: number;
}

/**
 * Percent price filter
 */
export interface PercentPriceFilter {
    filterType: 'PERCENT_PRICE';
    multiplierUp: string;
    multiplierDown: string;
    multiplierDecimal: string;
}

/**
 * Combined symbol filters for order validation
 */
export interface SymbolFilters {
    symbol: string;
    priceFilter?: PriceFilter;
    lotSizeFilter?: LotSizeFilter;
    marketLotSizeFilter?: MarketLotSizeFilter;
    minNotionalFilter?: MinNotionalFilter;
    maxNumOrdersFilter?: MaxNumOrdersFilter;
    maxNumAlgoOrdersFilter?: MaxNumAlgoOrdersFilter;
    percentPriceFilter?: PercentPriceFilter;
}

/**
 * Order validation error
 */
export interface OrderValidationError {
    code: string;
    message: string;
    field?: string;
    actual?: number | string;
    expected?: number | string;
}
