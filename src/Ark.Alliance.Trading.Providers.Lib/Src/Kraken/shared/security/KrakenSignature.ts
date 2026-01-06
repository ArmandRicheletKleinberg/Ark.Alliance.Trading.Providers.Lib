/**
 * @fileoverview Kraken API Signature Generator
 * @module Kraken/shared/security/KrakenSignature
 *
 * HMAC-SHA-512 signature generator for Kraken Futures API authentication.
 * 
 * @remarks
 * Kraken Futures authentication flow:
 * 1. Concatenate: postData + nonce + endpointPath
 * 2. SHA-256 hash the concatenation
 * 3. Base64-decode the API secret
 * 4. HMAC-SHA-512 using decoded secret as key
 * 5. Base64-encode the result -> Authent header
 */

import * as crypto from 'crypto';

/**
 * Kraken Futures API signature generator.
 * 
 * @example
 * ```typescript
 * const signer = new KrakenSignatureGenerator(apiSecret);
 * const authent = signer.generateSignature(postData, nonce, endpointPath);
 * ```
 */
export class KrakenSignatureGenerator {
    private readonly decodedSecret: Buffer;

    constructor(apiSecret: string) {
        // Base64-decode the API secret
        this.decodedSecret = Buffer.from(apiSecret, 'base64');
    }

    /**
     * Generate the Authent header value for authenticated requests.
     * 
     * @param postData - URL-encoded request body (or empty string for GET)
     * @param nonce - Unique incrementing nonce (typically timestamp in ms)
     * @param endpointPath - API endpoint path (e.g., '/derivatives/api/v3/sendorder')
     * @returns Base64-encoded HMAC-SHA-512 signature
     */
    generateSignature(postData: string, nonce: string, endpointPath: string): string {
        // Step 1: Concatenate postData + nonce + endpointPath
        const message = postData + nonce + endpointPath;

        // Step 2: SHA-256 hash the message
        const sha256Hash = crypto.createHash('sha256').update(message).digest();

        // Step 3 & 4: HMAC-SHA-512 using decoded secret
        const hmac = crypto.createHmac('sha512', this.decodedSecret);
        hmac.update(sha256Hash);

        // Step 5: Base64-encode the result
        return hmac.digest('base64');
    }

    /**
     * Generate authentication headers for a request.
     * 
     * @param apiKey - Kraken API key
     * @param postData - URL-encoded request body
     * @param endpointPath - Full endpoint path
     * @returns Headers object with APIKey, Authent, and Nonce
     */
    generateAuthHeaders(
        apiKey: string,
        postData: string,
        endpointPath: string
    ): { APIKey: string; Authent: string; Nonce: string } {
        const nonce = Date.now().toString();
        const authent = this.generateSignature(postData, nonce, endpointPath);

        return {
            APIKey: apiKey,
            Authent: authent,
            Nonce: nonce
        };
    }
}

/**
 * Generate a WebSocket authentication signature for private feeds.
 * 
 * @param apiSecret - Base64-encoded API secret
 * @param challenge - Challenge string from WebSocket
 * @returns Base64-encoded signature
 */
export function generateWsAuthSignature(apiSecret: string, challenge: string): string {
    const decodedSecret = Buffer.from(apiSecret, 'base64');

    // SHA-256 hash the challenge
    const sha256Hash = crypto.createHash('sha256').update(challenge).digest();

    // HMAC-SHA-512 with decoded secret
    const hmac = crypto.createHmac('sha512', decodedSecret);
    hmac.update(sha256Hash);

    return hmac.digest('base64');
}

/**
 * Generate a nonce for API requests.
 * Uses current timestamp in milliseconds.
 */
export function generateNonce(): string {
    return Date.now().toString();
}
