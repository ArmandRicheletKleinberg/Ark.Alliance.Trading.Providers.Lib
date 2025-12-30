/**
 * @fileoverview Deribit Order Delta Comparator
 * @module Deribit/domain/cache/DeribitOrderDeltaComparator
 *
 * Compares current cache state with REST snapshot for reconciliation.
 * Pattern aligned with Binance's OrderDeltaComparator implementation.
 *
 * @remarks
 * Used to calculate the delta between cached orders and REST snapshot
 * for snapshot reconciliation during connection recovery or periodic sync.
 */

import { DeribitOrder } from '../../dtos';
import { OrderState } from '../../enums';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of delta comparison between current cache and snapshot.
 */
export interface DeribitOrderDeltaResult {
    /** Orders in snapshot but not in cache (new orders). */
    toCreate: DeribitOrder[];
    /** Orders in both but with different state (updated orders). */
    toUpdate: DeribitOrder[];
    /** Orders in cache but not in snapshot (completed/cancelled orders). */
    toDelete: DeribitOrder[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if order is in an active (open) state.
 *
 * @param order - Deribit order to check
 * @returns true if order is active
 */
export function isActiveOrder(order: DeribitOrder): boolean {
    return order.order_state === OrderState.OPEN || order.order_state === OrderState.UNTRIGGERED;
}

/**
 * Check if order is in a terminal (completed) state.
 *
 * @param order - Deribit order to check
 * @returns true if order is terminal
 */
export function isTerminalOrder(order: DeribitOrder): boolean {
    return [
        OrderState.FILLED,
        OrderState.CANCELLED,
        OrderState.REJECTED
    ].includes(order.order_state);
}

/**
 * Check if two orders are equal (same state and key fields).
 *
 * @param a - First order
 * @param b - Second order
 * @returns true if orders are equivalent
 */
export function ordersAreEqual(a: DeribitOrder, b: DeribitOrder): boolean {
    return (
        a.order_id === b.order_id &&
        a.order_state === b.order_state &&
        a.filled_amount === b.filled_amount &&
        a.price === b.price &&
        a.amount === b.amount
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitOrderDeltaComparator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compares order cache state with REST snapshot for reconciliation.
 *
 * @remarks
 * This class computes the differences between the currently cached orders
 * and a fresh snapshot from the REST API. The result includes:
 * - `toCreate`: Orders present in snapshot but missing from cache
 * - `toUpdate`: Orders present in both but with different state
 * - `toDelete`: Orders present in cache but missing from snapshot (completed)
 *
 * @example
 * ```typescript
 * const comparator = new DeribitOrderDeltaComparator();
 * const currentOrders = cache.getActiveOrders(instanceKey).data || [];
 * const snapshotOrders = await client.getOpenOrders();
 *
 * const delta = comparator.compare(currentOrders, snapshotOrders);
 * // Apply delta to cache
 * ```
 */
export class DeribitOrderDeltaComparator {
    /**
     * Compare current cached orders with snapshot from REST API.
     *
     * @param current - Currently cached active orders
     * @param snapshot - Fresh snapshot from REST API (active orders only)
     * @returns Delta result with orders to create, update, and delete
     */
    compare(current: DeribitOrder[], snapshot: DeribitOrder[]): DeribitOrderDeltaResult {
        const currentMap = new Map<string, DeribitOrder>();
        const snapshotMap = new Map<string, DeribitOrder>();

        // Build maps for O(1) lookup
        for (const order of current) {
            currentMap.set(order.order_id, order);
        }
        for (const order of snapshot) {
            snapshotMap.set(order.order_id, order);
        }

        const toCreate: DeribitOrder[] = [];
        const toUpdate: DeribitOrder[] = [];
        const toDelete: DeribitOrder[] = [];

        // Find orders to create or update (in snapshot)
        for (const [orderId, snapshotOrder] of snapshotMap) {
            const cachedOrder = currentMap.get(orderId);

            if (!cachedOrder) {
                // Order in snapshot but not in cache -> create
                toCreate.push(snapshotOrder);
            } else if (!ordersAreEqual(cachedOrder, snapshotOrder)) {
                // Order exists but differs -> update
                toUpdate.push(snapshotOrder);
            }
        }

        // Find orders to delete (in cache but not in snapshot)
        for (const [orderId, cachedOrder] of currentMap) {
            if (!snapshotMap.has(orderId)) {
                // Order in cache but not in snapshot -> was completed/cancelled
                toDelete.push(cachedOrder);
            }
        }

        return { toCreate, toUpdate, toDelete };
    }

    /**
     * Compare with timestamp-based staleness detection.
     *
     * @param current - Currently cached active orders
     * @param snapshot - Fresh snapshot from REST API
     * @param staleThresholdMs - Threshold for considering cached order stale
     * @returns Delta result
     */
    compareWithStaleDetection(
        current: DeribitOrder[],
        snapshot: DeribitOrder[],
        staleThresholdMs: number = 60000
    ): DeribitOrderDeltaResult {
        const now = Date.now();
        const result = this.compare(current, snapshot);

        // Additionally mark very stale cached orders (not in snapshot) for deletion
        for (const cached of current) {
            const isStale = (now - cached.last_update_timestamp) > staleThresholdMs;
            const isActive = isActiveOrder(cached);
            const inSnapshot = snapshot.some((o) => o.order_id === cached.order_id);

            if (isActive && isStale && !inSnapshot) {
                // Already handled by compare, but log for debugging
                console.warn(
                    `[DeribitOrderDeltaComparator] Stale order detected: ${cached.order_id} ` +
                    `(last update: ${new Date(cached.last_update_timestamp).toISOString()})`
                );
            }
        }

        return result;
    }
}
