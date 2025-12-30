/**
 * @fileoverview Binance Environment Enumeration
 * @module enums/BinanceEnvironment
 *
 * Defines the trading environment (mainnet vs testnet).
 *
 * @remarks
 * Environment determines which API endpoints and URLs are used.
 * Some features like Universal Transfer are only available on mainnet.
 */

/**
 * Binance environment enumeration.
 *
 * @enum {string}
 */
export enum BinanceEnvironment {
    /**
     * Production mainnet environment.
     * Uses real funds and live trading.
     */
    MAINNET = 'MAINNET',

    /**
     * Testnet environment for development and testing.
     * Uses paper trading funds.
     */
    TESTNET = 'TESTNET'
}

/**
 * Type alias for environment string literals.
 * @deprecated Use BinanceEnvironment enum instead.
 */
export type BinanceEnvironmentType = 'MAINNET' | 'TESTNET';

/**
 * Checks if the environment is mainnet.
 *
 * @param env - The environment to check.
 * @returns True if mainnet.
 */
export function isMainnet(env: BinanceEnvironment): boolean {
    return env === BinanceEnvironment.MAINNET;
}

/**
 * Checks if the environment is testnet.
 *
 * @param env - The environment to check.
 * @returns True if testnet.
 */
export function isTestnet(env: BinanceEnvironment): boolean {
    return env === BinanceEnvironment.TESTNET;
}
