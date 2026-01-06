/**
 * @fileoverview Provider Client Interface
 * @module Common/Clients/Base/IProviderClient
 *
 * Defines the common interface for all provider clients (Binance, Deribit, etc.).
 * This abstraction allows the application layer to work with any provider
 * without knowing the implementation details.
 */

import { Result } from '../../result';

/**
 * Supported trading providers.
 */
export enum ProviderType {
    BINANCE = 'BINANCE',
    DERIBIT = 'DERIBIT',
    KRAKEN = 'KRAKEN'
}

/**
 * Provider environment configuration.
 */
export interface ProviderEnvironment {
    /** Whether this is a test/sandbox environment */
    readonly isTestnet: boolean;
    /** Base URL for REST API */
    readonly restBaseUrl: string;
    /** Base URL for WebSocket */
    readonly wsBaseUrl: string;
}

/**
 * Common client statistics.
 */
export interface ClientStats {
    /** Provider type */
    readonly provider: ProviderType;
    /** Whether client is connected */
    readonly isConnected: boolean;
    /** Connection uptime in milliseconds */
    readonly uptimeMs: number;
    /** Number of reconnection attempts */
    readonly reconnectCount: number;
    /** Total messages sent */
    readonly messagesSent: number;
    /** Total messages received */
    readonly messagesReceived: number;
    /** Average latency in milliseconds */
    readonly avgLatencyMs: number;
    /** Last error message if any */
    readonly lastError?: string;
}

/**
 * Provider connection state.
 */
export enum ConnectionState {
    DISCONNECTED = 'DISCONNECTED',
    CONNECTING = 'CONNECTING',
    CONNECTED = 'CONNECTED',
    RECONNECTING = 'RECONNECTING',
    ERROR = 'ERROR'
}

/**
 * Base interface for all provider clients.
 *
 * @remarks
 * All provider-specific clients (Binance, Deribit) must implement this interface
 * to ensure consistent behavior and allow the service layer to work with any provider.
 *
 * @example
 * ```typescript
 * class BinanceMarketDataClient implements IProviderClient {
 *     readonly provider = ProviderType.BINANCE;
 *     // ... implementation
 * }
 * ```
 */
export interface IProviderClient {
    /**
     * The provider type this client belongs to.
     */
    readonly provider: ProviderType;

    /**
     * The current environment (testnet or mainnet).
     */
    readonly environment: ProviderEnvironment;

    /**
     * Establishes connection to the provider.
     *
     * @returns Result indicating success or failure with error details.
     */
    connect(): Promise<Result<void>>;

    /**
     * Gracefully disconnects from the provider.
     *
     * @returns Result indicating success or failure with error details.
     */
    disconnect(): Promise<Result<void>>;

    /**
     * Checks if the client is currently connected.
     *
     * @returns True if connected and ready for operations.
     */
    isConnected(): boolean;

    /**
     * Gets the current connection state.
     *
     * @returns Current connection state.
     */
    getConnectionState(): ConnectionState;

    /**
     * Gets client statistics.
     *
     * @returns Current client statistics.
     */
    getStats(): ClientStats;
}

/**
 * Interface for clients that support real-time subscriptions.
 */
export interface ISubscribableClient extends IProviderClient {
    /**
     * Subscribe to a channel/topic.
     *
     * @param channel - The channel identifier to subscribe to.
     * @returns Result indicating success or failure.
     */
    subscribe(channel: string): Promise<Result<void>>;

    /**
     * Unsubscribe from a channel/topic.
     *
     * @param channel - The channel identifier to unsubscribe from.
     * @returns Result indicating success or failure.
     */
    unsubscribe(channel: string): Promise<Result<void>>;

    /**
     * Get list of current subscriptions.
     *
     * @returns Array of subscribed channel identifiers.
     */
    getSubscriptions(): string[];
}
