/**
 * Statistics for the WebSocket Client connection.
 */
export interface WebSocketStats {
    /**
     * Whether the client is currently connected.
     */
    connected: boolean;

    /**
     * List of active subscriptions (topics/symbols).
     */
    subscriptions: string[];

    /**
     * Total number of messages received since connection/start.
     */
    messageCount: number;

    /**
     * Timestamp of the last message received.
     */
    lastUpdate: Date | null;

    /**
     * Number of reconnection attempts made in the current cycle.
     */
    reconnectCount: number;
}
