/**
 * @fileoverview Binance Market Data Mapper
 * @module Binance/mappers/MarketDataMapper
 *
 * Maps Binance market data types to common IMarketData interfaces.
 * Pure functions - no side effects.
 *
 * @remarks
 * This mapper provides interoperability between Binance-specific market data types
 * and the provider-agnostic interfaces defined in Common/Domain.
 */

import {
    IQuote,
    ITicker,
    IOrderBook,
    IOrderBookLevel,
    ITrade,
    IKline
} from '../../Common/Domain';
import {
    BookTicker,
    Ticker24hr,
    ParsedOrderBook,
    OrderBookLevel,
    Trade,
    AggTrade,
    Kline
} from '../dtos/marketData';

// ═══════════════════════════════════════════════════════════════════════════════
// Quote Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance BookTicker to common IQuote interface.
 *
 * @param bookTicker - Binance book ticker
 * @returns Common IQuote interface
 *
 * @example
 * ```typescript
 * const result = await binanceClient.getBookTicker('BTCUSDT');
 * if (result.success) {
 *     const quote = mapBinanceBookTickerToIQuote(result.data);
 *     console.log(`Bid: ${quote.bidPrice}, Ask: ${quote.askPrice}`);
 * }
 * ```
 */
export function mapBinanceBookTickerToIQuote(bookTicker: BookTicker): IQuote {
    return {
        instrument: bookTicker.symbol,
        bidPrice: String(bookTicker.bidPrice),
        bidQuantity: String(bookTicker.bidQty),
        askPrice: String(bookTicker.askPrice),
        askQuantity: String(bookTicker.askQty),
        timestamp: bookTicker.timestamp
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Ticker Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance 24hr Ticker to common ITicker interface.
 *
 * @param ticker - Binance 24hr ticker
 * @param markPrice - Optional mark price to include
 * @param indexPrice - Optional index price to include
 * @returns Common ITicker interface
 *
 * @example
 * ```typescript
 * const ticker = await binanceClient.get24hrTicker('BTCUSDT');
 * if (ticker.success) {
 *     const commonTicker = mapBinanceTicker24hrToITicker(ticker.data);
 * }
 * ```
 */
export function mapBinanceTicker24hrToITicker(
    ticker: Ticker24hr,
    markPrice?: string,
    indexPrice?: string
): ITicker {
    return {
        instrument: ticker.symbol,
        bidPrice: '0', // Not available in 24hr ticker, use book ticker for this
        bidQuantity: '0',
        askPrice: '0',
        askQuantity: '0',
        timestamp: ticker.closeTime,
        lastPrice: String(ticker.lastPrice),
        markPrice: markPrice || '0',
        indexPrice: indexPrice || '0',
        high24h: String(ticker.highPrice),
        low24h: String(ticker.lowPrice),
        volume24h: String(ticker.volume),
        priceChangePercent24h: String(ticker.priceChangePercent)
    };
}

/**
 * Combine BookTicker and 24hr Ticker for complete ITicker.
 *
 * @param bookTicker - Binance book ticker (for bid/ask)
 * @param ticker24hr - Binance 24hr ticker (for stats)
 * @param markPrice - Optional mark price
 * @param indexPrice - Optional index price
 * @param fundingRate - Optional funding rate
 * @param openInterest - Optional open interest
 * @returns Complete ITicker interface
 */
export function mapBinanceTickersToITicker(
    bookTicker: BookTicker,
    ticker24hr: Ticker24hr,
    markPrice?: string,
    indexPrice?: string,
    fundingRate?: string,
    openInterest?: string
): ITicker {
    return {
        instrument: bookTicker.symbol,
        bidPrice: String(bookTicker.bidPrice),
        bidQuantity: String(bookTicker.bidQty),
        askPrice: String(bookTicker.askPrice),
        askQuantity: String(bookTicker.askQty),
        timestamp: bookTicker.timestamp,
        lastPrice: String(ticker24hr.lastPrice),
        markPrice: markPrice || '0',
        indexPrice: indexPrice || '0',
        high24h: String(ticker24hr.highPrice),
        low24h: String(ticker24hr.lowPrice),
        volume24h: String(ticker24hr.volume),
        priceChangePercent24h: String(ticker24hr.priceChangePercent),
        fundingRate,
        openInterest
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Book Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance OrderBook level to common IOrderBookLevel.
 *
 * @param level - Binance order book level [price, quantity]
 * @returns Common IOrderBookLevel
 */
export function mapBinanceOrderBookLevelToILevel(level: OrderBookLevel): IOrderBookLevel {
    return {
        price: String(level.price),
        quantity: String(level.quantity)
    };
}

/**
 * Map Binance ParsedOrderBook to common IOrderBook.
 *
 * @param orderBook - Binance parsed order book
 * @param symbol - Trading symbol
 * @returns Common IOrderBook interface
 */
export function mapBinanceOrderBookToIOrderBook(
    orderBook: ParsedOrderBook,
    symbol: string
): IOrderBook {
    return {
        instrument: symbol,
        bids: orderBook.bids.map(mapBinanceOrderBookLevelToILevel),
        asks: orderBook.asks.map(mapBinanceOrderBookLevelToILevel),
        updateId: orderBook.lastUpdateId,
        timestamp: orderBook.transactionTime
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Trade Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance Trade to common ITrade interface.
 *
 * @param trade - Binance trade
 * @param symbol - Trading symbol
 * @returns Common ITrade interface
 */
export function mapBinanceTradeToITrade(trade: Trade, symbol: string): ITrade {
    return {
        tradeId: String(trade.id),
        instrument: symbol,
        price: String(trade.price),
        quantity: String(trade.qty),
        side: trade.isBuyerMaker ? 'SELL' : 'BUY',
        timestamp: trade.timestamp,
        isBuyerMaker: trade.isBuyerMaker
    };
}

/**
 * Map Binance AggTrade to common ITrade interface.
 *
 * @param aggTrade - Binance aggregated trade
 * @param symbol - Trading symbol
 * @returns Common ITrade interface
 */
export function mapBinanceAggTradeToITrade(aggTrade: AggTrade, symbol: string): ITrade {
    return {
        tradeId: String(aggTrade.aggTradeId),
        instrument: symbol,
        price: String(aggTrade.price),
        quantity: String(aggTrade.qty),
        side: aggTrade.isBuyerMaker ? 'SELL' : 'BUY',
        timestamp: aggTrade.timestamp,
        isBuyerMaker: aggTrade.isBuyerMaker
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Kline Mapping
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map Binance Kline to common IKline interface.
 *
 * @param kline - Binance kline
 * @param symbol - Trading symbol
 * @param interval - Kline interval
 * @returns Common IKline interface
 */
export function mapBinanceKlineToIKline(
    kline: Kline,
    symbol: string,
    interval: string
): IKline {
    return {
        instrument: symbol,
        openTime: kline.openTime,
        closeTime: kline.closeTime,
        interval,
        open: String(kline.open),
        high: String(kline.high),
        low: String(kline.low),
        close: String(kline.close),
        volume: String(kline.volume),
        trades: kline.trades,
        isClosed: kline.closeTime <= Date.now()
    };
}

/**
 * Map array of Binance Klines to common IKline array.
 *
 * @param klines - Array of Binance klines
 * @param symbol - Trading symbol
 * @param interval - Kline interval
 * @returns Array of common IKline
 */
export function mapBinanceKlinesToIKlines(
    klines: Kline[],
    symbol: string,
    interval: string
): IKline[] {
    return klines.map(k => mapBinanceKlineToIKline(k, symbol, interval));
}
