/**
 * @fileoverview Deribit Market Data Service
 * @module Deribit/services/DeribitMarketDataService
 *
 * Provider-specific implementation of IMarketDataService for Deribit.
 *
 * @remarks
 * This service provides access to PUBLIC market data endpoints.
 * Market data does not require authentication.
 */

import { Result, ResultStatus } from '../../Common/result';
import {
    IQuote,
    ITicker,
    IOrderBook,
    ITrade,
    IInstrument
} from '../../Common/Domain';
import { ProviderType } from '../../Common/Clients/Base';
import {
    IMarketDataService,
    QuoteCallback,
    TickerCallback,
    OrderBookCallback,
    TradeCallback,
    SubscriptionHandle
} from '../../Services/IMarketDataService';
import { DeribitEnvironment } from '../enums';
import { DeribitMarketDataClient } from '../clients';

/**
 * Deribit market data service configuration.
 *
 * @remarks
 * Market data endpoints are PUBLIC and do NOT require authentication.
 */
export interface DeribitMarketDataServiceConfig {
    /**
     * Environment (TESTNET or MAINNET).
     */
    environment: DeribitEnvironment;

    /**
     * Default currency for instrument queries (e.g., 'BTC', 'ETH').
     */
    defaultCurrency?: string;

    /**
     * Enable debug logging.
     */
    debug?: boolean;
}

/**
 * Helper to create a NOT_IMPLEMENTED result.
 */
function notImplemented<T>(method: string): Result<T> {
    return Result.fail<T>({
        code: 'NOT_IMPLEMENTED',
        message: `${method} not yet implemented`,
        timestamp: Date.now()
    }, ResultStatus.NOT_IMPLEMENTED);
}

/**
 * Deribit implementation of IMarketDataService.
 *
 * @example
 * ```typescript
 * const service = new DeribitMarketDataService({
 *     environment: DeribitEnvironment.TESTNET
 * });
 *
 * await service.connect();
 *
 * const ticker = await service.getTicker('BTC-PERPETUAL');
 * if (ticker.isSuccess) {
 *     console.log(`BTC Last: ${ticker.data.lastPrice}`);
 * }
 * ```
 */
export class DeribitMarketDataService implements IMarketDataService {
    readonly provider = ProviderType.DERIBIT;

    private readonly config: DeribitMarketDataServiceConfig;
    private client: DeribitMarketDataClient | null = null;
    private readonly subscriptions: Map<string, SubscriptionHandle> = new Map();
    private handleCounter: number = 0;

    constructor(config: DeribitMarketDataServiceConfig) {
        this.config = config;
    }

    get isConnected(): boolean {
        return this.client?.isConnected() ?? false;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════════

    async connect(): Promise<Result<void>> {
        try {
            // Market data client uses empty credentials (public access)
            this.client = new DeribitMarketDataClient({
                credentials: { clientId: '', clientSecret: '' },
                environment: this.config.environment,
                debug: this.config.debug
            });

            return await this.client.connect();
        } catch (error) {
            return Result.fail<void>({
                code: 'CONNECTION_ERROR',
                message: error instanceof Error ? error.message : 'Failed to connect',
                timestamp: Date.now()
            });
        }
    }

    async disconnect(): Promise<Result<void>> {
        await this.unsubscribeAll();

        if (this.client) {
            const result = await this.client.disconnect();
            this.client = null;
            return result;
        }

        return Result.ok<void>(undefined);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Snapshot Data
    // ═══════════════════════════════════════════════════════════════════════════════

    async getTicker(instrument: string): Promise<Result<ITicker>> {
        if (!this.client) {
            return Result.fail<ITicker>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        return this.client.getTicker(instrument);
    }

    async getOrderBook(instrument: string, depth: number = 20): Promise<Result<IOrderBook>> {
        if (!this.client) {
            return Result.fail<IOrderBook>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        return this.client.getOrderBook(instrument, depth);
    }

    async getRecentTrades(instrument: string, limit: number = 100): Promise<Result<ITrade[]>> {
        // Not implemented in underlying client
        return Result.ok<ITrade[]>([]);
    }

    async getInstrument(symbol: string): Promise<Result<IInstrument>> {
        if (!this.client) {
            return Result.fail<IInstrument>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        return this.client.getInstrument(symbol);
    }

    async getInstruments(filter?: { type?: string; baseCurrency?: string }): Promise<Result<IInstrument[]>> {
        if (!this.client) {
            return Result.fail<IInstrument[]>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const currency = filter?.baseCurrency ?? this.config.defaultCurrency ?? 'BTC';
        return this.client.getInstruments(currency);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Streaming Data
    // ═══════════════════════════════════════════════════════════════════════════════

    async subscribeQuote(instrument: string, callback: QuoteCallback): Promise<Result<SubscriptionHandle>> {
        if (!this.client) {
            return Result.fail<SubscriptionHandle>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.subscribeQuote(instrument, callback);

        if (!result.isSuccess) {
            return Result.fail<SubscriptionHandle>(
                result.error ?? { code: 'SUBSCRIPTION_ERROR', message: 'Failed to subscribe', timestamp: Date.now() }
            );
        }

        return Result.ok(this.createHandle(instrument, 'quote', `quote.${instrument}`));
    }

    async subscribeTicker(instrument: string, callback: TickerCallback): Promise<Result<SubscriptionHandle>> {
        if (!this.client) {
            return Result.fail<SubscriptionHandle>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.subscribeTicker(instrument, callback);

        if (!result.isSuccess) {
            return Result.fail<SubscriptionHandle>(
                result.error ?? { code: 'SUBSCRIPTION_ERROR', message: 'Failed to subscribe', timestamp: Date.now() }
            );
        }

        return Result.ok(this.createHandle(instrument, 'ticker', `ticker.${instrument}.100ms`));
    }

    async subscribeOrderBook(instrument: string, callback: OrderBookCallback): Promise<Result<SubscriptionHandle>> {
        if (!this.client) {
            return Result.fail<SubscriptionHandle>({
                code: 'NOT_CONNECTED',
                message: 'Service not connected',
                timestamp: Date.now()
            });
        }

        const result = await this.client.subscribeOrderBook(instrument, callback);

        if (!result.isSuccess) {
            return Result.fail<SubscriptionHandle>(
                result.error ?? { code: 'SUBSCRIPTION_ERROR', message: 'Failed to subscribe', timestamp: Date.now() }
            );
        }

        return Result.ok(this.createHandle(instrument, 'orderbook', `book.${instrument}.100ms`));
    }

    async subscribeTrades(instrument: string, callback: TradeCallback): Promise<Result<SubscriptionHandle>> {
        return notImplemented<SubscriptionHandle>('subscribeTrades');
    }

    async unsubscribeAll(): Promise<Result<void>> {
        // Unsubscribe all handles
        for (const handle of this.subscriptions.values()) {
            await handle.unsubscribe();
        }
        this.subscriptions.clear();

        if (this.client) {
            return this.client.unsubscribeAll();
        }

        return Result.ok<void>(undefined);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Cache Access
    // ═══════════════════════════════════════════════════════════════════════════════

    getCachedQuote(instrument: string): IQuote | undefined {
        return this.client?.getCachedQuote(instrument);
    }

    getCachedQuotes(): Map<string, IQuote> {
        return this.client?.getAllCachedQuotes() ?? new Map();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Create a subscription handle.
     */
    private createHandle(
        instrument: string,
        type: 'quote' | 'ticker' | 'orderbook' | 'trades',
        channel: string
    ): SubscriptionHandle {
        const id = `${type}_${instrument}_${++this.handleCounter}`;
        const client = this.client;
        const subscriptions = this.subscriptions;

        const handle: SubscriptionHandle = {
            id,
            instrument,
            type,
            unsubscribe: async (): Promise<Result<void>> => {
                subscriptions.delete(id);
                if (client) {
                    return client.unsubscribe(channel);
                }
                return Result.ok<void>(undefined);
            }
        };

        subscriptions.set(id, handle);
        return handle;
    }
}
