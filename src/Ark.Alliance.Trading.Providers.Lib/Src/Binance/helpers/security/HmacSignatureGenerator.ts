/**
 * @fileoverview HMAC Signature Generator for Binance API Authentication
 * @module Binance/helpers/security/HmacSignatureGenerator
 *
 * Provides HMAC-SHA256 signature generation for Binance API requests.
 *
 * @remarks
 * This is Binance-specific authentication logic.
 * All signed endpoints require this signature.
 *
 * @example
 * ```typescript
 * const signer = new HmacSignatureGenerator(apiSecret);
 * const signedParams = signer.signParams({ symbol: 'BTCUSDT', timestamp: Date.now() });
 * ```
 */

import * as crypto from 'crypto';
import { LoggingService, LogLevel } from '../../../Common/helpers/logging';

/**
 * HMAC-SHA256 signature generator for Binance API authentication.
 *
 * @remarks
 * Required for all signed endpoints (orders, account info, etc.)
 */
export class HmacSignatureGenerator {
    /** API secret key for signature generation. */
    private readonly apiSecret: string;

    /** Logger instance. */
    private readonly logger: LoggingService;

    /**
     * Creates a new HmacSignatureGenerator instance.
     *
     * @param apiSecret - Binance API secret key.
     * @param logger - Optional logger instance.
     */
    constructor(apiSecret: string, logger?: LoggingService) {
        if (!apiSecret || apiSecret.length === 0) {
            throw new Error('API secret is required for signature generation');
        }
        this.apiSecret = apiSecret;
        this.logger = logger ?? new LoggingService(
            { minLevel: LogLevel.DEBUG },
            'HmacSignatureGenerator'
        );
    }

    /**
     * Generates HMAC-SHA256 signature from parameters.
     *
     * @param params - Request parameters object.
     * @returns Hexadecimal signature string.
     */
    public generateSignature(params: Record<string, unknown>): string {
        const queryString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        return this.generateSignatureFromString(queryString);
    }

    /**
     * Generates signature from pre-formatted query string.
     *
     * @param queryString - Pre-formatted query string.
     * @returns Hexadecimal signature string.
     */
    public generateSignatureFromString(queryString: string): string {
        try {
            return crypto
                .createHmac('sha256', this.apiSecret)
                .update(queryString)
                .digest('hex');
        } catch (error) {
            this.logger.error('Failed to generate signature', error);
            throw error;
        }
    }

    /**
     * Signs request parameters and adds signature field.
     *
     * @param params - Request parameters.
     * @returns Parameters with signature added.
     */
    public signParams<T extends Record<string, unknown>>(params: T): T & { signature: string } {
        const signature = this.generateSignature(params);
        this.logger.trace('Signed parameters', { paramCount: Object.keys(params).length });

        return {
            ...params,
            signature
        };
    }

    /**
     * Generates fully formed query string with signature.
     *
     * @param params - Request parameters.
     * @returns Complete query string with signature appended.
     *
     * @remarks
     * Parameters are sorted alphabetically as required by Binance.
     */
    public getSignedQueryString(params: Record<string, unknown>): string {
        const keys = Object.keys(params).sort();
        const queryString = keys
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const signature = this.generateSignatureFromString(queryString);
        return `${queryString}&signature=${signature}`;
    }
}
