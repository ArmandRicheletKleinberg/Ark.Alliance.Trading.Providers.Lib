/**
 * @fileoverview Deribit Market Data Client
 * @module Deribit/clients/DeribitMarketDataClient
 *
 * Client for Deribit public market data operations.
 */

import { EventEmitter } from 'events';
import { Result } from '../../Common/result';
import { IQuote, ITicker, IOrderBook, IInstrument, InstrumentType, SettlementType, OptionType } from '../../Common/Domain';
import { DeribitJsonRpcClient, DeribitClientConfig } from './DeribitJsonRpcClient';
import {
    DeribitTicker,
    DeribitOrderBook,
    DeribitInstrument,
    DeribitQuote
} from '../dtos';
import { CHANNELS } from '../shared';
import { InstrumentKind } from '../enums';

/**
 * Market data subscription callback.
 */
export type MarketDataCallback<T> = (data: T) => void;

/**
 * Deribit market data client.
 *
 * @remarks
 * Provides access to public market data including:
 * - Ticker data
 * - Order book
 * - Quotes (best bid/ask)
 * - Instrument information
 *
 * @example
 * ```typescript
 * const client = new DeribitMarketDataClient(config);
 * await client.connect();
 *
 * // Subscribe to quotes
 * await client.subscribeQuote('BTC-PERPETUAL', (quote) => {
 *     console.log(`Best bid: ${quote.bidPrice}, Best ask: ${quote.askPrice}`);
 * });
 *
 * // Get ticker
 * const ticker = await client.getTicker('BTC-PERPETUAL');
 * ```
 */
export class DeribitMarketDataClient extends EventEmitter {
    private client: DeribitJsonRpcClient;
    private quoteCache: Map<string, IQuote> = new Map();
    private callbacks: Map<string, Set<MarketDataCallback<unknown>>> = new Map();

    constructor(config: DeribitClientConfig) {
        super();
        this.client = new DeribitJsonRpcClient(config);

        // Forward notifications to handlers
        this.client.on('notification', ({ channel, data }) => {
            this.handleNotification(channel, data);
        });

        // Forward connection events
        this.client.on('connected', () => this.emit('connected'));
        this.client.on('disconnected', () => this.emit('disconnected'));
        this.client.on('reconnecting', (data) => this.emit('reconnecting', data));
        this.client.on('error', (error) => this.emit('error', error));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Connection
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Connect to Deribit.
     */
    async connect(): Promise<Result<void>> {
        return this.client.connect();
    }

    /**
     * Disconnect from Deribit.
     */
    async disconnect(): Promise<Result<void>> {
        this.quoteCache.clear();
        this.callbacks.clear();
        return this.client.disconnect();
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return this.client.isConnected();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Ticker
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get ticker for an instrument.
     */
    async getTicker(instrumentName: string): Promise<Result<ITicker>> {
        const result = await this.client.call<DeribitTicker>('public/ticker', {
            instrument_name: instrumentName
        });

        if (!result.success || !result.data) {
            return Result.fail<ITicker>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get ticker',
                timestamp: Date.now()
            });
        }

        return Result.ok(this.mapTicker(result.data));
    }

    /**
     * Subscribe to ticker updates.
     */
    async subscribeTicker(
        instrumentName: string,
        callback: MarketDataCallback<ITicker>,
        interval: string = '100ms'
    ): Promise<Result<void>> {
        const channel = CHANNELS.TICKER(instrumentName, interval);
        this.addCallback(channel, (data: unknown) => {
            callback(this.mapTicker(data as DeribitTicker));
        });

        return this.client.subscribe(channel);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Quotes
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Subscribe to quote (best bid/ask) updates.
     */
    async subscribeQuote(
        instrumentName: string,
        callback: MarketDataCallback<IQuote>
    ): Promise<Result<void>> {
        const channel = CHANNELS.QUOTE(instrumentName);
        this.addCallback(channel, (data: unknown) => {
            const quote = this.mapQuote(data as DeribitQuote);
            this.quoteCache.set(instrumentName, quote);
            callback(quote);
        });

        return this.client.subscribe(channel);
    }

    /**
     * Get cached quote.
     */
    getCachedQuote(instrumentName: string): IQuote | undefined {
        return this.quoteCache.get(instrumentName);
    }

    /**
     * Get all cached quotes.
     */
    getAllCachedQuotes(): Map<string, IQuote> {
        return new Map(this.quoteCache);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Order Book
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get order book snapshot.
     */
    async getOrderBook(
        instrumentName: string,
        depth: number = 10
    ): Promise<Result<IOrderBook>> {
        const result = await this.client.call<DeribitOrderBook>('public/get_order_book', {
            instrument_name: instrumentName,
            depth
        });

        if (!result.success || !result.data) {
            return Result.fail<IOrderBook>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get order book',
                timestamp: Date.now()
            });
        }

        return Result.ok(this.mapOrderBook(result.data));
    }

    /**
     * Subscribe to order book updates.
     */
    async subscribeOrderBook(
        instrumentName: string,
        callback: MarketDataCallback<IOrderBook>,
        interval: string = '100ms'
    ): Promise<Result<void>> {
        const channel = CHANNELS.BOOK(instrumentName, interval);
        this.addCallback(channel, (data: unknown) => {
            callback(this.mapOrderBook(data as DeribitOrderBook));
        });

        return this.client.subscribe(channel);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Instruments
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get instrument info.
     */
    async getInstrument(instrumentName: string): Promise<Result<IInstrument>> {
        const result = await this.client.call<DeribitInstrument>('public/get_instrument', {
            instrument_name: instrumentName
        });

        if (!result.success || !result.data) {
            return Result.fail<IInstrument>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get instrument',
                timestamp: Date.now()
            });
        }

        return Result.ok(this.mapInstrument(result.data));
    }

    /**
     * Get all instruments for a currency.
     */
    async getInstruments(
        currency: string,
        kind?: InstrumentKind,
        expired: boolean = false
    ): Promise<Result<IInstrument[]>> {
        const params: Record<string, unknown> = { currency };
        if (kind) {
            params.kind = kind;
        }
        if (expired) {
            params.expired = expired;
        }

        const result = await this.client.call<DeribitInstrument[]>(
            'public/get_instruments',
            params
        );

        if (!result.success || !result.data) {
            return Result.fail<IInstrument[]>({
                code: 'FAILURE',
                message: result.reason || 'Failed to get instruments',
                timestamp: Date.now()
            });
        }

        return Result.ok(result.data.map((i) => this.mapInstrument(i)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Unsubscribe
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Unsubscribe from a channel.
     */
    async unsubscribe(channel: string): Promise<Result<void>> {
        this.callbacks.delete(channel);
        return this.client.unsubscribe(channel);
    }

    /**
     * Unsubscribe from all channels.
     */
    async unsubscribeAll(): Promise<Result<void>> {
        const channels = this.client.getSubscriptions();
        this.callbacks.clear();

        for (const channel of channels) {
            await this.client.unsubscribe(channel);
        }

        return Result.Success;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Internal
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Add callback for a channel.
     */
    private addCallback(channel: string, callback: MarketDataCallback<unknown>): void {
        if (!this.callbacks.has(channel)) {
            this.callbacks.set(channel, new Set());
        }
        this.callbacks.get(channel)!.add(callback);
    }

    /**
     * Handle subscription notification.
     */
    private handleNotification(channel: string, data: unknown): void {
        const callbacks = this.callbacks.get(channel);
        if (callbacks) {
            callbacks.forEach((callback) => {
                try {
                    callback(data);
                } catch (error) {
                    this.emit('error', error);
                }
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Mappers
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Map Deribit ticker to common ITicker.
     */
    private mapTicker(ticker: DeribitTicker): ITicker {
        return {
            instrument: ticker.instrument_name,
            bidPrice: String(ticker.best_bid_price),
            bidQuantity: String(ticker.best_bid_amount),
            askPrice: String(ticker.best_ask_price),
            askQuantity: String(ticker.best_ask_amount),
            lastPrice: String(ticker.last_price),
            markPrice: String(ticker.mark_price),
            indexPrice: String(ticker.index_price),
            high24h: String(ticker.stats.high),
            low24h: String(ticker.stats.low),
            volume24h: String(ticker.stats.volume),
            priceChangePercent24h: String(ticker.stats.price_change),
            openInterest: String(ticker.open_interest),
            fundingRate: ticker.current_funding !== undefined
                ? String(ticker.current_funding)
                : undefined,
            timestamp: ticker.timestamp
        };
    }

    /**
     * Map Deribit quote to common IQuote.
     */
    private mapQuote(quote: DeribitQuote): IQuote {
        return {
            instrument: quote.instrument_name,
            bidPrice: String(quote.best_bid_price),
            bidQuantity: String(quote.best_bid_amount),
            askPrice: String(quote.best_ask_price),
            askQuantity: String(quote.best_ask_amount),
            timestamp: quote.timestamp
        };
    }

    /**
     * Map Deribit order book to common IOrderBook.
     */
    private mapOrderBook(book: DeribitOrderBook): IOrderBook {
        return {
            instrument: book.instrument_name,
            bids: book.bids.map(([price, qty]) => ({
                price: String(price),
                quantity: String(qty)
            })),
            asks: book.asks.map(([price, qty]) => ({
                price: String(price),
                quantity: String(qty)
            })),
            updateId: book.change_id,
            timestamp: book.timestamp
        };
    }

    /**
     * Map Deribit instrument to common IInstrument.
     */
    private mapInstrument(inst: DeribitInstrument): IInstrument {
        return {
            symbol: inst.instrument_name,
            baseCurrency: inst.base_currency,
            quoteCurrency: inst.quote_currency,
            type: this.mapInstrumentType(inst.kind),
            settlementType: inst.settlement_currency === inst.base_currency
                ? SettlementType.INVERSE
                : SettlementType.LINEAR,
            contractSize: String(inst.contract_size),
            tickSize: String(inst.tick_size),
            lotSize: String(inst.min_trade_amount),
            minQuantity: String(inst.min_trade_amount),
            maxQuantity: '1000000', // Deribit doesn't expose this
            pricePrecision: this.calculatePrecision(inst.tick_size),
            quantityPrecision: this.calculatePrecision(inst.min_trade_amount),
            isTradeable: inst.is_active,
            expirationTime: inst.expiration_timestamp,
            strikePrice: inst.strike ? String(inst.strike) : undefined,
            optionType: inst.option_type === 'call' ? OptionType.CALL
                : inst.option_type === 'put' ? OptionType.PUT
                    : undefined,
            maxLeverage: inst.max_leverage,
            providerData: inst
        };
    }

    /**
     * Map instrument kind to common type.
     */
    private mapInstrumentType(kind: InstrumentKind): InstrumentType {
        switch (kind) {
            case InstrumentKind.SPOT:
                return InstrumentType.SPOT;
            case InstrumentKind.OPTION:
            case InstrumentKind.OPTION_COMBO:
                return InstrumentType.OPTION;
            case InstrumentKind.FUTURE:
            case InstrumentKind.FUTURE_COMBO:
                return InstrumentType.FUTURE;
            default:
                return InstrumentType.PERPETUAL;
        }
    }

    /**
     * Calculate decimal precision from tick size.
     */
    private calculatePrecision(value: number): number {
        if (value >= 1) return 0;
        return Math.ceil(-Math.log10(value));
    }
}
