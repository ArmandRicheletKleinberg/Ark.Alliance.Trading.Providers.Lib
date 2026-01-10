/**
 * @fileoverview DeribitAccountService Implementation
 * @module Deribit/services/DeribitAccountService
 *
 * Implements IAccountService for Deribit exchange.
 * Uses DeribitUserDataClient for account operations and real-time updates.
 */

import { EventEmitter } from 'events';
import { Result } from '../../Common/result';
import { BaseService, ServiceConfig } from '../../Common/services';
import { IAccountService, SetLeverageParams, SetMarginTypeParams } from '../../Services/IAccountService';
import { IAccount, IAccountBalance, IAccountUpdate } from '../../Common/Domain';
import { ProviderType } from '../../Common/Clients/Base';
import { DeribitJsonRpcClient, DeribitUserDataClient } from '../clients';
import { DeribitEnvironment, getWsUrl, getRestBaseUrl } from '../enums';
import { DeribitAccountSummary } from '../dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deribit account service configuration.
 */
export interface DeribitAccountServiceConfig {
    /**
     * Client ID (API key).
     */
    clientId: string;

    /**
     * Client secret.
     */
    clientSecret: string;

    /**
     * Environment (MAINNET or TESTNET).
     */
    environment: DeribitEnvironment;

    /**
     * Instance key for multi-user support.
     */
    instanceKey?: string;

    /**
     * Enable debug logging.
     */
    debug?: boolean;

    /**
     * Cache TTL in milliseconds (default: 5000ms).
     */
    cacheTtlMs?: number;

    /**
     * OAuth scopes.
     */
    scopes?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Keys
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_KEYS = {
    ACCOUNT: 'account',
    BALANCES: 'balances',
    LEVERAGE: 'leverage',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deribit Account Service.
 *
 * @remarks
 * Extends BaseService to leverage:
 * - ConcurrentCache for account/balance/leverage data caching
 * - Lifecycle management (start/stop/restart)
 * - Context-aware logging
 * - Event system for real-time updates
 *
 * @example
 * ```typescript
 * const service = new Deribit AccountService({
 *     clientId: 'your-client-id',
 *     clientSecret: 'your-secret',
 *     environment: DeribitEnvironment.TESTNET
 * });
 *
 * await service.connect();
 * const accountResult = await service.getAccount('BTC');
 * ```
 */
export class DeribitAccountService extends BaseService implements IAccountService {
    readonly provider = ProviderType.DERIBIT;

    private readonly accountConfig: DeribitAccountServiceConfig;
    private rpcClient: DeribitJsonRpcClient | null = null;
    private userDataClient: DeribitUserDataClient | null = null;
    private readonly cacheTtlMs: number;

    /**
     * Creates a new DeribitAccountService.
     */
    constructor(config: DeribitAccountServiceConfig) {
        const instanceKey = config.instanceKey || `deribit-account-${Date.now()}`;
        const serviceConfig: ServiceConfig = {
            instanceKey,
            autoRecover: true,
            maxRecoveryAttempts: 3,
            recoveryDelayMs: 5000,
        };

        super(serviceConfig, undefined, {
            name: `${instanceKey}-cache`,
            defaultTtlMs: config.cacheTtlMs ?? 5000,
            maxEntries: 100,
        });

        this.accountConfig = config;
        this.cacheTtlMs = config.cacheTtlMs ?? 5000;
    }

    /**
     * Whether the service is connected.
     */
    get isConnected(): boolean {
        return this.isRunning();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // BaseService Lifecycle Implementation
    // ═══════════════════════════════════════════════════════════════════════════════

    protected async onStart(): Promise<void> {
        const wsUrl = getWsUrl(this.accountConfig.environment);
        const restBaseUrl = getRestBaseUrl(this.accountConfig.environment);

        // Initialize RPC client for JSON-RPC calls
        this.rpcClient = new DeribitJsonRpcClient({
            credentials: {
                clientId: this.accountConfig.clientId,
                clientSecret: this.accountConfig.clientSecret
            },
            environment: this.accountConfig.environment,
            scopes: this.accountConfig.scopes,
        });

        // Connect RPC client
        const connectResult = await this.rpcClient.connect();
        if (!connectResult.isSuccess) {
            throw new Error(`Failed to connect RPC client: ${connectResult.error?.message}`);
        }

        // Initialize User Data client for account operations
        this.userDataClient = new DeribitUserDataClient({
            credentials: {
                clientId: this.accountConfig.clientId,
                clientSecret: this.accountConfig.clientSecret
            },
            environment: this.accountConfig.environment,
        });

        // Connect user data client
        const userClientResult = await this.userDataClient.connect();
        if (!userClientResult.isSuccess) {
            throw new Error(`Failed to connect user data client: ${userClientResult.error?.message}`);
        }

        this.logger.info('Connected to Deribit account service');
    }

    protected async onStartHook(): Promise<void> {
        // Subscribe to portfolio updates for both BTC and ETH (Deribit currencies)
        const currencies = ['BTC', 'ETH'];

        for (const currency of currencies) {
            await this.userDataClient?.subscribePortfolio(currency, (account: DeribitAccountSummary) => {
                const update = this.mapAccount(account, currency);
                // Update cache with new account data
                this.cache.set(`${CACHE_KEYS.ACCOUNT}_${currency}`, update, {
                    ttlMs: this.cacheTtlMs
                });
                // Emit event for subscribers
                this.emit('accountUpdate', update);
            });
        }

        this.logger.debug('Portfolio update listeners registered for BTC and ETH');
    }

    protected async onStop(): Promise<void> {
        if (this.userDataClient) {
            await this.userDataClient.disconnect();
            this.userDataClient = null;
        }
        if (this.rpcClient) {
            await this.rpcClient.disconnect();
            this.rpcClient = null;
        }
        this.logger.info('Disconnected from Deribit account service');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // IAccountService Implementation
    // ═══════════════════════════════════════════════════════════════════════════════

    async connect(): Promise<Result<void>> {
        return this.start();
    }

    async disconnect(): Promise<Result<void>> {
        return this.stop('disconnect called');
    }

    async getAccount(currency: string = 'BTC'): Promise<Result<IAccount>> {
        return this.wrapAsync(async () => {
            // Check cache first
            const cacheKey = `${CACHE_KEYS.ACCOUNT}_${currency}`;
            const cached = this.cache.get(cacheKey) as IAccount | undefined;
            if (cached !== undefined) {
                this.logger.debug(`Account data for ${currency} served from cache`);
                return cached;
            }

            if (!this.userDataClient) {
                throw new Error('Service is not connected');
            }

            const result = await this.userDataClient.getAccountSummary(currency);
            if (!result.isSuccess) {
                throw new Error(result.error?.message || 'Failed to get account');
            }

            const account = this.mapAccount(result.data!, currency);

            // Cache the result
            this.cache.set(cacheKey, account, {
                ttlMs: this.cacheTtlMs
            });

            return account;
        });
    }

    async getBalances(currency: string = 'BTC'): Promise<Result<IAccountBalance[]>> {
        return this.wrapAsync(async () => {
            // Check cache first
            const cacheKey = `${CACHE_KEYS.BALANCES}_${currency}`;
            const cached = this.cache.get(cacheKey) as IAccountBalance[] | undefined;
            if (cached !== undefined) {
                this.logger.debug(`Balances for ${currency} served from cache`);
                return cached;
            }

            if (!this.userDataClient) {
                throw new Error('Service is not connected');
            }

            const result = await this.userDataClient.getAccountSummary(currency);
            if (!result.isSuccess) {
                throw new Error(result.error?.message || 'Failed to get balances');
            }

            const balances = this.mapBalances(result.data!, currency);

            // Cache the result
            this.cache.set(cacheKey, balances, {
                ttlMs: this.cacheTtlMs
            });

            return balances;
        });
    }

    async setLeverage(params: SetLeverageParams): Promise<Result<void>> {
        return this.wrapAsync(async () => {
            if (!this.rpcClient) {
                throw new Error('Service is not connected');
            }

            // Deribit doesn't have explicit leverage setting - it's managed via margin mode
            // and position sizing. Log a warning.
            this.logger.warn(`Deribit does not support explicit leverage setting. Use margin mode instead.`);

            // Invalidate leverage cache
            this.cache.remove(`${CACHE_KEYS.LEVERAGE}_${params.instrument}`);

            return undefined;
        });
    }

    async getLeverage(instrument: string): Promise<Result<number>> {
        return this.wrapAsync(async () => {
            // Check cache first
            const cacheKey = `${CACHE_KEYS.LEVERAGE}_${instrument}`;
            const cached = this.cache.get(cacheKey) as number | undefined;
            if (cached !== undefined) {
                this.logger.debug(`Leverage for ${instrument} served from cache`);
                return cached;
            }

            // Deribit positions contain effective leverage
            if (!this.userDataClient) {
                throw new Error('Service is not connected');
            }

            const positionResult = await this.userDataClient.getPosition(instrument);
            if (!positionResult.isSuccess || !positionResult.data) {
                // Default to 1x if no position
                return 1;
            }

            const position = positionResult.data;
            // Calculate effective leverage from position size / equity
            const leverage = position.leverage || 1;

            // Cache the result
            this.cache.set(cacheKey, leverage, {
                ttlMs: this.cacheTtlMs
            });

            return leverage;
        });
    }

    async setMarginType(params: SetMarginTypeParams): Promise<Result<void>> {
        return this.wrapAsync(async () => {
            if (!this.rpcClient) {
                throw new Error('Service is not connected');
            }

            // Deribit uses "cross" and "isolated" margin modes
            // This would be set via the trading client, not account service
            this.logger.warn(`Deribit margin type is set per order, not per account. Use trading service.`);

            return undefined;
        });
    }

    onAccountUpdate(callback: (update: IAccountUpdate) => void): void {
        this.on('accountUpdate', callback);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Cache Access Methods
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Get cached account data.
     */
    getCachedAccount(currency: string = 'BTC'): IAccount | undefined {
        return this.cache.get(`${CACHE_KEYS.ACCOUNT}_${currency}`) as IAccount | undefined;
    }

    /**
     * Get cached balances.
     */
    getCachedBalances(currency: string = 'BTC'): IAccountBalance[] | undefined {
        return this.cache.get(`${CACHE_KEYS.BALANCES}_${currency}`) as IAccountBalance[] | undefined;
    }

    /**
     * Invalidate all caches.
     */
    invalidateCache(): void {
        this.cache.clear();
        this.logger.debug('Account cache invalidated');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Mapping Functions
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Maps Deribit account summary to IAccount.
     */
    private mapAccount(summary: DeribitAccountSummary, currency: string): IAccount {
        return {
            accountId: `deribit-${currency.toLowerCase()}`,
            provider: ProviderType.DERIBIT,
            currency,
            totalBalance: summary.equity.toString(),
            availableBalance: summary.available_funds.toString(),
            marginUsed: summary.initial_margin.toString(),
            unrealizedPnl: summary.total_pl.toString(),
            realizedPnl: summary.session_rpl?.toString() || '0',
            updatedAt: Date.now(),
            providerData: summary,
        };
    }

    /**
     * Maps Deribit account summary to IAccountBalance array.
     */
    private mapBalances(summary: DeribitAccountSummary, currency: string): IAccountBalance[] {
        return [{
            currency,
            walletBalance: summary.balance.toString(),
            availableBalance: summary.available_funds.toString(),
            unrealizedPnl: summary.total_pl.toString(),
        }];
    }

    /**
     * Maps account update event to IAccount.
     */
    private mapAccountUpdate(summary: DeribitAccountSummary, currency: string): IAccount {
        return this.mapAccount(summary, currency);
    }
}
