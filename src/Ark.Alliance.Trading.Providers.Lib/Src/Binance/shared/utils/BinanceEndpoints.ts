/**
 * @fileoverview Binance Endpoint URL Helpers
 * @module Binance/shared/utils/BinanceEndpoints
 *
 * Pure functions for resolving Binance API endpoints by environment.
 * No singleton dependencies - use in service layer to configure clients.
 */

import { BinanceEnvironment } from '../../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// REST API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets the Futures REST API base URL (hostname only).
 *
 * @param environment - Trading environment.
 * @returns Hostname without protocol (e.g., 'fapi.binance.com').
 *
 * @example
 * ```typescript
 * const baseUrl = getFuturesRestBaseUrl(BinanceEnvironment.TESTNET);
 * // Returns: 'testnet.binancefuture.com'
 * ```
 */
export function getFuturesRestBaseUrl(environment: BinanceEnvironment): string {
    return environment === BinanceEnvironment.TESTNET
        ? 'testnet.binancefuture.com'
        : 'fapi.binance.com';
}

/**
 * Gets the Spot REST API base URL (hostname only).
 *
 * @returns Hostname for Spot API.
 *
 * @remarks
 * Spot API only works on mainnet (api.binance.com).
 * Universal Transfer is not available on testnet.
 */
export function getSpotRestBaseUrl(): string {
    return 'api.binance.com';
}

// ═══════════════════════════════════════════════════════════════════════════════
// WebSocket API Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gets the WebSocket API URL for trading operations.
 *
 * @param environment - Trading environment.
 * @returns Full WebSocket URL.
 *
 * @example
 * ```typescript
 * const wsUrl = getWsApiUrl(BinanceEnvironment.MAINNET);
 * // Returns: 'wss://ws-fapi.binance.com/ws-fapi/v1'
 * ```
 */
export function getWsApiUrl(environment: BinanceEnvironment): string {
    return environment === BinanceEnvironment.TESTNET
        ? 'wss://testnet.binancefuture.com/ws-fapi/v1'
        : 'wss://ws-fapi.binance.com/ws-fapi/v1';
}

/**
 * Gets the WebSocket stream URL for market data.
 *
 * @param environment - Trading environment.
 * @returns Full WebSocket stream URL.
 */
export function getMarketDataWsUrl(environment: BinanceEnvironment): string {
    return environment === BinanceEnvironment.TESTNET
        ? 'wss://stream.binancefuture.com/stream'
        : 'wss://fstream.binance.com/stream';
}

/**
 * Gets the User Data Stream WebSocket URL.
 *
 * @param environment - Trading environment.
 * @param listenKey - User's listen key.
 * @returns Full WebSocket URL with listen key.
 */
export function getUserDataStreamUrl(environment: BinanceEnvironment, listenKey: string): string {
    const baseUrl = environment === BinanceEnvironment.TESTNET
        ? 'wss://stream.binancefuture.com/ws/'
        : 'wss://fstream.binance.com/ws/';
    return `${baseUrl}${listenKey}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Combined Endpoint Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete endpoint configuration for a Binance environment.
 */
export interface BinanceEndpointConfig {
    readonly restBaseUrl: string;
    readonly wsApiUrl: string;
    readonly wsStreamUrl: string;
}

/**
 * Gets all endpoint URLs for a given environment.
 *
 * @param environment - Trading environment.
 * @returns Complete endpoint configuration.
 *
 * @example
 * ```typescript
 * const endpoints = getEndpointConfig(BinanceEnvironment.TESTNET);
 * const client = new BinanceRestClient(apiKey, apiSecret, {
 *     baseUrl: endpoints.restBaseUrl
 * });
 * ```
 */
export function getEndpointConfig(environment: BinanceEnvironment): BinanceEndpointConfig {
    return {
        restBaseUrl: getFuturesRestBaseUrl(environment),
        wsApiUrl: getWsApiUrl(environment),
        wsStreamUrl: getMarketDataWsUrl(environment)
    };
}
