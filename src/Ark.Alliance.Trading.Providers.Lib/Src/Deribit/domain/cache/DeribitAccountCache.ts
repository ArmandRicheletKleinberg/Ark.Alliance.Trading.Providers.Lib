/**
 * @fileoverview Deribit Account Cache
 * @module Deribit/domain/cache/DeribitAccountCache
 *
 * Cache for Deribit account summaries per currency.
 * Pattern aligned with Binance's AccountCache implementation.
 *
 * FEATURES:
 * - Stores DeribitAccountSummary per currency
 * - Event emission for equity/margin changes
 * - Supports user.portfolio subscription
 * - Instance-key isolation for multi-account scenarios
 */

import { EventEmitter } from 'events';
import { DeribitAccountSummary } from '../../dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Account lifecycle events.
 */
export const DERIBIT_ACCOUNT_EVENTS = {
    ACCOUNT_UPDATED: 'accountUpdated',
    MARGIN_WARNING: 'marginWarning',
    MARGIN_CRITICAL: 'marginCritical',
    EQUITY_CHANGED: 'equityChanged'
} as const;

/**
 * Cache statistics.
 */
export interface DeribitAccountCacheStats {
    instanceCount: number;
    totalCurrencies: number;
    currencies: string[];
    lastUpdateTimestamp: number;
}

/**
 * Account event payload.
 */
export interface DeribitAccountEventPayload {
    account: DeribitAccountSummary;
    previousAccount?: DeribitAccountSummary;
    timestamp: number;
    instanceKey: string;
}

/**
 * Margin warning thresholds.
 */
export const MARGIN_THRESHOLDS = {
    /** Warning when margin ratio exceeds this (e.g., 0.7 = 70%). */
    WARNING: 0.7,
    /** Critical when margin ratio exceeds this (e.g., 0.9 = 90%). */
    CRITICAL: 0.9
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitAccountCache
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deribit Account Cache.
 *
 * @remarks
 * Caches account summaries per currency (BTC, ETH, SOL, USDC).
 * Supports user.portfolio WebSocket subscription data.
 *
 * @example
 * ```typescript
 * const cache = new DeribitAccountCache();
 *
 * cache.on('accountUpdated', (payload) => {
 *     console.log('Account updated:', payload.account.currency);
 * });
 *
 * cache.on('marginWarning', (payload) => {
 *     console.warn('Margin warning for:', payload.account.currency);
 * });
 *
 * cache.update('account1', accountSummary);
 * const btcAccount = cache.get('account1', 'BTC');
 * ```
 */
export class DeribitAccountCache extends EventEmitter {
    /**
     * Cache storage: instanceKey -> currency -> DeribitAccountSummary.
     */
    private readonly cache = new Map<string, Map<string, DeribitAccountSummary>>();

    /**
     * Last update timestamp per instance.
     */
    private readonly lastUpdateMap = new Map<string, number>();

    // ═══════════════════════════════════════════════════════════════════════════
    // Update Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update account summary for a currency.
     *
     * @param instanceKey - Unique instance identifier
     * @param summary - Account summary from API
     */
    update(instanceKey: string, summary: DeribitAccountSummary): void {
        if (!this.cache.has(instanceKey)) {
            this.cache.set(instanceKey, new Map());
        }

        const instanceCache = this.cache.get(instanceKey)!;
        const currency = summary.currency.toUpperCase();
        const previous = instanceCache.get(currency);

        instanceCache.set(currency, summary);
        this.lastUpdateMap.set(instanceKey, Date.now());

        // Emit events
        this.emit(DERIBIT_ACCOUNT_EVENTS.ACCOUNT_UPDATED, {
            account: summary,
            previousAccount: previous,
            timestamp: Date.now(),
            instanceKey
        } as DeribitAccountEventPayload);

        // Check margin thresholds
        this.checkMarginThresholds(instanceKey, summary, previous);

        // Check equity changes
        if (previous && summary.equity !== previous.equity) {
            this.emit(DERIBIT_ACCOUNT_EVENTS.EQUITY_CHANGED, {
                account: summary,
                previousAccount: previous,
                timestamp: Date.now(),
                instanceKey
            } as DeribitAccountEventPayload);
        }
    }

    /**
     * Check and emit margin warning/critical events.
     */
    private checkMarginThresholds(
        instanceKey: string,
        current: DeribitAccountSummary,
        previous?: DeribitAccountSummary
    ): void {
        const marginRatio = this.calculateMarginRatio(current);
        const previousRatio = previous ? this.calculateMarginRatio(previous) : 0;

        // Emit warning if crossed threshold
        if (marginRatio >= MARGIN_THRESHOLDS.CRITICAL && previousRatio < MARGIN_THRESHOLDS.CRITICAL) {
            this.emit(DERIBIT_ACCOUNT_EVENTS.MARGIN_CRITICAL, {
                account: current,
                previousAccount: previous,
                timestamp: Date.now(),
                instanceKey
            } as DeribitAccountEventPayload);
        } else if (marginRatio >= MARGIN_THRESHOLDS.WARNING && previousRatio < MARGIN_THRESHOLDS.WARNING) {
            this.emit(DERIBIT_ACCOUNT_EVENTS.MARGIN_WARNING, {
                account: current,
                previousAccount: previous,
                timestamp: Date.now(),
                instanceKey
            } as DeribitAccountEventPayload);
        }
    }

    /**
     * Calculate margin utilization ratio.
     *
     * @param summary - Account summary
     * @returns Ratio of used margin to available (0-1+)
     */
    calculateMarginRatio(summary: DeribitAccountSummary): number {
        if (summary.equity <= 0) return 1;
        return summary.initial_margin / summary.equity;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Read Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get account summary for a specific currency.
     *
     * @param instanceKey - Instance identifier
     * @param currency - Currency (BTC, ETH, SOL, USDC)
     * @returns Account summary or undefined
     */
    get(instanceKey: string, currency: string): DeribitAccountSummary | undefined {
        const instanceCache = this.cache.get(instanceKey);
        return instanceCache?.get(currency.toUpperCase());
    }

    /**
     * Get all account summaries for an instance.
     *
     * @param instanceKey - Instance identifier
     * @returns Array of all account summaries
     */
    getAll(instanceKey: string): DeribitAccountSummary[] {
        const instanceCache = this.cache.get(instanceKey);
        return instanceCache ? Array.from(instanceCache.values()) : [];
    }

    /**
     * Get all currencies with cached data for an instance.
     *
     * @param instanceKey - Instance identifier
     * @returns Array of currency strings
     */
    getCurrencies(instanceKey: string): string[] {
        const instanceCache = this.cache.get(instanceKey);
        return instanceCache ? Array.from(instanceCache.keys()) : [];
    }

    /**
     * Check if instance has any cached data.
     *
     * @param instanceKey - Instance identifier
     * @returns true if any accounts cached
     */
    has(instanceKey: string): boolean {
        const instanceCache = this.cache.get(instanceKey);
        return instanceCache !== undefined && instanceCache.size > 0;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Aggregate Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get total equity across all currencies for an instance.
     *
     * @param instanceKey - Instance identifier
     * @returns Total equity (in base currency terms - approximate)
     */
    getTotalEquity(instanceKey: string): number {
        const accounts = this.getAll(instanceKey);
        return accounts.reduce((sum, acc) => sum + acc.equity, 0);
    }

    /**
     * Get total available funds across all currencies.
     *
     * @param instanceKey - Instance identifier
     * @returns Total available funds
     */
    getTotalAvailableFunds(instanceKey: string): number {
        const accounts = this.getAll(instanceKey);
        return accounts.reduce((sum, acc) => sum + acc.available_funds, 0);
    }

    /**
     * Get total unrealized PnL across all currencies.
     *
     * @param instanceKey - Instance identifier
     * @returns Total session unrealized PnL
     */
    getTotalUnrealizedPnl(instanceKey: string): number {
        const accounts = this.getAll(instanceKey);
        return accounts.reduce((sum, acc) => sum + acc.session_upl, 0);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Clear Operations
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Clear all data for an instance.
     *
     * @param instanceKey - Instance identifier
     */
    clear(instanceKey: string): void {
        this.cache.delete(instanceKey);
        this.lastUpdateMap.delete(instanceKey);
    }

    /**
     * Clear all cached data.
     */
    clearAll(): void {
        this.cache.clear();
        this.lastUpdateMap.clear();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Statistics
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get cache statistics.
     *
     * @param instanceKey - Optional instance to get stats for
     * @returns Cache statistics
     */
    getStats(instanceKey?: string): DeribitAccountCacheStats {
        if (instanceKey) {
            const instanceCache = this.cache.get(instanceKey);
            return {
                instanceCount: 1,
                totalCurrencies: instanceCache?.size ?? 0,
                currencies: instanceCache ? Array.from(instanceCache.keys()) : [],
                lastUpdateTimestamp: this.lastUpdateMap.get(instanceKey) ?? 0
            };
        }

        // Aggregate stats
        let totalCurrencies = 0;
        const allCurrencies = new Set<string>();
        let latestUpdate = 0;

        for (const [key, instanceCache] of this.cache) {
            totalCurrencies += instanceCache.size;
            for (const currency of instanceCache.keys()) {
                allCurrencies.add(currency);
            }
            const lastUpdate = this.lastUpdateMap.get(key) ?? 0;
            if (lastUpdate > latestUpdate) latestUpdate = lastUpdate;
        }

        return {
            instanceCount: this.cache.size,
            totalCurrencies,
            currencies: Array.from(allCurrencies),
            lastUpdateTimestamp: latestUpdate
        };
    }
}
