/**
 * @fileoverview Order Cache - Concurrent storage for orders per instance
 * @module domain/cache/OrderCache
 *
 * FEATURES:
 * - Per-instance order isolation
 * - Support for both regular and algo orders
 * - Status-based filtering (active/filled/canceled)
 * - Latency tracking for queries
 * - Configurable retention per instance
 *
 * @remarks
 * Extends BaseDomainCache to leverage ConcurrentCache.
 * Uses composite keys: "instanceKey:orderId" or "instanceKey:algoId".
 *
 * @example
 * ```typescript
 * const cache = new OrderCache();
 * cache.update('instance1', orderUpdate);
 * const active = cache.getActiveOrders('instance1');
 * ```
 */

import { OrderUpdate, OrderStatus, ExecutionType } from '../../dtos/binance/OrderUpdate';
import { AlgoOrderUpdate, AlgoOrderStatus } from '../../dtos/binance/AlgoOrderUpdate';
import { BaseDomainCache } from './Base/BaseDomainCache';
import { CacheConfig } from '../../../Common/helpers/cache/CacheConfig';

/**
 * Order cache statistics.
 */
export interface OrderCacheStats {
    /** Total orders in cache. */
    totalOrders: number;
    /** Count of active (open) orders. */
    activeOrders: number;
    /** Count of filled orders. */
    filledOrders: number;
    /** Count of canceled orders. */
    canceledOrders: number;
    /** Count of algo orders. */
    algoOrders: number;
    /** Last update timestamp. */
    lastUpdate: Date | null;
}

/**
 * Query result with latency tracking.
 */
export interface OrderQueryResult<T> {
    /** Whether the query succeeded. */
    success: boolean;
    /** The data if successful. */
    data?: T;
    /** Error message if unsuccessful. */
    error?: string;
    /** Query latency in milliseconds. */
    latencyMs: number;
    /** Query timestamp. */
    timestamp: Date;
}

/**
 * Order cache configuration.
 */
export interface OrderCacheConfig extends CacheConfig {
    /** Maximum orders to keep per instance (default: 1000). */
    maxOrdersPerInstance?: number;
}

/**
 * Concrete implementation for algorithmicorder caching.
 * @extends BaseDomainCache<string, AlgoOrderUpdate>
 */
class AlgoOrderCache extends BaseDomainCache<string, AlgoOrderUpdate> {
    constructor(config?: CacheConfig) {
        super(config);
    }

    /** Public accessor for setting algo orders. */
    public setAlgoOrder(key: string, value: AlgoOrderUpdate): void {
        this.set(key, value);
    }

    /** Public accessor for getting algo orders. */
    public getAlgoOrder(key: string): AlgoOrderUpdate | undefined {
        return this.get(key);
    }

    /** Public accessor for removing algo orders. */
    public removeAlgoOrder(key: string): boolean {
        return this.remove(key);
    }

    /** Public accessor for checking if key exists. */
    public hasAlgoOrder(key: string): boolean {
        return this.has(key);
    }

    /** Public accessor for all values. */
    public getAllAlgoOrders(): AlgoOrderUpdate[] {
        return this.getAll();
    }

    /** Public accessor for all keys. */
    public getAllKeys(): string[] {
        return this.keys();
    }
}

/**
 * Order Cache - Concurrent storage for order updates.
 *
 * @extends BaseDomainCache<string, OrderUpdate | AlgoOrderUpdate>
 */
export class OrderCache extends BaseDomainCache<string, OrderUpdate> {
    /** Algo orders cache (separate from regular orders). */
    private readonly algoCache: AlgoOrderCache;

    /** Active orders per instance (for quick filtering). */
    private readonly activeByInstance: Map<string, Map<number, OrderUpdate>> = new Map();

    /** Active algo orders per instance. */
    private readonly activeAlgoByInstance: Map<string, Map<number, AlgoOrderUpdate>> = new Map();

    /** Last update timestamp per instance. */
    private readonly lastUpdateByInstance: Map<string, Date> = new Map();

    /** Maximum orders per instance. */
    private readonly maxOrdersPerInstance: number;

    /**
     * Creates a new OrderCache instance.
     *
     * @param config - Optional cache configuration.
     */
    constructor(config?: OrderCacheConfig) {
        super({
            name: 'OrderCache',
            defaultTtlMs: 0, // No TTL - manual retention management
            ...config
        });

        this.algoCache = new AlgoOrderCache({
            name: 'AlgoOrderCache',
            defaultTtlMs: 0,
            ...config
        });

        this.maxOrdersPerInstance = config?.maxOrdersPerInstance ?? 1000;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Key Generation
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Generates cache key from instance and order ID.
     */
    private generateKey(instanceKey: string, orderId: number): string {
        return `${instanceKey}:${orderId}`;
    }

    /**
     * Generates cache key for algo orders.
     */
    private generateAlgoKey(instanceKey: string, algoId: number): string {
        return `${instanceKey}:${algoId}`;
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Regular Order Operations
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Updates order in cache (zero-blocking).
     *
     * @param instanceKey - The instance identifier.
     * @param order - The order update to cache.
     */
    public update(instanceKey: string, order: OrderUpdate): void {
        const key = this.generateKey(instanceKey, order.orderId);

        // Check for out-of-order updates using transactionTime
        const existing = this.get(key);
        if (existing?.transactionTime && order.transactionTime && order.transactionTime < existing.transactionTime) {
            console.warn(
                `[OrderCache] Rejecting stale order update for ${order.symbol} order ${order.orderId}: ` +
                `incoming ${order.transactionTime} < cached ${existing.transactionTime}`
            );
            return;
        }

        this.set(key, order);
        this.updateActiveOrders(instanceKey, order);
        this.lastUpdateByInstance.set(instanceKey, new Date());
    }

    /**
     * Gets order by ID.
     *
     * @param instanceKey - The instance identifier.
     * @param orderId - The order ID.
     * @returns Query result with order or error.
     */
    public getOrder(instanceKey: string, orderId: number): OrderQueryResult<OrderUpdate> {
        const start = Date.now();

        try {
            const key = this.generateKey(instanceKey, orderId);
            const order = this.get(key);

            return {
                success: !!order,
                data: order,
                error: order ? undefined : 'Order not found',
                latencyMs: Date.now() - start,
                timestamp: new Date()
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
     * Gets all active orders for instance.
     *
     * @param instanceKey - The instance identifier.
     * @returns Query result with active orders.
     */
    public getActiveOrders(instanceKey: string): OrderQueryResult<OrderUpdate[]> {
        const start = Date.now();

        try {
            const active = this.activeByInstance.get(instanceKey);
            const orders = active ? Array.from(active.values()) : [];

            return {
                success: true,
                data: orders,
                latencyMs: Date.now() - start,
                timestamp: new Date()
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
     * Gets all orders for instance (limited by maxOrdersPerInstance).
     *
     * @param instanceKey - The instance identifier.
     * @param limit - Maximum orders to return.
     * @returns Query result with orders.
     */
    public getRecentOrders(instanceKey: string, limit: number = 50): OrderQueryResult<OrderUpdate[]> {
        const start = Date.now();

        try {
            const allKeys = this.keys().filter(k => k.startsWith(`${instanceKey}:`));
            const orders = allKeys.map(k => this.get(k)).filter((o): o is OrderUpdate => !!o);
            const sorted = orders.sort((a, b) => b.transactionTime - a.transactionTime).slice(0, limit);

            return {
                success: true,
                data: sorted,
                latencyMs: Date.now() - start,
                timestamp: new Date()
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
     * Gets orders by symbol.
     *
     * @param instanceKey - The instance identifier.
     * @param symbol - Trading symbol to filter.
     * @returns Query result with matching orders.
     */
    public getOrdersBySymbol(instanceKey: string, symbol: string): OrderQueryResult<OrderUpdate[]> {
        const start = Date.now();

        try {
            const recent = this.getRecentOrders(instanceKey, this.maxOrdersPerInstance);
            const filtered = (recent.data ?? []).filter(o => o.symbol === symbol);

            return {
                success: true,
                data: filtered,
                latencyMs: Date.now() - start,
                timestamp: new Date()
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
     * Gets orders by status.
     *
     * @param instanceKey - The instance identifier.
     * @param status - Order status to filter.
     * @returns Query result with matching orders.
     */
    public getOrdersByStatus(instanceKey: string, status: OrderStatus): OrderQueryResult<OrderUpdate[]> {
        const start = Date.now();

        try {
            const recent = this.getRecentOrders(instanceKey, this.maxOrdersPerInstance);
            const filtered = (recent.data ?? []).filter(o => o.orderStatus === status);

            return {
                success: true,
                data: filtered,
                latencyMs: Date.now() - start,
                timestamp: new Date()
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

    // ═══════════════════════════════════════════════════════════════════════════════
    // Algo Order Operations
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Updates algo order in cache.
     *
     * @param instanceKey - The instance identifier.
     * @param algoOrder - The algo order update to cache.
     */
    public updateAlgoOrder(instanceKey: string, algoOrder: AlgoOrderUpdate): void {
        const key = this.generateAlgoKey(instanceKey, algoOrder.algoId);

        // Check for out-of-order updates using transactionTime
        const existing = this.algoCache['get'](key);
        if (existing?.transactionTime && algoOrder.transactionTime && algoOrder.transactionTime < existing.transactionTime) {
            console.warn(
                `[OrderCache] Rejecting stale algo order update for ${algoOrder.symbol} algo ${algoOrder.algoId}: ` +
                `incoming ${algoOrder.transactionTime} < cached ${existing.transactionTime}`
            );
            return;
        }

        this.algoCache['set'](key, algoOrder);
        this.updateActiveAlgoOrders(instanceKey, algoOrder);
        this.lastUpdateByInstance.set(instanceKey, new Date());
    }

    /**
     * Gets all active algo orders for instance.
     *
     * @param instanceKey - The instance identifier.
     * @returns Query result with active algo orders.
     */
    public getActiveAlgoOrders(instanceKey: string): OrderQueryResult<AlgoOrderUpdate[]> {
        const start = Date.now();

        try {
            const active = this.activeAlgoByInstance.get(instanceKey);
            const algoOrders = active ? Array.from(active.values()) : [];

            return {
                success: true,
                data: algoOrders,
                latencyMs: Date.now() - start,
                timestamp: new Date()
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

    // ═══════════════════════════════════════════════════════════════════════════════
    // Active Order Management (Internal)
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Updates active orders map based on order status.
     */
    private updateActiveOrders(instanceKey: string, order: OrderUpdate): void {
        let active = this.activeByInstance.get(instanceKey);

        if (!active) {
            active = new Map();
            this.activeByInstance.set(instanceKey, active);
        }

        const isActive = [OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED].includes(order.orderStatus);

        if (isActive) {
            active.set(order.orderId, order);
        } else {
            active.delete(order.orderId);
        }
    }

    /**
     * Updates active algo orders map based on status.
     */
    private updateActiveAlgoOrders(instanceKey: string, algoOrder: AlgoOrderUpdate): void {
        let active = this.activeAlgoByInstance.get(instanceKey);

        if (!active) {
            active = new Map();
            this.activeAlgoByInstance.set(instanceKey, active);
        }

        const isActive = [AlgoOrderStatus.NEW, AlgoOrderStatus.TRIGGERING].includes(algoOrder.status);

        if (isActive) {
            active.set(algoOrder.algoId, algoOrder);
        } else {
            active.delete(algoOrder.algoId);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Statistics & Cleanup
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Gets cache statistics for an instance.
     *
     * @param instanceKey - The instance identifier.
     * @returns Statistics object.
     */
    public getOrderStats(instanceKey: string): OrderCacheStats {
        const recent = this.getRecentOrders(instanceKey, this.maxOrdersPerInstance).data ?? [];
        const active = this.activeByInstance.get(instanceKey);
        const activeAlgo = this.activeAlgoByInstance.get(instanceKey);

        return {
            totalOrders: recent.length,
            activeOrders: active?.size ?? 0,
            filledOrders: recent.filter(o => o.orderStatus === OrderStatus.FILLED).length,
            canceledOrders: recent.filter(o => o.orderStatus === OrderStatus.CANCELED).length,
            algoOrders: activeAlgo?.size ?? 0,
            lastUpdate: this.lastUpdateByInstance.get(instanceKey) ?? null
        };
    }

    /**
     * Clears all orders for an instance.
     *
     * @param instanceKey - The instance identifier.
     */
    public clearInstance(instanceKey: string): void {
        // Clear regular orders
        const keysToDelete = this.keys().filter(k => k.startsWith(`${instanceKey}:`));
        keysToDelete.forEach(k => this.remove(k));

        // Clear algo orders
        const algoKeys = this.algoCache['keys']().filter(k => k.startsWith(`${instanceKey}:`));
        algoKeys.forEach(k => this.algoCache['remove'](k));

        // Clear active maps
        this.activeByInstance.delete(instanceKey);
        this.activeAlgoByInstance.delete(instanceKey);
        this.lastUpdateByInstance.delete(instanceKey);
    }

    /**
     * Gets all instance keys with orders.
     *
     * @returns Array of instance keys.
     */
    public getInstanceKeys(): string[] {
        const instanceKeys = new Set<string>();
        for (const key of this.keys()) {
            const [instanceKey] = key.split(':');
            if (instanceKey) instanceKeys.add(instanceKey);
        }
        return Array.from(instanceKeys);
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // Lifecycle Override
    // ═══════════════════════════════════════════════════════════════════════════════

    /**
     * Disposes both regular and algo order caches.
     */
    public override dispose(): void {
        this.algoCache.dispose();
        super.dispose();
    }
}
