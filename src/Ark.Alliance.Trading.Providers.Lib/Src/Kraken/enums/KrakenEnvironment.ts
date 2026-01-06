/**
 * @fileoverview Kraken Environment Configuration
 * @module Kraken/enums/KrakenEnvironment
 *
 * Defines trading environments for Kraken Futures API.
 */

/**
 * Kraken Futures trading environments.
 */
export enum KrakenEnvironment {
    /** Production environment */
    MAINNET = 'MAINNET',
    /** Demo/sandbox environment */
    TESTNET = 'TESTNET'
}

/** Type alias for KrakenEnvironment values */
export type KrakenEnvironmentType = `${KrakenEnvironment}`;

// ═══════════════════════════════════════════════════════════════════════════════
// Environment URLs
// ═══════════════════════════════════════════════════════════════════════════════

/** Production REST API base URL */
const MAINNET_REST_URL = 'https://futures.kraken.com';

/** Demo/Testnet REST API base URL */
const TESTNET_REST_URL = 'https://demo-futures.kraken.com';

/** Production WebSocket URL */
const MAINNET_WS_URL = 'wss://futures.kraken.com/ws/v1';

/** Demo/Testnet WebSocket URL */
const TESTNET_WS_URL = 'wss://demo-futures.kraken.com/ws/v1';

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if environment is mainnet.
 */
export function isMainnet(env: KrakenEnvironment): boolean {
    return env === KrakenEnvironment.MAINNET;
}

/**
 * Check if environment is testnet.
 */
export function isTestnet(env: KrakenEnvironment): boolean {
    return env === KrakenEnvironment.TESTNET;
}

/**
 * Get REST API base URL for the given environment.
 */
export function getRestBaseUrl(env: KrakenEnvironment): string {
    return env === KrakenEnvironment.MAINNET ? MAINNET_REST_URL : TESTNET_REST_URL;
}

/**
 * Get WebSocket URL for the given environment.
 */
export function getWsUrl(env: KrakenEnvironment): string {
    return env === KrakenEnvironment.MAINNET ? MAINNET_WS_URL : TESTNET_WS_URL;
}
