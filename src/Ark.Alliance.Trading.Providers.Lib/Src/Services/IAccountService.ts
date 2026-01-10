/**
 * @fileoverview Account Service Interface
 * @module Services/IAccountService
 *
 * Provider-agnostic account service interface that abstracts
 * account and balance operations across different exchange providers.
 */

import { Result } from '../Common/result';
import { IAccount, IAccountUpdate, IAccountBalance } from '../Common/Domain';
import { ProviderType } from '../Common/Clients/Base';

/**
 * Leverage setting parameters.
 */
export interface SetLeverageParams {
    /**
     * Instrument to set leverage for.
     */
    instrument: string;

    /**
     * Leverage value (e.g., 1-125 for Binance).
     */
    leverage: number;
}

/**
 * Margin type setting parameters.
 */
export interface SetMarginTypeParams {
    /**
     * Instrument to set margin type for.
     */
    instrument: string;

    /**
     * Margin type.
     */
    marginType: 'ISOLATED' | 'CROSSED';
}

/**
 * Account service interface.
 *
 * @remarks
 * This interface provides a provider-agnostic API for account operations.
 * Implementations handle provider-specific details internally.
 *
 * @example
 * ```typescript
 * const service = AccountServiceFactory.create(ProviderType.BINANCE, config);
 * await service.connect();
 *
 * const account = await service.getAccount();
 * if (account.isSuccess) {
 *     console.log(`Balance: ${account.data.totalBalance}`);
 *     console.log(`Available: ${account.data.availableBalance}`);
 * }
 * ```
 */
export interface IAccountService {
    /**
     * Provider type.
     */
    readonly provider: ProviderType;

    /**
     * Whether the service is connected.
     */
    readonly isConnected: boolean;

    // ═══════════════════════════════════════════════════════════════════════════
    // Lifecycle
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Connect to the provider.
     */
    connect(): Promise<Result<void>>;

    /**
     * Disconnect from the provider.
     */
    disconnect(): Promise<Result<void>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Account Data
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get account summary.
     *
     * @param currency - Currency for account (Deribit: 'BTC', 'ETH', 'USDC', etc.)
     */
    getAccount(currency?: string): Promise<Result<IAccount>>;

    /**
     * Get all asset balances.
     */
    getBalances(): Promise<Result<IAccountBalance[]>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Configuration
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Set leverage for an instrument.
     */
    setLeverage(params: SetLeverageParams): Promise<Result<void>>;

    /**
     * Set margin type for an instrument.
     */
    setMarginType(params: SetMarginTypeParams): Promise<Result<void>>;

    /**
     * Get current leverage for an instrument.
     */
    getLeverage(instrument: string): Promise<Result<number>>;

    // ═══════════════════════════════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Subscribe to account updates.
     */
    onAccountUpdate(callback: (update: IAccountUpdate) => void): void;

    /**
     * Remove all event listeners.
     */
    removeAllListeners(): void;
}
