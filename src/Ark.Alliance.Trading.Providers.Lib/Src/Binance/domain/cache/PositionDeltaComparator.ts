/**
 * @fileoverview Position Delta Comparator
 * @module core/cache/PositionDeltaComparator
 * 
 * Calculates deep-delta between cache positions and source positions.
 * Used for snapshot reconciliation to detect creates, updates, and deletes.
 */

import { Position } from '../../dtos/position/Position';

/**
 * Result of delta comparison
 */
export interface DeltaResult {
    toCreate: Position[];
    toUpdate: Position[];
    toDelete: Position[];
}

const NUMERIC_TOLERANCE = 1e-8;

/**
 * Compare two numbers with tolerance for floating point precision
 */
function numEq(a?: number, b?: number): boolean {
    if (a === undefined && b === undefined) return true;
    if (a === undefined || b === undefined) return false;
    return Math.abs(a - b) <= NUMERIC_TOLERANCE;
}

/**
 * Deep comparison of position fields
 */
function positionsEqual(a: Position, b: Position): boolean {
    return (
        a.symbol === b.symbol &&
        a.positionSide === b.positionSide &&
        numEq(a.positionAmt, b.positionAmt) &&
        numEq(a.entryPrice, b.entryPrice) &&
        numEq(a.markPrice, b.markPrice) &&
        numEq(a.unrealizedProfit, b.unrealizedProfit) &&
        a.marginType === b.marginType &&
        numEq(a.leverage, b.leverage) &&
        numEq(a.liquidationPrice, b.liquidationPrice) &&
        numEq(a.isolatedWallet, b.isolatedWallet)
    );
}

/**
 * Generate cache key for position
 */
function generateKey(symbol: string, positionSide: string): string {
    return `${symbol}|${positionSide}`;
}

/**
 * Position Delta Comparator
 * Compares cache positions against source positions (from REST snapshot)
 * and produces a delta result for atomic cache updates.
 */
export class PositionDeltaComparator {
    /**
     * Compare cache positions against source positions
     * @param cachePositions - Current positions in cache
     * @param sourcePositions - Fresh positions from REST API
     * @returns Delta result with creates, updates, and deletes
     */
    compare(cachePositions: Position[], sourcePositions: Position[]): DeltaResult {
        const toCreate: Position[] = [];
        const toUpdate: Position[] = [];
        const toDelete: Position[] = [];

        // Build maps for O(1) lookup
        const cacheMap = new Map<string, Position>();
        for (const p of cachePositions) {
            cacheMap.set(generateKey(p.symbol, p.positionSide), p);
        }

        const sourceMap = new Map<string, Position>();
        for (const p of sourcePositions) {
            sourceMap.set(generateKey(p.symbol, p.positionSide), p);
        }

        // Detect creates, updates, and deletes from source qty=0
        for (const [key, source] of sourceMap.entries()) {
            const cached = cacheMap.get(key);

            // If source has zero amount (closed position)
            if (Math.abs(source.positionAmt) === 0) {
                // If it exists in cache, DELETE it
                if (cached && Math.abs(cached.positionAmt) > 0) {
                    console.log(`[PositionDeltaComparator] Source qty=0 for ${source.symbol} -> DELETE`);
                    toDelete.push(cached);
                }
                continue;
            }

            if (!cached) {
                // Position in source but not in cache -> CREATE
                toCreate.push(source);
            } else if (!positionsEqual(cached, source)) {
                // Position exists in both but differs -> UPDATE
                // IMPORTANT: Merge source with cached to preserve fields that may be 0 in source
                const merged: Position = {
                    ...cached,  // Start with cached to preserve computed fields
                    ...source,  // Overlay with source data
                    // CRITICAL: Preserve entryPrice if source has 0 but cached has valid value
                    entryPrice: (source.entryPrice === 0 && cached.entryPrice > 0)
                        ? cached.entryPrice
                        : source.entryPrice,
                    // Preserve realizedProfit from cache (not in snapshot)
                    realizedProfit: cached.realizedProfit ?? source.realizedProfit ?? 0,
                    // Preserve mark price if not in source (market data stream provides this)
                    markPrice: source.markPrice || cached.markPrice || 0
                };
                toUpdate.push(merged);
            }
        }

        // Detect deletes
        for (const [key, cached] of cacheMap.entries()) {
            const source = sourceMap.get(key);

            if (!source) {
                // Position in cache but not in source -> DELETE
                toDelete.push(cached);
            } else if (Math.abs(source.positionAmt) === 0 && Math.abs(cached.positionAmt) > 0) {
                // Source reports zero amount (closed) -> DELETE
                toDelete.push(cached);
            }
        }

        return { toCreate, toUpdate, toDelete };
    }
}
