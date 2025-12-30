/**
 * @fileoverview Deribit Order Cache Updater
 * @module Deribit/domain/cache/DeribitOrderCacheUpdater
 *
 * Central orchestrator for all Deribit order cache operations.
 * Pattern aligned with Binance's OrderCacheUpdater implementation.
 *
 * FEATURES:
 * - Applies deltas from WS user.changes subscription
 * - Applies deltas from REST snapshot reconciliation
 * - Event emission for order lifecycle
 * - Thread-safe via mutex
 */

import { EventEmitter } from 'events';
import { DeribitOrder, DeribitOrderUpdate } from '../../dtos';
import { OrderState } from '../../enums';
import { DeribitOrderCache } from './DeribitOrderCache';
import {
    DeribitOrderDeltaComparator,
    DeribitOrderDeltaResult,
    isActiveOrder,
    isTerminalOrder
} from './DeribitOrderDeltaComparator';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Order lifecycle events.
 */
export const DERIBIT_ORDER_EVENTS = {
    ORDER_CREATED: 'orderCreated',
    ORDER_UPDATED: 'orderUpdated',
    ORDER_FILLED: 'orderFilled',
    ORDER_PARTIALLY_FILLED: 'orderPartiallyFilled',
    ORDER_CANCELLED: 'orderCancelled',
    ORDER_REJECTED: 'orderRejected',
    ORDER_TRIGGERED: 'orderTriggered',
    ORDER_EXPIRED: 'orderExpired'
} as const;

/**
 * Order action result from WebSocket update.
 */
export type OrderAction =
    | 'CREATED'
    | 'UPDATED'
    | 'FILLED'
    | 'PARTIALLY_FILLED'
    | 'CANCELLED'
    | 'REJECTED'
    | 'TRIGGERED'
    | 'EXPIRED'
    | 'IGNORED';

/**
 * Order event payload.
 */
export interface DeribitOrderEventPayload {
    order: DeribitOrder;
    timestamp: number;
    instanceKey: string;
    previousState?: OrderState;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitOrderCacheUpdater
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deribit Order Cache Updater.
 *
 * @remarks
 * Centralizes all cache update logic with thread safety.
 * - Updates cache from WebSocket `user.changes` subscription
 * - Reconciles cache from REST `private/get_open_orders` snapshots
 * - Emits order lifecycle events for downstream consumers
 *
 * @example
 * ```typescript
 * const updater = new DeribitOrderCacheUpdater(cache, 'account1');
 *
 * updater.on('orderFilled', (payload) => {
 *     console.log('Order filled:', payload.order.order_id);
 * });
 *
 * // From WebSocket
 * const { action } = updater.updateFromWsEvent(orderUpdate);
 *
 * // From REST snapshot
 * await updater.refreshFromSnapshot(snapshotOrders);
 * ```
 */
export class DeribitOrderCacheUpdater extends EventEmitter {
    private readonly cache: DeribitOrderCache;
    private readonly comparator: DeribitOrderDeltaComparator;
    private readonly instanceKey: string;

    /** Simple mutex for thread safety. */
    private lockPromise: Promise<void> | null = null;

    constructor(cache: DeribitOrderCache, instanceKey: string) {
        super();
        this.cache = cache;
        this.instanceKey = instanceKey;
        this.comparator = new DeribitOrderDeltaComparator();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Mutex
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Acquire simple mutex lock.
     */
    private async acquireLock(): Promise<() => void> {
        while (this.lockPromise) {
            await this.lockPromise;
        }

        let release: () => void = () => { };
        this.lockPromise = new Promise((resolve) => {
            release = () => {
                this.lockPromise = null;
                resolve();
            };
        });

        return release;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Delta Application
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Apply delta result atomically to cache.
     *
     * @param delta - Delta result from comparator
     */
    async applyDelta(delta: DeribitOrderDeltaResult): Promise<void> {
        const release = await this.acquireLock();
        try {
            // Apply creates
            for (const order of delta.toCreate) {
                this.cache.update(this.instanceKey, order);
                this.emit(DERIBIT_ORDER_EVENTS.ORDER_CREATED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as DeribitOrderEventPayload);
            }

            // Apply updates
            for (const order of delta.toUpdate) {
                this.cache.update(this.instanceKey, order);
                this.emit(DERIBIT_ORDER_EVENTS.ORDER_UPDATED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                } as DeribitOrderEventPayload);
            }

            // Apply deletes (mark as terminal)
            for (const order of delta.toDelete) {
                // Emit appropriate event based on order state
                if (order.order_state === OrderState.FILLED) {
                    this.emit(DERIBIT_ORDER_EVENTS.ORDER_FILLED, {
                        order,
                        timestamp: Date.now(),
                        instanceKey: this.instanceKey
                    } as DeribitOrderEventPayload);
                } else if (order.order_state === OrderState.CANCELLED) {
                    this.emit(DERIBIT_ORDER_EVENTS.ORDER_CANCELLED, {
                        order,
                        timestamp: Date.now(),
                        instanceKey: this.instanceKey
                    } as DeribitOrderEventPayload);
                }
            }

            if (delta.toCreate.length > 0 || delta.toUpdate.length > 0 || delta.toDelete.length > 0) {
                console.log(
                    `[DeribitOrderCacheUpdater] Reconciled: ` +
                    `+${delta.toCreate.length} ~${delta.toUpdate.length} -${delta.toDelete.length}`
                );
            }
        } finally {
            release();
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Snapshot Refresh
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Refresh cache from REST snapshot (private/get_open_orders).
     *
     * @param snapshotOrders - Orders from REST API
     */
    async refreshFromSnapshot(snapshotOrders: DeribitOrder[]): Promise<void> {
        const release = await this.acquireLock();
        try {
            const activeResult = this.cache.getActiveOrders(this.instanceKey);
            const currentOrders = activeResult.success && activeResult.data ? activeResult.data : [];
            const delta = this.comparator.compare(currentOrders, snapshotOrders);

            release();

            if (delta.toCreate.length > 0 || delta.toUpdate.length > 0 || delta.toDelete.length > 0) {
                await this.applyDelta(delta);
            }
        } catch (err) {
            release();
            throw err;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // WebSocket Update
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Update cache from WebSocket user.changes order update.
     *
     * @param orderUpdate - Order update from WebSocket
     * @returns Action taken
     */
    updateFromWsEvent(orderUpdate: DeribitOrderUpdate): { action: OrderAction } {
        // Convert DeribitOrderUpdate to DeribitOrder for cache
        const order: DeribitOrder = {
            order_id: orderUpdate.order_id,
            instrument_name: orderUpdate.instrument_name,
            direction: orderUpdate.direction,
            amount: orderUpdate.amount,
            filled_amount: orderUpdate.filled_amount,
            price: orderUpdate.price,
            average_price: orderUpdate.average_price,
            order_type: orderUpdate.order_type as any,
            order_state: orderUpdate.order_state as OrderState,
            time_in_force: orderUpdate.time_in_force as any,
            label: orderUpdate.label,
            is_liquidation: orderUpdate.is_liquidation,
            is_rebalance: orderUpdate.is_rebalance,
            reduce_only: orderUpdate.reduce_only,
            post_only: orderUpdate.post_only,
            replaced: orderUpdate.replaced,
            web: orderUpdate.web,
            api: orderUpdate.api,
            max_show: orderUpdate.max_show,
            creation_timestamp: orderUpdate.creation_timestamp,
            last_update_timestamp: orderUpdate.last_update_timestamp
        };

        // Get previous state for comparison
        const existingResult = this.cache.getOrder(this.instanceKey, order.order_id);
        const previousState = existingResult.data?.order_state;

        // Store in cache
        this.cache.update(this.instanceKey, order);

        // Determine action based on order state
        const state = order.order_state;

        // New order (no previous or was untriggered)
        if (!previousState || (previousState === OrderState.UNTRIGGERED && state === OrderState.OPEN)) {
            if (state === OrderState.TRIGGERED) {
                this.emit(DERIBIT_ORDER_EVENTS.ORDER_TRIGGERED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey,
                    previousState
                } as DeribitOrderEventPayload);
                return { action: 'TRIGGERED' };
            }

            this.emit(DERIBIT_ORDER_EVENTS.ORDER_CREATED, {
                order,
                timestamp: Date.now(),
                instanceKey: this.instanceKey
            } as DeribitOrderEventPayload);
            return { action: 'CREATED' };
        }

        // State transitions
        switch (state) {
            case OrderState.FILLED:
                this.emit(DERIBIT_ORDER_EVENTS.ORDER_FILLED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey,
                    previousState
                } as DeribitOrderEventPayload);
                return { action: 'FILLED' };

            case OrderState.CANCELLED:
                this.emit(DERIBIT_ORDER_EVENTS.ORDER_CANCELLED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey,
                    previousState
                } as DeribitOrderEventPayload);
                return { action: 'CANCELLED' };

            case OrderState.REJECTED:
                this.emit(DERIBIT_ORDER_EVENTS.ORDER_REJECTED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey,
                    previousState
                } as DeribitOrderEventPayload);
                return { action: 'REJECTED' };

            case OrderState.TRIGGERED:
                this.emit(DERIBIT_ORDER_EVENTS.ORDER_TRIGGERED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey,
                    previousState
                } as DeribitOrderEventPayload);
                return { action: 'TRIGGERED' };

            case OrderState.OPEN:
                // Check if partially filled
                if (order.filled_amount > 0 && previousState === OrderState.OPEN) {
                    const existingOrder = existingResult.data;
                    if (existingOrder && order.filled_amount > existingOrder.filled_amount) {
                        this.emit(DERIBIT_ORDER_EVENTS.ORDER_PARTIALLY_FILLED, {
                            order,
                            timestamp: Date.now(),
                            instanceKey: this.instanceKey,
                            previousState
                        } as DeribitOrderEventPayload);
                        return { action: 'PARTIALLY_FILLED' };
                    }
                }

                this.emit(DERIBIT_ORDER_EVENTS.ORDER_UPDATED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey,
                    previousState
                } as DeribitOrderEventPayload);
                return { action: 'UPDATED' };

            default:
                return { action: 'IGNORED' };
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Accessors
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get underlying cache.
     */
    getCache(): DeribitOrderCache {
        return this.cache;
    }

    /**
     * Get instance key.
     */
    getInstanceKey(): string {
        return this.instanceKey;
    }
}
