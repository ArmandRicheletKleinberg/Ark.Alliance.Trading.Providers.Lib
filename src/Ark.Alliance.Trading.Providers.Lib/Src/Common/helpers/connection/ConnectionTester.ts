/**
 * @fileoverview Connection Tester for Binance API
 * @module helpers/connection/ConnectionTester
 *
 * @remarks
 * Provides connection verification utilities for Binance API.
 * Tests API connectivity and credential validity.
 */

import { BinanceEnvironment } from '../../../Binance/enums/BinanceEnvironment';
import { BinanceRestClient } from '../../../Binance/clients/BinanceRestClient';
import { SignedRestClientConfig } from '../../../Binance/clients/Base/types/ClientConfig';

export interface ConnectionTestResult {
    success: boolean;
    message: string;
    details?: {
        canPing: boolean;
        canGetServerTime: boolean;
        canGetAccount: boolean;
        timestamp: number;
        latency?: number;
    };
    error?: string;
}

/** API URLs by environment */
const BINANCE_FAPI_URLS: Record<BinanceEnvironment, string> = {
    [BinanceEnvironment.TESTNET]: 'https://testnet.binancefuture.com',
    [BinanceEnvironment.MAINNET]: 'https://fapi.binance.com'
};

/**
 * Connection Tester - validates Binance API credentials
 *
 * @example
 * ```typescript
 * const result = await ConnectionTester.testConnection(
 *     'your-api-key',
 *     'your-api-secret',
 *     BinanceEnvironment.TESTNET
 * );
 *
 * if (result.success) {
 *     console.log('Connection successful!');
 * }
 * ```
 */
export class ConnectionTester {
    /**
     * Test connection to Binance API with provided credentials.
     *
     * @param apiKey - Binance API key
     * @param apiSecret - Binance API secret
     * @param environment - Trading environment
     * @returns Connection test result
     */
    static async testConnection(
        apiKey: string,
        apiSecret: string,
        environment: BinanceEnvironment
    ): Promise<ConnectionTestResult> {
        const baseUrl = BINANCE_FAPI_URLS[environment];
        const config: SignedRestClientConfig = { baseUrl };

        const client = new BinanceRestClient(apiKey, apiSecret, config);
        const startTime = Date.now();

        const details = {
            canPing: false,
            canGetServerTime: false,
            canGetAccount: false,
            timestamp: startTime,
            latency: undefined as number | undefined
        };

        try {
            // Test 1: Ping
            const pingResult = await client.ping();
            details.canPing = pingResult.isSuccess;

            if (!pingResult.isSuccess) {
                return {
                    success: false,
                    message: 'Failed to ping Binance API',
                    details,
                    error: pingResult.error?.message
                };
            }

            // Test 2: Server Time
            const timeResult = await client.getServerTime();
            details.canGetServerTime = timeResult.isSuccess;

            if (!timeResult.isSuccess) {
                return {
                    success: false,
                    message: 'Failed to get server time',
                    details,
                    error: timeResult.error?.message
                };
            }

            // Test 3: Account Info (requires valid credentials)
            const accountResult = await client.getAccount();
            details.canGetAccount = accountResult.isSuccess;
            details.latency = Date.now() - startTime;

            if (!accountResult.isSuccess) {
                return {
                    success: false,
                    message: 'API connection works but credentials may be invalid',
                    details,
                    error: accountResult.error?.message
                };
            }

            return {
                success: true,
                message: 'Connection successful - all tests passed',
                details
            };

        } catch (error) {
            details.latency = Date.now() - startTime;
            return {
                success: false,
                message: 'Connection test failed with exception',
                details,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Quick ping test (no authentication required).
     *
     * @param environment - Binance environment
     * @returns True if ping successful
     */
    static async quickPing(environment: BinanceEnvironment): Promise<boolean> {
        const baseUrl = BINANCE_FAPI_URLS[environment];

        // Use minimal credentials for ping (no auth needed for public endpoints)
        const client = new BinanceRestClient('', '', { baseUrl });

        const result = await client.ping();
        return result.isSuccess;
    }

    /**
     * Get base URL for environment.
     *
     * @param environment - Binance environment
     * @returns API base URL
     */
    static getBaseUrl(environment: BinanceEnvironment): string {
        return BINANCE_FAPI_URLS[environment];
    }
}
