/**
 * @fileoverview Kraken Futures WebSocket Client
 * @module Kraken/clients/KrakenWebSocketClient
 *
 * WebSocket client for Kraken Futures API with challenge-response authentication.
 * Supports both public market data feeds and private user data/trading feeds.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Result } from '../../Common/result';
import { ProviderType, ProviderEnvironment, ConnectionState, ClientStats, IProviderClient, ISubscribableClient } from '../../Common/Clients/Base';
import { KrakenEnvironment, getWsUrl } from '../enums';
import { generateWsAuthSignature, WS_PING_INTERVAL_MS, MAX_RECONNECT_ATTEMPTS, INITIAL_RECONNECT_DELAY_MS, MAX_RECONNECT_DELAY_MS, WS_FEEDS, WS_EVENTS } from '../shared';
import {
    WsMessage,
    WsSubscriptionRequest,
    WsSubscriptionResponse,
    WsChallengeResponse,
    WsTickerMessage,
    WsBookSnapshotMessage,
    WsBookDeltaMessage,
    WsTradeMessage,
    WsFillMessage,
    WsOpenOrderMessage,
    WsOpenPositionMessage,
    WsHeartbeatMessage
} from '../dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken WebSocket client configuration.
 */
export interface KrakenWebSocketClientConfig {
    /** API key (required for private feeds) */
    apiKey?: string;

    /** API secret (required for private feeds) */
    apiSecret?: string;

    /** Trading environment */
    environment: KrakenEnvironment;

    /** Enable debug logging */
    debug?: boolean;

    /** Auto-reconnect on disconnect */
    autoReconnect?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Event Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface KrakenWebSocketEvents {
    'connected': () => void;
    'disconnected': (reason?: string) => void;
    'error': (error: Error) => void;
    'ticker': (data: WsTickerMessage) => void;
    'book_snapshot': (data: WsBookSnapshotMessage) => void;
    'book': (data: WsBookDeltaMessage) => void;
    'trade': (data: WsTradeMessage) => void;
    'fills': (data: WsFillMessage) => void;
    'open_orders': (data: WsOpenOrderMessage) => void;
    'open_positions': (data: WsOpenPositionMessage) => void;
    'heartbeat': (data: WsHeartbeatMessage) => void;
    'subscribed': (feed: string, productIds?: string[]) => void;
    'unsubscribed': (feed: string, productIds?: string[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Client Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Kraken Futures WebSocket Client.
 * 
 * @remarks
 * Supports:
 * - Public feeds: ticker, book, trade
 * - Private feeds: fills, open_orders, open_positions (requires auth)
 * - Challenge-response authentication for private feeds
 * - Auto-reconnection with exponential backoff
 * 
 * @example
 * ```typescript
 * const client = new KrakenWebSocketClient({
 *     apiKey: 'your-key',
 *     apiSecret: 'your-secret',
 *     environment: KrakenEnvironment.TESTNET
 * });
 * 
 * client.on('ticker', (data) => console.log(data));
 * 
 * await client.connect();
 * await client.subscribe('ticker', ['PI_XBTUSD']);
 * ```
 */
export class KrakenWebSocketClient extends EventEmitter implements ISubscribableClient {
    readonly provider = ProviderType.KRAKEN;
    readonly environment: ProviderEnvironment;

    private readonly config: KrakenWebSocketClientConfig;
    private ws: WebSocket | null = null;
    private connectionState: ConnectionState = ConnectionState.DISCONNECTED;

    // Subscriptions
    private subscriptions: Map<string, Set<string>> = new Map();
    private pendingSubscriptions: Map<string, { resolve: (value: Result<void>) => void; reject: (err: Error) => void }> = new Map();

    // Authentication
    private challenge: string | null = null;
    private isAuthenticated: boolean = false;

    // Reconnection
    private reconnectAttempts: number = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;

    // Keep-alive
    private pingTimer: NodeJS.Timeout | null = null;

    // Stats
    private connectTime: number = 0;
    private messagesSent: number = 0;
    private messagesReceived: number = 0;
    private lastError?: string;

    constructor(config: KrakenWebSocketClientConfig) {
        super();
        this.config = {
            autoReconnect: true,
            ...config
        };

        const wsUrl = getWsUrl(config.environment);
        this.environment = {
            isTestnet: config.environment === KrakenEnvironment.TESTNET,
            restBaseUrl: '',
            wsBaseUrl: wsUrl
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IProviderClient Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    async connect(): Promise<Result<void>> {
        if (this.connectionState === ConnectionState.CONNECTED) {
            return Result.ok<void>(undefined);
        }

        this.connectionState = ConnectionState.CONNECTING;

        return new Promise((resolve) => {
            try {
                const wsUrl = getWsUrl(this.config.environment);
                const ws = new WebSocket(wsUrl);
                this.ws = ws;

                ws.on('open', () => {
                    this.connectionState = ConnectionState.CONNECTED;
                    this.connectTime = Date.now();
                    this.reconnectAttempts = 0;
                    this.startPingTimer();
                    this.log('Connected to Kraken WebSocket');
                    this.emit('connected');
                    resolve(Result.ok<void>(undefined));
                });

                ws.on('message', (data: Buffer) => {
                    this.handleMessage(data);
                });

                ws.on('close', (code: number, reason: Buffer) => {
                    this.handleClose(code, reason.toString());
                });

                ws.on('error', (error: Error) => {
                    this.lastError = error.message;
                    this.log(`WebSocket error: ${error.message}`);
                    this.emit('error', error);

                    if (this.connectionState === ConnectionState.CONNECTING) {
                        this.connectionState = ConnectionState.ERROR;
                        resolve(Result.fail<void>({
                            code: 'CONNECTION_ERROR',
                            message: error.message,
                            timestamp: Date.now()
                        }));
                    }
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Connection failed';
                this.lastError = message;
                this.connectionState = ConnectionState.ERROR;
                resolve(Result.fail<void>({
                    code: 'CONNECTION_ERROR',
                    message,
                    timestamp: Date.now()
                }));
            }
        });
    }

    async disconnect(): Promise<Result<void>> {
        this.stopPingTimer();
        this.stopReconnectTimer();

        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.connectionState = ConnectionState.DISCONNECTED;
        this.isAuthenticated = false;
        this.challenge = null;
        this.subscriptions.clear();

        this.log('Disconnected from Kraken WebSocket');
        return Result.ok<void>(undefined);
    }

    isConnected(): boolean {
        return this.connectionState === ConnectionState.CONNECTED;
    }

    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    getStats(): ClientStats {
        return {
            provider: this.provider,
            isConnected: this.isConnected(),
            uptimeMs: this.connectTime > 0 ? Date.now() - this.connectTime : 0,
            reconnectCount: this.reconnectAttempts,
            messagesSent: this.messagesSent,
            messagesReceived: this.messagesReceived,
            avgLatencyMs: 0,
            lastError: this.lastError
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ISubscribableClient Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    async subscribe(channel: string): Promise<Result<void>> {
        const [feed, ...productIds] = channel.split(':');
        return this.subscribeToFeed(feed, productIds.length > 0 ? productIds : undefined);
    }

    async unsubscribe(channel: string): Promise<Result<void>> {
        const [feed, ...productIds] = channel.split(':');
        return this.unsubscribeFromFeed(feed, productIds.length > 0 ? productIds : undefined);
    }

    getSubscriptions(): string[] {
        const result: string[] = [];
        for (const [feed, products] of this.subscriptions) {
            if (products.size > 0) {
                for (const product of products) {
                    result.push(`${feed}:${product}`);
                }
            } else {
                result.push(feed);
            }
        }
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Subscription Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Subscribe to a feed.
     */
    async subscribeToFeed(feed: string, productIds?: string[]): Promise<Result<void>> {
        if (!this.isConnected()) {
            return Result.fail<void>({
                code: 'NOT_CONNECTED',
                message: 'WebSocket not connected',
                timestamp: Date.now()
            });
        }

        // Check if private feed requires authentication
        const isPrivateFeed = this.isPrivateFeed(feed);
        if (isPrivateFeed && !this.isAuthenticated) {
            const authResult = await this.authenticate();
            if (!authResult.isSuccess) {
                return authResult;
            }
        }

        const request: WsSubscriptionRequest = {
            event: WS_EVENTS.SUBSCRIBE as any,
            feed,
            product_ids: productIds
        };

        // Add auth for private feeds
        if (isPrivateFeed && this.challenge && this.config.apiSecret) {
            request.api_key = this.config.apiKey;
            request.original_challenge = this.challenge;
            request.signed_challenge = generateWsAuthSignature(this.config.apiSecret, this.challenge);
        }

        return this.sendAndWait(request, `subscribe:${feed}`);
    }

    /**
     * Unsubscribe from a feed.
     */
    async unsubscribeFromFeed(feed: string, productIds?: string[]): Promise<Result<void>> {
        if (!this.isConnected()) {
            return Result.fail<void>({
                code: 'NOT_CONNECTED',
                message: 'WebSocket not connected',
                timestamp: Date.now()
            });
        }

        const request: WsSubscriptionRequest = {
            event: WS_EVENTS.UNSUBSCRIBE as any,
            feed,
            product_ids: productIds
        };

        return this.sendAndWait(request, `unsubscribe:${feed}`);
    }

    /**
     * Check if a feed is private (requires authentication).
     */
    private isPrivateFeed(feed: string): boolean {
        return [
            WS_FEEDS.FILLS,
            WS_FEEDS.OPEN_ORDERS,
            WS_FEEDS.OPEN_POSITIONS,
            WS_FEEDS.ACCOUNT,
            WS_FEEDS.NOTIFICATIONS
        ].includes(feed as any);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Authentication
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Authenticate for private feeds using challenge-response.
     */
    private async authenticate(): Promise<Result<void>> {
        if (!this.config.apiKey || !this.config.apiSecret) {
            return Result.fail<void>({
                code: 'AUTH_REQUIRED',
                message: 'API key and secret required for private feeds',
                timestamp: Date.now()
            });
        }

        // Request challenge
        const challengeResult = await this.requestChallenge();
        if (!challengeResult.isSuccess) {
            return challengeResult;
        }

        this.isAuthenticated = true;
        this.log('Authenticated for private feeds');
        return Result.ok<void>(undefined);
    }

    /**
     * Request authentication challenge.
     */
    private async requestChallenge(): Promise<Result<void>> {
        return new Promise((resolve) => {
            const request = {
                event: 'challenge',
                api_key: this.config.apiKey
            };

            const handleChallenge = (data: Buffer) => {
                try {
                    const message = JSON.parse(data.toString());
                    if (message.event === 'challenge') {
                        this.challenge = message.message;
                        this.ws?.off('message', handleChallenge);
                        resolve(Result.ok<void>(undefined));
                    }
                } catch {
                    // Ignore parse errors
                }
            };

            this.ws?.on('message', handleChallenge);
            this.send(request);

            // Timeout after 5 seconds
            setTimeout(() => {
                this.ws?.off('message', handleChallenge);
                resolve(Result.fail<void>({
                    code: 'AUTH_TIMEOUT',
                    message: 'Challenge request timed out',
                    timestamp: Date.now()
                }));
            }, 5000);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Message Handling
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Handle incoming WebSocket messages.
     */
    private handleMessage(data: Buffer): void {
        this.messagesReceived++;

        try {
            const message = JSON.parse(data.toString());

            // Handle events
            if (message.event) {
                this.handleEvent(message);
                return;
            }

            // Handle feed data
            if (message.feed) {
                this.handleFeedMessage(message);
            }
        } catch (error) {
            this.log(`Failed to parse message: ${error}`);
        }
    }

    /**
     * Handle event messages (subscribed, unsubscribed, error).
     */
    private handleEvent(message: any): void {
        switch (message.event) {
            case 'subscribed':
                this.handleSubscribed(message);
                break;

            case 'unsubscribed':
                this.handleUnsubscribed(message);
                break;

            case 'challenge':
                this.challenge = message.message;
                break;

            case 'error':
                this.log(`Error: ${message.message}`);
                this.handleError(message);
                break;

            case 'info':
                this.log(`Info: version ${message.version}`);
                break;
        }
    }

    /**
     * Handle feed data messages.
     */
    private handleFeedMessage(message: any): void {
        const feed = message.feed;

        switch (feed) {
            case 'ticker':
            case 'ticker_lite':
                this.emit('ticker', message as WsTickerMessage);
                break;

            case 'book_snapshot':
                this.emit('book_snapshot', message as WsBookSnapshotMessage);
                break;

            case 'book':
                this.emit('book', message as WsBookDeltaMessage);
                break;

            case 'trade':
                this.emit('trade', message as WsTradeMessage);
                break;

            case 'fills':
                this.emit('fills', message as WsFillMessage);
                break;

            case 'open_orders':
            case 'open_orders_snapshot':
                this.emit('open_orders', message as WsOpenOrderMessage);
                break;

            case 'open_positions':
                this.emit('open_positions', message as WsOpenPositionMessage);
                break;

            case 'heartbeat':
                this.emit('heartbeat', message as WsHeartbeatMessage);
                break;

            default:
                this.log(`Unknown feed: ${feed}`);
        }
    }

    /**
     * Handle subscription confirmation.
     */
    private handleSubscribed(message: WsSubscriptionResponse): void {
        const feed = message.feed;
        const products = message.product_ids || [];

        // Update subscriptions
        if (!this.subscriptions.has(feed)) {
            this.subscriptions.set(feed, new Set());
        }
        products.forEach(p => this.subscriptions.get(feed)!.add(p));

        // Resolve pending subscription
        const key = `subscribe:${feed}`;
        const pending = this.pendingSubscriptions.get(key);
        if (pending) {
            pending.resolve(Result.ok<void>(undefined));
            this.pendingSubscriptions.delete(key);
        }

        this.emit('subscribed', feed, products);
        this.log(`Subscribed to ${feed}${products.length > 0 ? `: ${products.join(', ')}` : ''}`);
    }

    /**
     * Handle unsubscription confirmation.
     */
    private handleUnsubscribed(message: WsSubscriptionResponse): void {
        const feed = message.feed;
        const products = message.product_ids || [];

        // Update subscriptions
        if (products.length > 0 && this.subscriptions.has(feed)) {
            products.forEach(p => this.subscriptions.get(feed)!.delete(p));
        } else {
            this.subscriptions.delete(feed);
        }

        // Resolve pending unsubscription
        const key = `unsubscribe:${feed}`;
        const pending = this.pendingSubscriptions.get(key);
        if (pending) {
            pending.resolve(Result.ok<void>(undefined));
            this.pendingSubscriptions.delete(key);
        }

        this.emit('unsubscribed', feed, products);
        this.log(`Unsubscribed from ${feed}`);
    }

    /**
     * Handle error messages.
     */
    private handleError(message: any): void {
        const errorMsg = message.message || 'Unknown error';

        // Reject any pending subscriptions that match
        for (const [key, pending] of this.pendingSubscriptions) {
            pending.resolve(Result.fail<void>({
                code: 'SUBSCRIPTION_ERROR',
                message: errorMsg,
                timestamp: Date.now()
            }));
        }
        this.pendingSubscriptions.clear();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Connection Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Handle WebSocket close.
     */
    private handleClose(code: number, reason: string): void {
        this.stopPingTimer();
        this.connectionState = ConnectionState.DISCONNECTED;
        this.isAuthenticated = false;

        this.log(`WebSocket closed: ${code} - ${reason}`);
        this.emit('disconnected', reason);

        // Auto-reconnect if enabled
        if (this.config.autoReconnect && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection with exponential backoff.
     */
    private scheduleReconnect(): void {
        const delay = Math.min(
            INITIAL_RECONNECT_DELAY_MS * Math.pow(2, this.reconnectAttempts),
            MAX_RECONNECT_DELAY_MS
        );

        this.connectionState = ConnectionState.RECONNECTING;
        this.reconnectAttempts++;

        this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(async () => {
            await this.connect();

            // Re-subscribe to previous subscriptions
            if (this.isConnected()) {
                for (const [feed, products] of this.subscriptions) {
                    await this.subscribeToFeed(feed, Array.from(products));
                }
            }
        }, delay);
    }

    /**
     * Stop reconnect timer.
     */
    private stopReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    /**
     * Start ping timer for keep-alive.
     */
    private startPingTimer(): void {
        this.pingTimer = setInterval(() => {
            this.send({ event: 'ping' });
        }, WS_PING_INTERVAL_MS);
    }

    /**
     * Stop ping timer.
     */
    private stopPingTimer(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Send Helpers
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send a message.
     */
    private send(message: object): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
            this.messagesSent++;
        }
    }

    /**
     * Send a message and wait for response.
     */
    private sendAndWait(message: object, key: string): Promise<Result<void>> {
        return new Promise((resolve) => {
            this.pendingSubscriptions.set(key, { resolve, reject: () => { } });
            this.send(message);

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.pendingSubscriptions.has(key)) {
                    this.pendingSubscriptions.delete(key);
                    resolve(Result.fail<void>({
                        code: 'TIMEOUT',
                        message: 'Request timed out',
                        timestamp: Date.now()
                    }));
                }
            }, 10000);
        });
    }

    /**
     * Log debug messages.
     */
    private log(message: string): void {
        if (this.config.debug) {
            console.log(`[KrakenWebSocketClient] ${message}`);
        }
    }
}
