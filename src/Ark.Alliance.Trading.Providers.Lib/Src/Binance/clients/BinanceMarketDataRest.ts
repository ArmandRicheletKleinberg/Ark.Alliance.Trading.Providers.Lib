/**
 * @fileoverview Binance Market Data REST Client
 * @module clients/BinanceMarketDataRest
 *
 * Public REST API client for Binance Futures market data.
 * All endpoints in this client are public and do not require authentication.
 *
 * @remarks
 * This client provides access to:
 * - Server time (for synchronization)
 * - Exchange information (symbols, filters, rate limits)
 * - Order book depth
 * - Kline/candlestick data
 * - Index and mark price klines
 *
 * All endpoints are FREE and do not require API keys.
 *
 * @see https://developers.binance.com/docs/derivatives/usds-margined-futures/market-data
 */

import { BaseRestClient } from './Base/_BaseRestClient';
import { RestClientConfig } from './Base/types/RestClientConfig';
import { Result } from '../../Common/result';
import { BinanceEnvironment } from '../enums';
import { MarketDataRestConfig } from './Base/types/ClientConfig';
import {
    ServerTimeResponse,
    ExchangeInfoResponse,
    OrderBookResponse,
    RawKline,
    Kline,
    KlineInterval,
    ContinuousContractType,
    parseKlines,
    parseOrderBook,
    ParsedOrderBook
} from '../dtos/marketData';

/**
 * Binance Market Data REST Client for public endpoints.
 *
 * @extends BaseRestClient
 *
 * @remarks
 * Configuration is injected via constructor for DDD compliance.
 * Use service layer or `BinanceEndpoints` helpers to create clients.
 *
 * @example
 * ```typescript
 * import { getFuturesRestBaseUrl } from '../shared/utils/BinanceEndpoints';
 *
 * const client = new BinanceMarketDataRest(
 *     BinanceEnvironment.MAINNET,
 *     { baseUrl: getFuturesRestBaseUrl(BinanceEnvironment.MAINNET) }
 * );
 *
 * const timeResult = await client.getServerTime();
 * if (timeResult.isSuccess) {
 *     console.log('Server time:', timeResult.data?.serverTime);
 * }
 * ```
 */
export class BinanceMarketDataRest extends BaseRestClient {
    /**
     * Cached base URL.
     */
    private readonly _baseUrl: string;

    /**
     * Creates a new BinanceMarketDataRest instance.
     *
     * @param environment - Trading environment (MAINNET or TESTNET).
     * @param config - Client configuration including baseUrl.
     */
    constructor(
        environment: BinanceEnvironment = BinanceEnvironment.MAINNET,
        config: MarketDataRestConfig
    ) {
        super(environment, {
            timeoutMs: config.timeoutMs,
            maxRetries: config.maxRetries,
            retryDelayMs: config.retryDelayMs,
            trackLatency: config.trackLatency,
            trackRateLimits: config.trackRateLimits
        });
        this._baseUrl = config.baseUrl;
    }

    /**
     * Returns the base URL for API requests.
     *
     * @returns The hostname.
     */
    protected getBaseUrl(): string {
        return this._baseUrl;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Connectivity
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Test connectivity to the REST API.
     *
     * @returns Empty object on success.
     *
     * @remarks
     * Weight: 1
     */
    public async ping(): Promise<Result<{}>> {
        return this.publicGet<{}>('/fapi/v1/ping');
    }

    /**
     * Get current server time.
     *
     * @returns Server time response.
     *
     * @remarks
     * Weight: 1
     *
     * @example
     * ```typescript
     * const result = await client.getServerTime();
     * console.log('Server time:', result.data?.serverTime);
     * ```
     */
    public async getServerTime(): Promise<Result<ServerTimeResponse>> {
        return this.publicGet<ServerTimeResponse>('/fapi/v1/time');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Exchange Information
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get current exchange trading rules and symbol information.
     *
     * @returns Exchange information including symbols, filters, and rate limits.
     *
     * @remarks
     * Weight: 1
     *
     * @example
     * ```typescript
     * const result = await client.getExchangeInfo();
     * const btcusdt = result.data?.symbols.find(s => s.symbol === 'BTCUSDT');
     * ```
     */
    public async getExchangeInfo(): Promise<Result<ExchangeInfoResponse>> {
        return this.publicGet<ExchangeInfoResponse>('/fapi/v1/exchangeInfo');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Order Book
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get order book depth.
     *
     * @param symbol - Trading symbol (e.g., "BTCUSDT").
     * @param limit - Number of levels. Valid: 5, 10, 20, 50, 100, 500, 1000. Default: 500.
     * @returns Raw order book response.
     *
     * @remarks
     * Weight: Varies by limit (5-50: 2, 100: 5, 500: 10, 1000: 20)
     */
    public async getOrderBook(
        symbol: string,
        limit: 5 | 10 | 20 | 50 | 100 | 500 | 1000 = 500
    ): Promise<Result<OrderBookResponse>> {
        return this.publicGet<OrderBookResponse>('/fapi/v1/depth', {
            symbol,
            limit
        });
    }

    /**
     * Get parsed order book with numeric values.
     *
     * @param symbol - Trading symbol.
     * @param limit - Number of levels.
     * @returns Parsed order book with numeric prices/quantities.
     */
    public async getOrderBookParsed(
        symbol: string,
        limit: 5 | 10 | 20 | 50 | 100 | 500 | 1000 = 500
    ): Promise<Result<ParsedOrderBook>> {
        const result = await this.getOrderBook(symbol, limit);
        return result.map(data => parseOrderBook(data));
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Kline/Candlestick Data
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get kline/candlestick data.
     *
     * @param symbol - Trading symbol.
     * @param interval - Kline interval.
     * @param options - Optional parameters.
     * @returns Raw kline arrays.
     *
     * @remarks
     * Weight: Varies by limit (1-100: 1, 100-500: 2, 500-1000: 5, >1000: 10)
     */
    public async getKlinesRaw(
        symbol: string,
        interval: KlineInterval,
        options?: {
            startTime?: number;
            endTime?: number;
            limit?: number;
        }
    ): Promise<Result<RawKline[]>> {
        return this.publicGet<RawKline[]>('/fapi/v1/klines', {
            symbol,
            interval,
            startTime: options?.startTime,
            endTime: options?.endTime,
            limit: options?.limit
        });
    }

    /**
     * Get parsed kline/candlestick data.
     *
     * @param symbol - Trading symbol.
     * @param interval - Kline interval.
     * @param options - Optional parameters.
     * @returns Parsed kline objects.
     */
    public async getKlines(
        symbol: string,
        interval: KlineInterval,
        options?: {
            startTime?: number;
            endTime?: number;
            limit?: number;
        }
    ): Promise<Result<Kline[]>> {
        const result = await this.getKlinesRaw(symbol, interval, options);
        return result.map(data => parseKlines(data));
    }

    /**
     * Get continuous contract kline data.
     *
     * @param pair - Trading pair.
     * @param contractType - Contract type.
     * @param interval - Kline interval.
     * @param options - Optional parameters.
     * @returns Parsed kline objects.
     *
     * @remarks
     * Weight: Varies by limit
     */
    public async getContinuousKlines(
        pair: string,
        contractType: ContinuousContractType,
        interval: KlineInterval,
        options?: {
            startTime?: number;
            endTime?: number;
            limit?: number;
        }
    ): Promise<Result<Kline[]>> {
        const result = await this.publicGet<RawKline[]>('/fapi/v1/continuousKlines', {
            pair,
            contractType,
            interval,
            startTime: options?.startTime,
            endTime: options?.endTime,
            limit: options?.limit
        });
        return result.map(data => parseKlines(data));
    }

    /**
     * Get index price kline data.
     *
     * @param pair - Trading pair.
     * @param interval - Kline interval.
     * @param options - Optional parameters.
     * @returns Parsed kline objects.
     */
    public async getIndexPriceKlines(
        pair: string,
        interval: KlineInterval,
        options?: {
            startTime?: number;
            endTime?: number;
            limit?: number;
        }
    ): Promise<Result<Kline[]>> {
        const result = await this.publicGet<RawKline[]>('/fapi/v1/indexPriceKlines', {
            pair,
            interval,
            startTime: options?.startTime,
            endTime: options?.endTime,
            limit: options?.limit
        });
        return result.map(data => parseKlines(data));
    }

    /**
     * Get mark price kline data.
     *
     * @param symbol - Trading symbol.
     * @param interval - Kline interval.
     * @param options - Optional parameters.
     * @returns Parsed kline objects.
     */
    public async getMarkPriceKlines(
        symbol: string,
        interval: KlineInterval,
        options?: {
            startTime?: number;
            endTime?: number;
            limit?: number;
        }
    ): Promise<Result<Kline[]>> {
        const result = await this.publicGet<RawKline[]>('/fapi/v1/markPriceKlines', {
            symbol,
            interval,
            startTime: options?.startTime,
            endTime: options?.endTime,
            limit: options?.limit
        });
        return result.map(data => parseKlines(data));
    }

    /**
     * Get premium index kline data.
     *
     * @param symbol - Trading symbol.
     * @param interval - Kline interval.
     * @param options - Optional parameters.
     * @returns Parsed kline objects.
     */
    public async getPremiumIndexKlines(
        symbol: string,
        interval: KlineInterval,
        options?: {
            startTime?: number;
            endTime?: number;
            limit?: number;
        }
    ): Promise<Result<Kline[]>> {
        const result = await this.publicGet<RawKline[]>('/fapi/v1/premiumIndexKlines', {
            symbol,
            interval,
            startTime: options?.startTime,
            endTime: options?.endTime,
            limit: options?.limit
        });
        return result.map(data => parseKlines(data));
    }
}
