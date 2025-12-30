/**
 * @fileoverview HMAC Signature Generator for Binance API
 * @module helpers/security/HmacSignatureGenerator
 */

import * as crypto from 'crypto';

/**
 * HMAC-SHA256 signature generator for Binance API authentication
 */
export class HmacSignatureGenerator {
    private apiSecret: string;

    constructor(apiSecret: string) {
        this.apiSecret = apiSecret;
    }

    /**
     * Generate HMAC-SHA256 signature
     * @param params - Request parameters object
     * @returns Hexadecimal signature string
     */
    generateSignature(params: Record<string, any>): string {
        // Sort keys alphabetically and create query string
        const queryString = Object.keys(params)
            .sort()
            .map(key => `${key}=${params[key]}`)
            .join('&');

        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');
    }

    /**
     * Generate signature from query string
     * @param queryString - Pre-formatted query string
     * @returns Hexadecimal signature string
     */
    generateSignatureFromString(queryString: string): string {
        return crypto
            .createHmac('sha256', this.apiSecret)
            .update(queryString)
            .digest('hex');
    }

    /**
     * Sign request parameters and add signature
     * @param params - Request parameters
     * @returns Parameters with signature added
     */
    signParams<T extends Record<string, any>>(params: T): T & { signature: string } {
        const signature = this.generateSignature(params);
        return {
            ...params,
            signature
        };
    }
    /**
     * Generate fully formed query string with signature
     * Ensure parameters are sorted alphabetically as required by Binance
     */
    getSignedQueryString(params: Record<string, any>): string {
        // Sort keys alphabetically
        const keys = Object.keys(params).sort();

        // Build query string
        const queryString = keys
            .map(key => `${key}=${params[key]}`)
            .join('&');

        // Generate signature
        const signature = this.generateSignatureFromString(queryString);

        // Return full string with signature appended
        return `${queryString}&signature=${signature}`;
    }
}
