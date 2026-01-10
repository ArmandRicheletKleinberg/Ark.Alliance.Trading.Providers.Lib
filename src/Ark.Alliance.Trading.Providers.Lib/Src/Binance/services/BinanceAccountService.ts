/**
 * @fileoverview Binance Account Service
 * @module Binance/services/BinanceAccountService
 *
 * Provider-specific implementation of IAccountService for Binance Futures.
 * Extends BaseService for lifecycle, caching, and logging.
 */

import { Result } from '../../Common/result';
import { IAccount, IAccountUpdate, IAccountBalance, AccountCurrency } from '../../Common/Domain';
import { ProviderType } from '../../Common/Clients/Base';
import {
    IAccountService,
    SetLeverageParams,
    SetMarginTypeParams
} from '../../Services/IAccountService';
import { BaseService, ServiceConfig } from '../../Common/services';
import { BinanceRestClient } from '../clients/BinanceRestClient';
import { BinanceUserDataStream } from '../clients/BinanceUserDataStream';
import { BinanceEnvironment } from '../enums';
import { getFuturesRestBaseUrl, getMarketDataWsUrl } from '../shared/utils/BinanceEndpoints';
import { CancellationToken } from '../../Common/services/cancellation';

// ═══════════════════════════════════════════════════════════════════════════════
// Cache Keys
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_KEYS = {
    ACCOUNT: 'account',
    BALANCES: 'balances',
    LEVERAGE: (symbol: string) => `leverage:${symbol}`,
} as const;

/**
 * Binance account service configuration.
 */
export interface BinanceAccountServiceConfig {
    /**
     * API key.
     */
    apiKey: string;

    /**
     * API secret.
     */
    apiSecret: string;

    /**
     * Environment (MAINNET or TESTNET).
     */
    environment: BinanceEnvironment;

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
}

/**
 * Binance implementation of IAccountService.
 *
 * @remarks
 * Extends BaseService for:
 * - Lifecycle management (start/stop)
 * - Built-in ConcurrentCache for account data
 * - Context-aware logging
 * - Event system for account updates
 *
 * @example
 * ```typescript
 * const service = new BinanceAccountService({
 *     apiKey: '...',
 *     apiSecret: '...',
 *     environment: BinanceEnvironment.TESTNET
 * });
 *
 * await service.connect();
 * const account = await service.getAccount();
 * ```
 */
export class BinanceAccountService extends BaseService implements IAccountService {
    readonly provider = ProviderType.BINANCE;

    private readonly accountConfig: BinanceAccountServiceConfig;
    private restClient: BinanceRestClient | null = null;
    private userDataStream: BinanceUserDataStream | null = null;
    private readonly cacheTtlMs: number;

    /**
     * Creates a new BinanceAccountService.
     */
    constructor(config: BinanceAccountServiceConfig) {
        const instanceKey = config.instanceKey || `binance-account-${Date.now()}`;
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
        const restBaseUrl = getFuturesRestBaseUrl(this.accountConfig.environment);
        const wsBaseUrl = getMarketDataWsUrl(this.accountConfig.environment);

        // Initialize REST client
        this.restClient = new BinanceRestClient(
            this.accountConfig.apiKey,
            this.accountConfig.apiSecret,
            { baseUrl: restBaseUrl }
        );

        // Initialize User Data Stream for real-time updates
        // BinanceUserDataStream takes (restClient, config)
        this.userDataStream = new BinanceUserDataStream(
            this.restClient,
            { restBaseUrl, wsStreamUrl: wsBaseUrl }
        );

        // Connect user data stream
        await this.userDataStream.connect();
        this.logger.info('Connected to Binance account service');
    }

    protected async onStartHook(token: CancellationToken): Promise<void> {
        // Subscribe to account updates from user data stream
        this.userDataStream?.on('accountUpdate', (data: any) => {
            const update = this.mapAccountUpdate(data);
            // Update cache with new account data
            this.cache.set(CACHE_KEYS.ACCOUNT, update, {
                ttlMs: this.cacheTtlMs
            });
            // Emit event for subscribers
            this.emit('accountUpdate', update);
        });

        this.logger.debug('Account update listener registered');
    }

    protected async onStop(): Promise<void> {
        if (this.userDataStream) {
            await this.userDataStream.disconnect();
            this.userDataStream = null;
        }
        this.restClient = null;
        this.logger.info('Disconnected from Binance account service');
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

    async getAccount(_currency?: string): Promise<Result<IAccount>> {
        return this.wrapAsync(async () => {
            // Check cache first
            const cached = this.cache.get(CACHE_KEYS.ACCOUNT) as IAccount | undefined;
            if (cached !== undefined) {
                this.logger.debug('Account data served from cache');
                return cached;
            }

            if (!this.restClient) {
                throw new Error('Service is not connected');
            }

            const result = await this.restClient.getAccount();
            if (!result.isSuccess) {
                throw new Error(result.error?.message || 'Failed to get account');
            }

            const account = this.mapAccount(result.data);

            // Store in cache
            this.cache.set(CACHE_KEYS.ACCOUNT, account, {
                ttlMs: this.cacheTtlMs
            });

            return account;
        });
    }

    async getBalances(): Promise<Result<IAccountBalance[]>> {
        return this.wrapAsync(async () => {
            // Check cache first
            const cached = this.cache.get(CACHE_KEYS.BALANCES) as IAccountBalance[] | undefined;
            if (cached !== undefined) {
                this.logger.debug('Balances served from cache');
                return cached;
            }

            if (!this.restClient) {
                throw new Error('Service is not connected');
            }

            const result = await this.restClient.getAccount();
            if (!result.isSuccess) {
                throw new Error(result.error?.message || 'Failed to get balances');
            }

            const balances = this.mapBalances(result.data.assets || []);

            // Store in cache
            this.cache.set(CACHE_KEYS.BALANCES, balances, {
                ttlMs: this.cacheTtlMs
            });

            return balances;
        });
    }

    async setLeverage(params: SetLeverageParams): Promise<Result<void>> {
        return this.wrapAsync(async () => {
            if (!this.restClient) {
                throw new Error('Service is not connected');
            }

            const result = await this.restClient.changeLeverage(params.instrument, params.leverage);
            if (!result.isSuccess) {
                throw new Error(result.error?.message || 'Failed to set leverage');
            }

            // Invalidate leverage cache for this instrument
            this.cache.remove(CACHE_KEYS.LEVERAGE(params.instrument));

            // Cache new leverage value
            this.cache.set(CACHE_KEYS.LEVERAGE(params.instrument), params.leverage, {
                ttlMs: this.cacheTtlMs * 6 // Leverage changes less frequently
            });
        });
    }

    async setMarginType(params: SetMarginTypeParams): Promise<Result<void>> {
        return this.wrapAsync(async () => {
            if (!this.restClient) {
                throw new Error('Service is not connected');
            }

            const result = await this.restClient.setMarginType(params.instrument, params.marginType);
            if (!result.isSuccess) {
                // Ignore "No need to change margin type" error
                if (result.error?.message?.includes('No need to change')) {
                    return;
                }
                throw new Error(result.error?.message || 'Failed to set margin type');
            }
        });
    }

    async getLeverage(instrument: string): Promise<Result<number>> {
        return this.wrapAsync(async () => {
            // Check cache first
            const cached = this.cache.get(CACHE_KEYS.LEVERAGE(instrument)) as number | undefined;
            if (cached !== undefined) {
                return cached;
            }

            if (!this.restClient) {
                throw new Error('Service is not connected');
            }

            const result = await this.restClient.getPositionRisk(instrument);
            if (!result.isSuccess) {
                throw new Error(result.error?.message || 'Failed to get leverage');
            }

            const positions = Array.isArray(result.data) ? result.data : [result.data];
            const position = positions.find((p: any) => p.symbol === instrument);

            if (!position) {
                throw new Error(`No position info found for ${instrument}`);
            }

            const leverage = parseInt(position.leverage, 10);

            // Cache leverage
            this.cache.set(CACHE_KEYS.LEVERAGE(instrument), leverage, {
                ttlMs: this.cacheTtlMs * 6
            });

            return leverage;
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════════════

    onAccountUpdate(callback: (update: IAccountUpdate) => void): void {
        this.on('accountUpdate', callback);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Cache Access
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Gets cached account data (if available).
     */
    getCachedAccount(): IAccount | undefined {
        return this.cache.get(CACHE_KEYS.ACCOUNT) as IAccount | undefined;
    }

    /**
     * Gets cached balances (if available).
     */
    getCachedBalances(): IAccountBalance[] | undefined {
        return this.cache.get(CACHE_KEYS.BALANCES) as IAccountBalance[] | undefined;
    }

    /**
     * Invalidates all cached data.
     */
    invalidateCache(): void {
        this.cache.clear();
        this.logger.debug('Account cache invalidated');
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Private Mappers
    // ═══════════════════════════════════════════════════════════════════════════════

    private mapAccount(data: any): IAccount {
        return {
            accountId: 'binance-futures',
            provider: ProviderType.BINANCE,
            currency: 'USDT' as AccountCurrency,
            totalBalance: data.totalWalletBalance || '0',
            availableBalance: data.availableBalance || '0',
            marginUsed: data.totalInitialMargin || '0',
            unrealizedPnl: data.totalUnrealizedProfit || '0',
            realizedPnl: '0',
            marginLevel: data.totalMarginBalance && data.totalInitialMargin
                ? String(parseFloat(data.totalMarginBalance) / parseFloat(data.totalInitialMargin))
                : undefined,
            maintenanceMargin: data.totalMaintMargin || undefined,
            initialMargin: data.totalInitialMargin || undefined,
            maxLeverage: 125,
            updatedAt: Date.now(),
            providerData: data
        };
    }

    private mapBalances(assets: any[]): IAccountBalance[] {
        return assets
            .filter((a: any) => parseFloat(a.walletBalance) > 0)
            .map((a: any) => ({
                currency: a.asset,
                walletBalance: a.walletBalance || '0',
                availableBalance: a.availableBalance || '0',
                crossWalletBalance: a.crossWalletBalance || undefined,
                unrealizedPnl: a.unrealizedProfit || '0',
                marginBalance: a.marginBalance || undefined
            }));
    }

    private mapAccountUpdate(data: any): IAccountUpdate {
        const account = this.mapAccount(data.a || data);
        return {
            ...account,
            updateType: data.e || 'ACCOUNT_UPDATE',
            balanceChange: data.B?.[0]?.bc || undefined
        };
    }
}
