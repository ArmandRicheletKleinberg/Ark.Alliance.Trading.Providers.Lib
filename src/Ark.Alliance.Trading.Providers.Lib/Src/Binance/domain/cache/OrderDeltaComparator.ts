/**
 * @fileoverview Order Delta Comparator
 * @module core/cache/OrderDeltaComparator
 * 
 * Calculates delta between cached orders and REST snapshot.
 * Handles all Binance order execution types and statuses per API spec:
 * - Execution Types: NEW, CANCELED, CALCULATED, EXPIRED, TRADE, AMENDMENT
 * - Order Status: NEW, PARTIALLY_FILLED, FILLED, CANCELED, EXPIRED, EXPIRED_IN_MATCH
 */

import { OrderUpdate, OrderStatus, ExecutionType } from '../../dtos/binance/OrderUpdate';

/**
 * Result of delta comparison
 */
export interface OrderDeltaResult {
    toCreate: OrderUpdate[];
    toUpdate: OrderUpdate[];
    toDelete: OrderUpdate[];
}

/**
 * Active order statuses (orders that should be in cache)
 */
const ACTIVE_STATUSES: OrderStatus[] = [OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED];

/**
 * Terminal order statuses (orders that should be removed from active cache)
 */
const TERMINAL_STATUSES: OrderStatus[] = [OrderStatus.FILLED, OrderStatus.CANCELED, OrderStatus.EXPIRED, OrderStatus.EXPIRED_IN_MATCH];

/**
 * Generate unique key for order
 */
function generateOrderKey(orderId: number | string): string {
    return `${orderId}`;
}

/**
 * Check if order is in active state
 */
export function isActiveOrder(order: OrderUpdate): boolean {
    return ACTIVE_STATUSES.includes(order.orderStatus);
}

/**
 * Check if order is in terminal state
 */
export function isTerminalOrder(order: OrderUpdate): boolean {
    return TERMINAL_STATUSES.includes(order.orderStatus);
}

/**
 * Deep comparison of order fields
 */
function ordersEqual(a: OrderUpdate, b: OrderUpdate): boolean {
    return (
        a.orderId === b.orderId &&
        a.orderStatus === b.orderStatus &&
        a.filledQuantity === b.filledQuantity &&
        a.averagePrice === b.averagePrice &&
        a.originalPrice === b.originalPrice &&
        a.originalQuantity === b.originalQuantity
    );
}

/**
 * Order Delta Comparator
 * Compares cached orders against REST snapshot and produces delta
 */
export class OrderDeltaComparator {
    /**
     * Compare cached orders against source orders from REST API
     * @param cacheOrders - Current orders in cache
     * @param sourceOrders - Fresh orders from REST API (getOpenOrders)
     * @returns Delta result with creates, updates, and deletes
     */
    compare(cacheOrders: OrderUpdate[], sourceOrders: OrderUpdate[]): OrderDeltaResult {
        const toCreate: OrderUpdate[] = [];
        const toUpdate: OrderUpdate[] = [];
        const toDelete: OrderUpdate[] = [];

        // Build maps for O(1) lookup
        const cacheMap = new Map<string, OrderUpdate>();
        for (const o of cacheOrders) {
            cacheMap.set(generateOrderKey(o.orderId), o);
        }

        const sourceMap = new Map<string, OrderUpdate>();
        for (const o of sourceOrders) {
            sourceMap.set(generateOrderKey(o.orderId), o);
        }

        // Detect creates and updates
        for (const [key, source] of sourceMap.entries()) {
            const cached = cacheMap.get(key);

            if (!cached) {
                // Order in source but not in cache → CREATE
                toCreate.push(source);
            } else if (!ordersEqual(cached, source)) {
                // Order exists in both but differs → UPDATE
                toUpdate.push(source);
            }
        }

        // Detect deletes (orders in cache but not in REST snapshot = filled/cancelled)
        for (const [key, cached] of cacheMap.entries()) {
            const source = sourceMap.get(key);

            if (!source && isActiveOrder(cached)) {
                // Active order in cache but not in source → DELETE (was filled/cancelled)
                toDelete.push(cached);
            }
        }

        return { toCreate, toUpdate, toDelete };
    }

    /**
     * Compare for WS event processing
     * Determines if a WS order update should modify cache
     */
    shouldUpdateCache(wsOrder: OrderUpdate, cachedOrder?: OrderUpdate): {
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IGNORE';
        reason: string;
    } {
        // Terminal status → delete from active cache
        if (isTerminalOrder(wsOrder)) {
            if (cachedOrder) {
                return { action: 'DELETE', reason: `Status: ${wsOrder.orderStatus}` };
            }
            return { action: 'IGNORE', reason: 'Terminal order not in cache' };
        }

        // Active status
        if (!cachedOrder) {
            return { action: 'CREATE', reason: `New order: ${wsOrder.orderStatus}` };
        }

        // Exists → update
        return { action: 'UPDATE', reason: `Status: ${wsOrder.orderStatus}` };
    }
}
