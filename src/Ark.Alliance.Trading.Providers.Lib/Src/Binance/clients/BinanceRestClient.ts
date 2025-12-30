/**
 * @fileoverview Binance REST API Client for Position Service
 * @module clients/BinanceRestClient
 */

import * as https from 'https';
import { HmacSignatureGenerator } from '../helpers/security/HmacSignatureGenerator';
import { Result } from '../../Common/result';
import {
    createBinanceSuccessResult,
    createBinanceErrorResult,
    createBinanceTimeoutResult,
    createBinanceNetworkErrorResult,
    createBinanceParseErrorResult
} from '../shared/utils/BinanceResultMapper';
import { LatencyTracker, LatencyStats } from '../utils/LatencyTracker';
import { ServerTimeSync } from '../utils/ServerTimeSync';
import { SignedRestClientConfig } from './Base/types/ClientConfig';
import { BinanceRateLimit } from '../dtos/binance/RateLimits';
import {
    OrderSide,
    TimeInForce,
    WorkingType,
    MarginType,
    MarginModifyType,
    type OrderSideType,
    type TimeInForceType,
    type WorkingTypeType,
    type MarginTypeType
} from '../enums';

/**
 * Binance Futures REST API Client
 * 
 * @remarks
 * This client requires configuration to be injected via constructor.
 * Use service layer to create clients with appropriate settings.
 * 
 * @example
 * ```typescript
 * import { getFuturesRestBaseUrl } from '../shared/utils/BinanceEndpoints';
 * 
 * const client = new BinanceRestClient(apiKey, apiSecret, {
 *     baseUrl: getFuturesRestBaseUrl(environment),
 *     onRateLimitUpdate: (limits) => rateLimitCache.update(instanceKey, 'rest', limits)
 * });
 * ```
 */
export class BinanceRestClient {
    private readonly baseUrl: string;
    private readonly apiKey: string;
    private readonly signatureGenerator: HmacSignatureGenerator;
    private readonly latencyTracker: LatencyTracker;
    private readonly timeoutMs: number;
    private readonly onRateLimitUpdate?: (rateLimits: BinanceRateLimit[]) => void;

    /**
     * Creates a new BinanceRestClient instance.
     * 
     * @param apiKey - Binance API key.
     * @param apiSecret - Binance API secret.
     * @param config - Client configuration including base URL and optional callbacks.
     */
    constructor(apiKey: string, apiSecret: string, config: SignedRestClientConfig) {
        this.apiKey = apiKey;
        this.signatureGenerator = new HmacSignatureGenerator(apiSecret);
        this.baseUrl = config.baseUrl;
        this.timeoutMs = config.timeoutMs ?? 30000;
        this.onRateLimitUpdate = config.onRateLimitUpdate;
        this.latencyTracker = new LatencyTracker();
    }

    /**
     * Make signed GET request
     */
    private async signedGet<T>(endpoint: string, params: Record<string, any> = {}): Promise<Result<T>> {
        // Use server-synced timestamp to prevent -1021 errors
        const timestamp = ServerTimeSync.getTimestamp();
        const queryParams: Record<string, any> = { ...params, timestamp };

        // Use helper to guarantee sort order matches signature
        const queryString = this.signatureGenerator.getSignedQueryString(queryParams);

        return this.makeRequest<T>('GET', `${endpoint}?${queryString}`);
    }

    /**
     * Make signed POST request
     */
    private async signedPost<T>(endpoint: string, params: Record<string, any> = {}): Promise<Result<T>> {
        // Use server-synced timestamp to prevent -1021 errors
        const timestamp = ServerTimeSync.getTimestamp();
        const queryParams: Record<string, any> = { ...params, timestamp };

        // Use helper to guarantee sort order matches signature
        const queryString = this.signatureGenerator.getSignedQueryString(queryParams);

        return this.makeRequest<T>('POST', `${endpoint}?${queryString}`);
    }

    /**
     * Make signed DELETE request
     */
    private async signedDelete<T>(endpoint: string, params: Record<string, any> = {}): Promise<Result<T>> {
        // Use server-synced timestamp to prevent -1021 errors
        const timestamp = ServerTimeSync.getTimestamp();
        const queryParams: Record<string, any> = { ...params, timestamp };

        // Use helper to guarantee sort order matches signature
        const queryString = this.signatureGenerator.getSignedQueryString(queryParams);

        return this.makeRequest<T>('DELETE', `${endpoint}?${queryString}`);
    }

    /**
     * Make HTTP request with timeout handling
     * Tracks latency and rate limits from response headers
     */
    private makeRequest<T>(method: string, path: string): Promise<Result<T>> {
        const startTime = Date.now();
        const endpoint = path.split('?')[0]; // Extract endpoint for context

        return new Promise((resolve) => {
            const options = {
                hostname: this.baseUrl,
                path: path,
                method: method,
                headers: {
                    'X-MBX-APIKEY': this.apiKey,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    // Track latency
                    const latencyMs = Date.now() - startTime;
                    this.latencyTracker.record(latencyMs);

                    // Parse rate limits from headers
                    this.parseRateLimitHeaders(res.headers);

                    try {
                        const parsed = JSON.parse(data);

                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(createBinanceSuccessResult<T>(parsed as T));
                        } else {
                            resolve(createBinanceErrorResult<T>(
                                parsed.code,
                                parsed.msg || 'Request failed',
                                {
                                    endpoint,
                                    httpStatus: res.statusCode,
                                    method,
                                    rawResponse: parsed
                                }
                            ));
                        }
                    } catch (err) {
                        resolve(createBinanceParseErrorResult<T>(
                            data,
                            err as Error,
                            endpoint
                        ));
                    }
                });
            });

            // Add timeout handling
            req.setTimeout(this.timeoutMs, () => {
                req.destroy();
                const latencyMs = Date.now() - startTime;
                this.latencyTracker.record(latencyMs);
                resolve(createBinanceTimeoutResult<T>(this.timeoutMs, endpoint));
            });

            req.on('error', (error) => {
                const latencyMs = Date.now() - startTime;
                this.latencyTracker.record(latencyMs);
                resolve(createBinanceNetworkErrorResult<T>(error, endpoint));
            });

            req.end();
        });
    }

    /**
     * Parse rate limit headers from Binance response
     */
    private parseRateLimitHeaders(headers: any): void {
        const rateLimits: any[] = [];

        // X-MBX-USED-WEIGHT-{interval}{intervalNum} - Request weight used
        const usedWeight1m = headers['x-mbx-used-weight-1m'];
        if (usedWeight1m) {
            rateLimits.push({
                rateLimitType: 'REQUEST_WEIGHT',
                interval: 'MINUTE',
                intervalNum: 1,
                limit: 2400,
                count: parseInt(usedWeight1m, 10)
            });
        }

        // X-MBX-ORDER-COUNT-{interval} - Order count (10 second window)
        const orderCount10s = headers['x-mbx-order-count-10s'];
        if (orderCount10s) {
            rateLimits.push({
                rateLimitType: 'ORDERS',
                interval: 'SECOND',
                intervalNum: 10,
                limit: 300,
                count: parseInt(orderCount10s, 10)
            });
        }

        // X-MBX-ORDER-COUNT-1M - Order count (1 minute window)
        const orderCount1m = headers['x-mbx-order-count-1m'];
        if (orderCount1m) {
            rateLimits.push({
                rateLimitType: 'ORDERS',
                interval: 'MINUTE',
                intervalNum: 1,
                limit: 1200,
                count: parseInt(orderCount1m, 10)
            });
        }

        if (rateLimits.length > 0 && this.onRateLimitUpdate) {
            this.onRateLimitUpdate(rateLimits);
        }
    }


    /**
     * Change leverage for a symbol
     */
    async changeLeverage(symbol: string, leverage: number): Promise<Result<any>> {
        return this.signedPost('/fapi/v1/leverage', { symbol, leverage });
    }

    /**
     * Change margin type for a symbol (CROSSED or ISOLATED)
     */
    async setMarginType(symbol: string, marginType: MarginTypeType): Promise<Result<any>> {
        return this.signedPost('/fapi/v1/marginType', { symbol, marginType });
    }

    /**
     * Get position risk
     */
    async getPositionRisk(symbol?: string): Promise<Result<any>> {
        const params = symbol ? { symbol } : {};
        return this.signedGet('/fapi/v2/positionRisk', params);
    }

    /**
     * Get account information
     */
    async getAccount(): Promise<Result<any>> {
        return this.signedGet('/fapi/v2/account');
    }

    /**
     * Create listen key for User Data Stream
     */
    async createListenKey(): Promise<Result<{ listenKey: string }>> {
        return this.signedPost('/fapi/v1/listenKey');
    }

    /**
     * Keepalive listen key
     */
    async keepaliveListenKey(): Promise<Result<any>> {
        return this.makeRequest('PUT', '/fapi/v1/listenKey');
    }

    /**
     * Delete listen key
     */
    async deleteListenKey(): Promise<Result<any>> {
        return this.makeRequest('DELETE', '/fapi/v1/listenKey');
    }

    /**
     * Ping endpoint
     */
    async ping(): Promise<Result<any>> {
        return this.makeRequest('GET', '/fapi/v1/ping');
    }

    /**
     * Get server time
     */
    async getServerTime(): Promise<Result<{ serverTime: number }>> {
        return this.makeRequest('GET', '/fapi/v1/time');
    }

    /**
     * Get exchange information (public endpoint - no auth required)
     * Returns trading rules and symbol information
     */
    async getExchangeInfo(): Promise<Result<any>> {
        return this.makeRequest('GET', '/fapi/v1/exchangeInfo');
    }

    /**
     * Get order book depth (public endpoint - no auth required)
     * @param symbol - Trading symbol
     * @param limit - Number of levels (default 20, max 1000)
     */
    async getOrderBook(symbol: string, limit: number = 20): Promise<Result<any>> {
        return this.makeRequest<any>('GET', `/fapi/v1/depth?symbol=${symbol}&limit=${limit}`);
    }

    /**
     * Get klines/candlestick data (public endpoint - no auth required)
     * @param symbol - Trading symbol
     * @param interval - Candlestick interval (e.g., '1m', '5m', '1h')
     * @param limit - Number of candles (default 10, max 1500)
     */
    async getKlines(symbol: string, interval: string, limit: number = 10): Promise<Result<any[]>> {
        const result = await this.makeRequest<any[]>('GET', `/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);

        // Map to structured format if successful
        return result.map(data => data.map((k: any[]) => ({
            openTime: k[0],
            open: k[1],
            high: k[2],
            low: k[3],
            close: k[4],
            volume: k[5],
            closeTime: k[6],
            quoteVolume: k[7],
            trades: k[8],
            takerBuyBaseVolume: k[9],
            takerBuyQuoteVolume: k[10]
        })));
    }

    /**
     * Get open orders for a symbol or all symbols
     * @param symbol - Optional symbol to filter orders
     */
    async getOpenOrders(symbol?: string): Promise<Result<any[]>> {
        const params = symbol ? { symbol } : {};
        return this.signedGet('/fapi/v1/openOrders', params);
    }

    /**
     * Cancel all open orders for a symbol
     * @param symbol - Symbol to cancel all orders for
     */
    async cancelAllOrders(symbol: string): Promise<Result<any>> {
        return this.signedDelete('/fapi/v1/allOpenOrders', { symbol });
    }

    /**
     * Place a MARKET order
     * @param symbol - Trading symbol
     * @param side - BUY or SELL
     * @param quantity - Order quantity
     */
    async placeMarketOrder(
        symbol: string,
        side: OrderSideType,
        quantity: number | string,
        options?: { reduceOnly?: boolean }
    ): Promise<Result<any>> {
        const params: Record<string, any> = {
            symbol,
            side,
            type: 'MARKET',
            quantity: quantity.toString()
        };

        if (options?.reduceOnly) {
            params.reduceOnly = 'true';
        }

        return this.signedPost('/fapi/v1/order', params);
    }

    /**
     * Place a LIMIT order
     * @param symbol - Trading symbol
     * @param side - BUY or SELL
     * @param quantity - Order quantity (string for precision)
     * @param price - Limit price (string for precision)
     * @param options - Additional options
     */
    async placeLimitOrder(
        symbol: string,
        side: OrderSideType,
        quantity: string,
        price: string,
        options?: {
            timeInForce?: TimeInForceType;
            reduceOnly?: boolean;
        }
    ): Promise<Result<any>> {
        const params: Record<string, any> = {
            symbol,
            side,
            type: 'LIMIT',
            timeInForce: options?.timeInForce || 'GTC',
            quantity,
            price
        };

        if (options?.reduceOnly) {
            params.reduceOnly = 'true';
        }

        return this.signedPost('/fapi/v1/order', params);
    }

    /**
     * Place a STOP or STOP_MARKET order
     * STOP orders require stopPrice and price (limit price when triggered)
     * STOP_MARKET orders only require stopPrice
     * NOTE: STOP orders via WebSocket API return [-4120] - must use REST API
     * 
     * @param symbol - Trading symbol
     * @param side - BUY or SELL
     * @param quantity - Order quantity (string for precision)
     * @param stopPrice - Trigger price (string for precision)
     * @param options - Additional options including price for STOP orders
     */
    async placeStopOrder(
        symbol: string,
        side: OrderSideType,
        quantity: string,
        stopPrice: string,
        options?: {
            price?: string;           // Required for STOP type, optional for STOP_MARKET
            type?: 'STOP' | 'STOP_MARKET';
            timeInForce?: TimeInForceType;
            reduceOnly?: boolean;
            workingType?: WorkingTypeType;
            priceProtect?: boolean;
            clientOrderId?: string;
        }
    ): Promise<Result<any>> {
        const orderType = options?.type || (options?.price ? 'STOP' : 'STOP_MARKET');

        const params: Record<string, any> = {
            symbol,
            side,
            type: orderType,
            quantity,
            stopPrice,
            timeInForce: options?.timeInForce || 'GTC',
            workingType: options?.workingType || 'MARK_PRICE',
            priceProtect: options?.priceProtect !== false ? 'true' : 'false'
        };

        // STOP type requires price (limit price when triggered)
        if (orderType === 'STOP' && options?.price) {
            params.price = options.price;
        }

        if (options?.reduceOnly) {
            params.reduceOnly = 'true';
        }

        if (options?.clientOrderId) {
            params.newClientOrderId = options.clientOrderId;
        }

        console.log(`[BinanceRestClient] Placing STOP order:`, params);
        return this.signedPost('/fapi/v1/order', params);
    }

    /**
     * Get user trade history for a symbol
     * @param symbol - Trading symbol (required)
     * @param options - Optional parameters
     */
    async getUserTrades(
        symbol: string,
        options?: {
            startTime?: number;
            endTime?: number;
            fromId?: number;
            limit?: number; // default 500, max 1000
        }
    ): Promise<Result<any[]>> {
        const params: Record<string, any> = { symbol };

        if (options?.startTime) params.startTime = options.startTime;
        if (options?.endTime) params.endTime = options.endTime;
        if (options?.fromId) params.fromId = options.fromId;
        if (options?.limit) params.limit = options.limit;

        return this.signedGet('/fapi/v1/userTrades', params);
    }

    /**
     * Get latency statistics
     */
    getLatencyStats(): LatencyStats {
        return this.latencyTracker.getStats();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Aliases for test scenario compatibility
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get account info (alias for getAccount)
     */
    async getAccountInfo(): Promise<Result<any>> {
        return this.getAccount();
    }

    /**
     * Get account balance
     * @returns Array of asset balances
     */
    async getBalance(): Promise<Result<any[]>> {
        return this.signedGet('/fapi/v2/balance');
    }

    /**
     * Get income history
     * @param options - Query parameters
     */
    async getIncome(options?: {
        symbol?: string;
        incomeType?: string;
        startTime?: number;
        endTime?: number;
        limit?: number;
    }): Promise<Result<any[]>> {
        return this.signedGet('/fapi/v1/income', options || {});
    }

    /**
     * Get commission rate for a symbol
     * @param symbol - Trading symbol
     */
    async getCommissionRate(symbol: string): Promise<Result<any>> {
        return this.signedGet('/fapi/v1/commissionRate', { symbol });
    }

    /**
     * Get leverage bracket information
     * @param symbol - Optional symbol filter
     */
    async getLeverageBracket(symbol?: string): Promise<Result<any[]>> {
        const params = symbol ? { symbol } : {};
        return this.signedGet('/fapi/v1/leverageBracket', params);
    }

    /**
     * Get current position mode (hedge/one-way)
     */
    async getPositionMode(): Promise<Result<{ dualSidePosition: boolean }>> {
        return this.signedGet('/fapi/v1/positionSide/dual');
    }

    /**
     * Set position mode
     * @param dualSidePosition - true for hedge mode, false for one-way
     */
    async setPositionMode(dualSidePosition: boolean): Promise<Result<any>> {
        return this.signedPost('/fapi/v1/positionSide/dual', {
            dualSidePosition: dualSidePosition.toString()
        });
    }

    /**
     * Get API trading status (quantitative rules)
     */
    async getApiTradingStatus(): Promise<Result<any>> {
        return this.signedGet('/fapi/v1/apiTradingStatus');
    }

    /**
     * Set leverage for a symbol (alias for changeLeverage)
     */
    async setLeverage(symbol: string, leverage: number): Promise<Result<any>> {
        return this.changeLeverage(symbol, leverage);
    }

    /**
     * Cancel a single order
     * @param symbol - Trading symbol
     * @param orderId - Order ID to cancel
     */
    async cancelOrder(symbol: string, orderId: number | string): Promise<Result<any>> {
        return this.signedDelete('/fapi/v1/order', { symbol, orderId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Generic Order Placement
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Generic order placement - dispatches to specific methods based on type
     * @param params - Order parameters including type
     * 
     * @remarks
     * Weight: 1 per order
     */
    async placeOrder(params: {
        symbol: string;
        side: OrderSideType;
        type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET';
        quantity?: string | number;
        price?: string;
        stopPrice?: string;
        timeInForce?: TimeInForceType;
        reduceOnly?: boolean;
        workingType?: WorkingTypeType;
        positionSide?: 'BOTH' | 'LONG' | 'SHORT';
        callbackRate?: number;
        closePosition?: boolean;
        goodTillDate?: number;
    }): Promise<Result<any>> {
        const orderParams: Record<string, any> = {
            symbol: params.symbol,
            side: params.side,
            type: params.type
        };

        // Quantity is required unless using closePosition
        if (params.quantity !== undefined && params.quantity !== null) {
            orderParams.quantity = params.quantity.toString();
        } else if (params.closePosition) {
            orderParams.closePosition = 'true';
        }

        if (params.price) orderParams.price = params.price;
        if (params.stopPrice) orderParams.stopPrice = params.stopPrice;
        if (params.timeInForce) orderParams.timeInForce = params.timeInForce;
        if (params.reduceOnly) orderParams.reduceOnly = 'true';
        if (params.workingType) orderParams.workingType = params.workingType;
        if (params.positionSide) orderParams.positionSide = params.positionSide;
        if (params.callbackRate) orderParams.callbackRate = params.callbackRate;
        if (params.goodTillDate) orderParams.goodTillDate = params.goodTillDate;

        // LIMIT requires timeInForce
        if (params.type === 'LIMIT' && !params.timeInForce) {
            orderParams.timeInForce = 'GTC';
        }

        return this.signedPost('/fapi/v1/order', orderParams);
    }

    /**
     * Cancel all open orders for a symbol (alias for cancelAllOrders)
     * @param symbol - Trading symbol
     */
    async cancelAllOpenOrders(symbol: string): Promise<Result<any>> {
        return this.cancelAllOrders(symbol);
    }

    /**
     * Get order status
     * @param symbol - Trading symbol
     * @param orderId - Order ID
     */
    async getOrder(symbol: string, orderId: number | string): Promise<Result<any>> {
        return this.signedGet('/fapi/v1/order', { symbol, orderId });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Market Data Methods (Public)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get price ticker for a symbol
     * @param symbol - Trading symbol
     */
    async getPrice(symbol: string): Promise<Result<{ symbol: string; price: string }>> {
        return this.makeRequest('GET', `/fapi/v1/ticker/price?symbol=${encodeURIComponent(symbol)}`);
    }

    /**
     * Get all prices
     */
    async getAllPrices(): Promise<Result<Array<{ symbol: string; price: string }>>> {
        return this.makeRequest('GET', '/fapi/v1/ticker/price');
    }

    /**
     * Get 24hr ticker statistics
     * @param symbol - Trading symbol
     */
    async get24hrTicker(symbol: string): Promise<Result<any>> {
        return this.makeRequest('GET', `/fapi/v1/ticker/24hr?symbol=${encodeURIComponent(symbol)}`);
    }

    /**
     * Get mark price
     * @param symbol - Trading symbol
     */
    async getMarkPrice(symbol: string): Promise<Result<any>> {
        return this.makeRequest('GET', `/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`);
    }

    /**
     * Get funding rate history
     * @param symbol - Trading symbol
     * @param limit - Number of entries (default 100)
     */
    async getFundingRate(symbol: string, limit: number = 100): Promise<Result<any[]>> {
        return this.makeRequest('GET', `/fapi/v1/fundingRate?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
    }

    /**
     * Get book ticker (best bid/ask)
     * @param symbol - Trading symbol
     */
    async getBookTicker(symbol: string): Promise<Result<any>> {
        return this.makeRequest('GET', `/fapi/v1/ticker/bookTicker?symbol=${encodeURIComponent(symbol)}`);
    }

    /**
     * Get recent trades
     * @param symbol - Trading symbol
     * @param limit - Number of trades (default 500)
     */
    async getRecentTrades(symbol: string, limit: number = 500): Promise<Result<any[]>> {
        return this.makeRequest('GET', `/fapi/v1/trades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
    }

    /**
     * Get aggregate trades
     * @param symbol - Trading symbol
     * @param limit - Number of trades (default 500)
     */
    async getAggTrades(symbol: string, limit: number = 500): Promise<Result<any[]>> {
        return this.makeRequest('GET', `/fapi/v1/aggTrades?symbol=${encodeURIComponent(symbol)}&limit=${limit}`);
    }

    /**
     * Get open interest
     * @param symbol - Trading symbol
     */
    async getOpenInterest(symbol: string): Promise<Result<any>> {
        return this.makeRequest('GET', `/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`);
    }

    /**
     * Modify isolated position margin
     * @param symbol - Trading symbol
     * @param amount - Amount to add (positive) or reduce (negative)
     * @param type - MarginModifyType.ADD (1) or MarginModifyType.REDUCE (2)
     * 
     * @remarks
     * Weight: 1
     * @see https://binance-docs.github.io/apidocs/futures/en/#modify-isolated-position-margin-trade
     */
    async modifyIsolatedPositionMargin(
        symbol: string,
        amount: number,
        type: MarginModifyType
    ): Promise<Result<any>> {
        return this.signedPost('/fapi/v1/positionMargin', {
            symbol,
            amount: amount.toString(),
            type
        });
    }
}
