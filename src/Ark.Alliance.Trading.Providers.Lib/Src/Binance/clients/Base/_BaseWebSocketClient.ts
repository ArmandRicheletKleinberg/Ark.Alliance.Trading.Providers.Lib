import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { WebSocketClientConfig } from './types/WebSocketClientConfig';
import { WebSocketStats } from './types/WebSocketStats';

/**
 * Abstract Base WebSocket Client.
 * Provides robust connection management, reconnection logic, ping/pong keep-alive,
 * and subscription handling.
 */
export abstract class BaseWebSocketClient extends EventEmitter {
    protected ws: WebSocket | null = null;
    protected subscriptions: Set<string> = new Set();
    protected isConnected: boolean = false;
    protected reconnectAttempts: number = 0;
    protected messageCount: number = 0;
    protected lastUpdate: Date | null = null;

    protected config: WebSocketClientConfig;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private pingTimer: NodeJS.Timeout | null = null;

    constructor(config?: WebSocketClientConfig) {
        super();
        this.config = {
            maxReconnectAttempts: 10,
            initialReconnectIntervalMs: 1000,
            maxReconnectIntervalMs: 30000,
            pingIntervalMs: 30000,
            ...config
        };
    }

    /**
     * Implementation should return the WebSocket URL to connect to.
     */
    protected abstract getUrl(): Promise<string> | string;

    /**
     * Use to generate the payload required to subscribe to topics.
     */
    protected abstract getSubscribePayload(topics: string[]): any;

    /**
     * Use to generate the payload required to unsubscribe from topics.
     */
    protected abstract getUnsubscribePayload(topics: string[]): any;

    /**
     * Process incoming raw WebSocket messages.
     * Implementation is responsible for parsing and routing.
     */
    protected abstract handleMessage(data: WebSocket.RawData): void;

    /**
     * Optional hook called after connection is established.
     */
    protected onConnected(): void { }

    /**
     * Connect to the WebSocket.
     */
    public async connect(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this.isConnected && this.ws) {
                resolve();
                return;
            }

            try {
                const url = await this.getUrl();
                this.ws = new WebSocket(url);

                this.ws.on('open', () => {
                    console.log(`[${this.constructor.name}] Connected`);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.emit('connected');

                    // Resubscribe if needed
                    if (this.subscriptions.size > 0) {
                        this.refreshSubscriptions();
                    }

                    this.startPingTimer();
                    this.onConnected();
                    resolve();
                });

                this.ws.on('message', (data: WebSocket.RawData) => {
                    this.messageCount++;
                    this.lastUpdate = new Date();
                    try {
                        this.handleMessage(data);
                    } catch (err: any) {
                        console.error(`[${this.constructor.name}] Message Handling Error:`, err.message);
                    }
                });

                this.ws.on('close', (code: number, reason: string) => {
                    const reasonStr = reason?.toString() || '';
                    console.log(`[${this.constructor.name}] Disconnected: ${code} ${reasonStr}`);
                    this.isConnected = false;
                    this.stopPingTimer();
                    this.emit('disconnected', { code, reason: reasonStr });

                    // Log disconnection to database for persistence
                    console.warn(`[WebSocket] Disconnected: ${code}`, {
                        source: this.constructor.name,
                        details: {
                            code,
                            reason: reasonStr,
                            reconnectAttempt: this.reconnectAttempts,
                            subscriptions: Array.from(this.subscriptions)
                        }
                    });

                    this.scheduleReconnect();
                });

                this.ws.on('error', (error: Error) => {
                    console.error(`[${this.constructor.name}] Error:`, error.message);
                    this.emit('error', error);

                    // Log error to database for persistence
                    console.error(`[WebSocket] Error: ${error.message}`, {
                        source: this.constructor.name,
                        error,
                        details: {
                            reconnectAttempt: this.reconnectAttempts,
                            isConnected: this.isConnected
                        }
                    });

                    if (!this.isConnected && this.reconnectAttempts === 0) {
                        reject(error);
                    }
                });

                this.ws.on('pong', () => {
                    // Alive
                });

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Subscribe to one or more topics.
     */
    public subscribe(topics: string | string[]): void {
        const list = Array.isArray(topics) ? topics : [topics];
        const newTopics: string[] = [];

        for (const t of list) {
            if (!this.subscriptions.has(t)) {
                this.subscriptions.add(t);
                newTopics.push(t);
            }
        }

        if (newTopics.length > 0 && this.isConnected) {
            this.send(this.getSubscribePayload(newTopics));
            console.log(`[${this.constructor.name}] Subscribed to: ${newTopics.join(', ')}`);
        }
    }

    /**
     * Unsubscribe from one or more topics.
     */
    public unsubscribe(topics: string | string[]): void {
        const list = Array.isArray(topics) ? topics : [topics];
        const toRemove: string[] = [];

        for (const t of list) {
            if (this.subscriptions.has(t)) {
                this.subscriptions.delete(t);
                toRemove.push(t);
            }
        }

        if (toRemove.length > 0 && this.isConnected) {
            this.send(this.getUnsubscribePayload(toRemove));
            console.log(`[${this.constructor.name}] Unsubscribed from: ${toRemove.join(', ')}`);
        }
    }

    /**
     * Resends subscription logic for all active subscriptions.
     */
    protected refreshSubscriptions(): void {
        const allTopics = Array.from(this.subscriptions);
        if (allTopics.length > 0) {
            this.send(this.getSubscribePayload(allTopics));
        }
    }

    /**
     * Send payload to WebSocket.
     */
    protected send(payload: any): void {
        if (!this.ws || !this.isConnected) return;
        const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
        this.ws.send(msg);
    }

    /**
     * Disconnect and cleanup.
     */
    public disconnect(): void {
        this.stopPingTimer();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.removeAllListeners(); // Prevent reconnect trigger on manual close
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.subscriptions.clear();
    }

    /**
     * Get current stats.
     */
    public getStats(): WebSocketStats {
        return {
            connected: this.isConnected,
            subscriptions: Array.from(this.subscriptions),
            messageCount: this.messageCount,
            lastUpdate: this.lastUpdate,
            reconnectCount: this.reconnectAttempts
        };
    }

    /**
     * Ping logic.
     */
    private startPingTimer(): void {
        this.stopPingTimer();
        if (!this.config.pingIntervalMs) return;

        this.pingTimer = setInterval(() => {
            if (this.ws && this.isConnected && this.ws.readyState === WebSocket.OPEN) {
                try {
                    this.ws.ping();
                } catch (err: any) {
                    console.warn(`[${this.constructor.name}] Ping failed:`, err.message);
                }
            }
        }, this.config.pingIntervalMs);
    }

    private stopPingTimer(): void {
        if (this.pingTimer) {
            clearInterval(this.pingTimer);
            this.pingTimer = null;
        }
    }

    /**
     * Exponential backoff reconnect.
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;

        const maxAttempts = this.config.maxReconnectAttempts || 10;
        if (this.reconnectAttempts >= maxAttempts) {
            console.warn(`[${this.constructor.name}] Max reconnect attempts (${maxAttempts}) reached. Resetting counter and continuing with max delay.`);

            // Log to database before resetting
            console.warn(`[WebSocket] Max reconnect attempts reached, resetting counter`, {
                source: this.constructor.name,
                details: {
                    maxAttempts,
                    subscriptions: Array.from(this.subscriptions)
                }
            });

            // Don't give up - reset counter but use max delay going forward
            // This ensures perpetual reconnection for 24/7 trading
            this.reconnectAttempts = Math.floor(maxAttempts / 2);  // Reset to half to use longer delays
            this.emit('maxReconnectReached');
        }

        const initialDelay = this.config.initialReconnectIntervalMs || 1000;
        const maxDelay = this.config.maxReconnectIntervalMs || 30000;

        const delay = Math.min(
            initialDelay * Math.pow(2, this.reconnectAttempts),
            maxDelay
        );

        this.reconnectAttempts++;
        console.log(`[${this.constructor.name}] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = null;
            try {
                await this.connect();
            } catch (error: any) {
                console.error(`[${this.constructor.name}] Reconnect failed:`, error.message);
                this.emit('reconnectFailed', { attempt: this.reconnectAttempts, error: error.message });
                this.scheduleReconnect();
            }
        }, delay);
    }
}
