/**
 * @fileoverview Binance WebSocket API Client for Trading Operations
 * @module clients/BinanceApiWsClient
 */

import WebSocket from 'ws';
import { generateUuid } from '../../Common/helpers/UuidGenerator';
import { EventEmitter } from 'events';
import { HmacSignatureGenerator } from '../helpers/security/HmacSignatureGenerator';
import { OrderBook, BinanceOrderResponse } from '../dtos';
import { BinanceRateLimit } from '../dtos/binance/RateLimits';
import { LatencyTracker, LatencyStats } from '../utils/LatencyTracker';
import { ServerTimeSync } from '../utils/ServerTimeSync';
import { WebSocketClientConfig } from './Base/types/ClientConfig';
import {
    OrderSide,
    PositionSide,
    TimeInForce,
    WorkingType,
    type OrderSideType,
    type PositionSideType,
    type TimeInForceType,
    type WorkingTypeType
} from '../enums';
import { WS_PING_INTERVAL_MS } from '../shared/constants/BinanceConstants';

/**
 * WebSocket API message payload
 */
interface WsApiPayload {
    id: string;
    method: string;
    params: Record<string, any>;
}

/**
 * WebSocket API response
 */
interface WsApiResponse {
    id: string;
    status: number;
    result?: any;
    error?: {
        code: number;
        msg: string;
    };
    rateLimits?: any[];
}

/**
 * GFX order parameters (GTX = Post Only)
 */
export interface GfxOrderParams {
    symbol: string;
    side: OrderSideType;
    quantity: string;
    price: string;
}

/**
 * Binance WebSocket API Client for order operations
 * 
 * @remarks
 * Configuration is injected via constructor for DDD compliance.
 * Use service layer to create clients with appropriate settings.
 * 
 * @example
 * ```typescript
 * import { getWsApiUrl } from '../shared/utils/BinanceEndpoints';
 * 
 * const client = new BinanceApiWsClient(apiKey, apiSecret, {
 *     wsUrl: getWsApiUrl(environment),
 *     onRateLimitUpdate: (limits) => rateLimitCache.update(instanceKey, 'websocket', limits)
 * });
 * ```
 */
export class BinanceApiWsClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private readonly wsUrl: string;
    private readonly apiKey: string;
    private readonly signatureGenerator: HmacSignatureGenerator;
    private isConnected: boolean = false;
    private pendingRequests: Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout; startTime: number }> = new Map();
    private reconnectAttempts: number = 0;
    private readonly maxReconnectAttempts: number;
    private readonly reconnectDelay: number;
    private readonly latencyTracker: LatencyTracker;
    private readonly onRateLimitUpdate?: (rateLimits: BinanceRateLimit[]) => void;
    private pingTimer: NodeJS.Timeout | null = null;
    private readonly PING_INTERVAL_MS: number = WS_PING_INTERVAL_MS;

    /**
     * Creates a new BinanceApiWsClient instance.
     * 
     * @param apiKey - Binance API key.
     * @param apiSecret - Binance API secret.
     * @param config - Client configuration including WebSocket URL and optional callbacks.
     */
    constructor(apiKey: string, apiSecret: string, config: WebSocketClientConfig) {
        super();
        this.apiKey = apiKey;
        this.signatureGenerator = new HmacSignatureGenerator(apiSecret);
        this.wsUrl = config.wsUrl;
        this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
        this.reconnectDelay = config.reconnectDelayMs ?? 5000;
        this.onRateLimitUpdate = config.onRateLimitUpdate;
        this.latencyTracker = new LatencyTracker();
    }

    /**
     * Connect to WebSocket API
     */
    async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.wsUrl);

            this.ws.on('open', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                this.startPingTimer(); // Start keepalive
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
                this.stopPingTimer(); // Stop keepalive
                this.emit('disconnected');
                this.handleReconnect();
            });

            this.ws.on('ping', () => {
                this.ws?.pong();
            });
        });
    }

    /**
     * Start ping timer to keep connection alive
     * Binance WebSocket API requires periodic pings
     */
    private startPingTimer(): void {
        this.stopPingTimer(); // Clear any existing timer

        this.pingTimer = setInterval(() => {
            if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.ping();
                } catch (err: any) {
                    console.warn('[BinanceApiWsClient] Ping failed:', err.message);
                }
            }
        }, this.PING_INTERVAL_MS);
    }

    /**
     * Stop ping timer
     */
    private stopPingTimer(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    /**
     * Handle WebSocket reconnection
     */
    private handleReconnect(): void {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(() => {
                this.connect().catch(err => {
                    this.emit('error', new Error(`Reconnect failed: ${err.message}`));
                });
            }, this.reconnectDelay);
        } else {
            this.emit('error', new Error('Max reconnection attempts reached'));
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    private handleMessage(data: WebSocket.Data): void {
        try {
            const response: WsApiResponse = JSON.parse(data.toString());

            // Capture rate limits via callback
            if (response.rateLimits && Array.isArray(response.rateLimits) && this.onRateLimitUpdate) {
                this.onRateLimitUpdate(response.rateLimits as BinanceRateLimit[]);
            }

            const pending = this.pendingRequests.get(response.id);

            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(response.id);

                // Track latency
                const latencyMs = Date.now() - pending.startTime;
                this.latencyTracker.record(latencyMs);

                if (response.status === 200 && response.result) {
                    pending.resolve(response.result);
                } else if (response.error) {
                    pending.reject(new Error(`[${response.error.code}] ${response.error.msg}`));
                } else {
                    pending.reject(new Error('Unknown error'));
                }
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    /**
     * Send request and wait for response
     */
    private sendRequest<T>(method: string, params: Record<string, any>, timeoutMs: number = 10000): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!this.isConnected || !this.ws) {
                reject(new Error('WebSocket not connected'));
                return;
            }

            const id = generateUuid();
            // Use server-synced timestamp to prevent -1021 errors
            const timestamp = ServerTimeSync.getTimestamp();

            // Add API key and timestamp
            const paramsWithAuth: Record<string, any> = {
                apiKey: this.apiKey,
                ...params,
                timestamp
            };

            // Sign parameters
            const signature = this.signatureGenerator.generateSignature(paramsWithAuth);
            paramsWithAuth.signature = signature;

            const payload: WsApiPayload = {
                id,
                method,
                params: paramsWithAuth
            };

            // DEBUG: Log exact payload being sent
            if (method === 'order.place') {
                console.log('[BinanceApiWsClient] CRITICAL DEBUG - Order params received:', {
                    symbol: params.symbol,
                    quantity: params.quantity,
                    quantityType: typeof params.quantity,
                    price: params.price,
                    priceType: typeof params.price,
                    type: params.type,
                    timeInForce: params.timeInForce
                });

                // Show exact JSON that will be sent
                const jsonPayload = JSON.stringify(payload);
                console.log('[BinanceApiWsClient] EXACT JSON being sent:', jsonPayload);
            }

            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, timeoutMs);

            this.pendingRequests.set(id, { resolve, reject, timeout, startTime: Date.now() });
            this.ws.send(JSON.stringify(payload));
        });
    }

    /**
     * Generic order placement
     * CRITICAL: Ensure quantity/price are properly formatted as DECIMAL numbers
     */
    async placeOrder(params: Record<string, any>): Promise<BinanceOrderResponse> {
        // SAFEGUARD: Ensure quantity and price are proper DECIMAL values
        // This catches any case where raw values bypass OrderFactory normalization
        const safeParams = { ...params };

        if (safeParams.quantity !== undefined) {
            // If string, parseFloat preserves precision. If number, we need to ensure it's clean.
            const qty = typeof safeParams.quantity === 'string'
                ? parseFloat(safeParams.quantity)
                : safeParams.quantity;
            safeParams.quantity = qty.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
        }

        if (safeParams.price !== undefined) {
            const price = typeof safeParams.price === 'string'
                ? parseFloat(safeParams.price)
                : safeParams.price;
            safeParams.price = price.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
        }

        if (safeParams.stopPrice !== undefined) {
            const stopPrice = typeof safeParams.stopPrice === 'string'
                ? parseFloat(safeParams.stopPrice)
                : safeParams.stopPrice;
            safeParams.stopPrice = stopPrice.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
        }

        console.log('[BinanceApiWsClient] placeOrder SAFEGUARD (STRING format):', {
            originalQty: params.quantity,
            safeQty: safeParams.quantity,
            typeof_safeQty: typeof safeParams.quantity,
            originalPrice: params.price,
            safePrice: safeParams.price
        });

        return this.sendRequest<BinanceOrderResponse>('order.place', safeParams);
    }

    /**
     * Place GFX order (GTX = Post Only, won't trigger immediately)
     */
    async placeGfxOrder(params: GfxOrderParams): Promise<BinanceOrderResponse> {
        return this.placeOrder({
            symbol: params.symbol,
            side: params.side,
            type: 'LIMIT',
            timeInForce: 'GTX',
            quantity: params.quantity,
            price: params.price
        });
    }

    /**
     * Cancel order
     */
    async cancelOrder(symbol: string, orderId: number): Promise<BinanceOrderResponse> {
        return this.sendRequest<BinanceOrderResponse>('order.cancel', {
            symbol,
            orderId
        });
    }

    /**
     * Get order book
     */
    async getOrderBook(symbol: string, limit: number = 20): Promise<OrderBook> {
        return this.sendRequest<OrderBook>('depth', {
            symbol,
            limit
        });
    }

    /**
     * Get order status
     */
    async getOrder(symbol: string, orderId: number): Promise<BinanceOrderResponse> {
        return this.sendRequest<BinanceOrderResponse>('order.status', {
            symbol,
            orderId
        });
    }

    /**
     * Get account status (v2/account.status)
     * Weight: 5
     */
    async getAccountStatus(): Promise<any> {
        return this.sendRequest<any>('v2/account.status', {});
    }

    /**
     * Place an Algo Order (STOP, TAKE_PROFIT, TRAILING_STOP_MARKET)
     * Uses algoOrder.place method instead of order.place
     * Required for STOP orders which return [-4120] on regular order.place
     * 
     * @param params - Algo order parameters
     */
    async placeAlgoOrder(params: {
        symbol: string;
        side: OrderSideType;
        type: 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET' | 'TRAILING_STOP_MARKET';
        quantity: string;
        triggerPrice: string;
        price?: string; // Required for STOP and TAKE_PROFIT (limit price when triggered)
        positionSide?: PositionSideType;
        timeInForce?: TimeInForceType;
        workingType?: WorkingTypeType;
        priceProtect?: boolean;
        reduceOnly?: boolean;
        clientAlgoId?: string;
    }): Promise<any> {
        const algoParams: Record<string, any> = {
            algoType: 'CONDITIONAL',
            symbol: params.symbol,
            side: params.side,
            type: params.type,
            quantity: params.quantity,
            triggerPrice: params.triggerPrice
        };

        // Optional params
        if (params.price) algoParams.price = params.price;
        if (params.positionSide) algoParams.positionSide = params.positionSide;
        if (params.timeInForce) algoParams.timeInForce = params.timeInForce;
        if (params.workingType) algoParams.workingType = params.workingType;
        if (params.priceProtect !== undefined) algoParams.priceProtect = params.priceProtect ? 'TRUE' : 'FALSE';
        if (params.reduceOnly !== undefined) algoParams.reduceOnly = params.reduceOnly ? 'true' : 'false';
        if (params.clientAlgoId) algoParams.clientAlgoId = params.clientAlgoId;

        console.log('[BinanceApiWsClient] Placing Algo Order:', {
            symbol: params.symbol,
            type: params.type,
            side: params.side,
            triggerPrice: params.triggerPrice,
            price: params.price
        });

        return this.sendRequest<any>('algoOrder.place', algoParams);
    }

    /**
     * Cancel an Algo Order
     * @param algoId - The algo order ID to cancel
     * @param clientAlgoId - Alternative: client algo ID to cancel
     */
    async cancelAlgoOrder(params: {
        algoId?: number;
        clientAlgoId?: string;
    }): Promise<any> {
        if (!params.algoId && !params.clientAlgoId) {
            throw new Error('Either algoId or clientAlgoId is required');
        }

        const cancelParams: Record<string, any> = {};
        if (params.algoId) cancelParams.algoId = params.algoId;
        if (params.clientAlgoId) cancelParams.clientAlgoId = params.clientAlgoId;

        console.log('[BinanceApiWsClient] Canceling Algo Order:', cancelParams);

        return this.sendRequest<any>('algoOrder.cancel', cancelParams);
    }

    /**
     * Check if connected
     */
    isWsConnected(): boolean {
        return this.isConnected;
    }

    /**
     * Disconnect
     */
    disconnect(): void {
        this.stopPingTimer();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.isConnected = false;
        }
    }

    /**
     * Get latency statistics
     */
    getLatencyStats(): LatencyStats {
        return this.latencyTracker.getStats();
    }
}
