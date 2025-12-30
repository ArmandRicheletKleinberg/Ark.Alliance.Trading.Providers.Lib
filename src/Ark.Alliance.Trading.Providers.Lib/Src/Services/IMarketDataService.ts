/**
 * @fileoverview Market Data Service Interface
 * @module Services/IMarketDataService
 *
 * Provider-agnostic market data service interface that abstracts
 * market data operations across different exchange providers.
 */

import { Result } from '../Common/result';
import { IQuote, ITicker, IOrderBook, ITrade, IInstrument } from '../Common/Domain';
import { ProviderType } from '../Common/Clients/Base';

/**
 * Market data subscription callback types.
 */
export type QuoteCallback = (quote: IQuote) => void;
export type TickerCallback = (ticker: ITicker) => void;
export type OrderBookCallback = (book: IOrderBook) => void;
export type TradeCallback = (trade: ITrade) => void;

/**
 * Subscription handle for unsubscribing.
 */
export interface SubscriptionHandle {
    /**
     * Unique subscription ID.
     */
    readonly id: string;

    /**
     * Subscribed instrument.
     */
    readonly instrument: string;

    /**
     * Subscription type.
     */
    readonly type: 'quote' | 'ticker' | 'orderbook' | 'trades';

    /**
     * Unsubscribe from this subscription.
     */
    unsubscribe(): Promise<Result<void>>;
}

/**
 * Market data service interface.
 *
 * @remarks
 * This interface provides a provider-agnostic API for market data.
 * Implementations handle provider-specific details internally.
 *
 * @example
 * ```typescript
 * const service = MarketDataServiceFactory.create(ProviderType.BINANCE, config);
 * await service.connect();
 *
 * // Subscribe to quotes
 * const sub = await service.subscribeQuote('BTCUSDT', (quote) => {
 *     console.log(`${quote.instrument}: ${quote.bidPrice} / ${quote.askPrice}`);
 * });
 *
 * // Later, unsubscribe
 * await sub.unsubscribe();
 * ```
 */
export interface IMarketDataService {
    /**
     * Provider type.
     */
    readonly provider: ProviderType;

    /**
     * Whether the service is connected.
     */
    readonly isConnected: boolean;

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Connect to the provider.
     */
    connect(): Promise<Result<void>>;

    /**
     * Disconnect from the provider.
     */
    disconnect(): Promise<Result<void>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Snapshot Data
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get ticker for an instrument.
     */
    getTicker(instrument: string): Promise<Result<ITicker>>;

    /**
     * Get order book for an instrument.
     */
    getOrderBook(instrument: string, depth?: number): Promise<Result<IOrderBook>>;

    /**
     * Get recent trades for an instrument.
     */
    getRecentTrades(instrument: string, limit?: number): Promise<Result<ITrade[]>>;

    /**
     * Get instrument info.
     */
    getInstrument(symbol: string): Promise<Result<IInstrument>>;

    /**
     * Get all available instruments.
     */
    getInstruments(filter?: { type?: string; baseCurrency?: string }): Promise<Result<IInstrument[]>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Streaming Data
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Subscribe to best bid/ask quotes.
     */
    subscribeQuote(instrument: string, callback: QuoteCallback): Promise<Result<SubscriptionHandle>>;

    /**
     * Subscribe to ticker updates.
     */
    subscribeTicker(instrument: string, callback: TickerCallback): Promise<Result<SubscriptionHandle>>;

    /**
     * Subscribe to order book updates.
     */
    subscribeOrderBook(instrument: string, callback: OrderBookCallback): Promise<Result<SubscriptionHandle>>;

    /**
     * Subscribe to trade updates.
     */
    subscribeTrades(instrument: string, callback: TradeCallback): Promise<Result<SubscriptionHandle>>;

    /**
     * Unsubscribe from all subscriptions.
     */
    unsubscribeAll(): Promise<Result<void>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Cache Access
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get cached quote (if subscribed).
     */
    getCachedQuote(instrument: string): IQuote | undefined;

    /**
     * Get all cached quotes.
     */
    getCachedQuotes(): Map<string, IQuote>;
}
