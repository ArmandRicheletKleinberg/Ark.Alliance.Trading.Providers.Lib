/**
 * @fileoverview Kline/Candlestick Models
 * @module models/marketData/Kline
 *
 * Response models for kline endpoints:
 * - GET /fapi/v1/klines
 * - GET /fapi/v1/continuousKlines
 * - GET /fapi/v1/indexPriceKlines
 * - GET /fapi/v1/markPriceKlines
 * - GET /fapi/v1/premiumIndexKlines
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data/rest-api/Kline-Candlestick-Data
 */

import {
    KlineInterval,
    ContractType,
    type KlineIntervalType,
    type ContractTypeType
} from '../../enums';

// Re-export for backward compatibility
export { KlineInterval, ContractType };
export type { KlineIntervalType, ContractTypeType };

/**
 * Raw kline array from Binance API.
 * Format: [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBaseVolume, takerBuyQuoteVolume, ignore]
 */
export type RawKline = [
    number,  // 0: Open time
    string,  // 1: Open price
    string,  // 2: High price
    string,  // 3: Low price
    string,  // 4: Close price
    string,  // 5: Volume
    number,  // 6: Close time
    string,  // 7: Quote asset volume
    number,  // 8: Number of trades
    string,  // 9: Taker buy base volume
    string,  // 10: Taker buy quote volume
    string   // 11: Ignore
];

/**
 * Parsed kline with named properties.
 */
export interface Kline {
    /**
     * Kline open time (Unix timestamp).
     */
    openTime: number;

    /**
     * Opening price.
     */
    open: number;

    /**
     * Highest price during interval.
     */
    high: number;

    /**
     * Lowest price during interval.
     */
    low: number;

    /**
     * Closing price (or latest price if not closed).
     */
    close: number;

    /**
     * Trading volume in base asset.
     */
    volume: number;

    /**
     * Kline close time (Unix timestamp).
     */
    closeTime: number;

    /**
     * Trading volume in quote asset.
     */
    quoteVolume: number;

    /**
     * Number of trades during interval.
     */
    trades: number;

    /**
     * Taker buy volume in base asset.
     */
    takerBuyBaseVolume: number;

    /**
     * Taker buy volume in quote asset.
     */
    takerBuyQuoteVolume: number;
}

/**
 * Continuous contract type for continuous klines.
 * @deprecated Use ContractType enum from enums instead.
 */
export type ContinuousContractType = ContractTypeType;

/**
 * Kline request parameters.
 */
export interface KlineRequest {
    /**
     * Trading symbol (required).
     */
    symbol: string;

    /**
     * Kline interval (required).
     */
    interval: KlineInterval;

    /**
     * Start time (optional, Unix timestamp).
     */
    startTime?: number;

    /**
     * End time (optional, Unix timestamp).
     */
    endTime?: number;

    /**
     * Number of klines (default 500, max 1500).
     */
    limit?: number;
}

/**
 * Continuous kline request parameters.
 */
export interface ContinuousKlineRequest {
    /**
     * Trading pair (required).
     */
    pair: string;

    /**
     * Contract type (required).
     */
    contractType: ContinuousContractType;

    /**
     * Kline interval (required).
     */
    interval: KlineInterval;

    /**
     * Start time (optional, Unix timestamp).
     */
    startTime?: number;

    /**
     * End time (optional, Unix timestamp).
     */
    endTime?: number;

    /**
     * Number of klines (default 500, max 1500).
     */
    limit?: number;
}

/**
 * Parses raw kline array to named object.
 *
 * @param raw - Raw kline array from API.
 * @returns Parsed kline object.
 */
export function parseKline(raw: RawKline): Kline {
    return {
        openTime: raw[0],
        open: parseFloat(raw[1]),
        high: parseFloat(raw[2]),
        low: parseFloat(raw[3]),
        close: parseFloat(raw[4]),
        volume: parseFloat(raw[5]),
        closeTime: raw[6],
        quoteVolume: parseFloat(raw[7]),
        trades: raw[8],
        takerBuyBaseVolume: parseFloat(raw[9]),
        takerBuyQuoteVolume: parseFloat(raw[10])
    };
}

/**
 * Parses array of raw klines.
 *
 * @param rawKlines - Array of raw kline arrays.
 * @returns Array of parsed kline objects.
 */
export function parseKlines(rawKlines: RawKline[]): Kline[] {
    return rawKlines.map(parseKline);
}
