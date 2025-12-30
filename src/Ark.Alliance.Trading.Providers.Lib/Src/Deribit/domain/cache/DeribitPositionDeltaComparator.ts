/**
 * @fileoverview Deribit Position Delta Comparator
 * @module Deribit/domain/cache/DeribitPositionDeltaComparator
 *
 * Compares current position cache state with REST snapshot for reconciliation.
 * Pattern aligned with Binance's PositionDeltaComparator implementation.
 *
 * @remarks
 * Used to calculate the delta between cached positions and REST snapshot
 * for snapshot reconciliation during connection recovery or periodic sync.
 */

import { DeribitPosition } from '../../dtos';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of delta comparison between current cache and snapshot.
 */
export interface DeribitPositionDeltaResult {
    /** Positions in snapshot but not in cache (new positions). */
    toCreate: DeribitPosition[];
    /** Positions in both but with different values (updated positions). */
    toUpdate: DeribitPosition[];
    /** Positions in cache but not in snapshot or now zero (closed positions). */
    toDelete: DeribitPosition[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if position is active (non-zero size).
 *
 * @param position - Deribit position to check
 * @returns true if position has non-zero size
 */
export function isActivePosition(position: DeribitPosition): boolean {
    return position.size !== 0;
}

/**
 * Generate cache key from position (instrument name).
 * Deribit uses single-directional positions per instrument.
 *
 * @param position - Deribit position
 * @returns Cache key
 */
export function getPositionKey(position: DeribitPosition): string {
    return position.instrument_name.toUpperCase();
}

/**
 * Check if two positions are equal (same key fields).
 *
 * @param a - First position
 * @param b - Second position
 * @returns true if positions are equivalent
 */
export function positionsAreEqual(a: DeribitPosition, b: DeribitPosition): boolean {
    // Compare key fields that would indicate a meaningful change
    return (
        a.instrument_name === b.instrument_name &&
        a.size === b.size &&
        a.direction === b.direction &&
        a.average_price === b.average_price &&
        a.leverage === b.leverage
    );
}

/**
 * Check if position has meaningfully changed (for PnL/margin updates).
 *
 * @param a - First position (cached)
 * @param b - Second position (snapshot)
 * @returns true if position has changed enough to warrant update
 */
export function positionNeedsUpdate(a: DeribitPosition, b: DeribitPosition): boolean {
    // Size or direction change is always meaningful
    if (a.size !== b.size || a.direction !== b.direction) {
        return true;
    }

    // Entry price change is meaningful
    if (a.average_price !== b.average_price) {
        return true;
    }

    // Leverage change is meaningful
    if (a.leverage !== b.leverage) {
        return true;
    }

    // Large PnL changes are meaningful (> 0.01 BTC or equivalent)
    const pnlDiff = Math.abs(a.floating_profit_loss - b.floating_profit_loss);
    if (pnlDiff > 0.01) {
        return true;
    }

    return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DeribitPositionDeltaComparator
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compares position cache state with REST snapshot for reconciliation.
 *
 * @remarks
 * This class computes the differences between the currently cached positions
 * and a fresh snapshot from the REST API. The result includes:
 * - `toCreate`: Positions present in snapshot but missing from cache
 * - `toUpdate`: Positions present in both but with different values
 * - `toDelete`: Positions present in cache but missing/zero in snapshot
 *
 * @example
 * ```typescript
 * const comparator = new DeribitPositionDeltaComparator();
 * const currentPositions = cache.getActivePositions();
 * const snapshotPositions = await client.getPositions('BTC');
 *
 * const delta = comparator.compare(currentPositions, snapshotPositions);
 * // Apply delta to cache
 * ```
 */
export class DeribitPositionDeltaComparator {
    /**
     * Compare current cached positions with snapshot from REST API.
     *
     * @param current - Currently cached active positions
     * @param snapshot - Fresh snapshot from REST API
     * @returns Delta result with positions to create, update, and delete
     */
    compare(current: DeribitPosition[], snapshot: DeribitPosition[]): DeribitPositionDeltaResult {
        const currentMap = new Map<string, DeribitPosition>();
        const snapshotMap = new Map<string, DeribitPosition>();

        // Build maps for O(1) lookup, only include active positions
        for (const position of current) {
            if (isActivePosition(position)) {
                currentMap.set(getPositionKey(position), position);
            }
        }
        for (const position of snapshot) {
            if (isActivePosition(position)) {
                snapshotMap.set(getPositionKey(position), position);
            }
        }

        const toCreate: DeribitPosition[] = [];
        const toUpdate: DeribitPosition[] = [];
        const toDelete: DeribitPosition[] = [];

        // Find positions to create or update (in snapshot)
        for (const [key, snapshotPos] of snapshotMap) {
            const cachedPos = currentMap.get(key);

            if (!cachedPos) {
                // Position in snapshot but not in cache -> create
                toCreate.push(snapshotPos);
            } else if (positionNeedsUpdate(cachedPos, snapshotPos)) {
                // Position exists but differs -> update
                toUpdate.push(snapshotPos);
            }
        }

        // Find positions to delete (in cache but not in snapshot)
        for (const [key, cachedPos] of currentMap) {
            if (!snapshotMap.has(key)) {
                // Position in cache but not in snapshot -> was closed
                toDelete.push(cachedPos);
            }
        }

        return { toCreate, toUpdate, toDelete };
    }

    /**
     * Compare with zero-size positions included in snapshot.
     *
     * @remarks
     * Some API responses include zero-size positions. This method
     * handles those correctly by treating them as deletions.
     *
     * @param current - Currently cached active positions
     * @param snapshot - Fresh snapshot from REST API (may include zero-size)
     * @returns Delta result
     */
    compareIncludingZero(
        current: DeribitPosition[],
        snapshot: DeribitPosition[]
    ): DeribitPositionDeltaResult {
        const result = this.compare(current, snapshot);

        // Check for positions that are zero in snapshot but active in cache
        for (const snapshotPos of snapshot) {
            if (!isActivePosition(snapshotPos)) {
                const key = getPositionKey(snapshotPos);
                const cachedPos = current.find((p) => getPositionKey(p) === key);

                if (cachedPos && isActivePosition(cachedPos)) {
                    // Position was closed (zero in snapshot, active in cache)
                    if (!result.toDelete.some((p) => getPositionKey(p) === key)) {
                        result.toDelete.push(cachedPos);
                    }
                }
            }
        }

        return result;
    }
}
