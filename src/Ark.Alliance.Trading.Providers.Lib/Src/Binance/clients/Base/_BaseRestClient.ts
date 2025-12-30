/**
 * @fileoverview Abstract Base REST Client
 * @module clients/Base/_BaseRestClient
 *
 * Provides foundational REST API functionality with:
 * - Public and signed request methods
 * - Timeout handling
 * - Latency tracking
 * - Rate limit parsing
 * - Error handling with Result pattern
 *
 * @remarks
 * Abstract class that must be extended by concrete implementations.
 * Subclasses must provide the base URL via getBaseUrl().
 */

import * as https from 'https';
import { EventEmitter } from 'events';
import { RestClientConfig } from './types/RestClientConfig';
import { RestClientStats } from './types/RestClientStats';
import { Result } from '../../../Common/result';
import {
    createBinanceSuccessResult,
    createBinanceErrorResult,
    createBinanceTimeoutResult,
    createBinanceNetworkErrorResult,
    createBinanceParseErrorResult
} from '../../shared/utils/BinanceResultMapper';
import { LatencyTracker, LatencyStats } from '../../utils/LatencyTracker';
import { BinanceEnvironment } from '../../enums';

/**
 * Abstract Base REST Client for Binance APIs.
 *
 * @abstract
 * @extends EventEmitter
 *
 * @example
 * ```typescript
 * class BinanceMarketDataRest extends BaseRestClient {
 *     protected getBaseUrl(): string {
 *         return 'fapi.binance.com';
 *     }
 *
 *     async getServerTime() {
 *         return this.publicGet<{ serverTime: number }>('/fapi/v1/time');
 *     }
 * }
 * ```
 */
export abstract class BaseRestClient extends EventEmitter {
    /**
     * Client configuration.
     */
    protected readonly config: Required<RestClientConfig>;

    /**
     * Latency tracker for performance monitoring.
     */
    protected readonly latencyTracker: LatencyTracker;

    /**
     * Current environment (MAINNET or TESTNET).
     */
    protected readonly environment: BinanceEnvironment;

    /**
     * Request statistics.
     */
    protected requestCount: number = 0;
    protected successCount: number = 0;
    protected errorCount: number = 0;
    protected lastRequest: Date | null = null;

    /**
     * Creates a new BaseRestClient instance.
     *
     * @param environment - Trading environment (MAINNET or TESTNET).
     * @param config - Optional client configuration.
     */
    constructor(
        environment: BinanceEnvironment,
        config?: RestClientConfig
    ) {
        super();
        this.environment = environment;
        this.config = {
            timeoutMs: config?.timeoutMs ?? 30000,
            maxRetries: config?.maxRetries ?? 3,
            retryDelayMs: config?.retryDelayMs ?? 1000,
            trackLatency: config?.trackLatency ?? true,
            trackRateLimits: config?.trackRateLimits ?? true
        };
        this.latencyTracker = new LatencyTracker();
    }

    /**
     * Returns the base URL (hostname) for API requests.
     * Must be implemented by subclasses.
     *
     * @returns The hostname without protocol (e.g., 'fapi.binance.com').
     */
    protected abstract getBaseUrl(): string;

    /**
     * Makes a public GET request (no authentication required).
     *
     * @template T - Expected response type.
     * @param endpoint - API endpoint path.
     * @param params - Optional query parameters.
     * @returns Result with response data or error.
     */
    protected async publicGet<T>(
        endpoint: string,
        params?: Record<string, any>
    ): Promise<Result<T>> {
        const queryString = params ? this.buildQueryString(params) : '';
        const path = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.makeRequest<T>('GET', path);
    }

    /**
     * Makes a public POST request (no authentication required).
     *
     * @template T - Expected response type.
     * @param endpoint - API endpoint path.
     * @param params - Optional query parameters.
     * @returns Result with response data or error.
     */
    protected async publicPost<T>(
        endpoint: string,
        params?: Record<string, any>
    ): Promise<Result<T>> {
        const queryString = params ? this.buildQueryString(params) : '';
        const path = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.makeRequest<T>('POST', path);
    }

    /**
     * Builds a query string from parameters.
     *
     * @param params - Key-value pairs for query parameters.
     * @returns Encoded query string.
     */
    protected buildQueryString(params: Record<string, any>): string {
        return Object.keys(params)
            .filter(key => params[key] !== undefined && params[key] !== null)
            .map(key => `${key}=${encodeURIComponent(params[key])}`)
            .join('&');
    }

    /**
     * Makes an HTTP request with timeout handling and latency tracking.
     *
     * @template T - Expected response type.
     * @param method - HTTP method.
     * @param path - Request path with query string.
     * @param headers - Optional additional headers.
     * @returns Result with response data or error.
     */
    protected makeRequest<T>(
        method: string,
        path: string,
        headers?: Record<string, string>
    ): Promise<Result<T>> {
        const startTime = Date.now();
        this.requestCount++;
        this.lastRequest = new Date();
        const endpoint = path.split('?')[0]; // Extract endpoint for context

        return new Promise((resolve) => {
            const options = {
                hostname: this.getBaseUrl(),
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    // Track latency
                    if (this.config.trackLatency) {
                        const latencyMs = Date.now() - startTime;
                        this.latencyTracker.record(latencyMs);
                    }

                    // Parse rate limits if tracking enabled
                    if (this.config.trackRateLimits) {
                        this.parseRateLimitHeaders(res.headers);
                    }

                    try {
                        const parsed = JSON.parse(data);

                        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                            this.successCount++;
                            resolve(createBinanceSuccessResult<T>(parsed as T));
                        } else {
                            this.errorCount++;
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
                        this.errorCount++;
                        resolve(createBinanceParseErrorResult<T>(
                            data,
                            err as Error,
                            endpoint
                        ));
                    }
                });
            });

            // Add timeout handling
            req.setTimeout(this.config.timeoutMs, () => {
                req.destroy();
                this.errorCount++;
                if (this.config.trackLatency) {
                    const latencyMs = Date.now() - startTime;
                    this.latencyTracker.record(latencyMs);
                }
                resolve(createBinanceTimeoutResult<T>(this.config.timeoutMs, endpoint));
            });

            req.on('error', (error) => {
                this.errorCount++;
                if (this.config.trackLatency) {
                    const latencyMs = Date.now() - startTime;
                    this.latencyTracker.record(latencyMs);
                }
                resolve(createBinanceNetworkErrorResult<T>(error, endpoint));
            });

            req.end();
        });
    }

    /**
     * Parses rate limit headers from Binance response.
     * Override in subclasses to handle specific rate limit types.
     *
     * @param headers - Response headers.
     */
    protected parseRateLimitHeaders(headers: any): void {
        // Default implementation - can be overridden
        const usedWeight = headers['x-mbx-used-weight-1m'];
        if (usedWeight) {
            this.emit('rateLimit', {
                type: 'REQUEST_WEIGHT',
                count: parseInt(usedWeight, 10),
                limit: 2400
            });
        }
    }

    /**
     * Gets latency statistics.
     *
     * @returns Latency statistics object.
     */
    public getLatencyStats(): LatencyStats {
        return this.latencyTracker.getStats();
    }

    /**
     * Gets client statistics.
     *
     * @returns Client statistics object.
     */
    public getStats(): RestClientStats {
        return {
            requestCount: this.requestCount,
            successCount: this.successCount,
            errorCount: this.errorCount,
            avgLatencyMs: this.latencyTracker.getStats().average,
            lastRequest: this.lastRequest,
            baseUrl: this.getBaseUrl(),
            environment: this.environment
        };
    }

    /**
     * Gets the current environment.
     *
     * @returns The trading environment.
     */
    public getEnvironment(): BinanceEnvironment {
        return this.environment;
    }
}
