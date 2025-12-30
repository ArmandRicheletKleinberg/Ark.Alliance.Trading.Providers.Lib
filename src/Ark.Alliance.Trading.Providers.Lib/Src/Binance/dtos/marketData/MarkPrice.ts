/**
 * @fileoverview Mark Price and Funding Rate DTOs
 * @module dtos/marketData/MarkPrice
 * 
 * Represents mark price and funding rate data from Binance Futures API.
 * Endpoints: 
 *   GET /fapi/v1/premiumIndex (Mark Price)
 *   GET /fapi/v1/fundingRate (Funding Rate History)
 * 
 * @remarks
 * Weight: 1 for mark price, 1 per symbol for funding rate
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Mark Price
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw mark price response from API.
 */
export interface MarkPriceRaw {
    symbol: string;
    markPrice: string;
    indexPrice: string;
    estimatedSettlePrice: string;
    lastFundingRate: string;
    nextFundingTime: number;
    interestRate: string;
    time: number;
}

/**
 * Parsed mark price with numeric values.
 */
export interface MarkPrice {
    /** Trading symbol */
    symbol: string;
    /** Current mark price */
    markPrice: number;
    /** Index price */
    indexPrice: number;
    /** Estimated settlement price */
    estimatedSettlePrice: number;
    /** Last funding rate */
    lastFundingRate: number;
    /** Next funding time (ms timestamp) */
    nextFundingTime: number;
    /** Interest rate */
    interestRate: number;
    /** Response timestamp */
    timestamp: number;
}

/**
 * Parses raw mark price to typed object.
 */
export function parseMarkPrice(raw: MarkPriceRaw): MarkPrice {
    return {
        symbol: raw.symbol,
        markPrice: parseFloat(raw.markPrice),
        indexPrice: parseFloat(raw.indexPrice),
        estimatedSettlePrice: parseFloat(raw.estimatedSettlePrice),
        lastFundingRate: parseFloat(raw.lastFundingRate),
        nextFundingTime: raw.nextFundingTime,
        interestRate: parseFloat(raw.interestRate),
        timestamp: raw.time
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Funding Rate History
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw funding rate response from API.
 */
export interface FundingRateRaw {
    symbol: string;
    fundingRate: string;
    fundingTime: number;
    markPrice: string;
}

/**
 * Parsed funding rate entry.
 */
export interface FundingRate {
    /** Trading symbol */
    symbol: string;
    /** Funding rate */
    fundingRate: number;
    /** Funding time (ms timestamp) */
    fundingTime: number;
    /** Mark price at funding time */
    markPrice: number;
}

/**
 * Parses raw funding rate to typed object.
 */
export function parseFundingRate(raw: FundingRateRaw): FundingRate {
    return {
        symbol: raw.symbol,
        fundingRate: parseFloat(raw.fundingRate),
        fundingTime: raw.fundingTime,
        markPrice: parseFloat(raw.markPrice)
    };
}

/**
 * Parses array of raw funding rates.
 */
export function parseFundingRates(rawArray: FundingRateRaw[]): FundingRate[] {
    return rawArray.map(parseFundingRate);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Book Ticker
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw book ticker response from API.
 */
export interface BookTickerRaw {
    symbol: string;
    bidPrice: string;
    bidQty: string;
    askPrice: string;
    askQty: string;
    time: number;
}

/**
 * Parsed book ticker with best bid/ask.
 */
export interface BookTicker {
    /** Trading symbol */
    symbol: string;
    /** Best bid price */
    bidPrice: number;
    /** Best bid quantity */
    bidQty: number;
    /** Best ask price */
    askPrice: number;
    /** Best ask quantity */
    askQty: number;
    /** Response timestamp */
    timestamp: number;
}

/**
 * Parses raw book ticker to typed object.
 */
export function parseBookTicker(raw: BookTickerRaw): BookTicker {
    return {
        symbol: raw.symbol,
        bidPrice: parseFloat(raw.bidPrice),
        bidQty: parseFloat(raw.bidQty),
        askPrice: parseFloat(raw.askPrice),
        askQty: parseFloat(raw.askQty),
        timestamp: raw.time || Date.now()
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Open Interest
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw open interest response from API.
 */
export interface OpenInterestRaw {
    symbol: string;
    openInterest: string;
    time: number;
}

/**
 * Parsed open interest.
 */
export interface OpenInterest {
    /** Trading symbol */
    symbol: string;
    /** Open interest in contracts */
    openInterest: number;
    /** Response timestamp */
    timestamp: number;
}

/**
 * Parses raw open interest to typed object.
 */
export function parseOpenInterest(raw: OpenInterestRaw): OpenInterest {
    return {
        symbol: raw.symbol,
        openInterest: parseFloat(raw.openInterest),
        timestamp: raw.time || Date.now()
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recent Trades
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw trade response from /fapi/v1/trades.
 */
export interface TradeRaw {
    id: number;
    price: string;
    qty: string;
    quoteQty: string;
    time: number;
    isBuyerMaker: boolean;
}

/**
 * Parsed trade.
 */
export interface Trade {
    /** Trade ID */
    id: number;
    /** Trade price */
    price: number;
    /** Trade quantity */
    qty: number;
    /** Quote asset quantity */
    quoteQty: number;
    /** Trade timestamp */
    timestamp: number;
    /** True if buyer is market maker */
    isBuyerMaker: boolean;
}

/**
 * Parses raw trade to typed object.
 */
export function parseTrade(raw: TradeRaw): Trade {
    return {
        id: raw.id,
        price: parseFloat(raw.price),
        qty: parseFloat(raw.qty),
        quoteQty: parseFloat(raw.quoteQty),
        timestamp: raw.time,
        isBuyerMaker: raw.isBuyerMaker
    };
}

/**
 * Parses array of raw trades.
 */
export function parseTrades(rawArray: TradeRaw[]): Trade[] {
    return rawArray.map(parseTrade);
}

/**
 * Raw aggregate trade response from /fapi/v1/aggTrades.
 */
export interface AggTradeRaw {
    a: number;      // Aggregate trade ID
    p: string;      // Price
    q: string;      // Quantity
    f: number;      // First trade ID
    l: number;      // Last trade ID
    T: number;      // Timestamp
    m: boolean;     // Is buyer maker
}

/**
 * Parsed aggregate trade.
 */
export interface AggTrade {
    /** Aggregate trade ID */
    aggTradeId: number;
    /** Trade price */
    price: number;
    /** Trade quantity */
    qty: number;
    /** First trade ID */
    firstTradeId: number;
    /** Last trade ID */
    lastTradeId: number;
    /** Trade timestamp */
    timestamp: number;
    /** True if buyer is market maker */
    isBuyerMaker: boolean;
}

/**
 * Parses raw aggregate trade to typed object.
 */
export function parseAggTrade(raw: AggTradeRaw): AggTrade {
    return {
        aggTradeId: raw.a,
        price: parseFloat(raw.p),
        qty: parseFloat(raw.q),
        firstTradeId: raw.f,
        lastTradeId: raw.l,
        timestamp: raw.T,
        isBuyerMaker: raw.m
    };
}

/**
 * Parses array of raw aggregate trades.
 */
export function parseAggTrades(rawArray: AggTradeRaw[]): AggTrade[] {
    return rawArray.map(parseAggTrade);
}
