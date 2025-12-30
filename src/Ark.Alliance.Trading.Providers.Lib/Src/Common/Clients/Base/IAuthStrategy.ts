/**
 * @fileoverview Authentication Strategy Interface
 * @module Common/Clients/Base/IAuthStrategy
 *
 * Defines a pluggable authentication strategy interface that allows
 * different providers to implement their own authentication mechanisms
 * (HMAC signatures for Binance, OAuth tokens for Deribit, etc.).
 */

import { Result } from '../../result';

/**
 * Authentication credentials returned by the strategy.
 */
export interface AuthCredentials {
    /** Access token or signature */
    readonly token: string;
    /** Token type (e.g., 'bearer', 'hmac') */
    readonly tokenType: string;
    /** Expiration timestamp in milliseconds (0 for non-expiring) */
    readonly expiresAt: number;
    /** Scopes/permissions granted (optional) */
    readonly scopes?: string[];
    /** Refresh token for token-based auth (optional) */
    readonly refreshToken?: string;
}

/**
 * Request object that can be authenticated.
 */
export interface AuthenticatableRequest {
    /** HTTP method or WebSocket method name */
    readonly method: string;
    /** Request path or endpoint */
    readonly path: string;
    /** Request parameters */
    readonly params?: Record<string, unknown>;
    /** Request headers */
    readonly headers?: Record<string, string>;
    /** Request timestamp */
    readonly timestamp: number;
}

/**
 * Authenticated request with credentials applied.
 */
export interface AuthenticatedRequest extends AuthenticatableRequest {
    /** Authentication headers added */
    readonly authHeaders: Record<string, string>;
    /** Signature if applicable */
    readonly signature?: string;
}

/**
 * Authentication strategy interface.
 *
 * @remarks
 * This interface abstracts the authentication mechanism, allowing:
 * - Binance: HMAC-SHA256 signature per request
 * - Deribit: OAuth2 access/refresh tokens
 * - Future providers: Any other auth mechanism
 *
 * @example
 * ```typescript
 * // Binance implementation
 * class BinanceAuthStrategy implements IAuthStrategy {
 *     async authenticate(): Promise<Result<AuthCredentials>> {
 *         // No pre-auth needed, signature generated per request
 *         return successResult({ token: '', tokenType: 'hmac', expiresAt: 0 });
 *     }
 *
 *     applyToRequest(request: AuthenticatableRequest): AuthenticatedRequest {
 *         const signature = this.generateHmacSignature(request);
 *         return { ...request, authHeaders: { 'X-MBX-APIKEY': this.apiKey }, signature };
 *     }
 * }
 *
 * // Deribit implementation
 * class DeribitAuthStrategy implements IAuthStrategy {
 *     async authenticate(): Promise<Result<AuthCredentials>> {
 *         // Call public/auth to get access token
 *         const response = await this.client.call('public/auth', {...});
 *         return successResult({
 *             token: response.access_token,
 *             tokenType: 'bearer',
 *             expiresAt: Date.now() + response.expires_in * 1000,
 *             refreshToken: response.refresh_token
 *         });
 *     }
 * }
 * ```
 */
export interface IAuthStrategy {
    /**
     * Whether this strategy requires pre-authentication.
     *
     * @remarks
     * - Binance: false (signature per request)
     * - Deribit: true (needs access token)
     */
    readonly requiresPreAuth: boolean;

    /**
     * Authenticate and obtain credentials.
     *
     * @remarks
     * For signature-based auth (Binance), this may be a no-op.
     * For token-based auth (Deribit), this obtains the access token.
     *
     * @returns Result with credentials or error.
     */
    authenticate(): Promise<Result<AuthCredentials>>;

    /**
     * Refresh credentials if needed.
     *
     * @remarks
     * Called periodically to ensure credentials remain valid.
     * For signature-based auth, this is a no-op.
     * For token-based auth, this refreshes the access token.
     *
     * @returns Result with fresh credentials or error.
     */
    refreshIfNeeded(): Promise<Result<AuthCredentials>>;

    /**
     * Apply authentication to a request.
     *
     * @param request - The request to authenticate.
     * @returns The authenticated request with credentials applied.
     */
    applyToRequest(request: AuthenticatableRequest): AuthenticatedRequest;

    /**
     * Check if current credentials are valid.
     *
     * @returns True if credentials are valid and not expired.
     */
    isValid(): boolean;

    /**
     * Get current credentials if available.
     *
     * @returns Current credentials or undefined if not authenticated.
     */
    getCredentials(): AuthCredentials | undefined;

    /**
     * Invalidate current credentials.
     *
     * @remarks
     * Forces re-authentication on next operation.
     */
    invalidate(): void;
}
