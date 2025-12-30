/**
 * @fileoverview Price Ticker DTO
 * @module dtos/marketData/PriceTicker
 * 
 * Represents symbol price ticker data from Binance Futures API.
 * Endpoint: GET /fapi/v1/ticker/price
 * 
 * @remarks
 * Weight: 1 for single symbol, 2 for all symbols
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw price ticker response from API.
 */
export interface PriceTickerRaw {
    /** Trading symbol (e.g., "BTCUSDT") */
    symbol: string;
    /** Current price as string */
    price: string;
    /** Timestamp in milliseconds */
    time: number;
}

/**
 * Parsed price ticker with numeric price.
 */
export interface PriceTicker {
    /** Trading symbol (e.g., "BTCUSDT") */
    symbol: string;
    /** Current price as number */
    price: number;
    /** Timestamp in milliseconds */
    timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses raw price ticker to typed object.
 * @param raw - Raw API response
 * @returns Parsed PriceTicker
 */
export function parsePriceTicker(raw: PriceTickerRaw): PriceTicker {
    return {
        symbol: raw.symbol,
        price: parseFloat(raw.price),
        timestamp: raw.time || Date.now()
    };
}

/**
 * Parses array of raw price tickers.
 * @param rawArray - Array of raw API responses
 * @returns Array of parsed PriceTicker objects
 */
export function parsePriceTickers(rawArray: PriceTickerRaw[]): PriceTicker[] {
    return rawArray.map(parsePriceTicker);
}
