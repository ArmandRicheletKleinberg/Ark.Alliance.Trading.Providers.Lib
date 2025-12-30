/**
 * @fileoverview Client Configuration Interfaces
 * @module clients/Base/BaseModels/_ClientConfig
 *
 * Defines configuration interfaces for Binance REST and WebSocket clients.
 * Enables constructor injection for DDD compliance and testability.
 */

import { BinanceRateLimit } from '../../../dtos/binance/RateLimits';

// ═══════════════════════════════════════════════════════════════════════════════
// REST Client Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for public REST clients (no authentication).
 */
export interface RestClientConfig {
    /** Request timeout in milliseconds (default: 30000) */
    timeoutMs?: number;

    /** Maximum retry attempts (default: 3) */
    maxRetries?: number;

    /** Delay between retries in milliseconds (default: 1000) */
    retryDelayMs?: number;

    /** Track request latency (default: true) */
    trackLatency?: boolean;

    /** Track rate limits from response headers (default: true) */
    trackRateLimits?: boolean;
}

/**
 * Configuration for signed REST clients (requires API key/secret).
 */
export interface SignedRestClientConfig extends RestClientConfig {
    /** Base URL hostname (e.g., 'fapi.binance.com') */
    baseUrl: string;

    /** Callback invoked when rate limit headers are parsed */
    onRateLimitUpdate?: (rateLimits: BinanceRateLimit[]) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket Client Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for WebSocket clients.
 */
export interface WebSocketClientConfig {
    /** WebSocket URL (e.g., 'wss://ws-fapi.binance.com/ws-fapi/v1') */
    wsUrl: string;

    /** Maximum reconnect attempts (default: 5) */
    maxReconnectAttempts?: number;

    /** Delay between reconnect attempts in milliseconds (default: 5000) */
    reconnectDelayMs?: number;

    /** Callback invoked when rate limit headers are parsed */
    onRateLimitUpdate?: (rateLimits: BinanceRateLimit[]) => void;
}

/**
 * Configuration for User Data Stream clients.
 */
export interface UserDataStreamConfig {
    /** REST base URL for listenKey management (e.g., 'fapi.binance.com') */
    restBaseUrl: string;

    /** WebSocket stream URL (e.g., 'wss://fstream.binance.com/ws/') */
    wsStreamUrl: string;

    /** Listen key keepalive interval in milliseconds (default: 1800000 = 30 min) */
    keepaliveIntervalMs?: number;

    /** Maximum reconnect attempts (default: 5) */
    maxReconnectAttempts?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Market Data Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for market data REST clients.
 */
export interface MarketDataRestConfig extends RestClientConfig {
    /** Base URL hostname (e.g., 'fapi.binance.com') */
    baseUrl: string;
}

/**
 * Configuration for market data WebSocket streams.
 */
export interface MarketDataWsConfig {
    /** WebSocket stream base URL (e.g., 'wss://fstream.binance.com/stream') */
    wsStreamUrl: string;

    /** Maximum reconnect attempts (default: 5) */
    maxReconnectAttempts?: number;

    /** Delay between reconnect attempts in milliseconds (default: 5000) */
    reconnectDelayMs?: number;
}
