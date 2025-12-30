/**
 * @fileoverview Account Cache Updater
 * @module domain/cache/AccountCacheUpdater
 *
 * Central orchestrator for account balance cache operations.
 * Features:
 * - Applies deltas from WS ACCOUNT_UPDATE balance events
 * - Applies snapshots from REST getAccount
 * - Event emission for balance changes
 *
 * @remarks
 * Accepts AccountCache via dependency injection (constructor).
 * No longer uses singleton pattern.
 */

import { EventEmitter } from 'events';
import { AccountBalance } from '../../dtos/binance/AccountBalance';
import { AccountCache } from './AccountCache';
import { ResiliencePolicy } from '../../utils/ResiliencePolicy';

/**
 * Balance change event data.
 */
export interface BalanceChangeEvent {
    /** Asset symbol. */
    asset: string;
    /** Previous balance value. */
    previousBalance: number;
    /** New balance value. */
    newBalance: number;
    /** Balance change amount. */
    change: number;
    /** Event timestamp. */
    timestamp: number;
    /** Instance identifier. */
    instanceKey: string;
}

/**
 * Account events.
 */
export const ACCOUNT_EVENTS = {
    BALANCE_UPDATED: 'balanceUpdated',
    ACCOUNT_SYNCED: 'accountSynced'
};

/**
 * Account Cache Updater - Centralizes all account cache update logic.
 *
 * @extends EventEmitter
 */
export class AccountCacheUpdater extends EventEmitter {
    /** The account cache instance. */
    private readonly cache: AccountCache;
    /** Resilience policy for error handling. */
    private readonly resilience: ResiliencePolicy;
    /** Instance identifier. */
    private readonly instanceKey: string;

    /**
     * Creates a new AccountCacheUpdater.
     *
     * @param instanceKey - The instance identifier.
     * @param cache - Injected AccountCache instance.
     * @param opts - Optional configuration.
     */
    constructor(
        instanceKey: string,
        cache: AccountCache,
        opts?: { resilience?: ResiliencePolicy }
    ) {
        super();
        this.cache = cache;
        this.instanceKey = instanceKey;
        this.resilience = opts?.resilience ?? new ResiliencePolicy();
    }

    /**
     * Updates from REST snapshot (getAccount / getAccountStatus).
     *
     * @param accountBalance - Account balance from API.
     */
    public refreshFromSnapshot(accountBalance: AccountBalance): void {
        const existing = this.cache.getBalance(this.instanceKey);
        const previousAssets = existing.success && existing.data
            ? existing.data.assets
            : [];

        // REST snapshots use lastUpdate timestamp from response
        this.cache.update(this.instanceKey, accountBalance, accountBalance.lastUpdate);

        // Detect and emit changes per asset
        for (const newAsset of accountBalance.assets) {
            const prevAsset = previousAssets.find(a => a.asset === newAsset.asset);
            const previousBalance = prevAsset?.walletBalance ?? 0;
            const change = newAsset.walletBalance - previousBalance;

            if (Math.abs(change) > 0.0000001) {
                this.emit(ACCOUNT_EVENTS.BALANCE_UPDATED, {
                    asset: newAsset.asset,
                    previousBalance,
                    newBalance: newAsset.walletBalance,
                    change,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as BalanceChangeEvent);
            }
        }

        this.emit(ACCOUNT_EVENTS.ACCOUNT_SYNCED, {
            instanceKey: this.instanceKey,
            assetCount: accountBalance.assets.length,
            timestamp: Date.now()
        });
    }

    /**
     * Updates from WebSocket ACCOUNT_UPDATE balance array.
     *
     * @param balanceUpdates - Balance updates from WebSocket event.
     * @param transactionTime - Binance transaction time (event.T) for timestamp validation.
     */
    public updateFromWsEvent(
        balanceUpdates: {
            asset: string;
            walletBalance: number;
            crossWalletBalance: number;
            balanceChange: number;
        }[],
        transactionTime?: number
    ): void {
        const existing = this.cache.getBalance(this.instanceKey);

        if (!existing.success || !existing.data) {
            // No existing balance - create minimal account
            const newBalance: AccountBalance = {
                assets: balanceUpdates.map(b => ({
                    asset: b.asset,
                    walletBalance: b.walletBalance,
                    unrealizedProfit: 0,
                    marginBalance: b.walletBalance,
                    availableBalance: b.walletBalance,
                    crossWalletBalance: b.crossWalletBalance,
                    crossUnPnl: 0,
                    initialMargin: 0,
                    maintMargin: 0,
                    positionInitialMargin: 0,
                    openOrderInitialMargin: 0,
                    maxWithdrawAmount: b.walletBalance,
                    updateTime: Date.now()
                })),
                positions: [],
                totalInitialMargin: 0,
                totalMaintMargin: 0,
                totalWalletBalance: balanceUpdates.reduce((sum, b) => sum + b.walletBalance, 0),
                totalUnrealizedProfit: 0,
                totalMarginBalance: 0,
                totalPositionInitialMargin: 0,
                totalOpenOrderInitialMargin: 0,
                totalCrossWalletBalance: 0,
                totalCrossUnPnl: 0,
                availableBalance: 0,
                maxWithdrawAmount: 0,
                lastUpdate: transactionTime || Date.now(),
                isMultiAssetMode: false
            };
            this.cache.update(this.instanceKey, newBalance, transactionTime);
            return;
        }

        // Merge updates into existing balance
        const updatedAssets = [...existing.data.assets];

        for (const update of balanceUpdates) {
            const existingAsset = updatedAssets.find(a => a.asset === update.asset);
            const previousBalance = existingAsset?.walletBalance ?? 0;

            if (existingAsset) {
                existingAsset.walletBalance = update.walletBalance;
                existingAsset.crossWalletBalance = update.crossWalletBalance;
            } else {
                updatedAssets.push({
                    asset: update.asset,
                    walletBalance: update.walletBalance,
                    unrealizedProfit: 0,
                    marginBalance: update.walletBalance,
                    availableBalance: update.walletBalance,
                    crossWalletBalance: update.crossWalletBalance,
                    crossUnPnl: 0,
                    initialMargin: 0,
                    maintMargin: 0,
                    positionInitialMargin: 0,
                    openOrderInitialMargin: 0,
                    maxWithdrawAmount: update.walletBalance,
                    updateTime: Date.now()
                });
            }

            // Emit balance change event
            if (Math.abs(update.balanceChange) > 0.0000001) {
                this.emit(ACCOUNT_EVENTS.BALANCE_UPDATED, {
                    asset: update.asset,
                    previousBalance,
                    newBalance: update.walletBalance,
                    change: update.balanceChange,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as BalanceChangeEvent);
            }
        }

        // Update cache with merged assets
        const updatedBalance: AccountBalance = {
            ...existing.data,
            assets: updatedAssets,
            totalWalletBalance: updatedAssets.reduce((sum, a) => sum + a.walletBalance, 0),
            lastUpdate: transactionTime || Date.now()
        };

        this.cache.update(this.instanceKey, updatedBalance, transactionTime);
    }

    /**
     * Gets current account balance.
     *
     * @returns Account balance or undefined.
     */
    public getAccountBalance(): AccountBalance | undefined {
        const result = this.cache.getBalance(this.instanceKey);
        return result.success ? result.data : undefined;
    }

    /**
     * Gets specific asset balance.
     *
     * @param asset - Asset symbol.
     * @returns Balance value.
     */
    public getAssetBalance(asset: string): number {
        const account = this.getAccountBalance();
        if (!account) return 0;

        const assetData = account.assets.find(a => a.asset === asset);
        return assetData?.walletBalance ?? 0;
    }

    /**
     * Gets the underlying cache instance.
     *
     * @returns AccountCache instance.
     */
    public getCache(): AccountCache {
        return this.cache;
    }
}
