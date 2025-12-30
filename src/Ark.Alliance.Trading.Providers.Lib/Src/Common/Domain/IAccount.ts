/**
 * @fileoverview Provider-Agnostic Account Interface
 * @module Common/Domain/IAccount
 *
 * Defines the common account interface that all provider-specific
 * account implementations must conform to.
 */

import { ProviderType } from '../Clients/Base';

/**
 * Account currency type.
 */
export type AccountCurrency = 'USDT' | 'USDC' | 'BTC' | 'ETH' | 'SOL' | 'USD' | string;

/**
 * Provider-agnostic account interface.
 *
 * @remarks
 * This interface represents the common account properties across all providers.
 * Provider-specific properties are accessible via the `providerData` field
 * which can be type-narrowed based on the provider type.
 *
 * All numeric values are stored as strings to preserve precision.
 *
 * @example
 * ```typescript
 * function displayAccount(account: IAccount) {
 *     console.log(`Account ${account.accountId} (${account.provider})`);
 *     console.log(`Balance: ${account.totalBalance} ${account.currency}`);
 *     console.log(`Available: ${account.availableBalance}`);
 *     console.log(`Unrealized PnL: ${account.unrealizedPnl}`);
 * }
 * ```
 */
export interface IAccount {
    /**
     * Account identifier.
     * @remarks Binance uses API key hash, Deribit uses account ID.
     */
    readonly accountId: string;

    /**
     * Provider type.
     */
    readonly provider: ProviderType;

    /**
     * Account currency (e.g., 'USDT', 'BTC').
     */
    readonly currency: AccountCurrency;

    /**
     * Total account balance.
     */
    readonly totalBalance: string;

    /**
     * Available balance for trading.
     */
    readonly availableBalance: string;

    /**
     * Margin currently in use.
     */
    readonly marginUsed: string;

    /**
     * Total unrealized PnL across all positions.
     */
    readonly unrealizedPnl: string;

    /**
     * Total realized PnL.
     */
    readonly realizedPnl: string;

    /**
     * Margin level percentage (optional).
     * @remarks Available on some providers when margin is used.
     */
    readonly marginLevel?: string;

    /**
     * Maintenance margin requirement.
     */
    readonly maintenanceMargin?: string;

    /**
     * Initial margin requirement.
     */
    readonly initialMargin?: string;

    /**
     * Maximum leverage allowed.
     */
    readonly maxLeverage?: number;

    /**
     * Last update timestamp (milliseconds).
     */
    readonly updatedAt: number;

    /**
     * Provider-specific data.
     * @remarks Use type narrowing to access provider-specific fields.
     */
    readonly providerData: unknown;
}

/**
 * Account update event data.
 */
export interface IAccountUpdate extends IAccount {
    /**
     * Type of update (e.g., 'ORDER', 'DEPOSIT', 'WITHDRAW', 'FUNDING_FEE').
     */
    readonly updateType: string;

    /**
     * Previous balance before update (for delta calculation).
     */
    readonly previousBalance?: string;

    /**
     * Balance change amount.
     */
    readonly balanceChange?: string;
}

/**
 * Account balance entry for multi-currency accounts.
 */
export interface IAccountBalance {
    /**
     * Currency/asset name.
     */
    readonly currency: string;

    /**
     * Wallet balance.
     */
    readonly walletBalance: string;

    /**
     * Available balance.
     */
    readonly availableBalance: string;

    /**
     * Cross wallet balance.
     */
    readonly crossWalletBalance?: string;

    /**
     * Unrealized PnL for this currency.
     */
    readonly unrealizedPnl: string;

    /**
     * Margin balance.
     */
    readonly marginBalance?: string;
}

/**
 * Helper function to calculate margin utilization percentage.
 *
 * @param account - Account to calculate for
 * @returns Margin utilization as percentage (0-100+)
 */
export function getMarginUtilization(account: IAccount): number {
    const total = parseFloat(account.totalBalance);
    const used = parseFloat(account.marginUsed);
    if (total <= 0) return 0;
    return (used / total) * 100;
}

/**
 * Helper function to check if account has sufficient margin.
 *
 * @param account - Account to check
 * @param requiredMargin - Required margin amount
 * @returns True if available balance >= required margin
 */
export function hasSufficientMargin(account: IAccount, requiredMargin: string): boolean {
    const available = parseFloat(account.availableBalance);
    const required = parseFloat(requiredMargin);
    return available >= required;
}

/**
 * Helper function to check if account is at risk of liquidation.
 *
 * @param account - Account to check
 * @param threshold - Margin level threshold (default 1.1 = 110%)
 * @returns True if margin level is below threshold
 */
export function isMarginAtRisk(account: IAccount, threshold: number = 1.1): boolean {
    if (!account.marginLevel) return false;
    const marginLevel = parseFloat(account.marginLevel);
    return marginLevel < threshold;
}
