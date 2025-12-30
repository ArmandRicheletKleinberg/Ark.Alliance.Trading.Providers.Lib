/**
 * @fileoverview 24hr Ticker Statistics DTO
 * @module dtos/marketData/Ticker24hr
 * 
 * Represents 24-hour rolling window price change statistics.
 * Endpoint: GET /fapi/v1/ticker/24hr
 * 
 * @remarks
 * Weight: 1 for single symbol, 40 for all symbols
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Interfaces
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw 24hr ticker response from API.
 */
export interface Ticker24hrRaw {
    symbol: string;
    priceChange: string;
    priceChangePercent: string;
    weightedAvgPrice: string;
    lastPrice: string;
    lastQty: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    volume: string;
    quoteVolume: string;
    openTime: number;
    closeTime: number;
    firstId: number;
    lastId: number;
    count: number;
}

/**
 * Parsed 24hr ticker with numeric values.
 */
export interface Ticker24hr {
    /** Trading symbol */
    symbol: string;
    /** Price change over 24 hours */
    priceChange: number;
    /** Price change percentage */
    priceChangePercent: number;
    /** Volume weighted average price */
    weightedAvgPrice: number;
    /** Last price */
    lastPrice: number;
    /** Last quantity */
    lastQty: number;
    /** Opening price */
    openPrice: number;
    /** Highest price */
    highPrice: number;
    /** Lowest price */
    lowPrice: number;
    /** Base asset volume */
    volume: number;
    /** Quote asset volume */
    quoteVolume: number;
    /** 24hr window open time */
    openTime: number;
    /** 24hr window close time */
    closeTime: number;
    /** First trade ID */
    firstTradeId: number;
    /** Last trade ID */
    lastTradeId: number;
    /** Total number of trades */
    tradeCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Parsers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parses raw 24hr ticker to typed object.
 * @param raw - Raw API response
 * @returns Parsed Ticker24hr
 */
export function parseTicker24hr(raw: Ticker24hrRaw): Ticker24hr {
    return {
        symbol: raw.symbol,
        priceChange: parseFloat(raw.priceChange),
        priceChangePercent: parseFloat(raw.priceChangePercent),
        weightedAvgPrice: parseFloat(raw.weightedAvgPrice),
        lastPrice: parseFloat(raw.lastPrice),
        lastQty: parseFloat(raw.lastQty),
        openPrice: parseFloat(raw.openPrice),
        highPrice: parseFloat(raw.highPrice),
        lowPrice: parseFloat(raw.lowPrice),
        volume: parseFloat(raw.volume),
        quoteVolume: parseFloat(raw.quoteVolume),
        openTime: raw.openTime,
        closeTime: raw.closeTime,
        firstTradeId: raw.firstId,
        lastTradeId: raw.lastId,
        tradeCount: raw.count
    };
}
