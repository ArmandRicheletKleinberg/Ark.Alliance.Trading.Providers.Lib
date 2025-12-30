/**
 * @fileoverview Deribit Environment Enum
 * @module Deribit/enums/DeribitEnvironment
 *
 * Defines the trading environments for Deribit API.
 */

/**
 * Deribit trading environment.
 */
export enum DeribitEnvironment {
    /**
     * Production environment (www.deribit.com).
     * Real trading with real funds.
     */
    MAINNET = 'MAINNET',

    /**
     * Test environment (test.deribit.com).
     * Paper trading with test funds.
     */
    TESTNET = 'TESTNET'
}

/**
 * Type alias for environment values.
 */
export type DeribitEnvironmentType = `${DeribitEnvironment}`;

/**
 * Check if environment is mainnet.
 */
export function isMainnet(env: DeribitEnvironment): boolean {
    return env === DeribitEnvironment.MAINNET;
}

/**
 * Check if environment is testnet.
 */
export function isTestnet(env: DeribitEnvironment): boolean {
    return env === DeribitEnvironment.TESTNET;
}

/**
 * Get REST API base URL for environment.
 */
export function getRestBaseUrl(env: DeribitEnvironment): string {
    return env === DeribitEnvironment.MAINNET
        ? 'https://www.deribit.com/api/v2'
        : 'https://test.deribit.com/api/v2';
}

/**
 * Get WebSocket URL for environment.
 */
export function getWsUrl(env: DeribitEnvironment): string {
    return env === DeribitEnvironment.MAINNET
        ? 'wss://www.deribit.com/ws/api/v2'
        : 'wss://test.deribit.com/ws/api/v2';
}
