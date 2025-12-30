/**
 * @fileoverview Base JSON-RPC WebSocket Client
 * @module Common/Clients/Base/BaseJsonRpcClient
 *
 * Abstract base class for JSON-RPC over WebSocket connections.
 * Provides connection management, request/response handling,
 * and subscription support for Deribit-style APIs.
 */

import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { generateUuid } from '../../helpers/UuidGenerator';
import { Result } from '../../result';
import {
    IProviderClient,
    ISubscribableClient,
    ProviderType,
    ProviderEnvironment,
    ConnectionState,
    ClientStats
} from './IProviderClient';
import {
    JsonRpcRequest,
    JsonRpcResponse,
    JsonRpcNotification,
    PendingRequest,
    createRequest,
    isSuccessResponse,
    isErrorResponse,
    isNotification
} from './types/JsonRpcTypes';

/**
 * Configuration for BaseJsonRpcClient.
 */
export interface JsonRpcClientConfig {
    /** Request timeout in milliseconds */
    timeoutMs?: number;
    /** Ping interval in milliseconds */
    pingIntervalMs?: number;
    /** Auto-reconnect on disconnect */
    autoReconnect?: boolean;
    /** Initial reconnect delay in milliseconds */
    reconnectDelayMs?: number;
    /** Maximum reconnect delay in milliseconds */
    maxReconnectDelayMs?: number;
    /** Maximum reconnect attempts */
    maxReconnectAttempts?: number;
    /** Enable debug logging */
    debug?: boolean;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Required<JsonRpcClientConfig> = {
    timeoutMs: 10000,
    pingIntervalMs: 30000,
    autoReconnect: true,
    reconnectDelayMs: 1000,
    maxReconnectDelayMs: 30000,
    maxReconnectAttempts: 10,
    debug: false
};

/**
 * Abstract base class for JSON-RPC WebSocket clients.
 *
 * @remarks
 * Provides a robust foundation for JSON-RPC over WebSocket connections,
 * handling:
 * - Connection management with auto-reconnect
 * - Request/response correlation via message IDs
 * - Subscription management
 * - Heartbeat/ping-pong
 * - Error handling and recovery
 *
 * @example
 * ```typescript
 * class DeribitClient extends BaseJsonRpcClient {
 *     readonly provider = ProviderType.DERIBIT;
 *
 *     getWebSocketUrl(): string {
 *         return 'wss://test.deribit.com/ws/api/v2';
 *     }
 *
 *     async authenticate(): Promise<Result<void>> {
 *         const result = await this.call('public/auth', {...});
 *         // ...
 *     }
 * }
 * ```
 */
export abstract class BaseJsonRpcClient
    extends EventEmitter
    implements ISubscribableClient {
    // ═══════════════════════════════════════════════════════════════════════════
    // Abstract Members
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Provider type.
     */
    abstract readonly provider: ProviderType;

    /**
     * Provider environment.
     */
    abstract readonly environment: ProviderEnvironment;

    /**
     * Get WebSocket URL for connection.
     */
    protected abstract getWebSocketUrl(): string;

    /**
     * Handle authentication after connection.
     * Override to implement provider-specific auth.
     */
    protected abstract onAuthenticate(): Promise<Result<void>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Protected Members
    // ═══════════════════════════════════════════════════════════════════════════

    protected ws: WebSocket | null = null;
    protected config: Required<JsonRpcClientConfig>;
    protected pendingRequests: Map<string, PendingRequest> = new Map();
    protected subscriptions: Set<string> = new Set();
    protected connectionState: ConnectionState = ConnectionState.DISCONNECTED;

    // Stats tracking
    protected connectedAt: number = 0;
    protected reconnectCount: number = 0;
    protected messagesSent: number = 0;
    protected messagesReceived: number = 0;
    protected totalLatencyMs: number = 0;
    protected latencyCount: number = 0;
    protected lastError: string | undefined;

    // Timers
    protected pingTimer: NodeJS.Timeout | null = null;
    protected reconnectTimer: NodeJS.Timeout | null = null;
    protected currentReconnectDelay: number = 0;
    protected reconnectAttempts: number = 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════════════════════════

    constructor(config?: JsonRpcClientConfig) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.currentReconnectDelay = this.config.reconnectDelayMs;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // IProviderClient Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Connect to the WebSocket server.
     */
    async connect(): Promise<Result<void>> {
        if (this.connectionState === ConnectionState.CONNECTED) {
            return Result.Success;
        }

        if (this.connectionState === ConnectionState.CONNECTING) {
            return Result.Failure.withReason('Connection already in progress');
        }

        this.connectionState = ConnectionState.CONNECTING;
        this.emit('connecting');

        try {
            await this.establishConnection();
            this.connectionState = ConnectionState.CONNECTED;
            this.connectedAt = Date.now();
            this.reconnectAttempts = 0;
            this.currentReconnectDelay = this.config.reconnectDelayMs;

            // Authenticate
            const authResult = await this.onAuthenticate();
            if (!authResult.success) {
                await this.disconnect();
                return Result.Failure.withReason(`Authentication failed: ${authResult.reason}`);
            }

            // Start heartbeat
            this.startPingTimer();

            this.emit('connected');
            this.log('Connected successfully');

            return Result.Success;
        } catch (error) {
            this.connectionState = ConnectionState.ERROR;
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.lastError = errorMessage;
            this.emit('error', error);
            return Result.Failure.withReason(errorMessage);
        }
    }

    /**
     * Disconnect from the WebSocket server.
     */
    async disconnect(): Promise<Result<void>> {
        this.stopPingTimer();
        this.clearReconnectTimer();

        if (this.ws) {
            // Reject all pending requests
            this.pendingRequests.forEach((pending) => {
                pending.reject(new Error('Connection closed'));
                if (pending.timeoutId) {
                    clearTimeout(pending.timeoutId);
                }
            });
            this.pendingRequests.clear();

            try {
                this.ws.close(1000, 'Client disconnect');
            } catch {
                // Ignore close errors
            }
            this.ws = null;
        }

        this.connectionState = ConnectionState.DISCONNECTED;
        this.subscriptions.clear();
        this.emit('disconnected');
        this.log('Disconnected');

        return Result.Success;
    }

    /**
     * Check if connected.
     */
    isConnected(): boolean {
        return (
            this.connectionState === ConnectionState.CONNECTED &&
            this.ws?.readyState === WebSocket.OPEN
        );
    }

    /**
     * Get connection state.
     */
    getConnectionState(): ConnectionState {
        return this.connectionState;
    }

    /**
     * Get client statistics.
     */
    getStats(): ClientStats {
        return {
            provider: this.provider,
            isConnected: this.isConnected(),
            uptimeMs: this.connectedAt > 0 ? Date.now() - this.connectedAt : 0,
            reconnectCount: this.reconnectCount,
            messagesSent: this.messagesSent,
            messagesReceived: this.messagesReceived,
            avgLatencyMs:
                this.latencyCount > 0
                    ? Math.round(this.totalLatencyMs / this.latencyCount)
                    : 0,
            lastError: this.lastError
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ISubscribableClient Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Subscribe to a channel.
     */
    async subscribe(channel: string): Promise<Result<void>> {
        return this.subscribeChannels([channel]);
    }

    /**
     * Subscribe to multiple channels.
     */
    async subscribeChannels(
        channels: string[],
        isPrivate: boolean = false
    ): Promise<Result<void>> {
        const method = isPrivate ? 'private/subscribe' : 'public/subscribe';
        const result = await this.call<string[]>(method, { channels });

        if (result.success) {
            for (const channel of channels) {
                this.subscriptions.add(channel);
            }
            this.log(`Subscribed to: ${channels.join(', ')}`);
            return Result.Success;
        }

        return Result.Failure.withReason(result.reason || 'Subscribe failed');
    }

    /**
     * Unsubscribe from a channel.
     */
    async unsubscribe(channel: string): Promise<Result<void>> {
        return this.unsubscribeChannels([channel]);
    }

    /**
     * Unsubscribe from multiple channels.
     */
    async unsubscribeChannels(
        channels: string[],
        isPrivate: boolean = false
    ): Promise<Result<void>> {
        const method = isPrivate ? 'private/unsubscribe' : 'public/unsubscribe';
        const result = await this.call<string[]>(method, { channels });

        if (result.success) {
            for (const channel of channels) {
                this.subscriptions.delete(channel);
            }
            this.log(`Unsubscribed from: ${channels.join(', ')}`);
            return Result.Success;
        }

        return Result.Failure.withReason(result.reason || 'Unsubscribe failed');
    }

    /**
     * Get current subscriptions.
     */
    getSubscriptions(): string[] {
        return Array.from(this.subscriptions);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // JSON-RPC Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Send a JSON-RPC request and await response.
     *
     * @param method - RPC method name
     * @param params - Optional parameters
     * @returns Result with response data or error
     */
    async call<T>(
        method: string,
        params?: Record<string, unknown>
    ): Promise<Result<T>> {
        if (!this.isConnected()) {
            return Result.fail<T>({
                code: 'NO_CONNECTION',
                message: 'Not connected',
                timestamp: Date.now()
            });
        }

        const id = generateUuid();
        const request = createRequest(id, method, params);

        return new Promise<Result<T>>((resolve) => {
            const pending: PendingRequest<T> = {
                id,
                method,
                timestamp: Date.now(),
                resolve: (value: T) => resolve(Result.ok(value)),
                reject: (error: Error) => resolve(Result.fail<T>({
                    code: 'FAILURE',
                    message: error.message,
                    timestamp: Date.now()
                }))
            };

            // Set timeout
            pending.timeoutId = setTimeout(() => {
                this.pendingRequests.delete(id);
                resolve(Result.fail<T>({
                    code: 'TIMEOUT',
                    message: `Request timeout: ${method}`,
                    timestamp: Date.now()
                }));
            }, this.config.timeoutMs);

            this.pendingRequests.set(id, pending as PendingRequest);

            try {
                this.sendRaw(request);
            } catch (error) {
                this.pendingRequests.delete(id);
                if (pending.timeoutId) {
                    clearTimeout(pending.timeoutId);
                }
                resolve(
                    Result.fail<T>({
                        code: 'SEND_FAILED',
                        message: error instanceof Error ? error.message : 'Send failed',
                        timestamp: Date.now()
                    })
                );
            }
        });
    }

    /**
     * Send raw JSON-RPC request (no response tracking).
     */
    protected sendRaw(request: JsonRpcRequest): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('WebSocket not connected');
        }

        const data = JSON.stringify(request);
        this.ws.send(data);
        this.messagesSent++;
        this.log(`>>> ${request.method}`, request.params);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Connection Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Establish WebSocket connection.
     */
    protected establishConnection(): Promise<void> {
        return new Promise((resolve, reject) => {
            const url = this.getWebSocketUrl();
            // Use WebSocket.default for ESM compatibility
            const WS = (WebSocket as any).default || WebSocket;
            this.ws = new WS(url);

            const timeout = setTimeout(() => {
                reject(new Error('Connection timeout'));
            }, this.config.timeoutMs);

            const ws = this.ws;
            if (!ws) {
                reject(new Error('Failed to create WebSocket'));
                return;
            }

            ws.on('open', () => {
                clearTimeout(timeout);
                resolve();
            });

            ws.on('error', (error: Error) => {
                clearTimeout(timeout);
                reject(error);
            });

            ws.on('close', (code: number, reason: Buffer) => {
                this.handleClose(code, reason.toString());
            });

            ws.on('message', (data: WebSocket.RawData) => {
                this.handleMessage(data);
            });

            ws.on('pong', () => {
                this.emit('pong');
            });
        });
    }

    /**
     * Handle incoming WebSocket message.
     */
    protected handleMessage(data: WebSocket.RawData): void {
        this.messagesReceived++;

        try {
            const message = JSON.parse(data.toString());

            // Check if it's a notification
            if (isNotification(message)) {
                this.handleNotification(message);
                return;
            }

            // Check if it's a response to a pending request
            const response = message as JsonRpcResponse;
            const id = String(response.id);
            const pending = this.pendingRequests.get(id);

            if (pending) {
                this.pendingRequests.delete(id);
                if (pending.timeoutId) {
                    clearTimeout(pending.timeoutId);
                }

                // Track latency
                const latency = Date.now() - pending.timestamp;
                this.totalLatencyMs += latency;
                this.latencyCount++;

                if (isSuccessResponse(response)) {
                    this.log(`<<< ${pending.method} (${latency}ms)`, response.result);
                    pending.resolve(response.result);
                } else if (isErrorResponse(response)) {
                    this.log(`<<< ${pending.method} ERROR`, response.error);
                    pending.reject(
                        new Error(`${response.error.code}: ${response.error.message}`)
                    );
                }
            } else {
                this.log('<<< Unhandled message', message);
            }
        } catch (error) {
            this.log('Failed to parse message', error);
        }
    }

    /**
     * Handle subscription notification.
     */
    protected handleNotification(notification: JsonRpcNotification): void {
        const { channel, data } = notification.params;
        this.log(`<<< [${channel}]`, data);
        this.emit('notification', { channel, data });
        this.emit(`subscription:${channel}`, data);
    }

    /**
     * Handle WebSocket close.
     */
    protected handleClose(code: number, reason: string): void {
        this.log(`Connection closed: ${code} ${reason}`);
        this.stopPingTimer();

        const wasConnected = this.connectionState === ConnectionState.CONNECTED;
        this.connectionState = ConnectionState.DISCONNECTED;
        this.ws = null;

        // Reject pending requests
        this.pendingRequests.forEach((pending) => {
            pending.reject(new Error('Connection closed'));
            if (pending.timeoutId) {
                clearTimeout(pending.timeoutId);
            }
        });
        this.pendingRequests.clear();

        this.emit('close', { code, reason });

        // Auto-reconnect if enabled
        if (
            wasConnected &&
            this.config.autoReconnect &&
            this.reconnectAttempts < this.config.maxReconnectAttempts
        ) {
            this.scheduleReconnect();
        }
    }

    /**
     * Schedule reconnection attempt.
     */
    protected scheduleReconnect(): void {
        this.clearReconnectTimer();
        this.connectionState = ConnectionState.RECONNECTING;
        this.reconnectAttempts++;
        this.reconnectCount++;

        this.log(
            `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${this.currentReconnectDelay}ms`
        );

        this.reconnectTimer = setTimeout(async () => {
            this.emit('reconnecting', {
                attempt: this.reconnectAttempts,
                maxAttempts: this.config.maxReconnectAttempts
            });

            const result = await this.connect();
            if (!result.success) {
                // Exponential backoff
                this.currentReconnectDelay = Math.min(
                    this.currentReconnectDelay * 2,
                    this.config.maxReconnectDelayMs
                );

                if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
                    this.scheduleReconnect();
                } else {
                    this.emit('reconnectFailed');
                }
            } else {
                // Resubscribe to channels
                await this.resubscribe();
            }
        }, this.currentReconnectDelay);
    }

    /**
     * Resubscribe to all previously subscribed channels.
     */
    protected async resubscribe(): Promise<void> {
        const channels = Array.from(this.subscriptions);
        if (channels.length > 0) {
            this.subscriptions.clear();
            const publicChannels = channels.filter((c) => !c.startsWith('user.'));
            const privateChannels = channels.filter((c) => c.startsWith('user.'));

            if (publicChannels.length > 0) {
                await this.subscribeChannels(publicChannels, false);
            }
            if (privateChannels.length > 0) {
                await this.subscribeChannels(privateChannels, true);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Heartbeat
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Start ping timer.
     */
    protected startPingTimer(): void {
        this.stopPingTimer();
        this.pingTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.ping();
                this.emit('ping');
            }
        }, this.config.pingIntervalMs);
    }

    /**
     * Stop ping timer.
     */
    protected stopPingTimer(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    /**
     * Clear reconnect timer.
     */
    protected clearReconnectTimer(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Logging
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Log message if debug is enabled.
     */
    protected log(message: string, data?: unknown): void {
        if (this.config.debug) {
            const prefix = `[${this.provider}]`;
            if (data !== undefined) {
                console.log(prefix, message, JSON.stringify(data, null, 2));
            } else {
                console.log(prefix, message);
            }
        }
    }
}
