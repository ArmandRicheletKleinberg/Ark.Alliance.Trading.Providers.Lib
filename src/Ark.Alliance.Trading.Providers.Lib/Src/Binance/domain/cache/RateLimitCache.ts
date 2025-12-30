/**
 * @fileoverview Rate Limit Cache - Concurrent storage per instance/client
 * @module domain/cache/RateLimitCache
 *
 * FEATURES:
 * - Per-instance and per-client rate limit tracking
 * - Zero-blocking reads
 * - Auto-calculation of reset times
 * - Support for multiple limit types (REQUEST_WEIGHT, ORDERS, RAW_REQUESTS)
 *
 * @remarks
 * Extends BaseDomainCache to leverage ConcurrentCache.
 * Uses composite keys: "instanceKey:client" where client is websocket/rest/userdata.
 *
 * @example
 * ```typescript
 * const cache = new RateLimitCache();
 * cache.update('instance1', 'rest', rateLimits);
 * const summary = cache.getSummary('instance1', 'rest');
 * ```
 */

import { BinanceRateLimit, RateLimitStatus, RateLimitSummary } from '../../dtos/binance/RateLimits';
import { BaseDomainCache } from './Base/BaseDomainCache';
import { CacheConfig } from '../../../Common/helpers/cache/CacheConfig';

/**
 * Client type for rate limit tracking.
 */
export type RateLimitClient = 'websocket' | 'rest' | 'userdata';

/**
 * Rate limit cache configuration.
 */
export interface RateLimitCacheConfig extends CacheConfig {
    // No additional config needed currently
}

/**
 * Rate Limit Cache - Tracks API rate limits per instance and client.
 *
 * @extends BaseDomainCache<string, RateLimitStatus>
 *
 * @remarks
 * Key format: "instanceKey:client"
 * Example: "1|TESTNET:websocket"
 */
export class RateLimitCache extends BaseDomainCache<string, RateLimitStatus> {
    /**
     * Creates a new RateLimitCache instance.
     *
     * @param config - Optional cache configuration.
     */
    constructor(config?: RateLimitCacheConfig) {
        super({
            name: 'RateLimitCache',
            defaultTtlMs: 0, // No TTL - rate limits managed by Binance intervals
            ...config
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Key Generation
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Generates cache key from instance and client type.
     */
    private getKey(instanceKey: string, client: RateLimitClient): string {
        return `${instanceKey}:${client}`;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Domain Operations
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Updates rate limits for an instance/client (zero-blocking).
     *
     * @param instanceKey - The instance identifier.
     * @param client - The client type.
     * @param rateLimits - Array of rate limit data.
     */
    public update(instanceKey: string, client: RateLimitClient, rateLimits: BinanceRateLimit[]): void {
        const key = this.getKey(instanceKey, client);

        const status: RateLimitStatus = {
            rateLimits,
            lastUpdated: new Date(),
            source: client === 'userdata' ? 'websocket' : client
        };

        this.set(key, status);
    }

    /**
     * Gets rate limits for an instance/client (zero-blocking).
     *
     * @param instanceKey - The instance identifier.
     * @param client - The client type.
     * @returns Rate limit status or undefined.
     */
    public getRateLimitStatus(instanceKey: string, client: RateLimitClient): RateLimitStatus | undefined {
        const key = this.getKey(instanceKey, client);
        return this.get(key);
    }

    /**
     * Gets all rate limits for an instance across all clients.
     *
     * @param instanceKey - The instance identifier.
     * @returns Map of client type to rate limit status.
     */
    public getAllForInstance(instanceKey: string): Map<string, RateLimitStatus> {
        const result = new Map<string, RateLimitStatus>();

        for (const key of this.keys()) {
            if (key.startsWith(`${instanceKey}:`)) {
                const [_, client] = key.split(':');
                const status = this.get(key);
                if (status && client) {
                    result.set(client, status);
                }
            }
        }

        return result;
    }

    /**
     * Gets rate limit summary (formatted for display).
     *
     * @param instanceKey - The instance identifier.
     * @param client - The client type.
     * @returns Formatted summary or null.
     */
    public getSummary(instanceKey: string, client: RateLimitClient): RateLimitSummary | null {
        const status = this.getRateLimitStatus(instanceKey, client);
        if (!status) return null;

        const summary: RateLimitSummary = {
            instanceKey,
            client,
            limits: {},
            lastUpdated: status.lastUpdated
        };

        // Process each rate limit type
        for (const limit of status.rateLimits) {
            const remaining = limit.limit - limit.count;
            const resetIn = this.calculateResetTime(limit.interval, limit.intervalNum);

            const limitInfo = {
                used: limit.count,
                limit: limit.limit,
                remaining,
                resetIn
            };

            switch (limit.rateLimitType) {
                case 'REQUEST_WEIGHT':
                    summary.limits.requestWeight = limitInfo;
                    break;
                case 'ORDERS':
                    summary.limits.orders = limitInfo;
                    break;
                case 'RAW_REQUESTS':
                    summary.limits.rawRequests = limitInfo;
                    break;
            }
        }

        return summary;
    }

    /**
     * Gets combined rate limits for an instance (used by StatusController).
     *
     * @param instanceKey - The instance identifier.
     * @returns Simplified summary across all clients or null.
     */
    public getRateLimits(instanceKey: string): {
        requestWeight: { used: number; limit: number; remaining: number };
        orders: { used: number; limit: number; remaining: number };
    } | null {
        const allForInstance = this.getAllForInstance(instanceKey);

        // Default limits based on Binance documentation (standard tier)
        let requestWeight = { used: 0, limit: 2400, remaining: 2400 };
        let orders = { used: 0, limit: 300, remaining: 300 };

        for (const [_, status] of allForInstance) {
            for (const limit of status.rateLimits) {
                if (limit.rateLimitType === 'REQUEST_WEIGHT') {
                    requestWeight = {
                        used: limit.count,
                        limit: limit.limit,
                        remaining: limit.limit - limit.count
                    };
                } else if (limit.rateLimitType === 'ORDERS') {
                    orders = {
                        used: limit.count,
                        limit: limit.limit,
                        remaining: limit.limit - limit.count
                    };
                }
            }
        }

        return { requestWeight, orders };
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Utility Methods
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Calculates time until rate limit resets (milliseconds).
     *
     * @param interval - The interval type (SECOND, MINUTE, DAY).
     * @param intervalNum - The interval number.
     * @returns Milliseconds until reset.
     */
    private calculateResetTime(interval: string, intervalNum: number): number {
        const now = new Date();
        let resetTime: Date;

        switch (interval) {
            case 'SECOND':
                resetTime = new Date(Math.ceil(now.getTime() / (intervalNum * 1000)) * (intervalNum * 1000));
                break;
            case 'MINUTE':
                resetTime = new Date(Math.ceil(now.getTime() / (intervalNum * 60000)) * (intervalNum * 60000));
                break;
            case 'DAY':
                resetTime = new Date(now);
                resetTime.setHours(24, 0, 0, 0);
                break;
            default:
                return 0;
        }

        return Math.max(0, resetTime.getTime() - now.getTime());
    }

    /**
     * Clears all rate limits for an instance.
     *
     * @param instanceKey - The instance identifier.
     */
    public clearInstance(instanceKey: string): void {
        const keysToDelete = this.keys().filter(k => k.startsWith(`${instanceKey}:`));
        keysToDelete.forEach(k => this.remove(k));
    }

    /**
     * Gets all instance keys with rate limits.
     *
     * @returns Array of instance keys.
     */
    public getAllInstances(): string[] {
        const instances = new Set<string>();

        for (const key of this.keys()) {
            const [instanceKey] = key.split(':');
            if (instanceKey) instances.add(instanceKey);
        }

        return Array.from(instances);
    }

    /**
     * Gets cache statistics.
     *
     * @returns Statistics object.
     */
    public getRateLimitStats(): {
        totalEntries: number;
        instances: number;
        oldestUpdate?: Date;
    } {
        let oldestUpdate: Date | undefined;

        for (const key of this.keys()) {
            const status = this.get(key);
            if (status && (!oldestUpdate || status.lastUpdated < oldestUpdate)) {
                oldestUpdate = status.lastUpdated;
            }
        }

        return {
            totalEntries: this.size,
            instances: this.getAllInstances().length,
            oldestUpdate
        };
    }
}
