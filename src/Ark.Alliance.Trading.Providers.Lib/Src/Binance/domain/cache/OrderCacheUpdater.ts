/**
 * @fileoverview Order Cache Updater
 * @module core/cache/OrderCacheUpdater
 * 
 * Central orchestrator for all order cache operations.
 * Features:
 * - Applies deltas from WS ORDER_TRADE_UPDATE events
 * - Applies deltas from REST snapshot reconciliation
 * - Event emission for order lifecycle
 * - Thread-safe via mutex
 */

import { EventEmitter } from 'events';
import { OrderUpdate, OrderStatus, ExecutionType } from '../../dtos/binance/OrderUpdate';
import { AlgoOrderUpdate, AlgoOrderStatus, isAlgoTerminalStatus, isAlgoActiveStatus } from '../../dtos/binance/AlgoOrderUpdate';
import { OrderCache } from './OrderCache';
import { OrderDeltaComparator, OrderDeltaResult, isActiveOrder, isTerminalOrder } from './OrderDeltaComparator';
import { ResiliencePolicy } from '../../utils/ResiliencePolicy';

/**
 * Order lifecycle events
 */
export const ORDER_EVENTS = {
    ORDER_CREATED: 'orderCreated',
    ORDER_UPDATED: 'orderUpdated',
    ORDER_FILLED: 'orderFilled',
    ORDER_PARTIALLY_FILLED: 'orderPartiallyFilled',
    ORDER_CANCELLED: 'orderCancelled',
    ORDER_EXPIRED: 'orderExpired',
    // Algo order events
    ALGO_ORDER_CREATED: 'algoOrderCreated',
    ALGO_ORDER_TRIGGERING: 'algoOrderTriggering',
    ALGO_ORDER_TRIGGERED: 'algoOrderTriggered',
    ALGO_ORDER_FINISHED: 'algoOrderFinished',
    ALGO_ORDER_REJECTED: 'algoOrderRejected',
    ALGO_ORDER_CANCELLED: 'algoOrderCancelled',
    ALGO_ORDER_EXPIRED: 'algoOrderExpired'
};

/**
 * Order Cache Updater
 * Centralizes all cache update logic with thread safety
 */
export class OrderCacheUpdater extends EventEmitter {
    private cache: OrderCache;
    private comparator: OrderDeltaComparator;
    private resilience: ResiliencePolicy;
    private instanceKey: string;

    // Simple mutex for thread safety
    private lockPromise: Promise<void> | null = null;

    constructor(
        cache: OrderCache,
        instanceKey: string,
        opts?: { resilience?: ResiliencePolicy }
    ) {
        super();
        this.cache = cache;
        this.instanceKey = instanceKey;
        this.comparator = new OrderDeltaComparator();
        this.resilience = opts?.resilience ?? new ResiliencePolicy();
    }

    /**
     * Acquire simple mutex lock
     */
    private async acquireLock(): Promise<() => void> {
        while (this.lockPromise) {
            await this.lockPromise;
        }

        let release: () => void = () => { };
        this.lockPromise = new Promise(resolve => {
            release = () => {
                this.lockPromise = null;
                resolve();
            };
        });

        return release;
    }

    /**
     * Apply delta result atomically to cache
     */
    async applyDelta(delta: OrderDeltaResult): Promise<void> {
        const release = await this.acquireLock();
        try {
            // Apply creates
            for (const order of delta.toCreate) {
                this.cache.update(this.instanceKey, order);
                this.emit(ORDER_EVENTS.ORDER_CREATED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
            }

            // Apply updates
            for (const order of delta.toUpdate) {
                this.cache.update(this.instanceKey, order);
                this.emit(ORDER_EVENTS.ORDER_UPDATED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
            }

            // Apply deletes (mark as terminal in cache's recent orders)
            for (const order of delta.toDelete) {
                // Don't actually delete, cache will handle moving to inactive
                this.emit(ORDER_EVENTS.ORDER_FILLED, {
                    order,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
            }

            if (delta.toCreate.length > 0 || delta.toUpdate.length > 0 || delta.toDelete.length > 0) {
                console.log(`[OrderCacheUpdater] Reconciled: +${delta.toCreate.length} ~${delta.toUpdate.length} -${delta.toDelete.length}`);
            }
        } finally {
            release();
        }
    }

    /**
     * Refresh cache from REST snapshot (getOpenOrders)
     */
    async refreshFromSnapshot(snapshotOrders: OrderUpdate[]): Promise<void> {
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

    /**
     * Update cache from WebSocket ORDER_TRADE_UPDATE event
     * Handles all execution types per Binance spec
     */
    updateFromWsEvent(orderUpdate: OrderUpdate): {
        action: 'CREATED' | 'UPDATED' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'EXPIRED' | 'IGNORED';
    } {
        // Store in cache (cache handles active/inactive tracking)
        this.cache.update(this.instanceKey, orderUpdate);

        // Determine event based on execution type and status
        switch (orderUpdate.executionType) {
            case 'NEW':
                this.emit(ORDER_EVENTS.ORDER_CREATED, {
                    order: orderUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'CREATED' };

            case 'TRADE':
                if (orderUpdate.orderStatus === 'FILLED') {
                    this.emit(ORDER_EVENTS.ORDER_FILLED, {
                        order: orderUpdate,
                        timestamp: Date.now(),
                        instanceKey: this.instanceKey
                    });
                    return { action: 'FILLED' };
                } else if (orderUpdate.orderStatus === 'PARTIALLY_FILLED') {
                    this.emit(ORDER_EVENTS.ORDER_PARTIALLY_FILLED, {
                        order: orderUpdate,
                        timestamp: Date.now(),
                        instanceKey: this.instanceKey
                    });
                    return { action: 'PARTIALLY_FILLED' };
                }
                break;

            case 'CANCELED':
                this.emit(ORDER_EVENTS.ORDER_CANCELLED, {
                    order: orderUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'CANCELLED' };

            case 'EXPIRED':
                this.emit(ORDER_EVENTS.ORDER_EXPIRED, {
                    order: orderUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'EXPIRED' };

            case 'AMENDMENT':
                this.emit(ORDER_EVENTS.ORDER_UPDATED, {
                    order: orderUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'UPDATED' };

            case 'CALCULATED':
                // Liquidation - treat as filled
                this.emit(ORDER_EVENTS.ORDER_FILLED, {
                    order: orderUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'FILLED' };
        }

        return { action: 'IGNORED' };
    }

    /**
     * Update cache from WebSocket ALGO_UPDATE event
     * Handles algo/conditional order lifecycle
     * 
     * @param algoUpdate - Parsed AlgoOrderUpdate from ALGO_UPDATE event
     * @returns Action taken based on algo status
     */
    updateFromAlgoWsEvent(algoUpdate: AlgoOrderUpdate): {
        action: 'CREATED' | 'TRIGGERING' | 'TRIGGERED' | 'FINISHED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'IGNORED';
    } {
        // Store in cache (cache handles active/inactive tracking)
        this.cache.updateAlgoOrder(this.instanceKey, algoUpdate);

        // Determine event based on algo status
        switch (algoUpdate.status) {
            case AlgoOrderStatus.NEW:
                this.emit(ORDER_EVENTS.ALGO_ORDER_CREATED, {
                    order: algoUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'CREATED' };

            case AlgoOrderStatus.TRIGGERING:
                this.emit(ORDER_EVENTS.ALGO_ORDER_TRIGGERING, {
                    order: algoUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'TRIGGERING' };

            case AlgoOrderStatus.TRIGGERED:
                this.emit(ORDER_EVENTS.ALGO_ORDER_TRIGGERED, {
                    order: algoUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'TRIGGERED' };

            case AlgoOrderStatus.FINISHED:
            case AlgoOrderStatus.EXECUTED:
                this.emit(ORDER_EVENTS.ALGO_ORDER_FINISHED, {
                    order: algoUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'FINISHED' };

            case AlgoOrderStatus.REJECTED:
                this.emit(ORDER_EVENTS.ALGO_ORDER_REJECTED, {
                    order: algoUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'REJECTED' };

            case AlgoOrderStatus.CANCELLED:
                this.emit(ORDER_EVENTS.ALGO_ORDER_CANCELLED, {
                    order: algoUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'CANCELLED' };

            case AlgoOrderStatus.EXPIRED:
                this.emit(ORDER_EVENTS.ALGO_ORDER_EXPIRED, {
                    order: algoUpdate,
                    timestamp: Date.now(),
                    instanceKey: this.instanceKey
                });
                return { action: 'EXPIRED' };
        }

        return { action: 'IGNORED' };
    }

    /**
     * Get underlying cache
     */
    getCache(): OrderCache {
        return this.cache;
    }

    /**
     * Get instance key
     */
    getInstanceKey(): string {
        return this.instanceKey;
    }
}
