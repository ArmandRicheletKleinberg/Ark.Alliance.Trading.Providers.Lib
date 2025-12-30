/**
 * @fileoverview Binance User Data Stream Client
 * @module clients/BinanceUserDataStream
 * 
 * Handles WebSocket connection to Binance User Data Stream.
 * Supports all 10 event types from Binance USDⓈ-M Futures.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { BinanceRestClient } from './BinanceRestClient';
import { UserDataStreamConfig } from './Base/types/ClientConfig';

// DTOs
import { OrderTradeUpdateEvent } from '../dtos';
import { OrderTradeUpdateRaw, parseOrderTradeUpdate } from '../dtos/binance/OrderUpdate';
import { AccountUpdateRaw } from '../dtos/userDataStream/AccountUpdateStreamEvent';
import { MarginCallRaw } from '../dtos/userDataStream/MarginCallStreamEvent';
import {
    ListenKeyExpiredRaw,
    parseListenKeyExpired,
    TradeLiteRaw,
    parseTradeLite,
    AccountConfigUpdateRaw,
    parseAccountConfigUpdate,
    GridUpdateRaw,
    parseGridUpdate,
    ConditionalOrderRejectRaw,
    parseConditionalOrderReject,
    AlgoUpdateRaw,
    parseAlgoUpdate
} from '../dtos/userDataStream';

/**
 * User Data Stream Client for position and order updates
 * 
 * @remarks
 * Configuration is injected via constructor for DDD compliance.
 * This client manages listenKey lifecycle via the provided restClient.
 * 
 * @example
 * ```typescript
 * import { getFuturesRestBaseUrl, getUserDataStreamUrl } from '../shared/utils/BinanceEndpoints';
 * 
 * const stream = new BinanceUserDataStream(restClient, {
 *     restBaseUrl: getFuturesRestBaseUrl(environment),
 *     wsStreamUrl: 'wss://fstream.binance.com/ws/'
 * });
 * ```
 */
export class BinanceUserDataStream extends EventEmitter {
    private ws: WebSocket | null = null;
    private readonly restClient: BinanceRestClient;
    private listenKey: string | null = null;
    private isConnected: boolean = false;
    private keepaliveInterval: NodeJS.Timeout | null = null;
    private readonly wsBaseUrl: string;
    private readonly keepaliveIntervalMs: number;
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number;

    /**
     * Creates a new BinanceUserDataStream instance.
     * 
     * @param restClient - REST client for listenKey management.
     * @param config - Stream configuration.
     */
    constructor(restClient: BinanceRestClient, config: UserDataStreamConfig) {
        super();
        this.restClient = restClient;
        this.wsBaseUrl = config.wsStreamUrl;
        this.keepaliveIntervalMs = config.keepaliveIntervalMs ?? 30 * 60 * 1000;
        this.maxReconnectAttempts = config.maxReconnectAttempts ?? 100;
    }

    /**
     * Connect to User Data Stream
     */
    async connect(): Promise<void> {
        try {
            // Get listen key
            const result = await this.restClient.createListenKey();
            if (!result.isSuccess || !result.data) {
                // Extract error details from Binance response
                const errorMsg = result.error?.message || 'Unknown error';
                const errorCode = result.error?.code || 'UNKNOWN';
                console.error(`[UserDataStream] Failed to create listen key: [${errorCode}] ${errorMsg}`);
                throw new Error(`Failed to create listen key: [${errorCode}] ${errorMsg}`);
            }

            this.listenKey = result.data.listenKey;
            console.log(`[UserDataStream] Listen key created successfully`);

            // Connect to WebSocket
            await this.connectWebSocket();

            // Setup keepalive (every 30 minutes)
            this.setupKeepalive();

            this.reconnectAttempts = 0;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Connect WebSocket with listen key
     */
    private async connectWebSocket(): Promise<void> {
        return new Promise((resolve, reject) => {
            const wsUrl = `${this.wsBaseUrl}/ws/${this.listenKey}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.emit('connected');
                resolve();
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                this.handleMessage(data);
            });

            this.ws.on('error', (error) => {
                this.emit('error', error);
                if (!this.isConnected) {
                    reject(error);
                }
            });

            this.ws.on('close', () => {
                this.isConnected = false;
                this.emit('disconnected');
                this.handleReconnect();
            });

            this.ws.on('ping', () => {
                this.ws?.pong();
            });
        });
    }

    /**
     * Handle incoming messages
     */
    /**
     * Handle incoming messages.
     * 
     * @remarks
     * Supports all 10 event types from Binance User Data Stream:
     * - listenKeyExpired, ACCOUNT_UPDATE, MARGIN_CALL
     * - ORDER_TRADE_UPDATE, TRADE_LITE, ACCOUNT_CONFIG_UPDATE
     * - GRID_UPDATE, CONDITIONAL_ORDER_TRIGGER_REJECT, ALGO_UPDATE
     */
    private handleMessage(data: WebSocket.Data): void {
        try {
            const message = JSON.parse(data.toString());
            const eventType = message.e;

            // Handle different event types
            switch (eventType) {
                // ─────────────────────────────────────────────────────────────
                // Listen Key Expired
                // ─────────────────────────────────────────────────────────────
                case 'listenKeyExpired': {
                    const result = parseListenKeyExpired(message as ListenKeyExpiredRaw);
                    if (result.isSuccess) {
                        console.log('[UserDataStream] ⚠️ Listen key expired, initiating reconnection...');
                        this.emit('listenKeyExpired', result.data);
                        // Auto-reconnect on listen key expiration
                        this.handleListenKeyExpired();
                    } else {
                        this.emit('error', new Error(`Failed to parse listenKeyExpired: ${result.reason}`));
                    }
                    break;
                }

                // ─────────────────────────────────────────────────────────────
                // Account Update (Balance/Position changes)
                // ─────────────────────────────────────────────────────────────
                case 'ACCOUNT_UPDATE': {
                    const raw = message as AccountUpdateRaw;
                    // Debug logging for position updates
                    if (raw.a?.P && raw.a.P.length > 0) {
                        console.log(`[UserDataStream] 📥 ACCOUNT_UPDATE:`, JSON.stringify({
                            eventTime: raw.E,
                            positions: raw.a.P.map((p) => ({
                                symbol: p.s,
                                side: p.ps,
                                amount: p.pa,
                                unrealizedPnL: p.up
                            }))
                        }));
                    }
                    this.emit('accountUpdate', raw);
                    break;
                }

                // ─────────────────────────────────────────────────────────────
                // Margin Call (High risk warning)
                // ─────────────────────────────────────────────────────────────
                case 'MARGIN_CALL':
                    console.warn('[UserDataStream] ⚠️ MARGIN_CALL received');
                    this.emit('marginCall', message as MarginCallRaw);
                    break;

                // ─────────────────────────────────────────────────────────────
                // Order Trade Update (Full order info)
                // ─────────────────────────────────────────────────────────────
                case 'ORDER_TRADE_UPDATE':
                    const orderUpdateResult = parseOrderTradeUpdate(message as OrderTradeUpdateRaw);
                    this.emit('orderUpdate', orderUpdateResult);
                    break;

                // ─────────────────────────────────────────────────────────────
                // Trade Lite (Fast, reduced latency trade updates)
                // ─────────────────────────────────────────────────────────────
                case 'TRADE_LITE': {
                    const result = parseTradeLite(message as TradeLiteRaw);
                    if (result.isSuccess) {
                        this.emit('tradeLite', result.data);
                    } else {
                        this.emit('error', new Error(`Failed to parse TRADE_LITE: ${result.reason}`));
                    }
                    break;
                }

                // ─────────────────────────────────────────────────────────────
                // Account Config Update (Leverage/Multi-assets mode)
                // ─────────────────────────────────────────────────────────────
                case 'ACCOUNT_CONFIG_UPDATE': {
                    const result = parseAccountConfigUpdate(message as AccountConfigUpdateRaw);
                    if (result.isSuccess) {
                        this.emit('accountConfigUpdate', result.data);
                    } else {
                        this.emit('error', new Error(`Failed to parse ACCOUNT_CONFIG_UPDATE: ${result.reason}`));
                    }
                    break;
                }

                // ─────────────────────────────────────────────────────────────
                // Grid Update (Grid strategy updates)
                // ─────────────────────────────────────────────────────────────
                case 'GRID_UPDATE': {
                    const result = parseGridUpdate(message as GridUpdateRaw);
                    if (result.isSuccess) {
                        this.emit('gridUpdate', result.data);
                    } else {
                        this.emit('error', new Error(`Failed to parse GRID_UPDATE: ${result.reason}`));
                    }
                    break;
                }

                // ─────────────────────────────────────────────────────────────
                // Conditional Order Trigger Rejected
                // ─────────────────────────────────────────────────────────────
                case 'CONDITIONAL_ORDER_TRIGGER_REJECT': {
                    const result = parseConditionalOrderReject(message as ConditionalOrderRejectRaw);
                    if (result.isSuccess) {
                        console.warn(`[UserDataStream] ⚠️ Order rejected:`, result.data?.rejectReason);
                        this.emit('conditionalOrderTriggerReject', result.data);
                    } else {
                        this.emit('error', new Error(`Failed to parse CONDITIONAL_ORDER_TRIGGER_REJECT: ${result.reason}`));
                    }
                    break;
                }

                // ─────────────────────────────────────────────────────────────
                // Algo Order Update (Conditional orders)
                // ─────────────────────────────────────────────────────────────
                case 'ALGO_UPDATE': {
                    const result = parseAlgoUpdate(message as AlgoUpdateRaw);
                    if (result.isSuccess) {
                        this.emit('algoOrderUpdate', result.data);
                    } else {
                        this.emit('error', new Error(`Failed to parse ALGO_UPDATE: ${result.reason}`));
                    }
                    break;
                }

                // ─────────────────────────────────────────────────────────────
                // Unknown Event
                // ─────────────────────────────────────────────────────────────
                default:
                    console.log(`[UserDataStream] Unknown event type: ${eventType}`);
                    this.emit('message', message);
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    /**
     * Setup keepalive interval
     */
    private setupKeepalive(): void {
        // Keepalive at configured interval (default 30 minutes)
        this.keepaliveInterval = setInterval(async () => {
            try {
                await this.restClient.keepaliveListenKey();
            } catch (error) {
                this.emit('error', new Error(`Keepalive failed: ${error}`));
            }
        }, this.keepaliveIntervalMs);
    }

    /**
     * Handle reconnection with exponential backoff
     */
    private handleReconnect(): void {
        const isNetworkError = (err: any) =>
            err.message.includes('ENOTFOUND') ||
            err.message.includes('ETIMEDOUT') ||
            err.message.includes('ECONNWEAK') ||
            err.code === 'ENOTFOUND' ||
            err.code === 'ETIMEDOUT';

        // Infinite retries for network errors, limit for others? 
        // Simpler: Just try for a long time. 
        // If we are at max attempts, check if it looks like a temporary network issue.

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;

            // Calculate backoff delay: 1s, 2s, 4s, 8s, 16s with jitter
            const baseDelay = 1000;
            const maxDelay = 30000;
            const exponentialDelay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts - 1), maxDelay);

            // Add jitter (±25%) to prevent thundering herd
            const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
            const delay = Math.round(exponentialDelay + jitter);

            console.log(`[UserDataStream] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

            setTimeout(async () => {
                try {
                    await this.connect();
                    console.log('[UserDataStream] Reconnect successful');
                } catch (err: any) {
                    console.error(`[UserDataStream] Reconnect attempt failed: ${err.message}`);
                    // Recurse to try again
                    this.handleReconnect();
                }
            }, delay);
        } else {
            // Reset attempts if it's a network error to keep trying indefinitely?
            // For now, just log and give up after max attempts (which we will increase)
            console.error('[UserDataStream] Max reconnection attempts reached. giving up.');
            this.emit('error', new Error('Max reconnection attempts reached'));
        }
    }


    /**
     * Handle listen key expiration - create new listen key and reconnect.
     * 
     * @remarks
     * This is called when the server sends a listenKeyExpired event.
     * The old WebSocket connection is closed and a new one is established.
     */
    private async handleListenKeyExpired(): Promise<void> {
        console.log('[UserDataStream] Handling listen key expiration...');

        // Clear old keepalive
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }

        // Close old WebSocket (without triggering handleReconnect)
        if (this.ws) {
            this.ws.removeAllListeners();
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }

        // Clear old listen key
        this.listenKey = null;

        // Reconnect with new listen key
        try {
            await this.connect();
            console.log('[UserDataStream] Successfully reconnected after listen key expiration');
        } catch (error) {
            console.error('[UserDataStream] Failed to reconnect after listen key expiration:', error);
            this.emit('error', error);
            // Fall back to normal reconnect logic
            this.handleReconnect();
        }
    }

    /**
     * Check if connected
     */
    isStreamConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Disconnect
     */
    async disconnect(): Promise<void> {
        // Clear keepalive
        if (this.keepaliveInterval) {
            clearInterval(this.keepaliveInterval);
            this.keepaliveInterval = null;
        }

        // Close WebSocket
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }

        // Delete listen key
        if (this.listenKey) {
            try {
                await this.restClient.deleteListenKey();
            } catch (error) {
                // Ignore errors on disconnect
            }
            this.listenKey = null;
        }
    }
}
