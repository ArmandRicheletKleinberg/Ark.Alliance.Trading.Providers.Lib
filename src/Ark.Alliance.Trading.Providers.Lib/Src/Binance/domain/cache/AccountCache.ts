/**
 * @fileoverview Account Cache with auto-refresh
 * @module domain/cache/AccountCache
 *
 * FEATURES:
 * - Per-instance account balance storage
 * - Auto-refresh with configurable interval
 * - TTL-based expiration via ConcurrentCache
 * - Zero-blocking reads
 *
 * @remarks
 * Extends BaseDomainCache to leverage ConcurrentCache for storage.
 * Instantiate per service - do NOT use as singleton.
 *
 * @example
 * ```typescript
 * class BinanceAccountService extends BaseService {
 *     private accountCache = new AccountCache({ defaultTtlMs: 5000 });
 *
 *     protected async onStop(): Promise<void> {
 *         this.accountCache.dispose();
 *     }
 * }
 * ```
 */

import { AccountBalance } from '../../dtos/binance/AccountBalance';
import { BaseDomainCache } from './Base/BaseDomainCache';
import { CacheConfig, CacheStats } from '../../../Common/helpers/cache/CacheConfig';

/**
 * Cache entry metadata for account balance.
 */
export interface AccountCacheEntry {
    /** The account balance data. */
    balance: AccountBalance;
    /** When the balance was last fetched. */
    lastFetch: Date;
    /** When the next refresh should occur. */
    nextRefresh: Date;
    /** Total fetch count for this instance. */
    fetchCount: number;
    /** Error count since last successful fetch. */
    errors: number;
    /** Binance transaction time from last update (for out-of-order detection). */
    transactionTime?: number;
}

/**
 * Query result for account balance lookups.
 */
export interface AccountQueryResult<T> {
    /** Whether the query was successful. */
    success: boolean;
    /** The data if successful. */
    data?: T;
    /** Error message if unsuccessful. */
    error?: string;
    /** Query latency in milliseconds. */
    latencyMs: number;
    /** When the query was executed. */
    timestamp: Date;
    /** How stale the data is in milliseconds. */
    staleMs?: number;
}

/**
 * Account cache configuration.
 */
export interface AccountCacheConfig extends CacheConfig {
    /** Refresh interval in milliseconds (default: 5000). */
    refreshIntervalMs?: number;
}

/**
 * Account Cache - Concurrent storage with auto-refresh tracking.
 *
 * @extends BaseDomainCache<string, AccountCacheEntry>
 */
export class AccountCache extends BaseDomainCache<string, AccountCacheEntry> {
    /** Refresh interval in milliseconds. */
    private refreshIntervalMs: number;

    /** Refresh callbacks per instance key. */
    private readonly refreshCallbacks: Map<string, () => Promise<void>> = new Map();

    /** Active refresh timers per instance key. */
    private readonly refreshTimers: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Creates a new AccountCache instance.
     *
     * @param config - Optional cache configuration.
     */
    constructor(config?: AccountCacheConfig) {
        super({
            name: 'AccountCache',
            defaultTtlMs: config?.defaultTtlMs ?? 60000, // 1 minute default
            ...config
        });
        this.refreshIntervalMs = config?.refreshIntervalMs ?? 5000;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Configuration
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Sets the refresh interval for auto-refresh.
     *
     * @param intervalMs - New interval in milliseconds.
     */
    public setRefreshInterval(intervalMs: number): void {
        this.refreshIntervalMs = intervalMs;

        // Reschedule all active timers
        for (const [instanceKey, callback] of this.refreshCallbacks) {
            this.stopAutoRefresh(instanceKey);
            this.startAutoRefresh(instanceKey, callback);
        }
    }

    /**
     * Gets the current refresh interval.
     *
     * @returns Refresh interval in milliseconds.
     */
    public getRefreshInterval(): number {
        return this.refreshIntervalMs;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Domain Operations
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Updates account balance for an instance.
     *
     * @param instanceKey - The instance identifier.
     * @param balance - The account balance to cache.
     * @param transactionTime - Optional Binance transaction time for out-of-order detection.
     */
    public update(instanceKey: string, balance: AccountBalance, transactionTime?: number): void {
        const existing = this.get(instanceKey);

        // Reject stale updates if transaction time is provided
        if (transactionTime && existing?.transactionTime && transactionTime < existing.transactionTime) {
            console.warn(
                `[AccountCache] Rejecting stale update for ${instanceKey}: ` +
                `incoming ${transactionTime} < cached ${existing.transactionTime}`
            );
            return;
        }

        const entry: AccountCacheEntry = {
            balance,
            lastFetch: new Date(),
            nextRefresh: new Date(Date.now() + this.refreshIntervalMs),
            fetchCount: (existing?.fetchCount ?? 0) + 1,
            errors: 0,
            transactionTime
        };

        this.set(instanceKey, entry);
    }

    /**
     * Records a fetch error for an instance.
     *
     * @param instanceKey - The instance identifier.
     */
    public recordError(instanceKey: string): void {
        const existing = this.get(instanceKey);
        if (existing) {
            existing.errors++;
            existing.nextRefresh = new Date(Date.now() + this.refreshIntervalMs);
            this.set(instanceKey, existing);
        }
    }

    /**
     * Gets account balance for an instance (zero-blocking).
     *
     * @param instanceKey - The instance identifier.
     * @returns Query result with balance or error.
     */
    public getBalance(instanceKey: string): AccountQueryResult<AccountBalance> {
        const start = Date.now();

        try {
            const entry = this.get(instanceKey);

            if (!entry) {
                return {
                    success: false,
                    error: 'Account balance not yet fetched',
                    latencyMs: Date.now() - start,
                    timestamp: new Date()
                };
            }

            const staleMs = Date.now() - entry.lastFetch.getTime();

            return {
                success: true,
                data: entry.balance,
                latencyMs: Date.now() - start,
                timestamp: new Date(),
                staleMs
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                latencyMs: Date.now() - start,
                timestamp: new Date()
            };
        }
    }

    /**
     * Gets cache entry metadata for an instance.
     *
     * @param instanceKey - The instance identifier.
     * @returns The cache entry or undefined.
     */
    public getEntry(instanceKey: string): AccountCacheEntry | undefined {
        return this.get(instanceKey);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Auto-Refresh
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Starts auto-refresh for an instance.
     *
     * @param instanceKey - The instance identifier.
     * @param fetchCallback - Async function to fetch new data.
     */
    public startAutoRefresh(instanceKey: string, fetchCallback: () => Promise<void>): void {
        this.refreshCallbacks.set(instanceKey, fetchCallback);

        const timer = setInterval(async () => {
            try {
                await fetchCallback();
            } catch {
                this.recordError(instanceKey);
            }
        }, this.refreshIntervalMs);

        this.refreshTimers.set(instanceKey, timer);
    }

    /**
     * Stops auto-refresh for an instance.
     *
     * @param instanceKey - The instance identifier.
     */
    public stopAutoRefresh(instanceKey: string): void {
        const timer = this.refreshTimers.get(instanceKey);
        if (timer) {
            clearInterval(timer);
            this.refreshTimers.delete(instanceKey);
        }
        this.refreshCallbacks.delete(instanceKey);
    }

    /**
     * Checks if an instance needs refresh.
     *
     * @param instanceKey - The instance identifier.
     * @returns True if refresh is needed.
     */
    public needsRefresh(instanceKey: string): boolean {
        const entry = this.get(instanceKey);
        if (!entry) return true;
        return new Date() >= entry.nextRefresh;
    }

    /**
     * Clears an instance from the cache and stops auto-refresh.
     *
     * @param instanceKey - The instance identifier.
     */
    public clearInstance(instanceKey: string): void {
        this.stopAutoRefresh(instanceKey);
        this.remove(instanceKey);
    }

    /**
     * Gets all instance keys in the cache.
     *
     * @returns Array of instance keys.
     */
    public getInstanceKeys(): string[] {
        return this.keys();
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Lifecycle Override
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Disposes the cache and stops all auto-refresh timers.
     */
    public override dispose(): void {
        // Stop all auto-refresh timers
        for (const instanceKey of this.refreshTimers.keys()) {
            this.stopAutoRefresh(instanceKey);
        }
        super.dispose();
    }
}
