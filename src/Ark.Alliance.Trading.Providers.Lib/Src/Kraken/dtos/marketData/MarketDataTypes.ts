/**
 * @fileoverview Kraken Futures Market Data DTOs
 * @module Kraken/dtos/marketData/MarketDataTypes
 *
 * Type definitions for Kraken Futures market data API responses.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Instrument Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Instruments response from /instruments endpoint.
 */
export interface InstrumentsResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** List of instruments */
    instruments: KrakenInstrument[];
}

/**
 * Kraken instrument specification.
 */
export interface KrakenInstrument {
    /** Instrument symbol (e.g., 'PI_XBTUSD') */
    symbol: string;

    /** Instrument type: 'perpetual', 'futures_inverse', 'futures_vanilla' */
    type: string;

    /** Underlying asset */
    underlying?: string;

    /** Quote currency */
    quoteCurrency?: string;

    /** Tick size (minimum price increment) */
    tickSize: number;

    /** Contract size */
    contractSize: number;

    /** Maximum leverage */
    maxLeverage?: number;

    /** Whether tradeable */
    tradeable: boolean;

    /** Whether postOnly available */
    postOnly?: boolean;

    /** Margin levels */
    marginLevels?: MarginLevel[];

    /** Last price */
    lastPrice?: number;

    /** Mark price */
    markPrice?: number;

    /** 24h volume */
    vol24h?: number;

    /** Open interest */
    openInterest?: number;

    /** Funding rate (for perpetuals) */
    fundingRate?: number;

    /** Next funding time (for perpetuals) */
    nextFundingRateTime?: string;

    /** Maturity date (for futures) */
    lastTradingTime?: string;
}

/**
 * Margin level specification.
 */
export interface MarginLevel {
    /** Number of contracts */
    contracts: number;

    /** Initial margin rate */
    initialMargin: number;

    /** Maintenance margin rate */
    maintenanceMargin: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Ticker Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tickers response from /tickers endpoint.
 */
export interface TickersResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** List of tickers */
    tickers: KrakenTicker[];
}

/**
 * Kraken ticker data.
 */
export interface KrakenTicker {
    /** Symbol */
    symbol: string;

    /** Best bid price */
    bid: number;

    /** Best bid size */
    bidSize: number;

    /** Best ask price */
    ask: number;

    /** Best ask size */
    askSize: number;

    /** Last trade price */
    last: number;

    /** Last trade size */
    lastSize: number;

    /** Last trade time */
    lastTime: string;

    /** 24h volume */
    vol24h: number;

    /** 24h high */
    high24h?: number;

    /** 24h low */
    low24h?: number;

    /** Mark price */
    markPrice: number;

    /** Index price */
    indexPrice?: number;

    /** Open interest */
    openInterest: number;

    /** Funding rate (perpetuals) */
    fundingRate?: number;

    /** Funding rate prediction */
    fundingRatePrediction?: number;

    /** Next funding time */
    nextFundingRateTime?: string;

    /** Suspended flag */
    suspended?: boolean;

    /** Post-only flag */
    postOnly?: boolean;

    /** Pair (e.g., 'XBT:USD') */
    pair?: string;

    /** Tag */
    tag?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Book Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Order book response from /orderbook endpoint.
 */
export interface OrderBookResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** Order book data */
    orderBook: KrakenOrderBook;
}

/**
 * Kraken order book structure.
 */
export interface KrakenOrderBook {
    /** Symbol */
    symbol: string;

    /** Bids [price, quantity] */
    bids: [number, number][];

    /** Asks [price, quantity] */
    asks: [number, number][];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Trade History Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Trade history response from /history endpoint.
 */
export interface TradeHistoryResponse {
    /** Result status */
    result: 'success' | string;

    /** Server timestamp */
    serverTime: string;

    /** Trade history */
    history: KrakenTrade[];
}

/**
 * Kraken trade data.
 */
export interface KrakenTrade {
    /** Trade ID */
    uid?: string;

    /** Trade time */
    time: string;

    /** Trade side: 'buy' or 'sell' */
    side: string;

    /** Trade price */
    price: number;

    /** Trade size */
    size: number;

    /** Trade type (liquidation, etc.) */
    type?: string;
}
