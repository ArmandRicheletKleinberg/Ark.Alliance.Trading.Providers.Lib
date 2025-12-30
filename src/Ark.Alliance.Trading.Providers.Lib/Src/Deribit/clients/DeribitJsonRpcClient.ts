/**
 * @fileoverview Deribit JSON-RPC Client
 * @module Deribit/clients/DeribitJsonRpcClient
 *
 * Core JSON-RPC client for Deribit API.
 * Extends BaseJsonRpcClient with Deribit-specific functionality.
 */

import {
    BaseJsonRpcClient,
    JsonRpcClientConfig,
    ProviderType,
    ProviderEnvironment
} from '../../Common/Clients/Base';
import { Result } from '../../Common/result';
import {
    DeribitEnvironment,
    getWsUrl,
    getRestBaseUrl,
    GrantType
} from '../enums';
import { AuthResponse } from '../dtos';
import { TOKEN_REFRESH_BUFFER_MS } from '../shared';

/**
 * Deribit client configuration.
 */
export interface DeribitClientConfig extends JsonRpcClientConfig {
    /** API credentials */
    credentials: {
        clientId: string;
        clientSecret: string;
    };
    /** Trading environment */
    environment: DeribitEnvironment;
    /** OAuth scopes to request */
    scopes?: string[];
    /** Enable cancel-on-disconnect */
    cancelOnDisconnect?: boolean;
}

/**
 * Deribit JSON-RPC client implementation.
 *
 * @remarks
 * Provides core JSON-RPC functionality for Deribit API including:
 * - OAuth2 authentication with automatic token refresh
 * - Connection management
 * - Request/response handling
 * - Subscription support
 *
 * @example
 * ```typescript
 * const client = new DeribitJsonRpcClient({
 *     credentials: { clientId: '...', clientSecret: '...' },
 *     environment: DeribitEnvironment.TESTNET,
 *     debug: true
 * });
 *
 * await client.connect();
 * const result = await client.call('public/get_instruments', { currency: 'BTC' });
 * ```
 */
export class DeribitJsonRpcClient extends BaseJsonRpcClient {
    readonly provider = ProviderType.DERIBIT;
    readonly environment: ProviderEnvironment;

    private deribitConfig: DeribitClientConfig;
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private tokenExpiresAt: number = 0;
    private refreshTimer: NodeJS.Timeout | null = null;

    constructor(config: DeribitClientConfig) {
        super(config);
        this.deribitConfig = config;
        this.environment = {
            isTestnet: config.environment === DeribitEnvironment.TESTNET,
            restBaseUrl: getRestBaseUrl(config.environment),
            wsBaseUrl: getWsUrl(config.environment)
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Abstract Implementations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get WebSocket URL for connection.
     */
    protected getWebSocketUrl(): string {
        return getWsUrl(this.deribitConfig.environment);
    }

    /**
     * Authenticate after connection.
     * 
     * @remarks
     * For public API access (market data), skip authentication
     * if credentials are empty. This allows unauthenticated
     * access to public endpoints.
     */
    protected async onAuthenticate(): Promise<Result<void>> {
        const { clientId, clientSecret } = this.deribitConfig.credentials;

        // Skip authentication for public access (empty credentials)
        if (!clientId && !clientSecret) {
            this.log('Skipping authentication (public access mode)');
            return Result.Success;
        }

        return this.authenticate();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Authentication
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Authenticate with Deribit using client credentials.
     */
    async authenticate(): Promise<Result<void>> {
        const { clientId, clientSecret } = this.deribitConfig.credentials;

        const result = await this.call<AuthResponse>('public/auth', {
            grant_type: GrantType.CLIENT_CREDENTIALS,
            client_id: clientId,
            client_secret: clientSecret,
            scope: this.deribitConfig.scopes?.join(' ')
        });

        if (!result.success || !result.data) {
            return Result.Failure.withReason(`Authentication failed: ${result.reason}`);
        }

        this.setTokens(result.data);
        this.scheduleTokenRefresh();

        // Enable cancel-on-disconnect if configured
        if (this.deribitConfig.cancelOnDisconnect) {
            await this.enableCancelOnDisconnect();
        }

        this.log('Authenticated successfully');
        return Result.Success;
    }

    /**
     * Refresh the access token.
     */
    async refreshAccessToken(): Promise<Result<void>> {
        if (!this.refreshToken) {
            return Result.Failure.withReason('No refresh token available');
        }

        const result = await this.call<AuthResponse>('public/auth', {
            grant_type: GrantType.REFRESH_TOKEN,
            refresh_token: this.refreshToken
        });

        if (!result.success || !result.data) {
            // Token refresh failed, try full re-authentication
            this.log('Token refresh failed, attempting full re-auth');
            return this.authenticate();
        }

        this.setTokens(result.data);
        this.scheduleTokenRefresh();

        this.log('Token refreshed successfully');
        return Result.Success;
    }

    /**
     * Set tokens from auth response.
     */
    private setTokens(response: AuthResponse): void {
        this.accessToken = response.access_token;
        this.refreshToken = response.refresh_token;
        this.tokenExpiresAt = Date.now() + response.expires_in * 1000;
    }

    /**
     * Schedule proactive token refresh.
     */
    private scheduleTokenRefresh(): void {
        this.clearRefreshTimer();

        const refreshDelay = this.tokenExpiresAt - Date.now() - TOKEN_REFRESH_BUFFER_MS;
        if (refreshDelay > 0) {
            this.refreshTimer = setTimeout(async () => {
                await this.refreshAccessToken();
            }, refreshDelay);

            this.log(`Token refresh scheduled in ${Math.round(refreshDelay / 1000)}s`);
        }
    }

    /**
     * Clear token refresh timer.
     */
    private clearRefreshTimer(): void {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    /**
     * Get current access token.
     */
    getAccessToken(): string | null {
        return this.accessToken;
    }

    /**
     * Check if token is valid (not expired).
     */
    isTokenValid(): boolean {
        return this.accessToken !== null && Date.now() < this.tokenExpiresAt;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Connection Management
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Enable cancel-on-disconnect.
     */
    async enableCancelOnDisconnect(): Promise<Result<void>> {
        const result = await this.call<{ enabled: boolean }>(
            'private/enable_cancel_on_disconnect',
            {}
        );

        if (result.success && result.data?.enabled) {
            this.log('Cancel-on-disconnect enabled');
        }

        return result.success ? Result.Success : Result.Failure.withReason(result.reason || 'Failed');
    }

    /**
     * Disable cancel-on-disconnect.
     */
    async disableCancelOnDisconnect(): Promise<Result<void>> {
        const result = await this.call<{ disabled: boolean }>(
            'private/disable_cancel_on_disconnect',
            {}
        );

        if (result.success && result.data?.disabled) {
            this.log('Cancel-on-disconnect disabled');
        }

        return result.success ? Result.Success : Result.Failure.withReason(result.reason || 'Failed');
    }

    /**
     * Set heartbeat interval.
     */
    async setHeartbeat(intervalSeconds: number = 30): Promise<Result<void>> {
        const result = await this.call<{ ok: string }>(
            'public/set_heartbeat',
            { interval: intervalSeconds }
        );

        return result.success ? Result.Success : Result.Failure.withReason(result.reason || 'Failed');
    }

    /**
     * Override disconnect to clean up Deribit-specific resources.
     */
    async disconnect(): Promise<Result<void>> {
        this.clearRefreshTimer();
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = 0;

        return super.disconnect();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Public API Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get server time.
     */
    async getTime(): Promise<Result<number>> {
        return this.call<number>('public/get_time', {});
    }

    /**
     * Test connection.
     */
    async test(): Promise<Result<{ version: string }>> {
        return this.call<{ version: string }>('public/test', {});
    }

    /**
     * Logout / invalidate session.
     */
    async logout(): Promise<Result<void>> {
        const result = await this.call<void>('private/logout', {});
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiresAt = 0;
        return result.success ? Result.Success : Result.Failure.withReason(result.reason || 'Failed');
    }
}
