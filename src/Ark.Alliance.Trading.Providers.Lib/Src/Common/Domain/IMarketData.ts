/**
 * @fileoverview Provider-Agnostic Market Data Interface
 * @module Common/Domain/IMarketData
 *
 * Defines the common market data interfaces that all provider-specific
 * implementations must conform to.
 */

/**
 * Best bid/ask quote data (like Binance bookTicker).
 */
export interface IQuote {
    /**
     * Instrument/symbol name.
     */
    readonly instrument: string;

    /**
     * Best bid price.
     */
    readonly bidPrice: string;

    /**
     * Best bid quantity.
     */
    readonly bidQuantity: string;

    /**
     * Best ask price.
     */
    readonly askPrice: string;

    /**
     * Best ask quantity.
     */
    readonly askQuantity: string;

    /**
     * Timestamp of the quote (milliseconds).
     */
    readonly timestamp: number;
}

/**
 * Ticker data with extended market information.
 */
export interface ITicker extends IQuote {
    /**
     * Last trade price.
     */
    readonly lastPrice: string;

    /**
     * Mark price (used for liquidation calculations).
     */
    readonly markPrice: string;

    /**
     * Index price (underlying reference price).
     */
    readonly indexPrice: string;

    /**
     * 24h high price.
     */
    readonly high24h: string;

    /**
     * 24h low price.
     */
    readonly low24h: string;

    /**
     * 24h volume in base currency.
     */
    readonly volume24h: string;

    /**
     * 24h price change percentage.
     */
    readonly priceChangePercent24h: string;

    /**
     * Open interest (for derivatives).
     */
    readonly openInterest?: string;

    /**
     * Current funding rate (for perpetuals).
     */
    readonly fundingRate?: string;
}

/**
 * Order book level.
 */
export interface IOrderBookLevel {
    /**
     * Price level.
     */
    readonly price: string;

    /**
     * Quantity at this level.
     */
    readonly quantity: string;
}

/**
 * Order book snapshot.
 */
export interface IOrderBook {
    /**
     * Instrument/symbol name.
     */
    readonly instrument: string;

    /**
     * Bid levels (sorted by price descending).
     */
    readonly bids: readonly IOrderBookLevel[];

    /**
     * Ask levels (sorted by price ascending).
     */
    readonly asks: readonly IOrderBookLevel[];

    /**
     * Update ID for sequencing.
     */
    readonly updateId: number;

    /**
     * Timestamp of the snapshot.
     */
    readonly timestamp: number;
}

/**
 * Trade/fill data.
 */
export interface ITrade {
    /**
     * Trade ID.
     */
    readonly tradeId: string;

    /**
     * Instrument/symbol name.
     */
    readonly instrument: string;

    /**
     * Trade price.
     */
    readonly price: string;

    /**
     * Trade quantity.
     */
    readonly quantity: string;

    /**
     * Trade side (buyer's perspective).
     */
    readonly side: 'BUY' | 'SELL';

    /**
     * Trade timestamp.
     */
    readonly timestamp: number;

    /**
     * Whether the buyer was the maker.
     */
    readonly isBuyerMaker: boolean;
}

/**
 * OHLCV candlestick data.
 */
export interface IKline {
    /**
     * Instrument/symbol name.
     */
    readonly instrument: string;

    /**
     * Kline open timestamp.
     */
    readonly openTime: number;

    /**
     * Kline close timestamp.
     */
    readonly closeTime: number;

    /**
     * Interval (e.g., '1m', '1h', '1d').
     */
    readonly interval: string;

    /**
     * Open price.
     */
    readonly open: string;

    /**
     * High price.
     */
    readonly high: string;

    /**
     * Low price.
     */
    readonly low: string;

    /**
     * Close price.
     */
    readonly close: string;

    /**
     * Volume in base currency.
     */
    readonly volume: string;

    /**
     * Number of trades.
     */
    readonly trades: number;

    /**
     * Whether this kline is closed.
     */
    readonly isClosed: boolean;
}

/**
 * Helper function to calculate mid price from quote.
 */
export function getMidPrice(quote: IQuote): number {
    const bid = parseFloat(quote.bidPrice);
    const ask = parseFloat(quote.askPrice);
    return (bid + ask) / 2;
}

/**
 * Helper function to calculate spread from quote.
 */
export function getSpread(quote: IQuote): number {
    const bid = parseFloat(quote.bidPrice);
    const ask = parseFloat(quote.askPrice);
    return ask - bid;
}

/**
 * Helper function to calculate spread percentage.
 */
export function getSpreadPercent(quote: IQuote): number {
    const mid = getMidPrice(quote);
    const spread = getSpread(quote);
    return mid > 0 ? (spread / mid) * 100 : 0;
}
