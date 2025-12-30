/**
 * Configuration for the Base WebSocket Client.
 */
export interface WebSocketClientConfig {
    /**
     * Maximum number of reconnection attempts before giving up.
     * @default 10
     */
    maxReconnectAttempts?: number;

    /**
     * Initial reconnection interval in milliseconds.
     * @default 1000
     */
    initialReconnectIntervalMs?: number;

    /**
     * Maximum reconnection interval in milliseconds (cap).
     * @default 30000
     */
    maxReconnectIntervalMs?: number;

    /**
     * Interval for sending ping frames in milliseconds.
     * @default 30000
     */
    pingIntervalMs?: number;
}
