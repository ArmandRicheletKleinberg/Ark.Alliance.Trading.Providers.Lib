/**
 * @fileoverview Binance Market Data WebSocket Client
 * @module clients/BinanceMarketDataWs
 * 
 * PUBLIC WebSocket for market data streaming - NO authentication required
 * Uses @bookTicker stream for minimum latency best bid/ask prices
 * 
 * Endpoint: wss://fstream.binance.com/ws/<symbol>@bookTicker
 */

import { BaseWebSocketClient } from './Base/_BaseWebSocketClient';
import { WebSocketStats } from './Base/types/WebSocketStats';
import { MarketDataWsConfig } from './Base/types/ClientConfig';
import WebSocket from 'ws';

export interface BookTickerData {
    symbol: string;
    bestBidPrice: number;
    bestBidQty: number;
    bestAskPrice: number;
    bestAskQty: number;
    updateId: number;
    timestamp: number;
}

interface BookTickerPayload {
    e: string;      // Event type
    u: number;      // Update ID
    s: string;      // Symbol
    b: string;      // Best Bid Price
    B: string;      // Best Bid Qty
    a: string;      // Best Ask Price
    A: string;      // Best Ask Qty
    T: number;      // Transaction time
    E: number;      // Event time
}

export type MarketDataWsStats = WebSocketStats;

/**
 * Binance Market Data WebSocket - Public stream (no auth)
 * 
 * @remarks
 * Configuration is injected via constructor for DDD compliance.
 * Use `BinanceEndpoints.getMarketDataWsUrl()` to get the wsStreamUrl.
 * 
 * @example
 * ```typescript
 * import { getMarketDataWsUrl } from '../shared/utils/BinanceEndpoints';
 * 
 * const client = new BinanceMarketDataWs({
 *     wsStreamUrl: getMarketDataWsUrl(environment)
 * });
 * ```
 */
export class BinanceMarketDataWs extends BaseWebSocketClient {
    // Price cache: symbol → BookTickerData
    private priceCache: Map<string, BookTickerData> = new Map();
    private readonly wsStreamUrl: string;

    /**
     * Creates a new BinanceMarketDataWs instance.
     * 
     * @param config - Client configuration including WebSocket stream URL.
     */
    constructor(config: MarketDataWsConfig) {
        super({
            maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
            initialReconnectIntervalMs: config.reconnectDelayMs ?? 1000,
            pingIntervalMs: 30000
        });

        // Ensure /stream suffix for combined streams
        const baseUrl = config.wsStreamUrl;
        this.wsStreamUrl = baseUrl.endsWith('/stream') ? baseUrl : `${baseUrl}/stream`;
    }

    /**
     * Provide the WebSocket URL
     */
    protected getUrl(): string {
        return this.wsStreamUrl;
    }

    /**
     * Construct subscription payload
     * Maps symbols to lowercase streams
     */
    protected getSubscribePayload(topics: string[]): any {
        const streams = topics.map(s => `${s.toLowerCase()}@bookTicker`);
        return {
            method: 'SUBSCRIBE',
            params: streams,
            id: Date.now()
        };
    }

    /**
     * Construct unsubscription payload
     */
    protected getUnsubscribePayload(topics: string[]): any {
        const streams = topics.map(s => `${s.toLowerCase()}@bookTicker`);
        return {
            method: 'UNSUBSCRIBE',
            params: streams,
            id: Date.now()
        };
    }

    /**
     * Handle incoming raw messages
     */
    protected handleMessage(data: WebSocket.RawData): void {
        try {
            const messageStr = data.toString();
            const message = JSON.parse(messageStr);

            // Handle combined stream format: { stream: "btcusdt@bookTicker", data: {...} }
            if (message.stream && message.data) {
                this.processBookTicker(message.data);
            } else if (message.e === 'bookTicker' || message.s) {
                // Direct format
                this.processBookTicker(message);
            }
            // Handle subscription response
            else if (message.result === null && message.id) {
                console.log(`[BinanceMarketDataWs] Subscription confirmed: ${message.id}`);
            }
        } catch (error: any) {
            console.error('[BinanceMarketDataWs] Parse error:', error.message);
        }
    }

    /**
     * Process bookTicker data
     */
    private processBookTicker(payload: BookTickerPayload): void {
        const tickerData: BookTickerData = {
            symbol: payload.s,
            bestBidPrice: parseFloat(payload.b),
            bestBidQty: parseFloat(payload.B),
            bestAskPrice: parseFloat(payload.a),
            bestAskQty: parseFloat(payload.A),
            updateId: payload.u,
            timestamp: payload.T || Date.now()
        };

        // Update cache
        this.priceCache.set(tickerData.symbol, tickerData);

        // Base class tracks total message count and stats

        // Emit price update
        this.emit('priceUpdate', tickerData);
        this.emit(`price:${tickerData.symbol}`, tickerData);
    }

    /**
     * Subscribe override to ensure uppercase storage
     */
    public override subscribe(symbols: string | string[]): void {
        const list = Array.isArray(symbols) ? symbols : [symbols];
        // Base class handles filtering duplicates in 'subscriptions' set
        // We just ensure we pass Uppercase symbols so the cached set is consistent
        super.subscribe(list.map(s => s.toUpperCase()));
    }

    /**
     * Unsubscribe override
     */
    public override unsubscribe(symbols: string | string[]): void {
        const list = Array.isArray(symbols) ? symbols : [symbols];
        super.unsubscribe(list.map(s => s.toUpperCase()));
    }

    /**
     * Get cached price (zero-blocking)
     */
    getPrice(symbol: string): BookTickerData | undefined {
        return this.priceCache.get(symbol.toUpperCase());
    }

    /**
     * Get best bid for symbol
     */
    getBestBid(symbol: string): number | undefined {
        return this.priceCache.get(symbol.toUpperCase())?.bestBidPrice;
    }

    /**
     * Get best ask for symbol
     */
    getBestAsk(symbol: string): number | undefined {
        return this.priceCache.get(symbol.toUpperCase())?.bestAskPrice;
    }

    /**
     * Get mid price
     */
    getMidPrice(symbol: string): number | undefined {
        const data = this.priceCache.get(symbol.toUpperCase());
        if (!data) return undefined;
        return (data.bestBidPrice + data.bestAskPrice) / 2;
    }

    /**
     * Get all cached prices for API consumption
     * @returns Map of symbol to BookTickerData
     */
    getAllPrices(): Map<string, BookTickerData> {
        return new Map(this.priceCache);
    }

    /**
     * Check if connected (Alias for convenience)
     */
    isWsConnected(): boolean {
        return this.isConnected;
    }
}
