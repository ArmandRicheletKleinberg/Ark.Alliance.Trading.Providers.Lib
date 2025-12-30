/**
 * @fileoverview Deribit Order Cache
 * @module Deribit/domain/cache/DeribitOrderCache
 *
 * Order caching with event notifications following DDD principles.
 * Pattern aligned with Binance's OrderCache implementation.
 *
 * FEATURES:
 * - Per-instance order isolation
 * - Support for both regular and conditional orders
 * - Event emission for order state changes
 * - Query methods with latency tracking
 */

import { EventEmitter } from 'events';
import { DeribitOrder } from '../../dtos';
import { OrderState } from '../../enums';
import {
    DEFAULT_COMPLETED_ORDER_TTL_MS,
    DEFAULT_ORDER_CACHE_CLEANUP_INTERVAL_MS,
    DEFAULT_CACHE_MAX_ENTRIES
} from '../../../Common/constants';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Order cache statistics.
 */
export interface DeribitOrderCacheStats {
    totalOrders: number;
    openOrders: number;
    filledOrders: number;
    cancelledOrders: number;
    lastUpdate: Date | null;
}

/**
 * Order query result with latency tracking.
 */
export interface OrderQueryResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    latencyMs: number;
    timestamp: Date;
}

/**
 * Order cache configuration.
 */
export interface DeribitOrderCacheConfig {
    /** Maximum orders to keep per instance */
    maxOrdersPerInstance?: number;
    /** TTL for completed orders in ms */
    completedOrderTtlMs?: number;
    /** Cleanup timer interval in ms */
    cleanupIntervalMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitOrderCache
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Order cache for Deribit orders with event notifications.
 *
 * @remarks
 * Provides concurrent order storage with:
 * - Per-instance isolation for multi-account scenarios
 * - Event emission on order state changes
 * - Query methods with result latency tracking
 * - Automatic cleanup of old completed orders
 *
 * @example
 * ```typescript
 * const cache = new DeribitOrderCache({ maxOrdersPerInstance: 1000 });
 *
 * cache.on('orderCreated', (order) => console.log('New order:', order.order_id));
 * cache.on('orderFilled', (order) => console.log('Order filled:', order.order_id));
 *
 * cache.update('account1', order);
 * const active = cache.getActiveOrders('account1');
 * ```
 */
export class DeribitOrderCache extends EventEmitter {
    private readonly orders: Map<string, Map<string, DeribitOrder>> = new Map();
    private readonly config: Required<DeribitOrderCacheConfig>;
    private lastUpdateTime: Date | null = null;
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(config?: DeribitOrderCacheConfig) {
        super();
        this.config = {
            maxOrdersPerInstance: config?.maxOrdersPerInstance ?? DEFAULT_CACHE_MAX_ENTRIES / 2,
            completedOrderTtlMs: config?.completedOrderTtlMs ?? DEFAULT_COMPLETED_ORDER_TTL_MS,
            cleanupIntervalMs: config?.cleanupIntervalMs ?? DEFAULT_ORDER_CACHE_CLEANUP_INTERVAL_MS
        };

        // Start cleanup timer
        this.startCleanupTimer();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Update Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update order in cache.
     *
     * @param instanceKey - Account/instance identifier
     * @param order - Order to cache
     */
    update(instanceKey: string, order: DeribitOrder): void {
        const startTime = Date.now();

        if (!this.orders.has(instanceKey)) {
            this.orders.set(instanceKey, new Map());
        }

        const instanceOrders = this.orders.get(instanceKey)!;
        const existingOrder = instanceOrders.get(order.order_id);

        // Detect state transitions
        if (!existingOrder) {
            this.emit('orderCreated', { instanceKey, order });
        } else if (existingOrder.order_state !== order.order_state) {
            this.emitStateChange(instanceKey, existingOrder.order_state, order);
        }

        instanceOrders.set(order.order_id, order);
        this.lastUpdateTime = new Date();

        // Enforce max orders limit
        this.enforceMaxOrders(instanceKey);

        const latency = Date.now() - startTime;
        this.emit('updated', { instanceKey, orderId: order.order_id, latencyMs: latency });
    }

    /**
     * Batch update multiple orders.
     *
     * @param instanceKey - Account/instance identifier
     * @param orders - Orders to cache
     */
    updateBatch(instanceKey: string, orders: DeribitOrder[]): void {
        for (const order of orders) {
            this.update(instanceKey, order);
        }
        this.emit('batchUpdated', { instanceKey, count: orders.length });
    }

    /**
     * Remove order from cache.
     *
     * @param instanceKey - Account/instance identifier
     * @param orderId - Order ID to remove
     * @returns true if removed
     */
    remove(instanceKey: string, orderId: string): boolean {
        const instanceOrders = this.orders.get(instanceKey);
        if (!instanceOrders) return false;

        const removed = instanceOrders.delete(orderId);
        if (removed) {
            this.emit('orderRemoved', { instanceKey, orderId });
        }
        return removed;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Query Methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get order by ID.
     *
     * @param instanceKey - Account/instance identifier
     * @param orderId - Order ID
     * @returns Query result with order or error
     */
    getOrder(instanceKey: string, orderId: string): OrderQueryResult<DeribitOrder> {
        const startTime = Date.now();
        const instanceOrders = this.orders.get(instanceKey);

        if (!instanceOrders) {
            return {
                success: false,
                error: `Instance ${instanceKey} not found`,
                latencyMs: Date.now() - startTime,
                timestamp: new Date()
            };
        }

        const order = instanceOrders.get(orderId);
        return {
            success: !!order,
            data: order,
            error: order ? undefined : `Order ${orderId} not found`,
            latencyMs: Date.now() - startTime,
            timestamp: new Date()
        };
    }

    /**
     * Get all active (open) orders for instance.
     *
     * @param instanceKey - Account/instance identifier
     * @returns Query result with active orders
     */
    getActiveOrders(instanceKey: string): OrderQueryResult<DeribitOrder[]> {
        const startTime = Date.now();
        const instanceOrders = this.orders.get(instanceKey);

        if (!instanceOrders) {
            return {
                success: true,
                data: [],
                latencyMs: Date.now() - startTime,
                timestamp: new Date()
            };
        }

        const activeOrders = Array.from(instanceOrders.values()).filter(
            (o) => o.order_state === OrderState.OPEN || o.order_state === OrderState.UNTRIGGERED
        );

        return {
            success: true,
            data: activeOrders,
            latencyMs: Date.now() - startTime,
            timestamp: new Date()
        };
    }

    /**
     * Get orders by instrument.
     *
     * @param instanceKey - Account/instance identifier
     * @param instrumentName - Instrument to filter by
     * @returns Query result with matching orders
     */
    getOrdersByInstrument(instanceKey: string, instrumentName: string): OrderQueryResult<DeribitOrder[]> {
        const startTime = Date.now();
        const instanceOrders = this.orders.get(instanceKey);

        if (!instanceOrders) {
            return {
                success: true,
                data: [],
                latencyMs: Date.now() - startTime,
                timestamp: new Date()
            };
        }

        const filtered = Array.from(instanceOrders.values()).filter(
            (o) => o.instrument_name === instrumentName
        );

        return {
            success: true,
            data: filtered,
            latencyMs: Date.now() - startTime,
            timestamp: new Date()
        };
    }

    /**
     * Get recent orders (limited).
     *
     * @param instanceKey - Account/instance identifier
     * @param limit - Maximum orders to return
     * @returns Query result with orders
     */
    getRecentOrders(instanceKey: string, limit: number = 50): OrderQueryResult<DeribitOrder[]> {
        const startTime = Date.now();
        const instanceOrders = this.orders.get(instanceKey);

        if (!instanceOrders) {
            return {
                success: true,
                data: [],
                latencyMs: Date.now() - startTime,
                timestamp: new Date()
            };
        }

        const sorted = Array.from(instanceOrders.values())
            .sort((a, b) => b.last_update_timestamp - a.last_update_timestamp)
            .slice(0, limit);

        return {
            success: true,
            data: sorted,
            latencyMs: Date.now() - startTime,
            timestamp: new Date()
        };
    }

    /**
     * Get all orders for instance.
     *
     * @param instanceKey - Account/instance identifier
     * @returns Array of all orders
     */
    getAllOrders(instanceKey: string): DeribitOrder[] {
        return Array.from(this.orders.get(instanceKey)?.values() ?? []);
    }

    /**
     * Check if order exists.
     *
     * @param instanceKey - Account/instance identifier
     * @param orderId - Order ID
     * @returns true if order exists
     */
    hasOrder(instanceKey: string, orderId: string): boolean {
        return this.orders.get(instanceKey)?.has(orderId) ?? false;
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
    getStats(instanceKey?: string): DeribitOrderCacheStats {
        const ordersToAnalyze = instanceKey
            ? Array.from(this.orders.get(instanceKey)?.values() ?? [])
            : Array.from(this.orders.values()).flatMap((m) => Array.from(m.values()));

        return {
            totalOrders: ordersToAnalyze.length,
            openOrders: ordersToAnalyze.filter((o) => o.order_state === OrderState.OPEN).length,
            filledOrders: ordersToAnalyze.filter((o) => o.order_state === OrderState.FILLED).length,
            cancelledOrders: ordersToAnalyze.filter((o) => o.order_state === OrderState.CANCELLED).length,
            lastUpdate: this.lastUpdateTime
        };
    }

    /**
     * Get all instance keys.
     */
    getInstanceKeys(): string[] {
        return Array.from(this.orders.keys());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Cleanup
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Clear orders for an instance.
     *
     * @param instanceKey - Account/instance identifier
     */
    clearInstance(instanceKey: string): void {
        this.orders.delete(instanceKey);
        this.emit('instanceCleared', { instanceKey });
    }

    /**
     * Clear all orders.
     */
    clear(): void {
        this.orders.clear();
        this.lastUpdateTime = null;
        this.emit('cleared');
    }

    /**
     * Dispose the cache.
     */
    dispose(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.clear();
        this.removeAllListeners();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Internal
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Emit appropriate event for order state change.
     */
    private emitStateChange(
        instanceKey: string,
        previousState: OrderState,
        order: DeribitOrder
    ): void {
        switch (order.order_state) {
            case OrderState.FILLED:
                this.emit('orderFilled', { instanceKey, order, previousState });
                break;
            case OrderState.CANCELLED:
                this.emit('orderCancelled', { instanceKey, order, previousState });
                break;
            case OrderState.REJECTED:
                this.emit('orderRejected', { instanceKey, order, previousState });
                break;
            case OrderState.TRIGGERED:
                this.emit('orderTriggered', { instanceKey, order, previousState });
                break;
            default:
                this.emit('orderStateChanged', { instanceKey, order, previousState });
        }
    }

    /**
     * Enforce max orders per instance.
     */
    private enforceMaxOrders(instanceKey: string): void {
        const instanceOrders = this.orders.get(instanceKey);
        if (!instanceOrders || instanceOrders.size <= this.config.maxOrdersPerInstance) {
            return;
        }

        // Remove oldest completed orders first
        const sortedOrders = Array.from(instanceOrders.entries()).sort(
            ([, a], [, b]) => a.last_update_timestamp - b.last_update_timestamp
        );

        const completedStates = [OrderState.FILLED, OrderState.CANCELLED, OrderState.REJECTED];
        let removed = 0;
        const targetSize = this.config.maxOrdersPerInstance;

        for (const [orderId, order] of sortedOrders) {
            if (instanceOrders.size - removed <= targetSize) break;
            if (completedStates.includes(order.order_state)) {
                instanceOrders.delete(orderId);
                removed++;
            }
        }
    }

    /**
     * Start periodic cleanup of old completed orders.
     */
    private startCleanupTimer(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanupCompletedOrders();
        }, this.config.cleanupIntervalMs);
    }

    /**
     * Clean up old completed orders.
     */
    private cleanupCompletedOrders(): void {
        const now = Date.now();
        const completedStates = [OrderState.FILLED, OrderState.CANCELLED, OrderState.REJECTED];

        for (const [instanceKey, instanceOrders] of Array.from(this.orders.entries())) {
            for (const [orderId, order] of Array.from(instanceOrders.entries())) {
                if (
                    completedStates.includes(order.order_state) &&
                    now - order.last_update_timestamp > this.config.completedOrderTtlMs
                ) {
                    instanceOrders.delete(orderId);
                }
            }

            // Remove empty instance maps
            if (instanceOrders.size === 0) {
                this.orders.delete(instanceKey);
            }
        }
    }
}
