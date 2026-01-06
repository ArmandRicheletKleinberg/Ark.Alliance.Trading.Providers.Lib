/**
 * @fileoverview Kraken Market Data Service
 * @module Kraken/services/KrakenMarketDataService
 *
 * Provider-specific implementation of IMarketDataService for Kraken Futures.
 * Combines REST API for snapshots and WebSocket for streaming.
 */

import { Result } from '../../Common/result';
import { IQuote, ITicker, IOrderBook, ITrade, IInstrument, InstrumentType, SettlementType } from '../../Common/Domain';
import { ProviderType } from '../../Common/Clients/Base';
import {
    IMarketDataService,
    QuoteCallback,
    TickerCallback,
    OrderBookCallback,
    TradeCallback,
    SubscriptionHandle
} from '../../Services/IMarketDataService';
import { KrakenEnvironment } from '../enums';
import { KrakenRestClient, KrakenRestClientConfig, KrakenWebSocketClient, KrakenWebSocketClientConfig } from '../clients';
import {
    KrakenInstrument,
    KrakenTicker,
    KrakenOrderBook,
    KrakenTrade,
    WsTickerMessage,
    WsBookSnapshotMessage,
    WsTradeMessage
} from '../dtos';
import { WS_FEEDS } from '../shared';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken market data service configuration.
 */
export interface KrakenMarketDataServiceConfig {
    /** Trading environment */
    environment: KrakenEnvironment;

    /** API key (optional, for authenticated access) */
    apiKey?: string;

    /** API secret (optional, for authenticated access) */
    apiSecret?: string;

    /** Enable debug logging */
    debug?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Subscription Handle Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Internal subscription handle.
 */
class KrakenSubscriptionHandle implements SubscriptionHandle {
    readonly id: string;
    readonly instrument: string;
    readonly type: 'quote' | 'ticker' | 'orderbook' | 'trades';

    private readonly unsubscribeFn: () => Promise<Result<void>>;

    constructor(
        id: string,
        instrument: string,
        type: 'quote' | 'ticker' | 'orderbook' | 'trades',
        unsubscribeFn: () => Promise<Result<void>>
    ) {
        this.id = id;
        this.instrument = instrument;
        this.type = type;
        this.unsubscribeFn = unsubscribeFn;
    }

    async unsubscribe(): Promise<Result<void>> {
        return this.unsubscribeFn();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken implementation of IMarketDataService.
 */
export class KrakenMarketDataService implements IMarketDataService {
    readonly provider = ProviderType.KRAKEN;

    private readonly config: KrakenMarketDataServiceConfig;
    private restClient: KrakenRestClient | null = null;
    private wsClient: KrakenWebSocketClient | null = null;

    // Callback registries
    private tickerCallbacks: Map<string, TickerCallback[]> = new Map();
    private orderBookCallbacks: Map<string, OrderBookCallback[]> = new Map();
    private tradeCallbacks: Map<string, TradeCallback[]> = new Map();

    // Quote cache
    private quoteCache: Map<string, IQuote> = new Map();

    // Subscription counter
    private subscriptionCounter = 0;

    constructor(config: KrakenMarketDataServiceConfig) {
        this.config = config;
    }

    get isConnected(): boolean {
        return (this.restClient?.isConnected() ?? false) || (this.wsClient?.isConnected() ?? false);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════

    async connect(): Promise<Result<void>> {
        try {
            const restConfig: KrakenRestClientConfig = {
                apiKey: this.config.apiKey || '',
                apiSecret: this.config.apiSecret || '',
                environment: this.config.environment,
                debug: this.config.debug
            };

            this.restClient = new KrakenRestClient(restConfig);
            const restResult = await this.restClient.connect();

            if (!restResult.isSuccess) {
                return restResult;
            }

            const wsConfig: KrakenWebSocketClientConfig = {
                apiKey: this.config.apiKey,
                apiSecret: this.config.apiSecret,
                environment: this.config.environment,
                debug: this.config.debug,
                autoReconnect: true
            };

            this.wsClient = new KrakenWebSocketClient(wsConfig);
            this.setupWebSocketHandlers();

            const wsResult = await this.wsClient.connect();
            if (!wsResult.isSuccess) {
                this.log(`WebSocket connection failed: ${wsResult.error?.message}`);
            }

            return Result.ok<void>(undefined);
        } catch (error) {
            return Result.fail<void>({
                code: 'CONNECTION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to connect',
                timestamp: Date.now()
            });
        }
    }

    async disconnect(): Promise<Result<void>> {
        if (this.wsClient) {
            await this.wsClient.disconnect();
            this.wsClient = null;
        }

        if (this.restClient) {
            await this.restClient.disconnect();
            this.restClient = null;
        }

        this.tickerCallbacks.clear();
        this.orderBookCallbacks.clear();
        this.tradeCallbacks.clear();
        this.quoteCache.clear();

        return Result.ok<void>(undefined);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Snapshot Data
    // ═══════════════════════════════════════════════════════════════════════════

    async getTicker(instrument: string): Promise<Result<ITicker>> {
        if (!this.restClient) {
            return Result.fail<ITicker>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.restClient.getTickers();

        if (!result.isSuccess) {
            return Result.fail<ITicker>(result.error!);
        }

        const tickers = result.data?.tickers as KrakenTicker[];
        const ticker = tickers?.find(t => t.symbol === instrument);

        if (!ticker) {
            return Result.fail<ITicker>({
                code: 'NOT_FOUND',
                message: `Ticker not found for ${instrument}`,
                timestamp: Date.now()
            });
        }

        return Result.ok<ITicker>(this.mapKrakenTicker(ticker));
    }

    async getOrderBook(instrument: string, depth: number = 20): Promise<Result<IOrderBook>> {
        if (!this.restClient) {
            return Result.fail<IOrderBook>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.restClient.getOrderBook(instrument);

        if (!result.isSuccess) {
            return Result.fail<IOrderBook>(result.error!);
        }

        const book = result.data?.orderBook as KrakenOrderBook;
        return Result.ok<IOrderBook>(this.mapKrakenOrderBook(book, depth));
    }

    async getRecentTrades(instrument: string, limit: number = 100): Promise<Result<ITrade[]>> {
        if (!this.restClient) {
            return Result.fail<ITrade[]>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.restClient.getHistory(instrument);

        if (!result.isSuccess) {
            return Result.fail<ITrade[]>(result.error!);
        }

        const trades = (result.data?.history as KrakenTrade[]) || [];
        const mappedTrades = trades.slice(0, limit).map(t => this.mapKrakenTrade(t, instrument));

        return Result.ok<ITrade[]>(mappedTrades);
    }

    async getInstrument(symbol: string): Promise<Result<IInstrument>> {
        if (!this.restClient) {
            return Result.fail<IInstrument>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.restClient.getInstruments();

        if (!result.isSuccess) {
            return Result.fail<IInstrument>(result.error!);
        }

        const instruments = result.data?.instruments as KrakenInstrument[];
        const instrument = instruments?.find(i => i.symbol === symbol);

        if (!instrument) {
            return Result.fail<IInstrument>({
                code: 'NOT_FOUND',
                message: `Instrument not found: ${symbol}`,
                timestamp: Date.now()
            });
        }

        return Result.ok<IInstrument>(this.mapKrakenInstrument(instrument));
    }

    async getInstruments(filter?: { type?: string; baseCurrency?: string }): Promise<Result<IInstrument[]>> {
        if (!this.restClient) {
            return Result.fail<IInstrument[]>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.restClient.getInstruments();

        if (!result.isSuccess) {
            return Result.fail<IInstrument[]>(result.error!);
        }

        let instruments = (result.data?.instruments as KrakenInstrument[]) || [];

        if (filter?.type) {
            instruments = instruments.filter(i => i.type === filter.type);
        }
        if (filter?.baseCurrency) {
            instruments = instruments.filter(i =>
                i.symbol.includes(filter.baseCurrency!.toUpperCase())
            );
        }

        return Result.ok<IInstrument[]>(instruments.map(i => this.mapKrakenInstrument(i)));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Streaming Data
    // ═══════════════════════════════════════════════════════════════════════════

    async subscribeQuote(instrument: string, callback: QuoteCallback): Promise<Result<SubscriptionHandle>> {
        return this.subscribeTicker(instrument, (ticker) => {
            const quote: IQuote = {
                instrument: ticker.instrument,
                bidPrice: ticker.bidPrice,
                bidQuantity: ticker.bidQuantity,
                askPrice: ticker.askPrice,
                askQuantity: ticker.askQuantity,
                timestamp: ticker.timestamp
            };
            this.quoteCache.set(instrument, quote);
            callback(quote);
        }).then(result => {
            if (result.isSuccess) {
                return Result.ok<SubscriptionHandle>(new KrakenSubscriptionHandle(
                    result.data!.id,
                    instrument,
                    'quote',
                    result.data!.unsubscribe.bind(result.data)
                ));
            }
            return result as Result<SubscriptionHandle>;
        });
    }

    async subscribeTicker(instrument: string, callback: TickerCallback): Promise<Result<SubscriptionHandle>> {
        if (!this.wsClient?.isConnected()) {
            return Result.fail<SubscriptionHandle>({
                code: 'NOT_CONNECTED',
                message: 'WebSocket not connected',
                timestamp: Date.now()
            });
        }

        if (!this.tickerCallbacks.has(instrument)) {
            this.tickerCallbacks.set(instrument, []);
        }
        this.tickerCallbacks.get(instrument)!.push(callback);

        if (this.tickerCallbacks.get(instrument)!.length === 1) {
            const result = await this.wsClient.subscribeToFeed(WS_FEEDS.TICKER, [instrument]);
            if (!result.isSuccess) {
                this.tickerCallbacks.delete(instrument);
                return Result.fail<SubscriptionHandle>(result.error!);
            }
        }

        const subId = `ticker:${instrument}:${++this.subscriptionCounter}`;

        return Result.ok<SubscriptionHandle>(new KrakenSubscriptionHandle(
            subId,
            instrument,
            'ticker',
            async () => {
                const callbacks = this.tickerCallbacks.get(instrument);
                if (callbacks) {
                    const idx = callbacks.indexOf(callback);
                    if (idx >= 0) callbacks.splice(idx, 1);

                    if (callbacks.length === 0) {
                        this.tickerCallbacks.delete(instrument);
                        await this.wsClient?.unsubscribeFromFeed(WS_FEEDS.TICKER, [instrument]);
                    }
                }
                return Result.ok<void>(undefined);
            }
        ));
    }

    async subscribeOrderBook(instrument: string, callback: OrderBookCallback): Promise<Result<SubscriptionHandle>> {
        if (!this.wsClient?.isConnected()) {
            return Result.fail<SubscriptionHandle>({
                code: 'NOT_CONNECTED',
                message: 'WebSocket not connected',
                timestamp: Date.now()
            });
        }

        if (!this.orderBookCallbacks.has(instrument)) {
            this.orderBookCallbacks.set(instrument, []);
        }
        this.orderBookCallbacks.get(instrument)!.push(callback);

        if (this.orderBookCallbacks.get(instrument)!.length === 1) {
            const result = await this.wsClient.subscribeToFeed(WS_FEEDS.BOOK, [instrument]);
            if (!result.isSuccess) {
                this.orderBookCallbacks.delete(instrument);
                return Result.fail<SubscriptionHandle>(result.error!);
            }
        }

        const subId = `orderbook:${instrument}:${++this.subscriptionCounter}`;

        return Result.ok<SubscriptionHandle>(new KrakenSubscriptionHandle(
            subId,
            instrument,
            'orderbook',
            async () => {
                const callbacks = this.orderBookCallbacks.get(instrument);
                if (callbacks) {
                    const idx = callbacks.indexOf(callback);
                    if (idx >= 0) callbacks.splice(idx, 1);

                    if (callbacks.length === 0) {
                        this.orderBookCallbacks.delete(instrument);
                        await this.wsClient?.unsubscribeFromFeed(WS_FEEDS.BOOK, [instrument]);
                    }
                }
                return Result.ok<void>(undefined);
            }
        ));
    }

    async subscribeTrades(instrument: string, callback: TradeCallback): Promise<Result<SubscriptionHandle>> {
        if (!this.wsClient?.isConnected()) {
            return Result.fail<SubscriptionHandle>({
                code: 'NOT_CONNECTED',
                message: 'WebSocket not connected',
                timestamp: Date.now()
            });
        }

        if (!this.tradeCallbacks.has(instrument)) {
            this.tradeCallbacks.set(instrument, []);
        }
        this.tradeCallbacks.get(instrument)!.push(callback);

        if (this.tradeCallbacks.get(instrument)!.length === 1) {
            const result = await this.wsClient.subscribeToFeed(WS_FEEDS.TRADE, [instrument]);
            if (!result.isSuccess) {
                this.tradeCallbacks.delete(instrument);
                return Result.fail<SubscriptionHandle>(result.error!);
            }
        }

        const subId = `trades:${instrument}:${++this.subscriptionCounter}`;

        return Result.ok<SubscriptionHandle>(new KrakenSubscriptionHandle(
            subId,
            instrument,
            'trades',
            async () => {
                const callbacks = this.tradeCallbacks.get(instrument);
                if (callbacks) {
                    const idx = callbacks.indexOf(callback);
                    if (idx >= 0) callbacks.splice(idx, 1);

                    if (callbacks.length === 0) {
                        this.tradeCallbacks.delete(instrument);
                        await this.wsClient?.unsubscribeFromFeed(WS_FEEDS.TRADE, [instrument]);
                    }
                }
                return Result.ok<void>(undefined);
            }
        ));
    }

    async unsubscribeAll(): Promise<Result<void>> {
        this.tickerCallbacks.clear();
        this.orderBookCallbacks.clear();
        this.tradeCallbacks.clear();
        return Result.ok<void>(undefined);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cache Access
    // ═══════════════════════════════════════════════════════════════════════════

    getCachedQuote(instrument: string): IQuote | undefined {
        return this.quoteCache.get(instrument);
    }

    getCachedQuotes(): Map<string, IQuote> {
        return new Map(this.quoteCache);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private Methods
    // ═══════════════════════════════════════════════════════════════════════════

    private setupWebSocketHandlers(): void {
        if (!this.wsClient) return;

        this.wsClient.on('ticker', (data: WsTickerMessage) => {
            const ticker = this.mapWsTicker(data);
            const callbacks = this.tickerCallbacks.get(data.product_id);
            callbacks?.forEach(cb => cb(ticker));
        });

        this.wsClient.on('book_snapshot', (data: WsBookSnapshotMessage) => {
            const book = this.mapWsBookSnapshot(data);
            const callbacks = this.orderBookCallbacks.get(data.product_id);
            callbacks?.forEach(cb => cb(book));
        });

        this.wsClient.on('trade', (data: WsTradeMessage) => {
            const trade = this.mapWsTrade(data);
            const callbacks = this.tradeCallbacks.get(data.product_id);
            callbacks?.forEach(cb => cb(trade));
        });
    }

    private mapKrakenTicker(ticker: KrakenTicker): ITicker {
        const priceChange = 0; // Kraken doesn't provide this directly
        return {
            instrument: ticker.symbol,
            bidPrice: ticker.bid.toString(),
            bidQuantity: ticker.bidSize.toString(),
            askPrice: ticker.ask.toString(),
            askQuantity: ticker.askSize.toString(),
            lastPrice: ticker.last.toString(),
            markPrice: ticker.markPrice.toString(),
            indexPrice: (ticker.indexPrice ?? ticker.markPrice).toString(),
            high24h: (ticker.high24h ?? ticker.last).toString(),
            low24h: (ticker.low24h ?? ticker.last).toString(),
            volume24h: ticker.vol24h.toString(),
            priceChangePercent24h: priceChange.toString(),
            openInterest: ticker.openInterest.toString(),
            fundingRate: ticker.fundingRate?.toString(),
            timestamp: new Date(ticker.lastTime).getTime()
        };
    }

    private mapWsTicker(data: WsTickerMessage): ITicker {
        return {
            instrument: data.product_id,
            bidPrice: data.bid.toString(),
            bidQuantity: data.bid_size.toString(),
            askPrice: data.ask.toString(),
            askQuantity: data.ask_size.toString(),
            lastPrice: data.last.toString(),
            markPrice: data.markPrice.toString(),
            indexPrice: (data.index ?? data.markPrice).toString(),
            high24h: (data.high ?? data.last).toString(),
            low24h: (data.low ?? data.last).toString(),
            volume24h: data.volume.toString(),
            priceChangePercent24h: (data.change ?? 0).toString(),
            openInterest: (data.openInterest ?? 0).toString(),
            fundingRate: data.funding_rate?.toString(),
            timestamp: data.time
        };
    }

    private mapKrakenOrderBook(book: KrakenOrderBook, depth: number): IOrderBook {
        return {
            instrument: book.symbol,
            bids: book.bids.slice(0, depth).map(([price, qty]) => ({
                price: price.toString(),
                quantity: qty.toString()
            })),
            asks: book.asks.slice(0, depth).map(([price, qty]) => ({
                price: price.toString(),
                quantity: qty.toString()
            })),
            updateId: Date.now(),
            timestamp: Date.now()
        };
    }

    private mapWsBookSnapshot(data: WsBookSnapshotMessage): IOrderBook {
        return {
            instrument: data.product_id,
            bids: data.bids.map(([price, qty]) => ({
                price: price.toString(),
                quantity: qty.toString()
            })),
            asks: data.asks.map(([price, qty]) => ({
                price: price.toString(),
                quantity: qty.toString()
            })),
            updateId: data.seq,
            timestamp: data.timestamp
        };
    }

    private mapKrakenTrade(trade: KrakenTrade, instrument: string): ITrade {
        return {
            tradeId: trade.uid || Date.now().toString(),
            instrument,
            price: trade.price.toString(),
            quantity: trade.size.toString(),
            side: trade.side === 'buy' ? 'BUY' : 'SELL',
            timestamp: new Date(trade.time).getTime(),
            isBuyerMaker: trade.side === 'sell' // If seller initiated, buyer was maker
        };
    }

    private mapWsTrade(data: WsTradeMessage): ITrade {
        return {
            tradeId: data.uid || data.seq.toString(),
            instrument: data.product_id,
            price: data.price.toString(),
            quantity: data.qty.toString(),
            side: data.side === 'buy' ? 'BUY' : 'SELL',
            timestamp: data.time,
            isBuyerMaker: data.side === 'sell'
        };
    }

    private mapKrakenInstrument(instr: KrakenInstrument): IInstrument {
        const isInverse = instr.symbol.includes('_') && !instr.symbol.includes('USDT');
        return {
            symbol: instr.symbol,
            baseCurrency: instr.underlying || this.extractBaseCurrency(instr.symbol),
            quoteCurrency: instr.quoteCurrency || 'USD',
            type: instr.type === 'perpetual' ? InstrumentType.PERPETUAL : InstrumentType.FUTURE,
            settlementType: isInverse ? SettlementType.INVERSE : SettlementType.LINEAR,
            contractSize: instr.contractSize.toString(),
            tickSize: instr.tickSize.toString(),
            lotSize: '1',
            minQuantity: '1',
            maxQuantity: '1000000',
            pricePrecision: this.getPrecision(instr.tickSize),
            quantityPrecision: 0,
            isTradeable: instr.tradeable,
            expirationTime: instr.lastTradingTime ? new Date(instr.lastTradingTime).getTime() : undefined,
            maxLeverage: instr.maxLeverage,
            providerData: instr
        };
    }

    private extractBaseCurrency(symbol: string): string {
        // Extract base from symbols like PI_XBTUSD, PF_ETHUSD
        const match = symbol.match(/P[IF]_(\w{3})/);
        return match ? match[1] : symbol.slice(0, 3);
    }

    private getPrecision(tickSize: number): number {
        if (tickSize >= 1) return 0;
        const str = tickSize.toString();
        const decimalIndex = str.indexOf('.');
        return decimalIndex >= 0 ? str.length - decimalIndex - 1 : 0;
    }

    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[KrakenMarketDataService] ${message}`);
        }
    }
}
