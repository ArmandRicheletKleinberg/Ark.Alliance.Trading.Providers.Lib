/**
 * @fileoverview Kraken Futures REST API Client
 * @module Kraken/clients/KrakenRestClient
 *
 * Base REST client for Kraken Futures API with authentication.
 * Follows the same patterns as BinanceRestClient for consistency.
 */

import * as https from 'https';
import { Result } from '../../Common/result';
import { ProviderType, ProviderEnvironment, ConnectionState, ClientStats, IProviderClient } from '../../Common/Clients/Base';
import { KrakenEnvironment, getRestBaseUrl } from '../enums';
import { KrakenSignatureGenerator, generateNonce, API_PATH_PREFIX, DEFAULT_TIMEOUT_MS, ENDPOINTS } from '../shared';
import { KrakenError, KrakenAuthError, KrakenRateLimitError, createErrorFromCode } from '../shared';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken REST client configuration.
 */
export interface KrakenRestClientConfig {
    /** API key */
    apiKey: string;

    /** API secret (base64 encoded) */
    apiSecret: string;

    /** Trading environment */
    environment: KrakenEnvironment;

    /** Request timeout in milliseconds */
    timeoutMs?: number;

    /** Enable debug logging */
    debug?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REST Client Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken Futures REST API Client.
 * 
 * @remarks
 * This client handles authentication, request signing, and HTTP communication
 * with the Kraken Futures API. All methods return Result<T> for consistent
 * error handling.
 * 
 * @example
 * ```typescript
 * const client = new KrakenRestClient({
 *     apiKey: 'your-api-key',
 *     apiSecret: 'your-api-secret',
 *     environment: KrakenEnvironment.TESTNET
 * });
 * 
 * const result = await client.getInstruments();
 * if (result.isSuccess) {
 *     console.log(result.data);
 * }
 * ```
 */
export class KrakenRestClient implements IProviderClient {
    readonly provider = ProviderType.KRAKEN;
    readonly environment: ProviderEnvironment;

    private readonly config: KrakenRestClientConfig;
    private readonly signatureGenerator: KrakenSignatureGenerator;
    private readonly baseUrl: string;
    private readonly timeoutMs: number;

    // Stats
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
    private connectTime: number = 0;
    private messagesSent: number = 0;
    private messagesReceived: number = 0;
    private totalLatencyMs: number = 0;
    private lastError?: string;

    constructor(config: KrakenRestClientConfig) {
        this.config = config;
        this.signatureGenerator = new KrakenSignatureGenerator(config.apiSecret);
        this.baseUrl = getRestBaseUrl(config.environment);
        this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

        this.environment = {
            isTestnet: config.environment === KrakenEnvironment.TESTNET,
            restBaseUrl: this.baseUrl,
            wsBaseUrl: '' // Set by WebSocket client
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IProviderClient Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    async connect(): Promise<Result<void>> {
        try {
            // Test connection with a simple public endpoint
            const result = await this.publicGet<{ serverTime: string }>(ENDPOINTS.SERVER_TIME);

            if (result.isSuccess) {
                this.connectionState = ConnectionState.CONNECTED;
                this.connectTime = Date.now();
                this.log('Connected to Kraken Futures API');
                return Result.ok<void>(undefined);
            }

            this.connectionState = ConnectionState.ERROR;
            this.lastError = result.error?.message;
            return Result.fail<void>({
                code: 'CONNECTION_FAILED',
                message: result.error?.message || 'Failed to connect',
                timestamp: Date.now()
            });
        } catch (error) {
            this.connectionState = ConnectionState.ERROR;
            const message = error instanceof Error ? error.message : 'Connection failed';
            this.lastError = message;
            return Result.fail<void>({
                code: 'CONNECTION_ERROR',
                message,
                timestamp: Date.now()
            });
        }
    }

    async disconnect(): Promise<Result<void>> {
        this.connectionState = ConnectionState.DISCONNECTED;
        this.log('Disconnected from Kraken Futures API');
        return Result.ok<void>(undefined);
    }

    isConnected(): boolean {
        return this.connectionState === ConnectionState.CONNECTED;
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    getStats(): ClientStats {
        const avgLatency = this.messagesReceived > 0
            ? this.totalLatencyMs / this.messagesReceived
            : 0;

        return {
            provider: this.provider,
            isConnected: this.isConnected(),
            uptimeMs: this.connectTime > 0 ? Date.now() - this.connectTime : 0,
            reconnectCount: 0,
            messagesSent: this.messagesSent,
            messagesReceived: this.messagesReceived,
            avgLatencyMs: avgLatency,
            lastError: this.lastError
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Public API Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get all instruments.
     */
    async getInstruments(): Promise<Result<any>> {
        return this.publicGet(ENDPOINTS.INSTRUMENTS);
    }

    /**
     * Get all tickers.
     */
    async getTickers(): Promise<Result<any>> {
        return this.publicGet(ENDPOINTS.TICKERS);
    }

    /**
     * Get order book for a symbol.
     */
    async getOrderBook(symbol: string): Promise<Result<any>> {
        return this.publicGet(ENDPOINTS.ORDERBOOK, { symbol });
    }

    /**
     * Get trade history for a symbol.
     */
    async getHistory(symbol: string, lastTime?: string): Promise<Result<any>> {
        const params: Record<string, string> = { symbol };
        if (lastTime) params.lastTime = lastTime;
        return this.publicGet(ENDPOINTS.HISTORY, params);
    }

    /**
     * Get server time.
     */
    async getServerTime(): Promise<Result<{ serverTime: string }>> {
        return this.publicGet(ENDPOINTS.SERVER_TIME);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private API Methods - Account
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get account information (wallets, balances).
     */
    async getAccounts(): Promise<Result<any>> {
        return this.privateGet(ENDPOINTS.ACCOUNTS);
    }

    /**
     * Get open positions.
     */
    async getOpenPositions(): Promise<Result<any>> {
        return this.privateGet(ENDPOINTS.OPEN_POSITIONS);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private API Methods - Trading
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send an order.
     */
    async sendOrder(params: {
        orderType: string;
        symbol: string;
        side: string;
        size: number;
        limitPrice?: number;
        stopPrice?: number;
        cliOrdId?: string;
        reduceOnly?: boolean;
        triggerSignal?: string;
    }): Promise<Result<any>> {
        return this.privatePost(ENDPOINTS.SEND_ORDER, params);
    }

    /**
     * Edit an existing order.
     */
    async editOrder(params: {
        orderId?: string;
        cliOrdId?: string;
        size?: number;
        limitPrice?: number;
        stopPrice?: number;
    }): Promise<Result<any>> {
        return this.privatePost(ENDPOINTS.EDIT_ORDER, params);
    }

    /**
     * Cancel an order.
     */
    async cancelOrder(params: {
        orderId?: string;
        cliOrdId?: string;
    }): Promise<Result<any>> {
        return this.privatePost(ENDPOINTS.CANCEL_ORDER, params);
    }

    /**
     * Cancel all orders.
     */
    async cancelAllOrders(symbol?: string): Promise<Result<any>> {
        const params = symbol ? { symbol } : {};
        return this.privatePost(ENDPOINTS.CANCEL_ALL_ORDERS, params);
    }

    /**
     * Get open orders.
     */
    async getOpenOrders(): Promise<Result<any>> {
        return this.privateGet(ENDPOINTS.OPEN_ORDERS);
    }

    /**
     * Get order status.
     */
    async getOrderStatus(orderIds: string[]): Promise<Result<any>> {
        return this.privatePost(ENDPOINTS.ORDERS_STATUS, { orderIds: orderIds.join(',') });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HTTP Request Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Make a public GET request (no authentication).
     */
    private async publicGet<T>(endpoint: string, params: Record<string, string> = {}): Promise<Result<T>> {
        const queryString = this.buildQueryString(params);
        const path = `${API_PATH_PREFIX}${endpoint}${queryString ? `?${queryString}` : ''}`;
        return this.makeRequest<T>('GET', path);
    }

    /**
     * Make a private GET request (with authentication).
     */
    private async privateGet<T>(endpoint: string, params: Record<string, string> = {}): Promise<Result<T>> {
        const queryString = this.buildQueryString(params);
        const path = `${API_PATH_PREFIX}${endpoint}`;
        const fullPath = `${path}${queryString ? `?${queryString}` : ''}`;

        const authHeaders = this.signatureGenerator.generateAuthHeaders(
            this.config.apiKey,
            queryString,
            path
        );

        return this.makeRequest<T>('GET', fullPath, undefined, authHeaders);
    }

    /**
     * Make a private POST request (with authentication).
     */
    private async privatePost<T>(endpoint: string, params: Record<string, any> = {}): Promise<Result<T>> {
        const path = `${API_PATH_PREFIX}${endpoint}`;
        const postData = this.buildQueryString(params);

        const authHeaders = this.signatureGenerator.generateAuthHeaders(
            this.config.apiKey,
            postData,
            path
        );

        return this.makeRequest<T>('POST', path, postData, authHeaders);
    }

    /**
     * Make an HTTP request.
     */
    private makeRequest<T>(
        method: string,
        path: string,
        body?: string,
        authHeaders?: { APIKey: string; Authent: string; Nonce: string }
    ): Promise<Result<T>> {
        const startTime = Date.now();
        this.messagesSent++;

        return new Promise((resolve) => {
            const url = new URL(path, this.baseUrl);

            const options: https.RequestOptions = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'Ark-Alliance-Trading-Providers/1.0',
                    ...(authHeaders || {})
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    const latencyMs = Date.now() - startTime;
                    this.totalLatencyMs += latencyMs;
                    this.messagesReceived++;

                    try {
                        const parsed = JSON.parse(data);

                        if (parsed.result === 'success') {
                            resolve(Result.ok<T>(parsed));
                        } else if (parsed.error || parsed.result !== 'success') {
                            const errorCode = parsed.error || parsed.result || 'UNKNOWN_ERROR';
                            const errorMsg = parsed.errors?.join(', ') || parsed.error || 'Request failed';
                            this.lastError = errorMsg;

                            resolve(Result.fail<T>({
                                code: errorCode,
                                message: errorMsg,
                                timestamp: Date.now(),
                                details: { response: parsed, endpoint: path }
                            }));
                        } else {
                            // Some endpoints return data directly without 'result' wrapper
                            resolve(Result.ok<T>(parsed));
                        }
                    } catch (parseError) {
                        this.lastError = 'Failed to parse response';
                        resolve(Result.fail<T>({
                            code: 'PARSE_ERROR',
                            message: 'Failed to parse API response',
                            timestamp: Date.now(),
                            details: { rawResponse: data }
                        }));
                    }
                });
            });

            req.setTimeout(this.timeoutMs, () => {
                req.destroy();
                this.lastError = 'Request timeout';
                resolve(Result.fail<T>({
                    code: 'TIMEOUT',
                    message: `Request timed out after ${this.timeoutMs}ms`,
                    timestamp: Date.now()
                }));
            });

            req.on('error', (error) => {
                this.lastError = error.message;
                resolve(Result.fail<T>({
                    code: 'NETWORK_ERROR',
                    message: error.message,
                    timestamp: Date.now()
                }));
            });

            if (body) {
                req.write(body);
            }

            req.end();
        });
    }

    /**
     * Build URL query string from parameters.
     */
    private buildQueryString(params: Record<string, any>): string {
        const entries = Object.entries(params)
            .filter(([_, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);

        return entries.join('&');
    }

    /**
     * Log debug messages.
     */
    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[KrakenRestClient] ${message}`);
        }
    }
}
